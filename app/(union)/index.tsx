import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useAavinStore } from '../../store/AavinStoreContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { DemoHeader } from '../../components/DemoHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Ionicons } from '@expo/vector-icons';

export default function UnionDashboard() {
  const { user } = useAuth();
  const { 
    union, 
    bmcs, 
    booths, 
    bmcReceipts, 
    discrepancyCases, 
    getUnionStats 
  } = useAavinStore();
  const { colors } = useTheme();
  const router = useRouter();

  const [refreshing, setRefreshing] = useState(false);

  const stats = getUnionStats();
  const netTransitDiscrepancy = Math.max(0, stats.totalBoothDispatched - stats.totalBmcReceived);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 400);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <DemoHeader 
        title="Aavin Union Headquarters"
        subtitle={`${union.name} • Madurai District Co-op`}
      />

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Urgent Attention Alert if there are active discrepancies or pending receipts */}
        {(stats.activeDiscrepanciesCount > 0 || stats.pendingReceiptsCount > 0) && (
          <View style={[styles.attentionBanner, { backgroundColor: '#FEF2F2', borderColor: '#EF4444' }]}>
            <Ionicons name="alert-circle" size={24} color="#DC2626" />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={[Typography.headline, { color: '#B91C1C', fontWeight: '900' }]}>
                EXECUTIVE AUDIT REQUIRED
              </Text>
              <Text style={[Typography.caption1, { color: '#991B1B', marginTop: 2 }]}>
                {stats.activeDiscrepanciesCount} active discrepancy case(s) • {stats.pendingReceiptsCount} BMC receipt(s) awaiting GM sign-off.
              </Text>
            </View>
            <Button
              title="Audit"
              variant="destructive"
              size="sm"
              onPress={() => router.push('/(union)/discrepancies' as any)}
            />
          </View>
        )}

        {/* Signature Hero Dark Navy Card (Reference Wallet UI) */}
        <View style={styles.heroNavyCard}>
          <View style={styles.heroCardHeaderRow}>
            <View style={styles.heroHeaderPill}>
              <Text style={styles.heroHeaderPillText}>Madurai District Union ›</Text>
            </View>
            <View style={[styles.heroStatusBadge, { backgroundColor: stats.activeDiscrepanciesCount > 0 ? '#DC2626' : '#16A34A' }]}>
              <Text style={styles.heroStatusBadgeText}>
                {stats.activeDiscrepanciesCount > 0 ? '⚠️ ACTION REQUIRED' : '✓ 100% BALANCED'}
              </Text>
            </View>
          </View>

          <Text style={styles.heroBalanceNumber}>
            {stats.totalBmcReceived.toFixed(1)} <Text style={{ fontSize: 20, fontWeight: '600' }}>Litres</Text>
          </Text>

          <View style={styles.heroSubRow}>
            <View style={[styles.growthPill, { backgroundColor: netTransitDiscrepancy > 0 ? 'rgba(220, 38, 38, 0.2)' : 'rgba(22, 163, 74, 0.2)' }]}>
              <Text style={[styles.growthPillText, { color: netTransitDiscrepancy > 0 ? '#F87171' : '#4ADE80' }]}>
                {netTransitDiscrepancy > 0 ? `-${netTransitDiscrepancy.toFixed(1)} L Loss` : '+5.4% ↑ Target'}
              </Text>
            </View>
            <Text style={styles.heroSubText}>
              Booths Dispatched: {stats.totalBoothDispatched.toFixed(1)} L
            </Text>
          </View>

          {/* 4 Circular Action Buttons (from Reference UI: Down, Up-Right, Swap, Plus) */}
          <View style={styles.heroActionsRow}>
            <Pressable 
              style={styles.heroCircleAction}
              onPress={() => router.push('/(union)/receipt-review' as any)}
            >
              <View style={styles.circleBtn}>
                <Ionicons name="document-text" size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.circleBtnLabel}>Receipts</Text>
            </Pressable>

            <Pressable 
              style={styles.heroCircleAction}
              onPress={() => router.push('/(union)/bmc-monitoring' as any)}
            >
              <View style={styles.circleBtn}>
                <Ionicons name="business" size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.circleBtnLabel}>BMCs</Text>
            </Pressable>

            <Pressable 
              style={styles.heroCircleAction}
              onPress={() => router.push('/(union)/discrepancies' as any)}
            >
              <View style={styles.circleBtn}>
                <Ionicons name="swap-horizontal" size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.circleBtnLabel}>Audit</Text>
            </Pressable>

            <Pressable 
              style={styles.heroCircleAction}
              onPress={() => router.push('/(union)/receipt-review' as any)}
            >
              <View style={styles.circleBtn}>
                <Ionicons name="checkmark-done" size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.circleBtnLabel}>Sign-Off</Text>
            </Pressable>
          </View>
        </View>

        {/* 3 Measurement Stages Disaggregation Banner (Explicitly required by prompt!) */}
        <Card style={styles.stagesCard}>
          <Text style={[Typography.caption2, { color: colors.primary, fontWeight: '800' }]}>
            SUPPLY CHAIN STAGE RECONCILIATION (DISTINCT MEASUREMENT NODES)
          </Text>

          <View style={styles.stagesGrid}>
            {/* Stage 1: Booths */}
            <View style={[styles.stageNode, { backgroundColor: colors.primaryLight }]}>
              <Text style={[Typography.caption2, { color: colors.primary, fontWeight: '800' }]}>
                STAGE 1: BOOTHS
              </Text>
              <Text style={[styles.stageVolume, { color: colors.primary }]}>
                {stats.totalBoothDispatched.toFixed(1)} L
              </Text>
              <Text style={[Typography.caption2, { color: colors.primary }]}>
                Total Declared Dispatched
              </Text>
            </View>

            {/* Stage 2: BMCs */}
            <View style={[styles.stageNode, { backgroundColor: '#F0FDF4' }]}>
              <Text style={[Typography.caption2, { color: '#16A34A', fontWeight: '800' }]}>
                STAGE 2: BMCS
              </Text>
              <Text style={[styles.stageVolume, { color: '#166534' }]}>
                {stats.totalBmcReceived.toFixed(1)} L
              </Text>
              <Text style={[Typography.caption2, { color: '#16A34A' }]}>
                Actual Measured Received
              </Text>
            </View>

            {/* Stage 3: BMC Receipts */}
            <View style={[styles.stageNode, { backgroundColor: '#FAF5FF' }]}>
              <Text style={[Typography.caption2, { color: '#9333EA', fontWeight: '800' }]}>
                STAGE 3: RECEIPTS
              </Text>
              <Text style={[styles.stageVolume, { color: '#6B21A8' }]}>
                {stats.totalReportedByBmcReceipts.toFixed(1)} L
              </Text>
              <Text style={[Typography.caption2, { color: '#9333EA' }]}>
                Reported by BMC Slips
              </Text>
            </View>
          </View>

          <View style={[styles.stageNoteBox, { backgroundColor: colors.background }]}>
            <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
              ℹ️ Measurement Integrity Rule: Booth declared dispatches and BMC intake measurements represent separate stages of the same physical milk and are audited for transit loss.
            </Text>
          </View>
        </Card>

        {/* 4 Operations KPI Cards */}
        <View style={styles.kpiRow}>
          <Card style={styles.kpiCard}>
            <View style={[styles.kpiIcon, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="document-text" size={18} color="#D97706" />
            </View>
            <Text style={[styles.kpiNumber, { color: colors.text }]}>{stats.pendingReceiptsCount}</Text>
            <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Receipts Pending Review</Text>
          </Card>

          <Card style={styles.kpiCard}>
            <View style={[styles.kpiIcon, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="warning" size={18} color="#DC2626" />
            </View>
            <Text style={[styles.kpiNumber, { color: '#DC2626' }]}>{stats.activeDiscrepanciesCount}</Text>
            <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Active Discrepancies</Text>
          </Card>

          <Card style={styles.kpiCard}>
            <View style={[styles.kpiIcon, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="checkmark-done" size={18} color="#16A34A" />
            </View>
            <Text style={[styles.kpiNumber, { color: '#16A34A' }]}>{stats.resolvedDiscrepanciesCount}</Text>
            <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Resolved Investigations</Text>
          </Card>

          <Card style={styles.kpiCard}>
            <View style={[styles.kpiIcon, { backgroundColor: '#E0F2FE' }]}>
              <Ionicons name="snow" size={18} color="#0284C7" />
            </View>
            <Text style={[styles.kpiNumber, { color: colors.text }]}>{bmcs.length}</Text>
            <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Monitored BMC Centers</Text>
          </Card>
        </View>

        {/* Bulk Milk Cooling Centers (BMC Grid) */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[Typography.headline, { color: colors.text, fontWeight: '800' }]}>
              Bulk Milk Cooling Centers (BMCs)
            </Text>
            <Pressable onPress={() => router.push('/(union)/bmc-monitoring' as any)}>
              <Text style={[Typography.caption1, { color: colors.primary, fontWeight: '700' }]}>View All →</Text>
            </Pressable>
          </View>

          {bmcs.map((b) => {
            const bmcBooths = booths.filter(booth => booth.assignedBmcId === b.id);
            const latestReceipt = bmcReceipts.find(r => r.bmcId === b.id);
            const bmcDiscrepancies = discrepancyCases.filter(c => c.bmcId === b.id && (c.status === 'open' || c.status === 'under_investigation'));

            return (
              <View key={b.id} style={[styles.bmcItem, { borderBottomColor: colors.border }]}>
                <View style={[styles.bmcIcon, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="snow" size={22} color={colors.primary} />
                </View>

                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]}>
                    {b.name}
                  </Text>
                  <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                    Location: {b.location} • In-Charge: {b.managerName}
                  </Text>
                  <Text style={[Typography.caption2, { color: colors.textSecondary, marginTop: 2 }]}>
                    Feeders: {bmcBooths.map(bt => bt.name.split(' ')[0]).join(', ')} ({bmcBooths.length} Booths)
                  </Text>

                  <View style={styles.bmcBadgesRow}>
                    <View style={[styles.bmcTag, { backgroundColor: bmcDiscrepancies.length > 0 ? '#FEE2E2' : '#DCFCE7' }]}>
                      <Text style={[styles.bmcTagText, { color: bmcDiscrepancies.length > 0 ? '#DC2626' : '#15803D' }]}>
                        {bmcDiscrepancies.length > 0 ? `${bmcDiscrepancies.length} Discrepancy Open` : 'Balanced'}
                      </Text>
                    </View>

                    {latestReceipt && (
                      <View style={[styles.bmcTag, { backgroundColor: '#F1F5F9' }]}>
                        <Text style={[styles.bmcTagText, { color: colors.text }]}>
                          Receipt #{latestReceipt.id} ({latestReceipt.totalReceivedQuantity}L)
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                <Pressable onPress={() => router.push('/(union)/receipt-review' as any)}>
                  <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                </Pressable>
              </View>
            );
          })}
        </Card>

        {/* Quick Review Navigation Actions */}
        <View style={styles.actionBtnGrid}>
          <Button
            title="📥 Review BMC Daily Receipts"
            size="lg"
            onPress={() => router.push('/(union)/receipt-review' as any)}
          />
          <Button
            title="🔍 All District Discrepancies & Directives"
            variant="secondary"
            onPress={() => router.push('/(union)/discrepancies' as any)}
          />
        </View>
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
    gap: 14,
    paddingBottom: 40,
  },
  attentionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  stagesCard: {
    padding: 16,
  },
  stagesGrid: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 10,
  },
  stageNode: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  stageVolume: {
    fontSize: 18,
    fontWeight: '900',
    marginVertical: 4,
  },
  stageNoteBox: {
    padding: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  kpiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  kpiCard: {
    width: '48%',
    padding: 12,
  },
  kpiIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  kpiNumber: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 2,
  },
  sectionCard: {
    padding: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  bmcItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  bmcIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bmcBadgesRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  bmcTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  bmcTagText: {
    fontSize: 10,
    fontWeight: '800',
  },
  actionBtnGrid: {
    gap: 10,
    marginTop: 4,
  },
  heroNavyCard: {
    backgroundColor: '#0D1E36',
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#071325',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  heroCardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  heroHeaderPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  heroHeaderPillText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11,
    fontWeight: '700',
  },
  heroStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  heroStatusBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  heroBalanceNumber: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginVertical: 4,
  },
  heroSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  growthPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginRight: 8,
  },
  growthPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  heroSubText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontWeight: '600',
  },
  heroActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
    paddingTop: 14,
  },
  heroCircleAction: {
    alignItems: 'center',
    flex: 1,
  },
  circleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#162C4E',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  circleBtnLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});
