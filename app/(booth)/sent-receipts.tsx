import React, { useState } from 'react';
import { StyleSheet, View, Text, FlatList, Pressable, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useAavinStore } from '../../store/AavinStoreContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { DemoHeader } from '../../components/DemoHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState } from '../../components/ui/EmptyState';

export default function SentReceiptsScreen() {
  const { user } = useAuth();
  const { boothReceipts, bmcDeliveries, booths, discrepancyCases } = useAavinStore();
  const { colors, isDark } = useTheme();
  const router = useRouter();

  const boothId = user?.associatedId || 'BOOTH001';
  const booth = booths.find(b => b.id === boothId) || booths[0];

  // All receipts from this booth
  const myReceipts = boothReceipts.filter(r => r.boothId === booth.id);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'pending' | 'matched' | 'mismatch'>('all');

  // Stats calculation
  const totalDispatchedLitres = myReceipts.reduce((sum, r) => sum + r.dispatchQuantity, 0);
  const matchedCount = myReceipts.filter(r => {
    const d = bmcDeliveries.find(del => del.boothReceiptId === r.id);
    return d?.status === 'matched';
  }).length;
  const pendingCount = myReceipts.filter(r => {
    const d = bmcDeliveries.find(del => del.boothReceiptId === r.id);
    return !d || d.status === 'pending_arrival';
  }).length;
  const mismatchCount = myReceipts.filter(r => {
    const d = bmcDeliveries.find(del => del.boothReceiptId === r.id);
    return d?.status === 'mismatch_investigation';
  }).length;

  const filteredReceipts = myReceipts.filter(item => {
    const delivery = bmcDeliveries.find(d => d.boothReceiptId === item.id);
    const status = delivery?.status || 'pending_arrival';

    // Status filter
    if (selectedFilter === 'pending' && status !== 'pending_arrival') return false;
    if (selectedFilter === 'matched' && status !== 'matched' && status !== 'resolved') return false;
    if (selectedFilter === 'mismatch' && status !== 'mismatch_investigation') return false;

    // Search query
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.id.toLowerCase().includes(q) ||
      item.bmcName.toLowerCase().includes(q) ||
      item.verificationCode.toLowerCase().includes(q) ||
      item.collectionDate.includes(q)
    );
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <DemoHeader 
        title="Sent Dispatch Receipts"
        subtitle={`BMC Transit & Reconciliation Ledger • ${booth.name}`}
        showBack
      />

      {/* Top Search & Filter Bar */}
      <View style={[styles.topBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={[styles.searchBox, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderColor: colors.border }]}>
          <Ionicons name="search" size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
          <TextInput
            placeholder="Search Receipt ID, Destination BMC, Date..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { color: colors.text }]}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </Pressable>
          )}
        </View>

        <Button
          title="+ New Receipt"
          size="sm"
          onPress={() => router.push('/(booth)/review-collection')}
        />
      </View>

      {/* Summary KPI Strip */}
      <View style={[styles.kpiContainer, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.kpiRow}>
          <View style={[styles.kpiTile, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.border }]}>
            <Text style={[Typography.caption2, { color: colors.textSecondary, fontWeight: '700' }]}>TOTAL DISPATCHED</Text>
            <Text style={[styles.kpiNumber, { color: colors.primary }]}>
              {totalDispatchedLitres.toFixed(1)} <Text style={{ fontSize: 13 }}>L</Text>
            </Text>
            <Text style={[Typography.caption2, { color: colors.textMuted }]}>{myReceipts.length} Dispatch Receipts</Text>
          </View>

          <View style={[styles.kpiTile, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.border }]}>
            <Text style={[Typography.caption2, { color: colors.textSecondary, fontWeight: '700' }]}>BMC RECONCILED</Text>
            <Text style={[styles.kpiNumber, { color: '#16A34A' }]}>
              {matchedCount} <Text style={{ fontSize: 13 }}>Matched</Text>
            </Text>
            <Text style={[Typography.caption2, { color: '#16A34A' }]}>✓ Verified Weight</Text>
          </View>

          <View style={[styles.kpiTile, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.border }]}>
            <Text style={[Typography.caption2, { color: colors.textSecondary, fontWeight: '700' }]}>IN TRANSIT / HOLD</Text>
            <Text style={[styles.kpiNumber, { color: mismatchCount > 0 ? '#DC2626' : '#0284C7' }]}>
              {pendingCount} <Text style={{ fontSize: 13 }}>Pending</Text>
            </Text>
            <Text style={[Typography.caption2, { color: mismatchCount > 0 ? '#DC2626' : colors.textMuted }]}>
              {mismatchCount > 0 ? `${mismatchCount} Under Audit` : 'Normal Transit'}
            </Text>
          </View>
        </View>

        {/* Filter Chips */}
        <View style={styles.filterChipRow}>
          <Pressable
            onPress={() => setSelectedFilter('all')}
            style={[
              styles.filterChip,
              selectedFilter === 'all'
                ? { backgroundColor: colors.primary, borderColor: colors.primary }
                : { backgroundColor: colors.background, borderColor: colors.border }
            ]}
          >
            <Text style={[styles.filterChipText, { color: selectedFilter === 'all' ? '#FFFFFF' : colors.textSecondary }]}>
              All ({myReceipts.length})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setSelectedFilter('pending')}
            style={[
              styles.filterChip,
              selectedFilter === 'pending'
                ? { backgroundColor: '#0284C7', borderColor: '#0284C7' }
                : { backgroundColor: colors.background, borderColor: colors.border }
            ]}
          >
            <Text style={[styles.filterChipText, { color: selectedFilter === 'pending' ? '#FFFFFF' : colors.textSecondary }]}>
              In Transit ({pendingCount})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setSelectedFilter('matched')}
            style={[
              styles.filterChip,
              selectedFilter === 'matched'
                ? { backgroundColor: '#16A34A', borderColor: '#16A34A' }
                : { backgroundColor: colors.background, borderColor: colors.border }
            ]}
          >
            <Text style={[styles.filterChipText, { color: selectedFilter === 'matched' ? '#FFFFFF' : colors.textSecondary }]}>
              Matched ({matchedCount})
            </Text>
          </Pressable>

          {mismatchCount > 0 && (
            <Pressable
              onPress={() => setSelectedFilter('mismatch')}
              style={[
                styles.filterChip,
                selectedFilter === 'mismatch'
                  ? { backgroundColor: '#DC2626', borderColor: '#DC2626' }
                  : { backgroundColor: colors.background, borderColor: colors.border }
              ]}
            >
              <Text style={[styles.filterChipText, { color: selectedFilter === 'mismatch' ? '#FFFFFF' : '#DC2626' }]}>
                Variance ({mismatchCount})
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Receipts List */}
      <FlatList
        data={filteredReceipts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            title="No Dispatch Receipts"
            message={searchQuery ? `No receipts match "${searchQuery}".` : 'No dispatch receipts found under this filter.'}
            icon="paper-plane-outline"
          />
        }
        renderItem={({ item }) => {
          // Find corresponding BMC delivery to show live status
          const delivery = bmcDeliveries.find(d => d.boothReceiptId === item.id);
          const hasDiscrepancy = delivery?.status === 'mismatch_investigation';

          const getStatusBadge = () => {
            if (!delivery) {
              return { label: 'CONFIRMED DRAFT', bg: '#FEF3C7', color: '#B45309', icon: 'time-outline' as const };
            }
            switch (delivery.status) {
              case 'pending_arrival':
                return { label: 'IN TRANSIT • AWAITING BMC', bg: '#E0F2FE', color: '#0284C7', icon: 'bus-outline' as const };
              case 'matched':
                return { label: 'MATCHED & CONFIRMED', bg: '#DCFCE7', color: '#15803D', icon: 'checkmark-done-circle' as const };
              case 'mismatch_investigation':
                return { label: 'VARIANCE • UNDER INVESTIGATION', bg: '#FEF2F2', color: '#DC2626', icon: 'alert-circle' as const };
              case 'resolved':
                return { label: 'AUDIT RESOLVED', bg: '#F3E8FF', color: '#7E22CE', icon: 'shield-checkmark' as const };
              default:
                return { label: delivery.status.toUpperCase(), bg: '#F1F5F9', color: '#475569', icon: 'ellipse-outline' as const };
            }
          };

          const badge = getStatusBadge();
          const varianceL = delivery?.difference !== undefined ? delivery.difference : 0;

          return (
            <Pressable 
              onPress={() => router.push(`/(booth)/receipt-preview?receiptId=${item.id}` as any)}
              style={({ pressed }) => [{ opacity: pressed ? 0.94 : 1 }]}
            >
              <Card style={[styles.receiptCard, { borderColor: hasDiscrepancy ? '#FCA5A5' : colors.border }]}>
                {/* Header: Receipt Number & Status Badge */}
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.receiptTitleRow}>
                      <Text style={[Typography.headline, { color: colors.text, fontWeight: '900' }]}>
                        {item.id}
                      </Text>
                      <View style={[styles.sessionPill, { backgroundColor: item.session === 'morning' ? '#FEF3C7' : '#E0E7FF' }]}>
                        <Ionicons 
                          name={item.session === 'morning' ? 'sunny' : 'moon'} 
                          size={11} 
                          color={item.session === 'morning' ? '#D97706' : '#4F46E5'} 
                        />
                        <Text style={[styles.sessionPillText, { color: item.session === 'morning' ? '#92400E' : '#3730A3' }]}>
                          {item.session.toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    <Text style={[Typography.caption2, { color: colors.textSecondary, marginTop: 2 }]}>
                      Dispatched on {item.collectionDate} • Created by {item.createdBy}
                    </Text>
                  </View>

                  <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                    <Ionicons name={badge.icon} size={13} color={badge.color} style={{ marginRight: 4 }} />
                    <Text style={[styles.statusText, { color: badge.color }]}>{badge.label}</Text>
                  </View>
                </View>

                {/* Transit Route Node Row */}
                <View style={[styles.routeNodeBox, { backgroundColor: isDark ? '#162032' : '#F8FAFC', borderColor: colors.border }]}>
                  <View style={styles.routeCol}>
                    <View style={styles.nodeIcon}>
                      <Ionicons name="business" size={13} color={colors.primary} />
                    </View>
                    <View>
                      <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Origin Society</Text>
                      <Text style={[Typography.caption1, { color: colors.text, fontWeight: '700' }]} numberOfLines={1}>
                        {item.boothName}
                      </Text>
                    </View>
                  </View>

                  <Ionicons name="arrow-forward" size={16} color={colors.textSecondary} style={{ marginHorizontal: 8 }} />

                  <View style={styles.routeCol}>
                    <View style={[styles.nodeIcon, { backgroundColor: '#E0F2FE' }]}>
                      <Ionicons name="snow" size={13} color="#0284C7" />
                    </View>
                    <View>
                      <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Destination Hub</Text>
                      <Text style={[Typography.caption1, { color: colors.primary, fontWeight: '800' }]} numberOfLines={1}>
                        {item.bmcName}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* 3-Column Reconciliation Metrics */}
                <View style={[styles.reconciliationGrid, { borderColor: colors.border }]}>
                  <View style={styles.gridItem}>
                    <Text style={[Typography.caption2, { color: colors.textSecondary, fontWeight: '700' }]}>
                      DECLARED INTAKE
                    </Text>
                    <Text style={[Typography.title2, { color: colors.primary, fontWeight: '900', marginTop: 2 }]}>
                      {item.dispatchQuantity.toFixed(1)} <Text style={{ fontSize: 13 }}>L</Text>
                    </Text>
                    <Text style={[Typography.caption2, { color: colors.textMuted }]}>
                      Booth Net Total
                    </Text>
                  </View>

                  <View style={[styles.gridItem, styles.gridItemBorder, { borderColor: colors.border }]}>
                    <Text style={[Typography.caption2, { color: colors.textSecondary, fontWeight: '700' }]}>
                      BMC WEIGHED
                    </Text>
                    <Text style={[Typography.title2, { color: colors.text, fontWeight: '900', marginTop: 2 }]}>
                      {delivery?.measuredReceivedQuantity !== undefined 
                        ? `${delivery.measuredReceivedQuantity.toFixed(1)} L` 
                        : 'In Transit'}
                    </Text>
                    <Text style={[Typography.caption2, { color: colors.textMuted }]}>
                      {delivery?.receivedAt ? delivery.receivedAt.split('T')[1]?.slice(0, 5) : 'Awaiting Arrival'}
                    </Text>
                  </View>

                  <View style={styles.gridItem}>
                    <Text style={[Typography.caption2, { color: colors.textSecondary, fontWeight: '700' }]}>
                      VARIANCE
                    </Text>
                    <Text 
                      style={[
                        Typography.title2, 
                        { 
                          fontWeight: '900', 
                          marginTop: 2,
                          color: !delivery?.measuredReceivedQuantity 
                            ? colors.textMuted 
                            : varianceL > 0 
                              ? '#DC2626' 
                              : '#16A34A' 
                        }
                      ]}
                    >
                      {delivery?.measuredReceivedQuantity !== undefined 
                        ? `${varianceL > 0 ? '+' : ''}${varianceL.toFixed(1)} L` 
                        : '0.0 L'}
                    </Text>
                    <Text style={[Typography.caption2, { color: !delivery?.measuredReceivedQuantity ? colors.textMuted : varianceL > 0 ? '#DC2626' : '#16A34A' }]}>
                      {!delivery?.measuredReceivedQuantity ? 'Pending BMC' : Math.abs(varianceL) <= 0.5 ? 'Within Tolerance' : '⚠️ Discrepancy'}
                    </Text>
                  </View>
                </View>

                {/* Card Footer: Metadata & Waybill Link */}
                <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                  <View style={styles.footerTagsRow}>
                    <Text style={[Typography.caption2, { color: colors.textSecondary, fontWeight: '600' }]}>
                      👨‍🌾 {item.totalFarmersCount} Producers • 🥛 {item.totalRecordsCount} Batches
                    </Text>
                    <Text style={[Typography.caption2, { color: colors.primary, fontWeight: '700', marginLeft: 8 }]}>
                      Token: {item.verificationCode}
                    </Text>
                  </View>

                  <View style={styles.openWaybillLink}>
                    <Text style={[Typography.caption1, { color: colors.primary, fontWeight: '800' }]}>
                      View Digital Slip
                    </Text>
                    <Ionicons name="arrow-forward" size={14} color={colors.primary} style={{ marginLeft: 3 }} />
                  </View>
                </View>
              </Card>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 10,
    borderBottomWidth: 1,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 4,
  },
  kpiContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 8,
  },
  kpiTile: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 2,
  },
  kpiNumber: {
    fontSize: 18,
    fontWeight: '900',
  },
  filterChipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 40,
  },
  receiptCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  receiptTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sessionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  sessionPillText: {
    fontSize: 9,
    fontWeight: '800',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  routeNodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  routeCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nodeIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#EEF2F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reconciliationGrid: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.01)',
  },
  gridItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  gridItemBorder: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerTagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  openWaybillLink: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
