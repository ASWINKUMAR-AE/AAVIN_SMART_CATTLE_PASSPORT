import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text as NativeText,
  type TextProps,
  Pressable,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { useAavinStore } from '../../store/AavinStoreContext';
import { indiaDate } from '../../services/milkCollectionsApi';
import {
  FarmerBatchMonitoringResult,
  MilkMonitoringAlert,
} from '../../services/monitoring/monitoringTypes';
import { FarmerMonitoringDetailModal } from './FarmerMonitoringDetailModal';

interface SocietyMonitoringSectionProps {
  societyId: string;
  societyName: string;
}

// Keep Android's extra font padding from shifting labels relative to icons and values.
const Text = ({ style, ...props }: TextProps) => (
  <NativeText {...props} style={[styles.textBase, style]} />
);

export const SocietyMonitoringSection: React.FC<SocietyMonitoringSectionProps> = ({
  societyId,
  societyName,
}) => {
  const { colors } = useTheme();
  const { width, fontScale } = useWindowDimensions();
  const [sectionWidth, setSectionWidth] = useState<number | null>(null);
  // Measure the card, since a tablet may show it inside a narrow dashboard column.
  const readableWidth = Math.max(0, (sectionWidth ?? width - 32) - 34) / fontScale;
  const compact = readableWidth < 600;
  const narrow = readableWidth < 260;
  const {
    getSocietyMonitoringSummary,
    runBatchMonitoring,
    reviewMonitoringAlert,
    resolveMonitoringAlert,
    escalateMonitoringAlert,
  } = useAavinStore();

  const [selectedTab, setSelectedTab] = useState<'morning' | 'evening' | 'daily'>('morning');
  const [selectedDate] = useState<string>(indiaDate());
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
    <View
      testID="society-milk-monitoring"
      onLayout={event => setSectionWidth(event.nativeEvent.layout.width)}
      style={[styles.sectionContainer, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      {/* Section Header */}
      <View style={[styles.headerRow, compact && styles.headerStack]}>
        <View style={[styles.headerCopy, compact && styles.headerCopyCompact]}>
          <Text style={[Typography.footnote, styles.eyebrow, { color: colors.primary }]}>
            Morning & Evening
          </Text>
          <Text accessibilityRole="header" style={[Typography.title3, styles.title, { color: colors.text }]}>
            Milk Monitoring
          </Text>
          <Text style={[Typography.footnote, styles.subtitle, { color: colors.textSecondary }]}>
            Cow-wise yield baselines • Dual-batch shortfall checks • Society escalation
          </Text>
        </View>

        <Pressable
          onPress={handleEvaluateCutoff}
          disabled={isEvaluating}
          accessibilityRole="button"
          accessibilityLabel="Recalculate milk monitoring"
          accessibilityState={{ disabled: isEvaluating, busy: isEvaluating }}
          style={[styles.recalcBtn, compact && styles.recalcBtnCompact, { backgroundColor: colors.primary }]}
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

      {/* Full-width rows keep every label and value on the same alignment rails. */}
      <View style={[styles.overviewPanel, { backgroundColor: colors.background, borderColor: colors.border }]}>
        {[
          { label: 'Total Expected', value: totalExpected.toFixed(1) + ' L', color: colors.primary },
          { label: 'Total Verified', value: totalActual.toFixed(1) + ' L', color: colors.text },
          { label: 'Active Alerts', value: String(activeAlertsCount), color: activeAlertsCount > 0 ? '#EF4444' : '#10B981' },
        ].map((metric, index) => (
          <View key={metric.label} testID="monitoring-metric-row" style={[
            styles.metricRow, narrow && styles.metricRowStack,
            index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
          ]}>
            <Text style={[Typography.footnote, styles.metricLabel, narrow && styles.metricLabelStack, { color: colors.textSecondary }]}>{metric.label}</Text>
            <Text style={[Typography.title3, styles.metricValue, narrow && styles.metricValueStack, { color: metric.color }]}>
              {metric.value}
            </Text>
          </View>
        ))}

      </View>

      {/* Each tab owns its full label, including when text is enlarged. */}
      <View accessibilityRole="tablist" style={[styles.tabsRow, narrow && styles.tabsStack]}>
        {([
          { key: 'morning', label: 'Morning', icon: 'sunny-outline' },
          { key: 'evening', label: 'Evening', icon: 'moon-outline' },
          { key: 'daily', label: 'Daily', icon: 'calendar-outline' },
        ] as const).map(tab => {
          const selected = selectedTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected }}
              onPress={() => setSelectedTab(tab.key)}
              style={[
                styles.tabBtn,
                narrow && styles.tabBtnStack,
                { borderColor: selected ? colors.primary : colors.border,
                  backgroundColor: selected ? colors.background : 'transparent' },
              ]}
            >
              <View style={styles.tabIcon}>
                <Ionicons name={tab.icon} size={18} color={selected ? colors.primary : colors.textSecondary} />
              </View>
              <View style={[styles.tabCopy, narrow && styles.tabCopyStack]}>
                <Text style={[Typography.footnote, styles.tabLabel, narrow && styles.tabLabelStack,
                  { color: selected ? colors.primary : colors.textSecondary }]}>
                  {tab.label}
                </Text>

              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Batch Specific List or Daily Summary */}
      {selectedTab !== 'daily' ? (
        <View style={styles.tableWrapper}>
          {activeBatchResults.length === 0 ? (
            <Text style={[Typography.caption1, styles.emptyText, { color: colors.textSecondary }]}>
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
                <View style={[styles.farmerCardMain, compact && styles.farmerCardMainCompact]}>
                  <View style={[styles.farmerInfo, compact && styles.farmerInfoCompact]}>
                    <View style={styles.farmerNameRow}>
                      <Text style={[Typography.subhead, styles.farmerName, { color: colors.text, fontWeight: '800' }]}>
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

                  <View style={[styles.quantityBox, compact && styles.quantityBoxCompact]}>
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
            <Text style={[Typography.caption1, styles.emptyText, { color: colors.textSecondary }]}>
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
                  <Text style={[Typography.subhead, styles.farmerName, { color: colors.text, fontWeight: '800' }]}>
                    {daily.farmerName} ({daily.farmerIdCode})
                  </Text>
                  {getStatusBadge(daily.overallSeverity)}
                </View>

                <View style={[styles.dailyBreakdownRow, compact && styles.dailyBreakdownStack]}>
                  <View style={[styles.dailyCol, compact && styles.dailyColCompact]}>
                    <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Morning</Text>
                    <Text style={[Typography.caption1, { color: colors.text, fontWeight: '700' }]}>
                      {daily.morning.actualBatchLitres} / {daily.morning.expectedBatchLitres} L
                    </Text>
                  </View>
                  <View style={[styles.dailyCol, compact && styles.dailyColCompact]}>
                    <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Evening</Text>
                    <Text style={[Typography.caption1, { color: colors.text, fontWeight: '700' }]}>
                      {daily.evening.actualBatchLitres} / {daily.evening.expectedBatchLitres} L
                    </Text>
                  </View>
                  <View style={[styles.dailyCol, compact && styles.dailyColCompact]}>
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
    borderRadius: 20, borderWidth: 1, padding: 16, marginVertical: 12,
  },
  headerRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 16, marginBottom: 16,
  },
  headerStack: { flexDirection: 'column', alignItems: 'stretch' },
  headerCopy: { flex: 1, minWidth: 0 },
  headerCopyCompact: { flex: 0 },
  textBase: { includeFontPadding: false, textAlign: 'left' },
  eyebrow: { fontWeight: '700', marginBottom: 4 },
  title: { fontWeight: '700', fontSize: 22, lineHeight: 28 },
  subtitle: { marginTop: 8 },
  recalcBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    minHeight: 44, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10,
    flexShrink: 0,
  },
  recalcBtnCompact: { alignSelf: 'stretch' },
  recalcBtnText: {
    color: '#FFF', fontSize: 13, lineHeight: 18, fontWeight: '800',
    flexShrink: 1, textAlign: 'center',
  },
  overviewPanel: { borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, marginBottom: 16 },
  metricRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  metricRowStack: { flexDirection: 'column', alignItems: 'stretch', gap: 6 },
  metricLabel: { flex: 1, flexShrink: 1, minWidth: 0 },
  metricLabelStack: { flex: 0 },
  metricValue: { flexShrink: 1, textAlign: 'right', fontWeight: '700', fontVariant: ['tabular-nums'] },
  metricValueStack: { textAlign: 'left' },
  tabsRow: { flexDirection: 'row', gap: 8, marginBottom: 16, alignItems: 'stretch' },
  tabsStack: { flexDirection: 'column' },
  tabBtn: {
    flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'flex-start',
    paddingVertical: 12, paddingHorizontal: 4, gap: 8, borderWidth: 1, borderRadius: 10,
  },
  tabBtnStack: { flexDirection: 'row', flex: 0, alignItems: 'center', minHeight: 48, paddingHorizontal: 14 },
  tabIcon: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  tabCopy: { alignSelf: 'stretch', alignItems: 'stretch', gap: 3 },
  tabCopyStack: { flex: 1, alignSelf: 'auto' },
  tabLabel: { textAlign: 'center', fontWeight: '700' },
  tabLabelStack: { textAlign: 'left' },
  tableWrapper: { gap: 8 },
  emptyText: { textAlign: 'center', paddingHorizontal: 8, paddingVertical: 20 },
  farmerCard: { borderRadius: 12, borderWidth: 1, padding: 12 },
  farmerCardMain: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  farmerCardMainCompact: { flexWrap: 'wrap' },
  farmerInfo: { flex: 1, minWidth: 0 },
  farmerInfoCompact: { flexBasis: '100%' },
  farmerNameRow: { flexDirection: 'row', alignItems: 'flex-start', flexWrap: 'wrap', gap: 6 },
  farmerName: { flexShrink: 1, minWidth: 0 },
  quantityBox: { alignItems: 'flex-end', flexShrink: 1, gap: 4 },
  quantityBoxCompact: { flex: 1, alignItems: 'flex-start' },
  statusBadge: {
    paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, maxWidth: '100%',
    alignSelf: 'flex-start',
  },
  statusBadgeText: { color: '#FFF', fontSize: 10, lineHeight: 14, fontWeight: '800' },
  dailyCard: { borderRadius: 12, borderWidth: 1, padding: 12 },
  dailyCardHeader: {
    flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: 8, marginBottom: 12,
  },
  dailyBreakdownRow: { flexDirection: 'row', gap: 12 },
  dailyBreakdownStack: { flexDirection: 'column' },
  dailyCol: { flex: 1, minWidth: 0, gap: 4 },
  dailyColCompact: { flex: 0 },
});
