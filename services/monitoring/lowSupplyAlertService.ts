import { InAppNotification, UserRole } from '../../types/aavin';
import {
  AlertSeverity,
  AlertStatus,
  DEFAULT_MONITORING_CONFIG,
  FarmerBatchMonitoringResult,
  MilkMonitoringAlert,
  MilkMonitoringConfig,
} from './monitoringTypes';

export class LowSupplyAlertService {
  /**
   * Generate a deterministic idempotency key for an alert.
   */
  public static generateAlertId(
    societyId: string,
    farmerId: string,
    collectionDate: string,
    batch: string
  ): string {
    return `ALERT-${societyId}-${farmerId}-${collectionDate}-${batch.toLowerCase()}`;
  }

  /**
   * Process a batch monitoring result and generate or update the corresponding alert.
   */
  public static processBatchAlert(
    result: FarmerBatchMonitoringResult,
    societyName: string,
    existingAlerts: MilkMonitoringAlert[],
    historicalAlerts: MilkMonitoringAlert[] = [],
    config: MilkMonitoringConfig = DEFAULT_MONITORING_CONFIG,
    now: Date = new Date()
  ): {
    updatedAlerts: MilkMonitoringAlert[];
    newNotifications: InAppNotification[];
  } {
    const alertId = this.generateAlertId(
      result.societyId,
      result.farmerId,
      result.collectionDate,
      result.batch
    );
    const timestamp = now.toISOString();
    const newNotifications: InAppNotification[] = [];

    // Find if an alert already exists for this exact batch & farmer
    const existingIndex = existingAlerts.findIndex(a => a.id === alertId);
    const existing = existingIndex >= 0 ? existingAlerts[existingIndex] : null;

    // Check for persistent low supply across consecutive days
    let isPersistent = false;
    if (result.severity === 'warning' || result.severity === 'critical') {
      const priorShortfalls = historicalAlerts.filter(
        a => a.farmerId === result.farmerId &&
             a.collectionDate !== result.collectionDate &&
             (a.severity === 'warning' || a.severity === 'critical' || a.severity === 'persistent')
      );
      if (priorShortfalls.length >= config.persistentShortfallDays - 1) {
        isPersistent = true;
      }
    }

    const finalSeverity: AlertSeverity = isPersistent ? 'persistent' : result.severity;

    // Determine if an alert is actionable (warning, critical, persistent, no_record)
    const isActionable =
      finalSeverity === 'warning' ||
      finalSeverity === 'critical' ||
      finalSeverity === 'persistent' ||
      finalSeverity === 'no_record';

    if (!isActionable) {
      // If result is normal or resolved and an open alert previously existed, resolve it
      if (existing && existing.status !== 'resolved' && existing.status !== 'dismissed') {
        const resolved: MilkMonitoringAlert = {
          ...existing,
          status: 'resolved',
          resolvedAt: timestamp,
          resolvedBy: 'System Recalculation',
          resolutionNotes: `Auto-resolved: supply is now ${result.actualBatchLitres} L (expected: ${result.expectedBatchLitres} L).`,
          updatedAt: timestamp,
          auditTrail: [
            ...existing.auditTrail,
            {
              timestamp,
              action: 'AUTO_RESOLVED',
              actor: 'System',
              details: `Actual supply reached ${result.actualBatchLitres} L against expected ${result.expectedBatchLitres} L.`,
            },
          ],
        };
        const updated = [...existingAlerts];
        updated[existingIndex] = resolved;
        return { updatedAlerts: updated, newNotifications: [] };
      }
      return { updatedAlerts: existingAlerts, newNotifications: [] };
    }

    // Determine escalation status
    const shouldEscalate =
      (finalSeverity === 'critical' && config.autoEscalateCritical) ||
      (finalSeverity === 'persistent' && config.autoEscalatePersistent);

    let alertRecord: MilkMonitoringAlert;

    if (existing) {
      // Idempotently update existing unresolved alert
      const statusChanged = existing.severity !== finalSeverity;
      alertRecord = {
        ...existing,
        severity: finalSeverity,
        expectedLitres: result.expectedBatchLitres,
        actualLitres: result.actualBatchLitres,
        gapLitres: result.batchGapLitres,
        gapPercentage: result.batchGapPercentage,
        eligibleCowsCount: result.eligibleCows,
        registeredCowsCount: result.registeredCows,
        declaredCowsCount: result.declaredCows,
        isEscalatedToUnion: existing.isEscalatedToUnion || shouldEscalate,
        escalatedAt: existing.isEscalatedToUnion ? existing.escalatedAt : shouldEscalate ? timestamp : undefined,
        updatedAt: timestamp,
        auditTrail: statusChanged
          ? [
              ...existing.auditTrail,
              {
                timestamp,
                action: 'SEVERITY_UPDATED',
                actor: 'System',
                details: `Severity recalculated from ${existing.severity} to ${finalSeverity}. Gap: ${result.batchGapLitres} L (${result.batchGapPercentage}%).`,
              },
            ]
          : existing.auditTrail,
      };
    } else {
      // Create new alert
      alertRecord = {
        id: alertId,
        societyId: result.societyId,
        societyName,
        farmerId: result.farmerId,
        farmerIdCode: result.farmerIdCode,
        farmerName: result.farmerName,
        collectionDate: result.collectionDate,
        batch: result.batch,
        severity: finalSeverity,
        status: shouldEscalate ? 'escalated_to_union' : 'active',
        expectedLitres: result.expectedBatchLitres,
        actualLitres: result.actualBatchLitres,
        gapLitres: result.batchGapLitres,
        gapPercentage: result.batchGapPercentage,
        eligibleCowsCount: result.eligibleCows,
        registeredCowsCount: result.registeredCows,
        declaredCowsCount: result.declaredCows,
        isEscalatedToUnion: shouldEscalate,
        escalatedAt: shouldEscalate ? timestamp : undefined,
        createdAt: timestamp,
        updatedAt: timestamp,
        auditTrail: [
          {
            timestamp,
            action: 'CREATED',
            actor: 'Batch Monitoring Service',
            details: `Alert created: ${finalSeverity.toUpperCase()}. Expected: ${result.expectedBatchLitres} L, Actual: ${result.actualBatchLitres} L, Gap: ${result.batchGapLitres} L (${result.batchGapPercentage}%).`,
          },
        ],
      };

      // Create notification for Society
      newNotifications.push({
        id: `NOTIF-${alertId}-SOC`,
        recipientRole: 'booth',
        recipientId: result.societyId,
        title: finalSeverity === 'no_record'
          ? `Missing ${result.batch.toUpperCase()} Milk Record: ${result.farmerName}`
          : `Low Supply Alert (${finalSeverity.toUpperCase()}): ${result.farmerName}`,
        message: finalSeverity === 'no_record'
          ? `No collection record arrived after cutoff for ${result.farmerName} (${result.farmerIdCode}) on ${result.collectionDate} (${result.batch}). Expected: ${result.expectedBatchLitres} L.`
          : `${result.batch.toUpperCase()} supply shortfall: Supplied ${result.actualBatchLitres} L vs ${result.expectedBatchLitres} L expected (-${result.batchGapPercentage}%).`,
        type: 'discrepancy_alert',
        timestamp,
        isRead: false,
        referenceId: alertId,
        linkRoute: '/(booth)',
      });

      // If escalated, create notification for Union
      if (shouldEscalate) {
        newNotifications.push({
          id: `NOTIF-${alertId}-UNION`,
          recipientRole: 'union',
          title: `Escalated Milk Shortfall: ${result.farmerName} (${societyName})`,
          message: `${finalSeverity.toUpperCase()} shortfall on ${result.collectionDate} (${result.batch}): ${result.actualBatchLitres} L actual vs ${result.expectedBatchLitres} L expected (${result.batchGapLitres} L gap).`,
          type: 'union_escalation',
          timestamp,
          isRead: false,
          referenceId: alertId,
          linkRoute: '/(union)',
        });
      }
    }

    const updatedAlerts = [...existingAlerts];
    if (existingIndex >= 0) {
      updatedAlerts[existingIndex] = alertRecord;
    } else {
      updatedAlerts.push(alertRecord);
    }

    return { updatedAlerts, newNotifications };
  }
}
