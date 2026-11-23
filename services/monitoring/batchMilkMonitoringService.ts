import { Cow, Farmer, MilkRecord } from '../../types/aavin';
import {
  AlertSeverity,
  CowBatchYieldEstimate,
  DEFAULT_MONITORING_CONFIG,
  FarmerBatchMonitoringResult,
  FarmerDailyMonitoringSummary,
  MilkMonitoringConfig,
  MonitoringBatch,
} from './monitoringTypes';
import { MilkYieldEstimationService } from './milkYieldEstimationService';

export class BatchMilkMonitoringService {
  /**
   * Check if a batch has passed its cutoff time plus grace period for a given date.
   */
  public static isBatchPastCutoff(
    batch: MonitoringBatch,
    collectionDate: string,
    config: MilkMonitoringConfig = DEFAULT_MONITORING_CONFIG,
    now: Date = new Date()
  ): boolean {
    const todayStr = now.toISOString().split('T')[0];

    // If checking a past date, cutoff has definitely passed
    if (collectionDate < todayStr) {
      return true;
    }

    // If checking a future date, cutoff has not passed
    if (collectionDate > todayStr) {
      return false;
    }

    // For today, check against configured cutoff time + grace period
    const cutoffTime = batch === 'morning' ? config.morningCutoffTime : config.eveningCutoffTime;
    const graceMinutes = batch === 'morning' ? config.morningGracePeriodMinutes : config.eveningGracePeriodMinutes;

    const [cutoffHours, cutoffMinutes] = cutoffTime.split(':').map(Number);
    const cutoffDate = new Date(now);
    cutoffDate.setHours(cutoffHours, cutoffMinutes + graceMinutes, 0, 0);

    return now.getTime() >= cutoffDate.getTime();
  }

  /**
   * Evaluate a single farmer's milk supply for a specific batch.
   */
  public static evaluateFarmerBatch(
    farmer: Farmer,
    cows: Cow[],
    milkRecords: MilkRecord[],
    batch: MonitoringBatch,
    collectionDate: string,
    config: MilkMonitoringConfig = DEFAULT_MONITORING_CONFIG,
    now: Date = new Date()
  ): FarmerBatchMonitoringResult {
    const timestamp = now.toISOString();
    const dataQualityIssues: string[] = [];

    // Filter registered cows belonging to this farmer
    // Deduplicate cattle records by unique tagId
    const seenTags = new Set<string>();
    const farmerCows: Cow[] = [];
    for (const c of cows) {
      if (c.farmerId === farmer.id) {
        if (c.tagId && seenTags.has(c.tagId)) {
          dataQualityIssues.push(`Duplicate cattle tag detected: #${c.tagId}`);
          continue;
        }
        if (c.tagId) seenTags.add(c.tagId);
        farmerCows.push(c);
      }
    }

    const declaredCows = farmer.numberOfCows || 0;
    const registeredCows = farmerCows.length;
    const verifiedCows = farmerCows.filter(c => c.verificationStatus === 'verified').length;

    // Check discrepancy between declared and registered
    if (declaredCows !== registeredCows && declaredCows > 0) {
      dataQualityIssues.push(`Declared cow count (${declaredCows}) differs from registered count (${registeredCows}).`);
    }

    // Cow breakdown by eligibility
    let eligibleCows = 0;
    let dryCows = 0;
    let quarantineCows = 0;
    let unknownCows = 0;

    const cowEstimates: CowBatchYieldEstimate[] = [];
    let expectedBatchLitres = 0;

    for (const cow of farmerCows) {
      const eligibility = MilkYieldEstimationService.determineEligibility(cow);
      if (eligibility.status === 'eligible') {
        eligibleCows++;
      } else if (eligibility.status === 'dry_or_non_lactating') {
        dryCows++;
      } else if (eligibility.status === 'quarantine_or_withdrawal') {
        quarantineCows++;
      } else {
        unknownCows++;
      }

      // Historical records for this cow / farmer
      const cowHistory = milkRecords.filter(r => r.farmerId === farmer.id && r.status !== 'corrected');
      const estimate = MilkYieldEstimationService.calculateExpectedBatchYield(cow, batch, cowHistory);
      cowEstimates.push(estimate);

      if (eligibility.status === 'eligible') {
        expectedBatchLitres += estimate.expectedLitres;
      }
    }

    expectedBatchLitres = Number(expectedBatchLitres.toFixed(2));

    // Find verified actual milk supplied by this farmer for this date & session
    const matchingRecords = milkRecords.filter(
      r => r.farmerId === farmer.id &&
           r.collectionDate === collectionDate &&
           r.session === batch &&
           r.status !== 'corrected'
    );

    const hasRecord = matchingRecords.length > 0;
    let actualBatchLitres = 0;
    let measurementMethod: 'farmer_wise' | 'combined' | 'none' = 'none';

    if (hasRecord) {
      // Sum verified records
      actualBatchLitres = Number(
        matchingRecords.reduce((sum, r) => sum + Number(r.quantityLitres || 0), 0).toFixed(2)
      );

      const hasCombined = matchingRecords.some(r => r.measurementMethod === 'combined' || r.route === 'vendor');
      measurementMethod = hasCombined ? 'combined' : 'farmer_wise';

      if (hasCombined) {
        dataQualityIssues.push('Record includes vendor / combined measurement basis. Individual attribution unverified.');
      }
    }

    // Shortfall calculation
    const batchGapLitres = Number((expectedBatchLitres - actualBatchLitres).toFixed(2));
    let batchGapPercentage: number | null = null;
    if (expectedBatchLitres > 0) {
      batchGapPercentage = Number(((batchGapLitres / expectedBatchLitres) * 100).toFixed(1));
    }

    // Determine severity
    const pastCutoff = this.isBatchPastCutoff(batch, collectionDate, config, now);
    let severity: AlertSeverity = 'normal';

    if (eligibleCows === 0 || expectedBatchLitres <= 0) {
      // No eligible cows producing milk
      severity = eligibleCows === 0 && dryCows > 0 ? 'normal' : 'insufficient_data';
    } else if (!hasRecord) {
      if (pastCutoff) {
        severity = 'no_record';
      } else {
        severity = 'normal'; // Still within collection window
      }
    } else if (measurementMethod === 'combined') {
      severity = 'insufficient_data';
    } else if (actualBatchLitres > expectedBatchLitres * 1.5 && expectedBatchLitres > 0) {
      severity = 'supply_above_expected';
    } else if (batchGapPercentage !== null && expectedBatchLitres >= config.minExpectedLitresForAlert && batchGapLitres >= config.minAbsoluteGapLitres) {
      if (batchGapPercentage >= config.criticalThresholdPercent) {
        severity = 'critical';
      } else if (batchGapPercentage >= config.warningThresholdPercent) {
        severity = 'warning';
      } else {
        severity = 'normal';
      }
    } else {
      severity = 'normal';
    }

    return {
      farmerId: farmer.id,
      farmerIdCode: farmer.farmerIdCode || farmer.id,
      farmerName: farmer.name,
      societyId: farmer.assignedBoothId,
      collectionDate,
      batch,
      declaredCows,
      registeredCows,
      verifiedCows,
      eligibleCows,
      dryCows,
      quarantineCows,
      unknownCows,
      expectedBatchLitres,
      actualBatchLitres,
      batchGapLitres,
      batchGapPercentage,
      hasRecord,
      measurementMethod,
      severity,
      cowEstimates,
      calculationTimestamp: timestamp,
      dataQualityIssues,
    };
  }

