import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { useAavinStore } from '../../store/AavinStoreContext';
import { MilkMonitoringAlert } from '../../services/monitoring/monitoringTypes';

interface UnionMonitoringSectionProps {
  unionId?: string;
  unionName?: string;
}

export const UnionMonitoringSection: React.FC<UnionMonitoringSectionProps> = ({
  unionId,
  unionName = 'Aavin District Union',
}) => {
  const { colors } = useTheme();
  const { getUnionMonitoringAlerts, resolveMonitoringAlert } = useAavinStore();

  const [filterType, setFilterType] = useState<string>('all');
  const [selectedAlert, setSelectedAlert] = useState<MilkMonitoringAlert | null>(null);
  const [unionNote, setUnionNote] = useState<string>('');

  const { alerts, stats } = getUnionMonitoringAlerts(unionId);

  const filteredAlerts = alerts.filter(a => {
    if (filterType === 'all') return true;
    if (filterType === 'escalated') return a.isEscalatedToUnion && a.status !== 'resolved';
    if (filterType === 'critical') return a.severity === 'critical';
    if (filterType === 'persistent') return a.severity === 'persistent';
    if (filterType === 'no_record') return a.severity === 'no_record';
    if (filterType === 'awaiting_society') return a.status === 'active' && !a.reviewReason;
    return true;
  });

  const handleResolveAlert = (alert: MilkMonitoringAlert) => {
    Alert.alert(
      'Resolve Case',
      `Mark milk supply alert for ${alert.farmerName} as resolved by Union?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Resolve',
          onPress: () => {
            resolveMonitoringAlert(
              alert.id,
              unionNote.trim() || 'Reviewed & verified by Union field officer.',
              unionName
            );
            Alert.alert('Resolved', 'Alert marked as resolved.');
            setSelectedAlert(null);
            setUnionNote('');
          },
        },
      ]
    );
  };

  const getSeverityBadgeColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '#EF4444';
      case 'persistent':
        return '#9333EA';
      case 'warning':
        return '#F59E0B';
      case 'no_record':
        return '#DC2626';
      default:
        return '#6B7280';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="shield-checkmark" size={22} color={colors.primary} />
            <Text style={[Typography.title3, { color: colors.text, fontWeight: '800' }]}>
              Society Milk Supply Alerts
            </Text>
          </View>
          <Text style={[Typography.caption2, { color: colors.textSecondary, marginTop: 2 }]}>
            Monitoring shortfalls across member societies • Escalated cases & persistent gaps
          </Text>
        </View>
      </View>

      {/* KPI Cards Grid */}
      <View style={styles.kpiGrid}>
        <Pressable
          onPress={() => setFilterType('all')}
          style={[
            styles.kpiCard,
            { backgroundColor: colors.background, borderColor: filterType === 'all' ? colors.primary : colors.border },
          ]}
        >
          <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Total Alerts</Text>
          <Text style={[Typography.title2, { color: colors.text, fontWeight: '800' }]}>{stats.totalAlerts}</Text>
        </Pressable>

        <Pressable
          onPress={() => setFilterType('escalated')}
          style={[
            styles.kpiCard,
            { backgroundColor: '#FAF5FF', borderColor: filterType === 'escalated' ? '#9333EA' : '#E9D5FF' },
          ]}
        >
          <Text style={[Typography.caption2, { color: '#7E22CE' }]}>Escalated to Union</Text>
          <Text style={[Typography.title2, { color: '#9333EA', fontWeight: '800' }]}>{stats.escalatedToUnion}</Text>
        </Pressable>

        <Pressable
          onPress={() => setFilterType('critical')}
          style={[
            styles.kpiCard,
            { backgroundColor: '#FEF2F2', borderColor: filterType === 'critical' ? '#EF4444' : '#FECACA' },
          ]}
        >
          <Text style={[Typography.caption2, { color: '#B91C1C' }]}>Critical (≥50%)</Text>
          <Text style={[Typography.title2, { color: '#EF4444', fontWeight: '800' }]}>{stats.criticalAlerts}</Text>
        </Pressable>

        <Pressable
          onPress={() => setFilterType('persistent')}
          style={[
            styles.kpiCard,
            { backgroundColor: '#FDF4FF', borderColor: filterType === 'persistent' ? '#C026D3' : '#F5D0FE' },
          ]}
        >
          <Text style={[Typography.caption2, { color: '#A21CAF' }]}>Persistent (2+ d)</Text>
          <Text style={[Typography.title2, { color: '#C026D3', fontWeight: '800' }]}>{stats.persistentShortfalls}</Text>
        </Pressable>
      </View>

      {/* Secondary Metrics Summary */}
      <View style={[styles.subMetricsRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <View style={styles.subMetric}>
          <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Morning Warnings</Text>
          <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700' }]}>{stats.morningWarnings}</Text>
        </View>
        <View style={styles.vDivider} />
        <View style={styles.subMetric}>
          <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Evening Warnings</Text>
          <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700' }]}>{stats.eveningWarnings}</Text>
        </View>
        <View style={styles.vDivider} />
        <View style={styles.subMetric}>
          <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Missing Records</Text>
          <Text style={[Typography.subhead, { color: '#DC2626', fontWeight: '700' }]}>{stats.missingRecords}</Text>
        </View>
        <View style={styles.vDivider} />
        <View style={styles.subMetric}>
          <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Awaiting Society Review</Text>
          <Text style={[Typography.subhead, { color: '#D97706', fontWeight: '700' }]}>{stats.awaitingSocietyReview}</Text>
        </View>
      </View>

      {/* Alerts Table */}
      <View style={styles.alertsList}>
        {filteredAlerts.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="checkmark-circle-outline" size={32} color="#10B981" />
            <Text style={[Typography.subhead, { color: colors.textSecondary, marginTop: 6 }]}>
              No alerts matching the selected filter.
            </Text>
          </View>
        ) : (
          filteredAlerts.map(alert => (
            <Pressable
              key={alert.id}
              onPress={() => setSelectedAlert(alert)}
              style={[
                styles.alertCard,
                { backgroundColor: colors.background, borderColor: colors.border },
              ]}
            >
              <View style={styles.alertCardHeader}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]}>
                      {alert.farmerName}
                    </Text>
                    <View
                      style={[
                        styles.badge,
                        { backgroundColor: getSeverityBadgeColor(alert.severity) },
                      ]}
                    >
                      <Text style={styles.badgeText}>{alert.severity.toUpperCase()}</Text>
                    </View>
                    {alert.isEscalatedToUnion && (
                      <View style={[styles.badge, { backgroundColor: '#7C3AED' }]}>
                        <Text style={styles.badgeText}>ESCALATED</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[Typography.caption2, { color: colors.textSecondary, marginTop: 2 }]}>
                    {alert.societyName} • Date: {alert.collectionDate} • {alert.batch.toUpperCase()} BATCH
                  </Text>
                </View>

                <View style={styles.gapBox}>
                  <Text style={[Typography.caption1, { color: colors.primary, fontWeight: '800' }]}>
                    {alert.actualLitres} / {alert.expectedLitres} L
                  </Text>
                  {alert.gapLitres > 0 && (
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#EF4444' }}>
                      -{alert.gapLitres.toFixed(1)} L ({alert.gapPercentage}%)
                    </Text>
                  )}
                </View>

                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} style={{ marginLeft: 6 }} />
              </View>

              {alert.reviewReason && (
                <View style={styles.reviewSnippet}>
                  <Text style={[Typography.caption2, { color: '#B45309', fontWeight: '700' }]}>
                    Society Review: {alert.reviewReason}
                  </Text>
                  {alert.reviewNotes ? (
                    <Text style={[Typography.caption2, { color: colors.textSecondary }]} numberOfLines={1}>
                      "{alert.reviewNotes}"
                    </Text>
                  ) : null}
                </View>
              )}
            </Pressable>
          ))
        )}
      </View>

      {/* Union Case Review Modal */}
      {selectedAlert && (
        <View style={[styles.caseModalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.caseModalContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.caseHeader, { borderBottomColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[Typography.headline, { color: colors.text, fontWeight: '800' }]}>
                  Union Case Review: {selectedAlert.farmerName}
                </Text>
                <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                  {selectedAlert.societyName} • {selectedAlert.collectionDate} ({selectedAlert.batch.toUpperCase()})
                </Text>
              </View>
              <Pressable onPress={() => setSelectedAlert(null)}>
                <Ionicons name="close" size={22} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ padding: 14, gap: 10 }}>
              <View style={[styles.caseDetailRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <View style={styles.caseDetailCol}>
                  <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Expected Yield</Text>
                  <Text style={[Typography.title3, { color: colors.primary, fontWeight: '800' }]}>
                    {selectedAlert.expectedLitres} L
                  </Text>
                </View>
                <View style={styles.caseDetailCol}>
                  <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Actual Supplied</Text>
                  <Text style={[Typography.title3, { color: colors.text, fontWeight: '800' }]}>
                    {selectedAlert.actualLitres} L
                  </Text>
                </View>
                <View style={styles.caseDetailCol}>
                  <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Shortfall</Text>
                  <Text style={[Typography.title3, { color: '#EF4444', fontWeight: '800' }]}>
                    -{selectedAlert.gapLitres} L ({selectedAlert.gapPercentage}%)
                  </Text>
                </View>
              </View>

              {selectedAlert.reviewReason ? (
                <View style={styles.societyReviewCard}>
                  <Text style={[Typography.caption1, { color: '#92400E', fontWeight: '800' }]}>
                    Society Review Outcome:
                  </Text>
                  <Text style={[Typography.caption1, { color: colors.text, fontWeight: '700', marginTop: 2 }]}>
                    {selectedAlert.reviewReason}
                  </Text>
                  <Text style={[Typography.caption2, { color: colors.textSecondary, marginTop: 2 }]}>
                    "{selectedAlert.reviewNotes}"
                  </Text>
                  <Text style={[Typography.caption2, { color: colors.textMuted, marginTop: 4 }]}>
                    By {selectedAlert.reviewedBy} at {selectedAlert.reviewedAt?.slice(0, 16)}
                  </Text>
                </View>
              ) : (
                <Text style={[Typography.caption2, { color: '#D97706' }]}>
                  • Society has not yet completed on-ground investigation for this alert.
                </Text>
              )}

              {/* Union Actions */}
              <Text style={[Typography.caption1, { color: colors.text, fontWeight: '700', marginTop: 6 }]}>
                Union Review Notes / Decision:
              </Text>
              <TextInput
                value={unionNote}
                onChangeText={setUnionNote}
                placeholder="Enter Union decision, field verification memo, or corrective order..."
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={3}
                style={[
                  styles.unionNotesInput,
                  { color: colors.text, borderColor: colors.border, backgroundColor: colors.background },
                ]}
              />

              <View style={styles.modalActionRow}>
                <Pressable
                  onPress={() => handleResolveAlert(selectedAlert)}
                  style={[styles.resolveCaseBtn, { backgroundColor: '#10B981' }]}
                >
                  <Ionicons name="checkmark-done" size={16} color="#FFF" />
                  <Text style={styles.btnText}>Mark Case Resolved</Text>
                </Pressable>

                <Pressable
                  onPress={() => setSelectedAlert(null)}
                  style={[styles.closeCaseBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                >
                  <Text style={[styles.btnText, { color: colors.text }]}>Close</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginVertical: 12,
  },
  headerRow: {
    marginBottom: 12,
  },
  kpiGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  kpiCard: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  subMetricsRow: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  subMetric: {
    alignItems: 'center',
    flex: 1,
  },
  vDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },
  alertsList: {
    gap: 8,
  },
  emptyBox: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  alertCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gapBox: {
    alignItems: 'flex-end',
    minWidth: 85,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '800',
  },
  reviewSnippet: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
  },
  caseModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    padding: 16,
    zIndex: 999,
  },
  caseModalContainer: {
    borderRadius: 16,
    borderWidth: 1,
    maxHeight: '85%',
    overflow: 'hidden',
  },
  caseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
  },
  caseDetailRow: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    justifyContent: 'space-between',
  },
  caseDetailCol: {
    alignItems: 'center',
    flex: 1,
  },
  societyReviewCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  unionNotesInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    minHeight: 50,
    textAlignVertical: 'top',
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  resolveCaseBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  closeCaseBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
  },
  btnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },
});
