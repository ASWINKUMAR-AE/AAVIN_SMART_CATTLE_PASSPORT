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

export default function BoothDashboard() {
  const { user } = useAuth();
  const { 
    booths, 
    bmcs, 
    farmers, 
    getBoothStats, 
    milkRecords, 
    boothReceipts,
    bmcDeliveries,
    discrepancyCases 
  } = useAavinStore();
  const { colors } = useTheme();
  const router = useRouter();

  const [refreshing, setRefreshing] = useState(false);

  const boothId = user?.associatedId || 'BOOTH001';
  const booth = booths.find(b => b.id === boothId) || booths[0];
  const assignedBmc = bmcs.find(b => b.id === booth.assignedBmcId) || bmcs[0];

  const stats = getBoothStats(booth.id);
  const boothRecords = milkRecords.filter(r => r.boothId === booth.id);
  const todayRecords = boothRecords.filter(r => r.collectionDate === '2026-10-12');
  const assignedFarmers = farmers.filter(f => f.assignedBoothId === booth.id);

  // Check today's receipt status
  const todayReceipt = boothReceipts.find(r => r.boothId === booth.id && r.collectionDate === '2026-10-12');

  // Any discrepancy cases involving this booth
  const boothDiscrepancies = discrepancyCases.filter(c => c.boothId === booth.id && c.status === 'open');

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 400);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <DemoHeader 
        title={booth.name}
        subtitle={`Booth #${booth.code} • Linked to BMC: ${assignedBmc.name}`}
      />

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Discrepancy Alert for Booth Staff */}
        {boothDiscrepancies.length > 0 && (
          <View style={[styles.discrepancyBanner, { backgroundColor: '#FEF2F2', borderColor: '#EF4444' }]}>
            <Ionicons name="alert-circle" size={24} color="#DC2626" />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={[Typography.headline, { color: '#B91C1C', fontWeight: '800' }]}>
                ⚠️ ACTIVE BMC TRANSIT DISCREPANCY
              </Text>
              <Text style={[Typography.caption1, { color: '#991B1B', marginTop: 2 }]}>
                Case #{boothDiscrepancies[0].id}: {boothDiscrepancies[0].differenceLitres} L variance reported at {assignedBmc.name}.
              </Text>
            </View>
          </View>
        )}

        {/* Signature Hero Dark Navy Card (Reference Wallet UI) */}
        <View style={styles.heroNavyCard}>
          <View style={styles.heroCardHeaderRow}>
            <View style={styles.heroHeaderPill}>
              <Text style={styles.heroHeaderPillText}>Booth #{booth.code} ›</Text>
            </View>
            <View style={[styles.heroStatusBadge, { backgroundColor: todayReceipt ? '#16A34A' : '#D97706' }]}>
              <Text style={styles.heroStatusBadgeText}>
                {todayReceipt ? '✓ DISPATCH READY' : 'CLOSURE PENDING'}
              </Text>
            </View>
          </View>

          <Text style={styles.heroBalanceNumber}>
            {stats.eligibleReceiptTotal.toFixed(2)} <Text style={{ fontSize: 20, fontWeight: '600' }}>Litres</Text>
          </Text>

          <View style={styles.heroSubRow}>
            <View style={styles.growthPill}>
              <Text style={styles.growthPillText}>+4.2% ↑</Text>
            </View>
            <Text style={styles.heroSubText}>
              Farmer: {stats.farmerWiseTotal.toFixed(1)} L • Route: {stats.vendorCombinedTotal.toFixed(1)} L
            </Text>
          </View>

          {/* 4 Circular Action Buttons (from Reference UI: Down, Up-Right, Swap, Plus) */}
          <View style={styles.heroActionsRow}>
            <Pressable 
              style={styles.heroCircleAction}
              onPress={() => router.push('/(booth)/record-milk')}
            >
              <View style={styles.circleBtn}>
                <Ionicons name="arrow-down" size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.circleBtnLabel}>Record</Text>
            </Pressable>

            <Pressable 
              style={styles.heroCircleAction}
              onPress={() => router.push('/(booth)/review-collection')}
            >
              <View style={styles.circleBtn}>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.circleBtnLabel}>Review</Text>
            </Pressable>

            <Pressable 
              style={styles.heroCircleAction}
              onPress={() => router.push('/(booth)/sent-receipts')}
            >
              <View style={styles.circleBtn}>
                <Ionicons name="swap-horizontal" size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.circleBtnLabel}>Receipts</Text>
            </Pressable>

            <Pressable 
              style={styles.heroCircleAction}
              onPress={() => router.push('/(booth)/farmers')}
            >
              <View style={styles.circleBtn}>
                <Ionicons name="people" size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.circleBtnLabel}>Farmers</Text>
            </Pressable>
          </View>
        </View>

        {/* Dispatch Pipeline Overview */}
        <Card style={styles.pipelineCard}>
          <Text style={[Typography.headline, { color: colors.text, fontWeight: '800', marginBottom: 12 }]}>
            Milk Collection Chain Node
          </Text>

          <View style={styles.pipelineFlow}>
            <View style={styles.flowNode}>
              <Text style={{ fontSize: 24 }}>👨‍🌾</Text>
              <Text style={[Typography.caption2, { color: colors.textSecondary, fontWeight: '700', marginTop: 4 }]}>
                Farmers
              </Text>
              <Text style={[Typography.caption2, { color: '#16A34A', fontWeight: '800' }]}>
                {stats.farmersAttended} Supplied
              </Text>
            </View>

            <Ionicons name="arrow-forward" size={18} color="#94A3B8" />

            <View style={[styles.flowNode, { backgroundColor: colors.primaryLight, padding: 8, borderRadius: 10 }]}>
              <Text style={{ fontSize: 24 }}>🏢</Text>
              <Text style={[Typography.caption2, { color: colors.primary, fontWeight: '800', marginTop: 4 }]}>
                Melur Booth
              </Text>
              <Text style={[Typography.caption2, { color: colors.primary, fontWeight: '900' }]}>
                {stats.eligibleReceiptTotal.toFixed(1)} L
              </Text>
            </View>

            <Ionicons name="arrow-forward" size={18} color="#94A3B8" />

            <View style={styles.flowNode}>
              <Text style={{ fontSize: 24 }}>❄️</Text>
              <Text style={[Typography.caption2, { color: colors.textSecondary, fontWeight: '700', marginTop: 4 }]}>
                East BMC
              </Text>
              <Text style={[Typography.caption2, { color: colors.textSecondary, fontWeight: '800' }]}>
                {todayReceipt?.status === 'sent_to_bmc' ? 'Dispatched' : 'Pending'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Today's Recorded Entries List */}
        <Card style={styles.entriesCard}>
          <View style={styles.entriesHeader}>
            <Text style={[Typography.headline, { color: colors.text, fontWeight: '800' }]}>
              Today's Entries ({todayRecords.length})
            </Text>
            <Pressable onPress={() => router.push('/(booth)/record-milk')}>
              <Text style={[Typography.caption1, { color: colors.primary, fontWeight: '700' }]}>
                + New Entry
              </Text>
            </Pressable>
          </View>

          {todayRecords.length === 0 ? (
            <Text style={[Typography.subhead, { color: colors.textSecondary, textAlign: 'center', marginVertical: 20 }]}>
              No milk entries recorded today yet.
            </Text>
          ) : (
            todayRecords.map((r) => (
              <View key={r.id} style={[styles.entryItem, { borderBottomColor: colors.border }]}>
                <View style={[styles.entryIconCircle, { backgroundColor: r.measurementMethod === 'farmer_wise' ? '#DCFCE7' : '#E0E7FF' }]}>
                  <Ionicons 
                    name={r.measurementMethod === 'farmer_wise' ? 'person' : 'bus'} 
                    size={16} 
                    color={r.measurementMethod === 'farmer_wise' ? '#15803D' : '#4338CA'} 
                  />
                </View>

                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]}>
                    {r.farmerName || `${r.vendorName || 'Combined Vendor'}`}
                  </Text>
                  <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                    {r.measurementMethod === 'farmer_wise' ? 'Direct Farmer Measurement' : 'Vendor Combined (Individual N/A)'}
                  </Text>
                  <Text style={[Typography.caption2, { color: colors.textMuted }]}>
                    {r.session.toUpperCase()} • Recorded by: {r.createdBy}
                  </Text>
                </View>

                <View style={styles.entryQtyBox}>
                  <Text style={[styles.entryQtyNum, { color: colors.primary }]}>
                    {r.quantityLitres.toFixed(1)} L
                  </Text>
                </View>
              </View>
            ))
          )}
        </Card>
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
  discrepancyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  primaryCard: {
    padding: 16,
  },
  primaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  largeTotalText: {
    fontSize: 32,
    fontWeight: '900',
    marginTop: 2,
  },
  receiptPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  receiptPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  breakdownCol: {
    flex: 1,
  },
  vDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 12,
  },
  actionBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  pipelineCard: {
    padding: 16,
  },
  pipelineFlow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  flowNode: {
    alignItems: 'center',
  },
  entriesCard: {
    padding: 16,
  },
  entriesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  entryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  entryIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryQtyBox: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  entryQtyNum: {
    fontSize: 15,
    fontWeight: '800',
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
    backgroundColor: 'rgba(22, 163, 74, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginRight: 8,
  },
  growthPillText: {
    color: '#4ADE80',
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
