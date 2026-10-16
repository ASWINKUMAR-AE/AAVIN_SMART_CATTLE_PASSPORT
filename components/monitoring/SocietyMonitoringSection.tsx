import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { useAavinStore } from '../../store/AavinStoreContext';
import { indiaDate } from '../../services/milkCollectionsApi';
import {
  FarmerBatchMonitoringResult,
  FarmerDailyMonitoringSummary,
  MonitoringBatch,
  MilkMonitoringAlert,
} from '../../services/monitoring/monitoringTypes';
import { FarmerMonitoringDetailModal } from './FarmerMonitoringDetailModal';

interface SocietyMonitoringSectionProps {
  societyId: string;
  societyName: string;
}

export const SocietyMonitoringSection: React.FC<SocietyMonitoringSectionProps> = ({
  societyId,
  societyName,
}) => {
  const { colors } = useTheme();
  const {
    getSocietyMonitoringSummary,
    runBatchMonitoring,
    reviewMonitoringAlert,
    resolveMonitoringAlert,
    escalateMonitoringAlert,
    monitoringConfig,
  } = useAavinStore();

  const [selectedTab, setSelectedTab] = useState<'morning' | 'evening' | 'daily'>('morning');
  const [selectedDate, setSelectedDate] = useState<string>(indiaDate());
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [detailResult, setDetailResult] = useState<FarmerBatchMonitoringResult | null>(null);
  const [activeAlert, setActiveAlert] = useState<MilkMonitoringAlert | null>(null);

  // Load calculated summaries
  const summary = useMemo(() => {
    return getSocietyMonitoringSummary(societyId, selectedDate);
  }, [getSocietyMonitoringSummary, societyId, selectedDate]);

  const handleEvaluateCutoff = async () => {
    if (isEvaluating) return;
    setIsEvaluating(true);
    try {
      if (selectedTab === 'morning' || selectedTab === 'daily') {
        await runBatchMonitoring(societyId, 'morning', selectedDate);
      }
      if (selectedTab === 'evening' || selectedTab === 'daily') {
        await runBatchMonitoring(societyId, 'evening', selectedDate);
      }
    } finally {
      setIsEvaluating(false);
    }
  };

  const openDetails = (result: FarmerBatchMonitoringResult) => {
    setDetailResult(result);
    const alert = summary.alerts.find(
      a => a.farmerId === result.farmerId && a.batch === result.batch
    );
    setActiveAlert(alert || null);
  };

  const getStatusBadge = (severity: string) => {
    let bg = '#10B981';
    let text = 'NORMAL';
    if (severity === 'critical') {
      bg = '#EF4444';
      text = 'CRITICAL';
    } else if (severity === 'persistent') {
      bg = '#7C3AED';
      text = 'PERSISTENT';
    } else if (severity === 'warning') {
      bg = '#F59E0B';
      text = 'WARNING';
    } else if (severity === 'no_record') {
      bg = '#DC2626';
      text = 'NO RECORD';
    } else if (severity === 'insufficient_data') {
      bg = '#6B7280';
      text = 'INSUFFICIENT';
    } else if (severity === 'supply_above_expected') {
      bg = '#3B82F6';
      text = 'SURPLUS';
    }

    return (
      <View style={[styles.statusBadge, { backgroundColor: bg }]}>
        <Text style={styles.statusBadgeText}>{text}</Text>
      </View>
    );
  };

  const activeBatchResults = selectedTab === 'morning' ? summary.morning : summary.evening;

  // Aggregate stats for quick cards
  const totalExpected = activeBatchResults.reduce((acc, r) => acc + r.expectedBatchLitres, 0);
  const totalActual = activeBatchResults.reduce((acc, r) => acc + r.actualBatchLitres, 0);
  const activeAlertsCount = summary.alerts.filter(a => a.status === 'active' || a.status === 'escalated_to_union').length;

  return (
    <View style={[styles.sectionContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Section Header */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="analytics" size={20} color={colors.primary} />
            <Text style={[Typography.title3, { color: colors.text, fontWeight: '800' }]}>
              Morning & Evening Milk Monitoring
            </Text>
          </View>
          <Text style={[Typography.caption2, { color: colors.textSecondary, marginTop: 2 }]}>
            Cow-wise yield baselines • Dual-batch shortfall checks • Society escalation
          </Text>
        </View>

        <Pressable
          onPress={handleEvaluateCutoff}
          disabled={isEvaluating}
          style={[styles.recalcBtn, { backgroundColor: colors.primary }]}
        >
          {isEvaluating ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Ionicons name="refresh" size={14} color="#FFF" />
              <Text style={styles.recalcBtnText}>Recalculate</Text>
            </>
          )}
        </Pressable>
      </View>

      {/* Overview Cards */}
      <View style={[styles.overviewRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <View style={styles.overviewCol}>
          <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Total Expected</Text>
          <Text style={[Typography.headline, { color: colors.primary, fontWeight: '800' }]}>
            {totalExpected.toFixed(1)} L
          </Text>
        </View>
        <View style={styles.vDivider} />
        <View style={styles.overviewCol}>
          <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Total Verified</Text>
          <Text style={[Typography.headline, { color: colors.text, fontWeight: '800' }]}>
            {totalActual.toFixed(1)} L
          </Text>
        </View>
        <View style={styles.vDivider} />
        <View style={styles.overviewCol}>
          <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Active Alerts</Text>
          <Text
            style={[
              Typography.headline,
              { color: activeAlertsCount > 0 ? '#EF4444' : '#10B981', fontWeight: '800' },
            ]}
          >
            {activeAlertsCount}
          </Text>
        </View>
        <View style={styles.vDivider} />
        <View style={styles.overviewCol}>
          <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Cutoff Schedule</Text>
          <Text style={[Typography.caption1, { color: colors.text, fontWeight: '700' }]}>
            M: {monitoringConfig.morningCutoffTime} | E: {monitoringConfig.eveningCutoffTime}
          </Text>
        </View>
      </View>

      {/* Tabs Row */}
      <View style={styles.tabsRow}>
        <Pressable
          onPress={() => setSelectedTab('morning')}
          style={[
            styles.tabBtn,
            selectedTab === 'morning' && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
          ]}
        >
          <Ionicons
            name="sunny-outline"
            size={16}
            color={selectedTab === 'morning' ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              Typography.subhead,
              {
                color: selectedTab === 'morning' ? colors.primary : colors.textSecondary,
                fontWeight: selectedTab === 'morning' ? '800' : '600',
              },
            ]}
          >
            Morning Batch
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setSelectedTab('evening')}
          style={[
            styles.tabBtn,
            selectedTab === 'evening' && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
          ]}
        >
          <Ionicons
            name="moon-outline"
            size={16}
            color={selectedTab === 'evening' ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              Typography.subhead,
              {
                color: selectedTab === 'evening' ? colors.primary : colors.textSecondary,
                fontWeight: selectedTab === 'evening' ? '800' : '600',
              },
            ]}
          >
            Evening Batch
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setSelectedTab('daily')}
          style={[
            styles.tabBtn,
            selectedTab === 'daily' && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
          ]}
        >
          <Ionicons
            name="calendar-outline"
            size={16}
            color={selectedTab === 'daily' ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              Typography.subhead,
              {
                color: selectedTab === 'daily' ? colors.primary : colors.textSecondary,
                fontWeight: selectedTab === 'daily' ? '800' : '600',
              },
            ]}
          >
            Daily Summary
          </Text>
        </Pressable>
      </View>

      {/* Batch Specific List or Daily Summary */}
      {selectedTab !== 'daily' ? (
        <View style={styles.tableWrapper}>
          {activeBatchResults.length === 0 ? (
            <Text style={[Typography.caption1, { color: colors.textSecondary, textAlign: 'center', padding: 16 }]}>
              No farmers assigned to this society yet.
            </Text>
          ) : (
            activeBatchResults.map(farmerResult => (
              <Pressable
                key={farmerResult.farmerId}
                onPress={() => openDetails(farmerResult)}
                style={[
                  styles.farmerCard,
                  { backgroundColor: colors.background, borderColor: colors.border },
                ]}
              >
                <View style={styles.farmerCardMain}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]}>
                        {farmerResult.farmerName}
                      </Text>
                      {getStatusBadge(farmerResult.severity)}
                    </View>
                    <Text style={[Typography.caption2, { color: colors.textSecondary, marginTop: 2 }]}>
                      {farmerResult.farmerIdCode} • Cows: {farmerResult.declaredCows} declared / {farmerResult.registeredCows} reg /{' '}
                      <Text style={{ color: '#16A34A', fontWeight: '700' }}>
                        {farmerResult.eligibleCows} eligible
                      </Text>
                    </Text>
                  </View>

                  <View style={styles.quantityBox}>
                    <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                      Exp: <Text style={{ fontWeight: '700', color: colors.text }}>{farmerResult.expectedBatchLitres.toFixed(1)}L</Text>
                    </Text>
                    <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                      Act: <Text style={{ fontWeight: '800', color: colors.primary }}>{farmerResult.actualBatchLitres.toFixed(1)}L</Text>
                    </Text>
                    {farmerResult.batchGapLitres > 0 && (
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#EF4444' }}>
                        -{farmerResult.batchGapLitres.toFixed(1)}L ({farmerResult.batchGapPercentage}%)
                      </Text>
                    )}
                  </View>

                  <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} style={{ marginLeft: 6 }} />
                </View>
              </Pressable>
            ))
          )}
        </View>
      ) : (
        /* Daily Summary View */
        <View style={styles.tableWrapper}>
          {summary.daily.length === 0 ? (
            <Text style={[Typography.caption1, { color: colors.textSecondary, textAlign: 'center', padding: 16 }]}>
              No daily data available.
            </Text>
          ) : (
            summary.daily.map(daily => (
              <View
                key={daily.farmerId}
                style={[
                  styles.dailyCard,
                  { backgroundColor: colors.background, borderColor: colors.border },
                ]}
              >
                <View style={styles.dailyCardHeader}>
                  <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]}>
                    {daily.farmerName} ({daily.farmerIdCode})
                  </Text>
                  {getStatusBadge(daily.overallSeverity)}
                </View>

                <View style={styles.dailyBreakdownRow}>
                  <View style={styles.dailyCol}>
                    <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Morning</Text>
                    <Text style={[Typography.caption1, { color: colors.text, fontWeight: '700' }]}>
                      {daily.morning.actualBatchLitres} / {daily.morning.expectedBatchLitres} L
                    </Text>
                  </View>
                  <View style={styles.vDivider} />
                  <View style={styles.dailyCol}>
                    <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Evening</Text>
                    <Text style={[Typography.caption1, { color: colors.text, fontWeight: '700' }]}>
                      {daily.evening.actualBatchLitres} / {daily.evening.expectedBatchLitres} L
                    </Text>
                  </View>
                  <View style={styles.vDivider} />
                  <View style={styles.dailyCol}>
                    <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Daily Combined</Text>
                    <Text style={[Typography.caption1, { color: colors.primary, fontWeight: '800' }]}>
                      {daily.dailyActualLitres} / {daily.dailyExpectedLitres} L
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      )}

      {/* Detail & Review Modal */}
      <FarmerMonitoringDetailModal
        visible={!!detailResult}
        onClose={() => setDetailResult(null)}
        result={detailResult}
        activeAlert={activeAlert}
        onRecordReview={(alertId, reason, notes) =>
          reviewMonitoringAlert(alertId, reason, notes, societyName)
        }
        onEscalate={(alertId, notes) =>
          escalateMonitoringAlert(alertId, notes, societyName)
        }
        onResolve={(alertId, notes) =>
          resolveMonitoringAlert(alertId, notes, societyName)
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  sectionContainer: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginVertical: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  recalcBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  recalcBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },
  overviewRow: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  overviewCol: {
    alignItems: 'center',
    flex: 1,
  },
  vDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E2E8F0',
  },
  tabsRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
    marginBottom: 10,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  tableWrapper: {
    gap: 8,
  },
  farmerCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  farmerCardMain: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityBox: {
    alignItems: 'flex-end',
    minWidth: 85,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '800',
  },
  dailyCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  dailyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dailyBreakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dailyCol: {
    alignItems: 'center',
    flex: 1,
  },
});
