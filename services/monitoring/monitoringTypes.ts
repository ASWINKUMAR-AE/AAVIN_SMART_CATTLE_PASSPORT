import { Cow, Farmer, MilkRecord, UserRole } from '../../types/aavin';

export type MonitoringBatch = 'morning' | 'evening';

export type AlertSeverity =
  | 'normal'
  | 'warning'
  | 'critical'
  | 'persistent'
  | 'no_record'
  | 'insufficient_data'
  | 'supply_above_expected';

export type AlertStatus =
  | 'active'
  | 'investigating'
  | 'escalated_to_union'
  | 'resolved'
  | 'dismissed';

export type CattleEligibilityStatus =
  | 'eligible'
  | 'dry_or_non_lactating'
  | 'quarantine_or_withdrawal'
  | 'unknown';

export type YieldDataSource =
  | 'cow_batch_history'
  | 'cow_daily_derived'
  | 'breed_dataset'
  | 'provisional_baseline'
  | 'unavailable';

export type YieldReliabilityCategory =
  | 'high'
  | 'medium'
  | 'provisional'
  | 'insufficient';

export interface CowBatchYieldEstimate {
  cowId: string;
  tagId: string;
  name: string;
  breed: string;
  batch: MonitoringBatch;
  expectedLitres: number;
  dataSource: YieldDataSource;
  baselinePeriod: string;
  eligibilityStatus: CattleEligibilityStatus;
  reliabilityCategory: YieldReliabilityCategory;
  calculationTimestamp: string;
  unavailabilityReason?: string;
  notes?: string;
}

export interface FarmerBatchMonitoringResult {
  farmerId: string;
  farmerIdCode: string;
  farmerName: string;
  societyId: string;
  collectionDate: string; // YYYY-MM-DD
  batch: MonitoringBatch;
  
  // Cow count breakdown
  declaredCows: number;
  registeredCows: number;
  verifiedCows: number;
  eligibleCows: number;
  dryCows: number;
  quarantineCows: number;
  unknownCows: number;

  // Milk volume and shortfall calculation
  expectedBatchLitres: number;
  actualBatchLitres: number;
  batchGapLitres: number;
  batchGapPercentage: number | null; // null if expected <= 0

  hasRecord: boolean;
  measurementMethod: 'farmer_wise' | 'combined' | 'none';
  severity: AlertSeverity;
  cowEstimates: CowBatchYieldEstimate[];
  calculationTimestamp: string;
  dataQualityIssues: string[];
}

export interface FarmerDailyMonitoringSummary {
  farmerId: string;
  farmerIdCode: string;
  farmerName: string;
  societyId: string;
  collectionDate: string;
  morning: FarmerBatchMonitoringResult;
  evening: FarmerBatchMonitoringResult;
  dailyExpectedLitres: number;
  dailyActualLitres: number;
  dailyGapLitres: number;
  dailyGapPercentage: number | null;
  overallSeverity: AlertSeverity;
}

export interface MonitoringAlertAuditEntry {
  timestamp: string;
  action: string;
  actor: string;
  details: string;
}

export interface MilkMonitoringAlert {
  id: string; // Idempotency key: ALERT-{societyId}-{farmerId}-{date}-{batch}
  societyId: string;
  societyName: string;
  farmerId: string;
  farmerIdCode: string;
  farmerName: string;
  collectionDate: string;
  batch: MonitoringBatch;
  severity: AlertSeverity;
  status: AlertStatus;

  expectedLitres: number;
  actualLitres: number;
  gapLitres: number;
  gapPercentage: number | null;

  eligibleCowsCount: number;
  registeredCowsCount: number;
  declaredCowsCount: number;

  isEscalatedToUnion: boolean;
  escalatedAt?: string;

  // Society review
  reviewReason?: string;
  reviewNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;

  // Union review
  unionReviewNotes?: string;
  unionReviewedBy?: string;
  unionReviewedAt?: string;

  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNotes?: string;

  createdAt: string;
  updatedAt: string;
  auditTrail: MonitoringAlertAuditEntry[];
}

export interface MilkMonitoringConfig {
  enabled: boolean;
  warningThresholdPercent: number; // e.g. 25
  criticalThresholdPercent: number; // e.g. 50
  persistentShortfallDays: number; // e.g. 2
  minExpectedLitresForAlert: number; // e.g. 1.0
  minAbsoluteGapLitres: number; // e.g. 0.5
  morningCutoffTime: string; // HH:mm, e.g. "10:00"
  morningGracePeriodMinutes: number; // e.g. 30
  eveningCutoffTime: string; // HH:mm, e.g. "19:00"
  eveningGracePeriodMinutes: number; // e.g. 30
  autoEscalateCritical: boolean;
  autoEscalatePersistent: boolean;
}

export const DEFAULT_MONITORING_CONFIG: MilkMonitoringConfig = {
  enabled: true,
  warningThresholdPercent: 25,
  criticalThresholdPercent: 50,
  persistentShortfallDays: 2,
  minExpectedLitresForAlert: 1.0,
  minAbsoluteGapLitres: 0.5,
  morningCutoffTime: '10:00',
  morningGracePeriodMinutes: 30,
  eveningCutoffTime: '19:00',
  eveningGracePeriodMinutes: 30,
  autoEscalateCritical: true,
  autoEscalatePersistent: true,
};
