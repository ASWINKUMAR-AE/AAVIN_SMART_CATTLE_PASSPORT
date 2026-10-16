import { Cow, MilkRecord } from '../../types/aavin';
import {
  CattleEligibilityStatus,
  CowBatchYieldEstimate,
  MonitoringBatch,
  YieldDataSource,
  YieldReliabilityCategory,
} from './monitoringTypes';
import { BreedYieldDatasetAdapter } from './datasetAdapter';

/**
 * Service to evaluate cow eligibility and calculate expected batch yields
 * adhering to the strict priority and data-quality guidelines.
 */
export class MilkYieldEstimationService {
  /**
   * Determine a cow's milk production eligibility status.
   */
  public static determineEligibility(cow: Cow): {
    status: CattleEligibilityStatus;
    isEligible: boolean;
    reason?: string;
  } {
    // 1. Dry or non-lactating checks
    if (cow.currentStatus === 'dry' || cow.lactationStage === 'dry') {
      return {
        status: 'dry_or_non_lactating',
        isEligible: false,
        reason: 'Cow is confirmed dry / non-lactating.',
      };
    }

    // 2. Quarantine hold or active veterinary withdrawal period
    if (
      cow.currentStatus === 'quarantine_hold' ||
      cow.healthStatus === 'quarantine_hold' ||
      cow.activeWithdrawal?.hasActiveWithdrawal
    ) {
      const medName = cow.activeWithdrawal?.medicineName || 'Veterinary treatment';
      const days = cow.activeWithdrawal?.daysRemaining || 0;
      return {
        status: 'quarantine_or_withdrawal',
        isEligible: false,
        reason: `Active withdrawal / quarantine hold (${medName}, ${days} days remaining). Milk must not enter procurement.`,
      };
    }

    // 3. Status unknown / unverified
    if (!cow.currentStatus && !cow.dailyMilkYield && !(cow as any).milk_capacity) {
      return {
        status: 'unknown',
        isEligible: false,
        reason: 'Cow production status and capacity are unknown / unverified.',
      };
    }

    // 4. Eligible lactating animal
    return {
      status: 'eligible',
      isEligible: true,
    };
  }

  /**
   * Calculate expected yield for an individual cow and specific batch (morning / evening).
   * 
   * Priority:
   * 1. Reliable individual cow historical records for this batch
   * 2. Registered cow daily yield / capacity partitioned by batch ratio
   * 3. Breed-wise documented dataset adjusted for lactation stage
   * 4. Provisional baseline
   * 5. Unavailable / Insufficient data
   */
  public static calculateExpectedBatchYield(
    cow: Cow,
    batch: MonitoringBatch,
    historicalRecords: MilkRecord[] = [],
    yieldDataset = BreedYieldDatasetAdapter
  ): CowBatchYieldEstimate {
    const timestamp = new Date().toISOString();
    const eligibility = this.determineEligibility(cow);

    // If cow is not eligible (dry, under withdrawal hold, etc.), expected yield is 0 L
    if (!eligibility.isEligible) {
      return {
        cowId: cow.id || cow.cowId || cow.tagId,
        tagId: cow.tagId,
        name: cow.name || cow.breed,
        breed: cow.breed,
        batch,
        expectedLitres: 0,
        dataSource: 'unavailable',
        baselinePeriod: 'none',
        eligibilityStatus: eligibility.status,
        reliabilityCategory: 'high',
        calculationTimestamp: timestamp,
        unavailabilityReason: eligibility.reason,
      };
    }

    // Priority 1: Individual cow verified history for the corresponding batch
    // Filter records for this cow (or farmer where only this cow exists) for the specific session
    const cowBatchRecords = historicalRecords.filter(
      r => r.session === batch && r.quantityLitres > 0 && r.status !== 'corrected'
    );

    if (cowBatchRecords.length >= 3) {
      // Calculate median or recent trimmed average of last 5 records
      const recent = cowBatchRecords.slice(0, 7);
      const sum = recent.reduce((acc, curr) => acc + curr.quantityLitres, 0);
      const avg = Number((sum / recent.length).toFixed(2));

      return {
        cowId: cow.id || cow.cowId || cow.tagId,
        tagId: cow.tagId,
        name: cow.name || cow.breed,
        breed: cow.breed,
        batch,
        expectedLitres: avg,
        dataSource: 'cow_batch_history',
        baselinePeriod: `Last ${recent.length} verified ${batch} records`,
        eligibilityStatus: 'eligible',
        reliabilityCategory: 'high',
        calculationTimestamp: timestamp,
        notes: `Computed from ${recent.length} recent ${batch} recordings.`,
      };
    }

    // Priority 2: Registered dailyMilkYield or milk_capacity
    const registeredDaily = Number(cow.dailyMilkYield || (cow as any).milk_capacity || 0);
    if (registeredDaily > 0) {
      // Documented tropical dairy session split: Morning ~55%, Evening ~45%
      const batchRatio = batch === 'morning' ? 0.55 : 0.45;
      const expectedLitres = Number((registeredDaily * batchRatio).toFixed(2));

      return {
        cowId: cow.id || cow.cowId || cow.tagId,
        tagId: cow.tagId,
        name: cow.name || cow.breed,
        breed: cow.breed,
        batch,
        expectedLitres,
        dataSource: 'cow_daily_derived',
        baselinePeriod: 'Registered cow daily capacity',
        eligibilityStatus: 'eligible',
        reliabilityCategory: 'medium',
        calculationTimestamp: timestamp,
        notes: `Derived from registered daily yield (${registeredDaily} L) at ${(batchRatio * 100).toFixed(0)}% ${batch} split.`,
      };
    }

    // Priority 3: Breed-wise dataset adjusted for lactation stage
    if (cow.breed) {
      const breedEstimate = yieldDataset.estimateFromBreed(
        cow.breed,
        batch,
        cow.lactationStage
      );

      if (breedEstimate.expectedLitres > 0) {
        return {
          cowId: cow.id || cow.cowId || cow.tagId,
          tagId: cow.tagId,
          name: cow.name || cow.breed,
          breed: cow.breed,
          batch,
          expectedLitres: breedEstimate.expectedLitres,
          dataSource: 'breed_dataset',
          baselinePeriod: `${BreedYieldDatasetAdapter.DATASET_VERSION} breed standard`,
          eligibilityStatus: 'eligible',
          reliabilityCategory: 'provisional',
          calculationTimestamp: timestamp,
          notes: `Estimated using breed standard (${breedEstimate.dailyBaseline} L/day baseline, stage factor: ${breedEstimate.stageFactor}).`,
        };
      }
    }

    // Priority 4 & 5: Insufficient data to calculate expected yield
    return {
      cowId: cow.id || cow.cowId || cow.tagId,
      tagId: cow.tagId,
      name: cow.name || cow.breed,
      breed: cow.breed,
      batch,
      expectedLitres: 0,
      dataSource: 'unavailable',
      baselinePeriod: 'none',
      eligibilityStatus: 'unknown',
      reliabilityCategory: 'insufficient',
      calculationTimestamp: timestamp,
      unavailabilityReason: 'Insufficient cow yield history, registered capacity, or breed specifications.',
    };
  }
}
