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

export default function BMCDashboard() {
  const { user } = useAuth();
  const { 
    bmcs, 
    booths, 
    bmcDeliveries, 
    discrepancyCases, 
    getBmcStats,
    bmcReceipts 
  } = useAavinStore();
  const { colors } = useTheme();
  const router = useRouter();

  const [refreshing, setRefreshing] = useState(false);

  const bmcId = user?.associatedId || 'BMC001';
  const bmc = bmcs.find(b => b.id === bmcId) || bmcs[0];
  const assignedBooths = booths.filter(b => b.assignedBmcId === bmc.id);

  const stats = getBmcStats(bmc.id);
  const deliveries = bmcDeliveries.filter(d => d.bmcId === bmc.id);
  const pendingArrivals = deliveries.filter(d => d.status === 'pending_arrival');
  const discrepancies = discrepancyCases.filter(c => c.bmcId === bmc.id);
  const openDiscrepancies = discrepancies.filter(c => c.status === 'open' || c.status === 'under_investigation' || c.status === 'escalated_to_union');

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 400);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <DemoHeader 
        title={bmc.name}
        subtitle={`${assignedBooths.length} Feeder Societies • Capacity: ${bmc.capacityLitres.toLocaleString()} L`}
      />

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Pending Deliveries Alert Banner */}
        {pendingArrivals.length > 0 && (
          <View style={[styles.alertBanner, { backgroundColor: '#E0F2FE', borderColor: '#38BDF8' }]}>
            <Ionicons name="time" size={24} color="#0284C7" />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={[Typography.headline, { color: '#0369A1', fontWeight: '800' }]}>
                {pendingArrivals.length} Society Delivery Awaiting Measurement
              </Text>
              <Text style={[Typography.caption1, { color: '#0284C7', marginTop: 2 }]}>
                {pendingArrivals[0].boothName} dispatched {pendingArrivals[0].declaredDispatchQuantity} L. Confirm arrival volume.
              </Text>
            </View>
            <Button
              title="Measure"
              size="sm"
              onPress={() => router.push('/(bmc)/receive-milk')}
            />
          </View>
        )}

        {/* Active Discrepancy Alert */}
        {openDiscrepancies.length > 0 && (
          <View style={[styles.alertBanner, { backgroundColor: '#FEF2F2', borderColor: '#EF4444' }]}>
            <Ionicons name="alert-circle" size={24} color="#DC2626" />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={[Typography.headline, { color: '#B91C1C', fontWeight: '800' }]}>
                ⚠️ {openDiscrepancies.length} Active Discrepancy Case(s)
              </Text>
              <Text style={[Typography.caption1, { color: '#991B1B', marginTop: 2 }]}>
                Variance detected between Society dispatch receipt and BMC flow meter.
              </Text>
            </View>
            <Button
              title="Audit"
              variant="destructive"
              size="sm"
              onPress={() => router.push('/(bmc)/investigations')}
            />
          </View>
        )}

        {/* Signature Hero Dark Navy Card (Reference Wallet UI) */}
        <View style={styles.heroNavyCard}>
          <View style={styles.heroCardHeaderRow}>
            <View style={styles.heroHeaderPill}>
              <Text style={styles.heroHeaderPillText}>BMC Intake Volume ›</Text>
            </View>
            <View style={[styles.heroStatusBadge, { backgroundColor: stats.totalDifference > 0 ? '#DC2626' : '#16A34A' }]}>
              <Text style={styles.heroStatusBadgeText}>
                {stats.totalDifference > 0 ? '⚠️ VARIANCE DETECTED' : '✓ BALANCED'}
              </Text>
            </View>
          </View>

          <Text style={styles.heroBalanceNumber}>
            {stats.todayReceived.toFixed(1)} <Text style={{ fontSize: 20, fontWeight: '600' }}>Litres</Text>
          </Text>

          <View style={styles.heroSubRow}>
            <View style={[styles.growthPill, { backgroundColor: stats.totalDifference > 0 ? 'rgba(220, 38, 38, 0.2)' : 'rgba(22, 163, 74, 0.2)' }]}>
              <Text style={[styles.growthPillText, { color: stats.totalDifference > 0 ? '#F87171' : '#4ADE80' }]}>
                {stats.totalDifference > 0 ? `-${stats.totalDifference.toFixed(1)} L Diff` : '100% Reconciled'}
              </Text>
            </View>
            <Text style={styles.heroSubText}>
              Society Declared: {stats.todayDeclared.toFixed(1)} L
            </Text>
          </View>

          {/* 4 Circular Action Buttons (from Reference UI: Down, Up-Right, Swap, Plus) */}
          <View style={styles.heroActionsRow}>
            <Pressable 
              style={styles.heroCircleAction}
              onPress={() => router.push('/(bmc)/receive-milk')}
            >
              <View style={styles.circleBtn}>
                <Ionicons name="arrow-down" size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.circleBtnLabel}>Measure</Text>
            </Pressable>

            <Pressable 
              style={styles.heroCircleAction}
              onPress={() => router.push('/(bmc)/daily-summary')}
            >
              <View style={styles.circleBtn}>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.circleBtnLabel}>Summary</Text>
            </Pressable>

            <Pressable 
              style={styles.heroCircleAction}
              onPress={() => router.push('/(bmc)/investigations')}
            >
              <View style={styles.circleBtn}>
                <Ionicons name="swap-horizontal" size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.circleBtnLabel}>Audit</Text>
            </Pressable>

            <Pressable 
              style={styles.heroCircleAction}
              onPress={() => router.push('/(bmc)/receive-milk')}
            >
              <View style={styles.circleBtn}>
                <Ionicons name="add" size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.circleBtnLabel}>Intake</Text>
            </Pressable>
          </View>
        </View>

        {/* Big Reconciliation Metric Cards */}
        <View style={styles.metricsRow}>
          {/* Declared vs Received */}
          <Card style={styles.metricCard}>
            <Text style={[Typography.caption2, { color: colors.textSecondary, fontWeight: '700' }]}>
              SOCIETY DECLARED
            </Text>
            <Text style={[styles.metricNumber, { color: colors.text }]}>
              {stats.todayDeclared.toFixed(1)} L
            </Text>
            <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
              Total Feeder Dispatches
            </Text>
          </Card>

          <Card style={styles.metricCard}>
            <Text style={[Typography.caption2, { color: colors.primary, fontWeight: '700' }]}>
              BMC RECEIVED
            </Text>
            <Text style={[styles.metricNumber, { color: colors.primary }]}>
              {stats.todayReceived.toFixed(1)} L
            </Text>
            <Text style={[Typography.caption2, { color: '#16A34A', fontWeight: '600' }]}>
              Actual Measured Vol
            </Text>
          </Card>

          <Card style={styles.metricCard}>
            <Text style={[Typography.caption2, { color: '#DC2626', fontWeight: '700' }]}>
              NET VARIANCE
            </Text>
            <Text 
              style={[
                styles.metricNumber, 
                { color: stats.totalDifference > 0 ? '#DC2626' : '#16A34A' }
              ]}
            >
              {stats.totalDifference > 0 ? `-${stats.totalDifference.toFixed(1)} L` : '0.0 L'}
            </Text>
            <Text style={[Typography.caption2, { color: stats.totalDifference > 0 ? '#DC2626' : '#16A34A' }]}>
              {stats.totalDifference > 0 ? 'Shortfall' : 'Balanced'}
            </Text>
          </Card>
        </View>

        {/* Assigned Feeder Societies */}
        <Card style={styles.sectionCard}>
          <Text style={[Typography.headline, { color: colors.text, fontWeight: '800', marginBottom: 10 }]}>
            Assigned Feeder Societies ({assignedBooths.length})
          </Text>

          {assignedBooths.map((b) => {
            const boothDelivery = deliveries.find(d => d.boothId === b.id && d.collectionDate === '2026-10-12');
            return (
              <View key={b.id} style={[styles.boothRow, { borderBottomColor: colors.border }]}>
                <View style={[styles.boothIcon, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="business" size={20} color={colors.primary} />
                </View>

                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]}>
                    {b.name}
                  </Text>
                  <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                    Code: {b.code} • {b.village} • In-Charge: {b.operatorName}
                  </Text>
                  <Text style={[Typography.caption2, { color: colors.textMuted }]}>
                    Status: {boothDelivery ? (boothDelivery.status === 'pending_arrival' ? 'Awaiting Measurement' : `Measured (${boothDelivery.measuredReceivedQuantity}L)`) : 'No Dispatch Today'}
                  </Text>
                </View>

                <View style={styles.boothAction}>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </View>
              </View>
            );
          })}
        </Card>

        {/* Quick Operations Actions */}
        <View style={styles.actionGrid}>
          <Button
            title="📥 Confirm Milk Received (Intake)"
            size="lg"
            onPress={() => router.push('/(bmc)/receive-milk')}
          />
          <Button
            title="🔍 View Discrepancies & Audit Cases"
            variant="secondary"
            onPress={() => router.push('/(bmc)/investigations')}
          />
          <Button
            title="📋 Close BMC Daily Receipt for Union"
            variant="outline"
            onPress={() => router.push('/(bmc)/daily-summary')}
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
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  metricCard: {
    flex: 1,
    padding: 12,
  },
  metricNumber: {
    fontSize: 18,
    fontWeight: '900',
    marginVertical: 4,
  },
  sectionCard: {
    padding: 16,
  },
  boothRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  boothIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boothAction: {
    paddingLeft: 8,
  },
  actionGrid: {
    gap: 10,
    marginTop: 4,
  },
  heroNavyCard: {
    backgroundColor: '#0D1E36',
    borderRadius: 24,
    padding: 18,
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
