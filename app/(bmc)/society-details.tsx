import React, { useState, useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, Platform, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAavinStore } from '../../store/AavinStoreContext';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { DemoHeader } from '../../components/DemoHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Ionicons } from '@expo/vector-icons';
import { SocietyIncomeRecord } from '../../types/aavin';

type PeriodFilter = 'today' | 'week' | 'month' | 'year' | 'all';

export default function SocietyDetailsScreen() {
  const router = useRouter();
  const { societyId } = useLocalSearchParams<{ societyId: string }>();
  const { colors } = useTheme();
  const { 
    booths, 
    bmcs, 
    milkRecords, 
    bmcDeliveries, 
    discrepancyCases, 
    societyIncomeRecords,
    getSocietyDetailedStats 
  } = useAavinStore();

  const [period, setPeriod] = useState<PeriodFilter>('month');

  const society = booths.find(b => b.id === societyId) || booths[0];
  const bmc = bmcs.find(b => b.id === society?.assignedBmcId);

  const stats = useMemo(() => {
    if (!society) return null;
    return getSocietyDetailedStats(society.id, period);
  }, [society, period, getSocietyDetailedStats]);

  const societyIncome = useMemo(() => {
    if (!society) return [];
    return (societyIncomeRecords || []).filter(i => i.societyId === society.id);
  }, [society, societyIncomeRecords]);

  const societyDeliveries = useMemo(() => {
    if (!society) return [];
    return bmcDeliveries.filter(d => d.boothId === society.id);
  }, [society, bmcDeliveries]);

  const societyDiscrepancies = useMemo(() => {
    if (!society) return [];
    return discrepancyCases.filter(c => c.boothId === society.id);
  }, [society, discrepancyCases]);

  const rawMilkRecords = useMemo(() => {
    if (!society) return [];
    return milkRecords.filter(r => r.boothId === society.id);
  }, [society, milkRecords]);

  if (!society) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <DemoHeader title="Society Details" subtitle="Society record not found" />
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
          <Text style={[Typography.headline, { color: colors.text, marginTop: 12 }]}>
            Society Not Found
          </Text>
          <Text style={[Typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: 8 }]}>
            The requested feeder society ID could not be located in the registered registry.
          </Text>
          <Button 
            title="← Back to Dashboard" 
            style={{ marginTop: 20 }}
            onPress={() => router.back()} 
          />
        </View>
      </View>
    );
  }

  const hasNoData = rawMilkRecords.length === 0 && societyDeliveries.length === 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <DemoHeader 
        title={society.name}
        subtitle={`ID: ${society.id} • ${society.village}, ${society.taluk}`}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Navigation & Context Bar */}
        <View style={styles.topNavRow}>
          <Pressable 
            style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]} 
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={18} color={colors.text} />
            <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700', marginLeft: 6 }]}>
              Dashboard
            </Text>
          </Pressable>

          <View style={styles.actionPillsRow}>
            <Pressable 
              style={[styles.smallActionBtn, { backgroundColor: colors.primaryLight }]}
              onPress={() => router.push({ pathname: '/(bmc)/society-income', params: { preselectedSocietyId: society.id } })}
            >
              <Ionicons name="cash-outline" size={15} color={colors.primary} />
              <Text style={[Typography.caption2, { color: colors.primary, fontWeight: '800', marginLeft: 4 }]}>
                + Record Income
              </Text>
            </Pressable>

            <Pressable 
              style={[styles.smallActionBtn, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
              onPress={() => router.push({ pathname: '/(bmc)/society-comparison', params: { preselectedId1: society.id } })}
            >
              <Ionicons name="bar-chart-outline" size={15} color={colors.text} />
              <Text style={[Typography.caption2, { color: colors.text, fontWeight: '700', marginLeft: 4 }]}>
                Compare
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Society Profile Summary Card */}
        <Card style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={[styles.societyBadge, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="business" size={24} color={colors.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={styles.titleRow}>
                <Text style={[Typography.headline, { color: colors.text, fontWeight: '800' }]}>
                  {society.name}
                </Text>
                <View style={[styles.statusBadge, { 
                  backgroundColor: stats?.isActive ? 'rgba(22, 163, 74, 0.15)' : 'rgba(156, 163, 175, 0.2)' 
                }]}>
                  <Text style={[styles.statusText, { 
                    color: stats?.isActive ? '#16A34A' : '#6B7280' 
                  }]}>
                    {stats?.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </Text>
                </View>
              </View>

              <Text style={[Typography.caption1, { color: colors.textSecondary, marginTop: 2 }]}>
                Assigned BMC: {bmc?.name || society.assignedBmcId} • Code: {society.code}
              </Text>
              <Text style={[Typography.caption2, { color: colors.textMuted, marginTop: 2 }]}>
                In-Charge: {society.operatorName} • 📞 {society.phone} • Capacity: {society.capacityLitres.toLocaleString()} L
              </Text>
            </View>
          </View>

          {/* Quick Reconciliation Banner */}
          <View style={[styles.reconcileStatusStrip, {
            backgroundColor: stats?.reconciliationStatus === 'variance' ? '#FEF2F2' : 
                             stats?.reconciliationStatus === 'reconciled' ? '#F0FDF4' : '#F8FAFC',
            borderColor: stats?.reconciliationStatus === 'variance' ? '#FCA5A5' : 
                         stats?.reconciliationStatus === 'reconciled' ? '#86EFAC' : '#E2E8F0',
          }]}>
            <Ionicons 
              name={stats?.reconciliationStatus === 'variance' ? 'warning' : 
                    stats?.reconciliationStatus === 'reconciled' ? 'checkmark-circle' : 'hourglass-outline'} 
              size={18} 
              color={stats?.reconciliationStatus === 'variance' ? '#DC2626' : 
                     stats?.reconciliationStatus === 'reconciled' ? '#16A34A' : '#64748B'} 
            />
            <Text style={[Typography.caption1, { 
              color: stats?.reconciliationStatus === 'variance' ? '#991B1B' : 
                     stats?.reconciliationStatus === 'reconciled' ? '#166534' : '#334155',
              fontWeight: '700',
              marginLeft: 8,
              flex: 1,
            }]}>
              Reconciliation: {stats?.reconciliationStatus.toUpperCase()} 
              {stats?.differenceLitres && stats.differenceLitres !== 0 ? ` (${stats.differenceLitres > 0 ? '-' : '+'}${Math.abs(stats.differenceLitres)}L variance)` : ''}
              {stats?.unresolvedDiscrepanciesCount ? ` • ${stats.unresolvedDiscrepanciesCount} active audit case(s)` : ''}
            </Text>
          </View>
        </Card>

        {/* Date Filter Tabs */}
        <View style={styles.periodTabsRow}>
          {(['today', 'week', 'month', 'year', 'all'] as PeriodFilter[]).map((p) => {
            const active = period === p;
            const labels: Record<PeriodFilter, string> = {
              today: 'Today',
              week: '7 Days',
              month: 'This Month',
              year: 'This Year',
              all: 'All Time'
            };
            return (
              <Pressable
                key={p}
                style={[
                  styles.periodTab,
                  active && { backgroundColor: colors.primary, borderColor: colors.primary },
                  !active && { backgroundColor: colors.card, borderColor: colors.border }
                ]}
                onPress={() => setPeriod(p)}
              >
                <Text style={[
                  Typography.caption1,
                  { fontWeight: '700' },
                  active ? { color: '#FFFFFF' } : { color: colors.textSecondary }
                ]}>
                  {labels[p]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Empty State Guard: Truthful missing data vs zero */}
        {hasNoData ? (
          <Card style={styles.emptyCard}>
            <Ionicons name="document-text-outline" size={44} color={colors.textMuted} />
            <Text style={[Typography.headline, { color: colors.text, marginTop: 10 }]}>
              No Recorded Data
            </Text>
            <Text style={[Typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: 6, lineHeight: 20 }]}>
              This society has no milk collection sessions or BMC deliveries logged in the selected window. Missing logs are explicitly shown as unrecorded rather than assuming 0L supply.
            </Text>
            <Button
              title="Record Measurement for Society"
              size="md"
              style={{ marginTop: 16 }}
              onPress={() => router.push('/(bmc)/receive-milk')}
            />
          </Card>
        ) : (
          <>
            {/* Section 1: Milk Statistics */}
            <Text style={[Typography.headline, { color: colors.text, fontWeight: '800', marginTop: 8 }]}>
              🥛 Milk Statistics & Operational Metrics
            </Text>

            <View style={styles.gridTwoColumns}>
              {/* Daily Milk */}
              <Card style={styles.statCard}>
                <View style={styles.statIconRow}>
                  <Text style={[Typography.caption2, { color: colors.textSecondary, fontWeight: '700' }]}>
                    TODAY'S SUPPLY
                  </Text>
                  <Ionicons name="water-outline" size={16} color={colors.primary} />
                </View>
                <Text style={[styles.statBigNumber, { color: colors.text }]}>
                  {stats?.dailyMilk !== undefined && stats.dailyMilk > 0 ? `${stats.dailyMilk} L` : 'No Record'}
                </Text>
                <Text style={[Typography.caption2, { color: colors.textMuted }]}>
                  {stats?.dailyMilk ? 'Logged on 12-Oct-2026' : 'Awaiting today\'s session'}
                </Text>
              </Card>

              {/* Monthly Total */}
              <Card style={styles.statCard}>
                <View style={styles.statIconRow}>
                  <Text style={[Typography.caption2, { color: colors.textSecondary, fontWeight: '700' }]}>
                    MONTHLY TOTAL
                  </Text>
                  <Ionicons name="calendar-outline" size={16} color="#0284C7" />
                </View>
                <Text style={[styles.statBigNumber, { color: '#0284C7' }]}>
                  {stats?.monthlyTotalMilk ? `${stats.monthlyTotalMilk.toLocaleString()} L` : '0.0 L'}
                </Text>
                <Text style={[Typography.caption2, { color: colors.textMuted }]}>
                  October 2026 aggregate
                </Text>
              </Card>

              {/* Yearly Total */}
              <Card style={styles.statCard}>
                <View style={styles.statIconRow}>
                  <Text style={[Typography.caption2, { color: colors.textSecondary, fontWeight: '700' }]}>
                    YEARLY TOTAL
                  </Text>
                  <Ionicons name="analytics-outline" size={16} color="#7C3AED" />
                </View>
                <Text style={[styles.statBigNumber, { color: '#7C3AED' }]}>
                  {stats?.yearlyTotalMilk ? `${stats.yearlyTotalMilk.toLocaleString()} L` : '0.0 L'}
                </Text>
                <Text style={[Typography.caption2, { color: colors.textMuted }]}>
                  FY 2026-27 cumulative
                </Text>
              </Card>

              {/* Average Daily Quantity */}
              <Card style={styles.statCard}>
                <View style={styles.statIconRow}>
                  <Text style={[Typography.caption2, { color: colors.textSecondary, fontWeight: '700' }]}>
                    AVG DAILY SUPPLY
                  </Text>
                  <Ionicons name="speedometer-outline" size={16} color="#16A34A" />
                </View>
                <Text style={[styles.statBigNumber, { color: '#16A34A' }]}>
                  {stats?.avgDailyQuantity ? `${stats.avgDailyQuantity} L` : '—'}
                </Text>
                <Text style={[Typography.caption2, { color: colors.textMuted }]}>
                  Across active recording days
                </Text>
              </Card>

              {/* Highest Day */}
              <Card style={styles.statCard}>
                <View style={styles.statIconRow}>
                  <Text style={[Typography.caption2, { color: colors.textSecondary, fontWeight: '700' }]}>
                    PEAK DAILY SUPPLY
                  </Text>
                  <Ionicons name="trending-up-outline" size={16} color="#EA580C" />
                </View>
                <Text style={[styles.statBigNumber, { color: '#EA580C' }]}>
                  {stats?.highestDailyQuantity ? `${stats.highestDailyQuantity} L` : '—'}
                </Text>
                <Text style={[Typography.caption2, { color: colors.textMuted }]}>
                  Highest recorded day
                </Text>
              </Card>

              {/* Lowest Day */}
              <Card style={styles.statCard}>
                <View style={styles.statIconRow}>
                  <Text style={[Typography.caption2, { color: colors.textSecondary, fontWeight: '700' }]}>
                    MIN DAILY SUPPLY
                  </Text>
                  <Ionicons name="trending-down-outline" size={16} color="#64748B" />
                </View>
                <Text style={[styles.statBigNumber, { color: '#64748B' }]}>
                  {stats?.lowestDailyQuantity ? `${stats.lowestDailyQuantity} L` : '—'}
                </Text>
                <Text style={[Typography.caption2, { color: colors.textMuted }]}>
                  Lowest recorded day
                </Text>
              </Card>
            </View>

            {/* Reconciliation Comparison Card */}
            <Card style={styles.reconcileDetailCard}>
              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800', marginBottom: 12 }]}>
                BMC Flow Meter Intake vs Society Declaration
              </Text>

              <View style={styles.reconcileRow}>
                <View style={styles.reconcileCol}>
                  <Text style={[Typography.caption2, { color: colors.textSecondary }]}>SOCIETY DISPATCHED</Text>
                  <Text style={[Typography.headline, { color: colors.text, fontWeight: '800' }]}>
                    {((stats?.quantityReceivedByBmc || 0) + (stats?.differenceLitres || 0)).toFixed(1)} L
                  </Text>
                </View>

                <View style={styles.reconcileArrow}>
                  <Ionicons name="arrow-forward" size={18} color={colors.textMuted} />
                </View>

                <View style={styles.reconcileCol}>
                  <Text style={[Typography.caption2, { color: colors.primary }]}>BMC MEASURED</Text>
                  <Text style={[Typography.headline, { color: colors.primary, fontWeight: '800' }]}>
                    {stats?.quantityReceivedByBmc?.toFixed(1) || '0.0'} L
                  </Text>
                </View>

                <View style={styles.reconcileColRight}>
                  <Text style={[Typography.caption2, { color: stats?.differenceLitres && stats.differenceLitres > 0 ? '#DC2626' : '#16A34A' }]}>
                    NET DIFFERENCE
                  </Text>
                  <Text style={[Typography.headline, { 
                    color: stats?.differenceLitres && stats.differenceLitres > 0 ? '#DC2626' : '#16A34A',
                    fontWeight: '800' 
                  }]}>
                    {stats?.differenceLitres !== undefined 
                      ? (stats.differenceLitres > 0 ? `-${stats.differenceLitres.toFixed(1)} L` : '0.0 L Balanced')
                      : '0.0 L'}
                  </Text>
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={styles.metaInfoRow}>
                <View style={styles.metaItem}>
                  <Text style={[Typography.caption2, { color: colors.textMuted }]}>Missing Session Records:</Text>
                  <Text style={[Typography.caption1, { color: stats?.missingRecordsCount ? '#D97706' : '#16A34A', fontWeight: '700' }]}>
                    {stats?.missingRecordsCount ? `⚠️ ${stats.missingRecordsCount} Day(s) Unlogged` : '✓ 100% Complete'}
                  </Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={[Typography.caption2, { color: colors.textMuted }]}>Unresolved Audit Cases:</Text>
                  <Text style={[Typography.caption1, { color: stats?.unresolvedDiscrepanciesCount ? '#DC2626' : '#16A34A', fontWeight: '700' }]}>
                    {stats?.unresolvedDiscrepanciesCount ? `⚠️ ${stats.unresolvedDiscrepanciesCount} Active` : '✓ 0 Cases'}
                  </Text>
                </View>
              </View>
            </Card>

            {/* Section 2: Financial Statistics */}
            <Text style={[Typography.headline, { color: colors.text, fontWeight: '800', marginTop: 12 }]}>
              💰 Financial Statistics & Union Ledger
            </Text>

            <View style={styles.gridTwoColumns}>
              {/* Total Recorded Income */}
              <Card style={styles.statCard}>
                <View style={styles.statIconRow}>
                  <Text style={[Typography.caption2, { color: colors.textSecondary, fontWeight: '700' }]}>
                    RECORDED INCOME
                  </Text>
                  <Ionicons name="wallet-outline" size={16} color="#059669" />
                </View>
                <Text style={[styles.statBigNumber, { color: '#059669' }]}>
                  ₹{(stats?.totalRecordedIncome || 0).toLocaleString('en-IN')}
                </Text>
                <Text style={[Typography.caption2, { color: colors.textMuted }]}>
                  Total ledger entries
                </Text>
              </Card>

              {/* Payments Received */}
              <Card style={styles.statCard}>
                <View style={styles.statIconRow}>
                  <Text style={[Typography.caption2, { color: colors.textSecondary, fontWeight: '700' }]}>
                    PAYMENTS CLEARED
                  </Text>
                  <Ionicons name="checkmark-done-circle-outline" size={16} color="#16A34A" />
                </View>
                <Text style={[styles.statBigNumber, { color: '#16A34A' }]}>
                  ₹{(stats?.paymentsReceived || 0).toLocaleString('en-IN')}
                </Text>
                <Text style={[Typography.caption2, { color: colors.textMuted }]}>
                  Verified disbursements
                </Text>
              </Card>

              {/* Payments Pending */}
              <Card style={styles.statCard}>
                <View style={styles.statIconRow}>
                  <Text style={[Typography.caption2, { color: colors.textSecondary, fontWeight: '700' }]}>
                    PENDING PAYMENTS
                  </Text>
                  <Ionicons name="time-outline" size={16} color="#D97706" />
                </View>
                <Text style={[styles.statBigNumber, { color: '#D97706' }]}>
                  ₹{(stats?.paymentsPending || 0).toLocaleString('en-IN')}
                </Text>
                <Text style={[Typography.caption2, { color: colors.textMuted }]}>
                  Awaiting audit/sign-off
                </Text>
              </Card>

              {/* Reported to Union */}
              <Card style={styles.statCard}>
                <View style={styles.statIconRow}>
                  <Text style={[Typography.caption2, { color: colors.textSecondary, fontWeight: '700' }]}>
                    REPORTED TO UNION
                  </Text>
                  <Ionicons name="send-outline" size={16} color="#2563EB" />
                </View>
                <Text style={[styles.statBigNumber, { color: '#2563EB' }]}>
                  ₹{(stats?.amountReportedToUnion || 0).toLocaleString('en-IN')}
                </Text>
                <Text style={[Typography.caption2, { color: colors.textMuted }]}>
                  Included in Union returns
                </Text>
              </Card>
            </View>

            {/* Recent Income Entries Table */}
            <Card style={styles.ledgerCard}>
              <View style={styles.ledgerHeaderRow}>
                <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]}>
                  Recent Financial Entries ({societyIncome.length})
                </Text>
                <Pressable onPress={() => router.push({ pathname: '/(bmc)/society-income', params: { preselectedSocietyId: society.id } })}>
                  <Text style={[Typography.caption1, { color: colors.primary, fontWeight: '700' }]}>
                    + Add Entry
                  </Text>
                </Pressable>
              </View>

              {societyIncome.length === 0 ? (
                <View style={styles.innerEmptyState}>
                  <Text style={[Typography.caption1, { color: colors.textSecondary, fontStyle: 'italic' }]}>
                    No financial ledger transactions recorded for this society yet.
                  </Text>
                </View>
              ) : (
                societyIncome.slice(0, 5).map((item) => (
                  <View key={item.id} style={[styles.incomeItemRow, { borderBottomColor: colors.border }]}>
                    <View style={styles.incomeCatIcon}>
                      <Ionicons name="receipt-outline" size={18} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700' }]}>
                        {item.description}
                      </Text>
                      <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                        {item.category.replace(/_/g, ' ').toUpperCase()} • Period: {item.financialPeriod} • Date: {item.transactionDate}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[Typography.subhead, { color: '#059669', fontWeight: '800' }]}>
                        ₹{item.amountInr.toLocaleString('en-IN')}
                      </Text>
                      <View style={[styles.miniStatusBadge, { 
                        backgroundColor: item.status === 'verified' ? '#DCFCE7' : '#FEF3C7' 
                      }]}>
                        <Text style={[styles.miniStatusText, { 
                          color: item.status === 'verified' ? '#166534' : '#92400E' 
                        }]}>
                          {item.status.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </Card>

            {/* Active Discrepancy Cases (if any) */}
            {societyDiscrepancies.length > 0 && (
              <Card style={styles.discrepancySectionCard}>
                <Text style={[Typography.subhead, { color: '#B91C1C', fontWeight: '800', marginBottom: 10 }]}>
                  ⚠️ Discrepancy & Audit Case History ({societyDiscrepancies.length})
                </Text>
                {societyDiscrepancies.map(c => (
                  <View key={c.id} style={[styles.caseRow, { borderBottomColor: colors.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700' }]}>
                        Case #{c.id} • {c.collectionDate}
                      </Text>
                      <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                        Declared: {c.declaredQuantity}L vs Measured: {c.measuredQuantity}L (Variance: {c.differenceLitres}L)
                      </Text>
                      {c.investigationNotes?.[0] && (
                        <Text style={[Typography.caption2, { color: colors.textMuted, fontStyle: 'italic', marginTop: 2 }]}>
                          "{c.investigationNotes[0].note}"
                        </Text>
                      )}
                    </View>
                    <Button
                      title="Inspect"
                      size="sm"
                      variant="outline"
                      onPress={() => router.push('/(bmc)/investigations')}
                    />
                  </View>
                ))}
              </Card>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  topNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
  },
  actionPillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  smallActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
  },
  profileCard: {
    padding: 16,
    borderRadius: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  societyBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  reconcileStatusStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 14,
  },
  periodTabsRow: {
    flexDirection: 'row',
    gap: 6,
    marginVertical: 4,
  },
  periodTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridTwoColumns: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    width: '48.5%',
    padding: 12,
    borderRadius: 12,
  },
  statIconRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  statBigNumber: {
    fontSize: 20,
    fontWeight: '800',
    marginVertical: 4,
  },
  reconcileDetailCard: {
    padding: 16,
    borderRadius: 14,
  },
  reconcileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reconcileCol: {
    flex: 1,
  },
  reconcileArrow: {
    paddingHorizontal: 8,
  },
  reconcileColRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  metaInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaItem: {
    flex: 1,
  },
  ledgerCard: {
    padding: 16,
    borderRadius: 14,
  },
  ledgerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  innerEmptyState: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  incomeItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  incomeCatIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0, 77, 153, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  miniStatusText: {
    fontSize: 9,
    fontWeight: '800',
  },
  discrepancySectionCard: {
    padding: 16,
    borderRadius: 14,
    borderColor: '#FCA5A5',
    borderWidth: 1,
    backgroundColor: '#FFF5F5',
  },
  caseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  emptyCard: {
    padding: 30,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  emptyContainer: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