  /**
   * Monitor all farmers in a society for a specific batch.
   */
  public static monitorSocietyBatch(
    societyId: string,
    farmers: Farmer[],
    cows: Cow[],
    milkRecords: MilkRecord[],
    batch: MonitoringBatch,
    collectionDate: string,
    config: MilkMonitoringConfig = DEFAULT_MONITORING_CONFIG,
    now: Date = new Date()
  ): FarmerBatchMonitoringResult[] {
    const societyFarmers = farmers.filter(f => f.assignedBoothId === societyId);
    return societyFarmers.map(farmer =>
      this.evaluateFarmerBatch(farmer, cows, milkRecords, batch, collectionDate, config, now)
    );
  }

  /**
   * Aggregate Morning and Evening evaluations into a daily summary without double counting.
   */
  public static calculateDailySummary(
    morningResult: FarmerBatchMonitoringResult,
    eveningResult: FarmerBatchMonitoringResult
  ): FarmerDailyMonitoringSummary {
    const dailyExpectedLitres = Number(
      (morningResult.expectedBatchLitres + eveningResult.expectedBatchLitres).toFixed(2)
    );
    const dailyActualLitres = Number(
      (morningResult.actualBatchLitres + eveningResult.actualBatchLitres).toFixed(2)
    );
    const dailyGapLitres = Number((dailyExpectedLitres - dailyActualLitres).toFixed(2));

    let dailyGapPercentage: number | null = null;
    if (dailyExpectedLitres > 0) {
      dailyGapPercentage = Number(((dailyGapLitres / dailyExpectedLitres) * 100).toFixed(1));
    }

    // Overall severity: critical if either batch is critical, otherwise warning if either is warning, etc.
    let overallSeverity: AlertSeverity = 'normal';
    if (morningResult.severity === 'critical' || eveningResult.severity === 'critical') {
      overallSeverity = 'critical';
    } else if (morningResult.severity === 'warning' || eveningResult.severity === 'warning') {
      overallSeverity = 'warning';
    } else if (morningResult.severity === 'no_record' && eveningResult.severity === 'no_record') {
      overallSeverity = 'no_record';
    } else if (morningResult.severity === 'insufficient_data' || eveningResult.severity === 'insufficient_data') {
      overallSeverity = 'insufficient_data';
    }

    return {
      farmerId: morningResult.farmerId,
      farmerIdCode: morningResult.farmerIdCode,
      farmerName: morningResult.farmerName,
      societyId: morningResult.societyId,
      collectionDate: morningResult.collectionDate,
      morning: morningResult,
      evening: eveningResult,
      dailyExpectedLitres,
      dailyActualLitres,
      dailyGapLitres,
      dailyGapPercentage,
      overallSeverity,
    };
  }
}
