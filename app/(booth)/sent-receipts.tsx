import React, { useState } from 'react';
import { StyleSheet, View, Text, FlatList, Pressable, TextInput, Modal, ScrollView } from 'react-native';
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
import { BoothReceipt } from '../../types/aavin';

export default function SentReceiptsScreen() {
  const { user } = useAuth();
  const { boothReceipts, bmcDeliveries, booths } = useAavinStore();
  const { colors, isDark } = useTheme();
  const router = useRouter();

  const boothId = user?.associatedId || 'BOOTH001';
  const booth = booths.find(b => b.id === boothId) || booths[0];

  // All receipts from this booth
  const myReceipts = boothReceipts.filter(r => r.boothId === booth.id);

  // Filters, Search & Popup Detail State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'pending' | 'matched' | 'mismatch'>('all');
  const [selectedDetailReceipt, setSelectedDetailReceipt] = useState<BoothReceipt | null>(null);

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
            placeholder="Search Receipt ID, BMC, Date..."
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
          <View style={styles.kpiItem}>
            <Text style={[styles.kpiValue, { color: colors.primary }]}>
              {totalDispatchedLitres.toFixed(1)} L
            </Text>
            <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
              Total Dispatched
            </Text>
          </View>

          <View style={[styles.kpiDivider, { backgroundColor: colors.border }]} />

          <View style={styles.kpiItem}>
            <Text style={[styles.kpiValue, { color: '#16A34A' }]}>
              {matchedCount} / {myReceipts.length}
            </Text>
            <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
              Reconciled
            </Text>
          </View>

          <View style={[styles.kpiDivider, { backgroundColor: colors.border }]} />

          <View style={styles.kpiItem}>
            <Text style={[styles.kpiValue, { color: mismatchCount > 0 ? '#DC2626' : '#0284C7' }]}>
              {mismatchCount > 0 ? `${mismatchCount} Variance` : `${pendingCount} In Transit`}
            </Text>
            <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
              Current Status
            </Text>
          </View>
        </View>

        {/* Filter Pills */}
        <View style={styles.filterRow}>
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

      {/* Receipts List - Clean, compact scannable cards */}
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
                return { label: 'IN TRANSIT', bg: '#E0F2FE', color: '#0284C7', icon: 'bus-outline' as const };
              case 'matched':
                return { label: 'MATCHED', bg: '#DCFCE7', color: '#15803D', icon: 'checkmark-done-circle' as const };
              case 'mismatch_investigation':
                return { label: 'VARIANCE', bg: '#FEF2F2', color: '#DC2626', icon: 'alert-circle' as const };
              case 'resolved':
                return { label: 'RESOLVED', bg: '#F3E8FF', color: '#7E22CE', icon: 'shield-checkmark' as const };
              default:
                return { label: delivery.status.toUpperCase(), bg: '#F1F5F9', color: '#475569', icon: 'ellipse-outline' as const };
            }
          };

          const badge = getStatusBadge();
          const varianceL = delivery?.difference !== undefined ? delivery.difference : 0;

          return (
            <Card style={[styles.compactReceiptCard, { borderColor: hasDiscrepancy ? '#FCA5A5' : colors.border }]}>
              {/* Header: Receipt Number, Session & Status Badge */}
              <View style={styles.compactHeaderRow}>
                <View style={styles.compactTitleGroup}>
                  <Text style={[Typography.subhead, { color: colors.text, fontWeight: '900' }]}>
                    #{item.id}
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

                <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                  <Ionicons name={badge.icon} size={12} color={badge.color} style={{ marginRight: 4 }} />
                  <Text style={[styles.statusText, { color: badge.color }]}>{badge.label}</Text>
                </View>
              </View>

              {/* Summary Body Row: Dispatched Volume, Destination & Date */}
              <View style={styles.compactBodyRow}>
                <View style={styles.compactVolumeCol}>
                  <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Dispatched Quantity</Text>
                  <Text style={[styles.compactBigVolume, { color: colors.primary }]}>
                    {item.dispatchQuantity.toFixed(2)} <Text style={{ fontSize: 13, fontWeight: '700' }}>Litres</Text>
                  </Text>
                </View>

                <View style={[styles.compactVDivider, { backgroundColor: colors.border }]} />

                <View style={styles.compactMetaCol}>
                  <View style={styles.compactMetaItem}>
                    <Ionicons name="business-outline" size={13} color={colors.textSecondary} />
                    <Text style={[Typography.caption2, { color: colors.text, fontWeight: '700', marginLeft: 4 }]} numberOfLines={1}>
                      {item.bmcName}
                    </Text>
                  </View>
                  <View style={styles.compactMetaItem}>
                    <Ionicons name="calendar-outline" size={13} color={colors.textSecondary} />
                    <Text style={[Typography.caption2, { color: colors.textSecondary, marginLeft: 4 }]}>
                      {item.collectionDate}
                    </Text>
                  </View>
                  <View style={styles.compactMetaItem}>
                    <Ionicons 
                      name={delivery?.status === 'matched' ? "checkmark-circle" : (hasDiscrepancy ? "warning" : "time-outline")} 
                      size={13} 
                      color={delivery?.status === 'matched' ? "#16A34A" : (hasDiscrepancy ? "#DC2626" : "#0284C7")} 
                    />
                    <Text style={[Typography.caption2, { color: delivery?.status === 'matched' ? "#16A34A" : (hasDiscrepancy ? "#DC2626" : colors.textMuted), fontWeight: '700', marginLeft: 4 }]}>
                      {delivery?.status === 'matched' ? 'Reconciled' : (hasDiscrepancy ? `${varianceL > 0 ? '+' : ''}${varianceL.toFixed(1)} L Variance` : 'In Transit')}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Card Footer: More View Button (Popup Modal) & Direct Waybill Link */}
              <View style={[styles.compactFooterRow, { borderTopColor: colors.border }]}>
                {/* User Requested: 'More View' Button to open full data popup */}
                <Pressable
                  onPress={() => setSelectedDetailReceipt(item)}
                  style={[styles.moreViewBtn, { backgroundColor: isDark ? '#1E293B' : '#EFF6FF', borderColor: '#BFDBFE' }]}
                >
                  <Ionicons name="eye-outline" size={15} color="#0072BC" />
                  <Text style={[styles.moreViewBtnText, { color: '#0072BC' }]}>
                    More View
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => router.push(`/(booth)/receipt-preview?receiptId=${item.id}` as any)}
                  style={styles.waybillQuickLink}
                >
                  <Text style={[Typography.caption1, { color: colors.primary, fontWeight: '800' }]}>
                    Digital Slip
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.primary} />
                </Pressable>
              </View>
            </Card>
          );
        }}
      />

      {/* Full Data Detail Popup Modal */}
      {selectedDetailReceipt && (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedDetailReceipt(null)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setSelectedDetailReceipt(null)}>
            <View
              style={[styles.modalContentBox, { backgroundColor: colors.card, borderColor: colors.border }]}
              onStartShouldSetResponder={() => true}
            >
              {/* Modal Header */}
              <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[Typography.caption2, { color: colors.primary, fontWeight: '800', letterSpacing: 0.5 }]}>
                    CONSIGNMENT AUDIT DETAILS
                  </Text>
                  <Text style={[Typography.title2, { color: colors.text, fontWeight: '900', marginTop: 2 }]}>
                    #{selectedDetailReceipt.id}
                  </Text>
                </View>
                <Pressable onPress={() => setSelectedDetailReceipt(null)} hitSlop={10} style={styles.modalCloseBtn}>
                  <Ionicons name="close" size={22} color={colors.text} />
                </Pressable>
              </View>

              <ScrollView style={styles.modalScrollBody} showsVerticalScrollIndicator={false}>
                {(() => {
                  const delivery = bmcDeliveries.find(d => d.boothReceiptId === selectedDetailReceipt.id);
                  let modalBadge: { label: string; bg: string; color: string; icon: keyof typeof Ionicons.glyphMap } = {
                    label: 'CONFIRMED DRAFT',
                    bg: '#FEF3C7',
                    color: '#B45309',
                    icon: 'time-outline',
                  };
                  if (delivery) {
                    if (delivery.status === 'pending_arrival') {
                      modalBadge = { label: 'IN TRANSIT • AWAITING BMC', bg: '#E0F2FE', color: '#0284C7', icon: 'bus-outline' as const };
                    } else if (delivery.status === 'matched') {
                      modalBadge = { label: 'MATCHED & CONFIRMED', bg: '#DCFCE7', color: '#15803D', icon: 'checkmark-done-circle' as const };
                    } else if (delivery.status === 'mismatch_investigation') {
                      modalBadge = { label: 'VARIANCE • UNDER INVESTIGATION', bg: '#FEF2F2', color: '#DC2626', icon: 'alert-circle' as const };
                    } else if (delivery.status === 'resolved') {
                      modalBadge = { label: 'AUDIT RESOLVED', bg: '#F3E8FF', color: '#7E22CE', icon: 'shield-checkmark' as const };
                    }
                  }
                  const varianceL = delivery?.difference !== undefined ? delivery.difference : 0;

                  return (
                    <View style={{ gap: 12 }}>
                      {/* Status Strip in Modal */}
                      <View style={[styles.modalStatusStrip, { backgroundColor: modalBadge.bg }]}>
                        <Ionicons name={modalBadge.icon} size={15} color={modalBadge.color} style={{ marginRight: 6 }} />
                        <Text style={[styles.modalStatusText, { color: modalBadge.color }]}>
                          {modalBadge.label}
                        </Text>
                      </View>

                      {/* Spotlight Volume */}
                      <View style={[styles.modalVolumeBox, { backgroundColor: isDark ? '#1E293B' : '#EFF6FF', borderColor: '#BFDBFE' }]}>
                        <Text style={[Typography.caption2, { color: colors.primary, fontWeight: '800' }]}>
                          DECLARED DISPATCH QUANTITY
                        </Text>
                        <Text style={[styles.modalBigVolumeNumber, { color: colors.primary }]}>
                          {selectedDetailReceipt.dispatchQuantity.toFixed(2)} <Text style={{ fontSize: 18, fontWeight: '700' }}>Litres</Text>
                        </Text>
                        <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                          Digitally sealed & verified by {selectedDetailReceipt.createdBy}
                        </Text>
                      </View>

                      {/* Full Transit Route Corridor */}
                      <View style={[styles.modalCorridorBox, { backgroundColor: isDark ? '#162032' : '#F8FAFC', borderColor: colors.border }]}>
                        <View style={styles.modalCorridorNode}>
                          <Ionicons name="business" size={16} color={colors.primary} />
                          <Text style={[Typography.caption2, { color: colors.textSecondary, marginTop: 4 }]}>Origin Society</Text>
                          <Text style={[Typography.caption1, { color: colors.text, fontWeight: '800', textAlign: 'center' }]}>
                            {selectedDetailReceipt.boothName}
                          </Text>
                        </View>
                        <Ionicons name="arrow-forward-circle" size={22} color="#0284C7" />
                        <View style={styles.modalCorridorNode}>
                          <Ionicons name="snow" size={16} color="#0284C7" />
                          <Text style={[Typography.caption2, { color: colors.textSecondary, marginTop: 4 }]}>Destination BMC</Text>
                          <Text style={[Typography.caption1, { color: colors.primary, fontWeight: '800', textAlign: 'center' }]}>
                            {selectedDetailReceipt.bmcName}
                          </Text>
                        </View>
                      </View>

                      {/* Full 3-Column Reconciliation Grid */}
                      <View style={[styles.modalReconGrid, { borderColor: colors.border }]}>
                        <View style={styles.modalReconCol}>
                          <Text style={[Typography.caption2, { color: colors.textSecondary, fontWeight: '700' }]}>DECLARED</Text>
                          <Text style={[Typography.headline, { color: colors.primary, fontWeight: '900', marginTop: 2 }]}>
                            {selectedDetailReceipt.dispatchQuantity.toFixed(1)} L
                          </Text>
                        </View>
                        <View style={[styles.modalReconCol, styles.modalReconColBorder, { borderColor: colors.border }]}>
                          <Text style={[Typography.caption2, { color: colors.textSecondary, fontWeight: '700' }]}>BMC WEIGHED</Text>
                          <Text style={[Typography.headline, { color: colors.text, fontWeight: '900', marginTop: 2 }]}>
                            {delivery?.measuredReceivedQuantity !== undefined ? `${delivery.measuredReceivedQuantity.toFixed(1)} L` : 'In Transit'}
                          </Text>
                        </View>
                        <View style={styles.modalReconCol}>
                          <Text style={[Typography.caption2, { color: colors.textSecondary, fontWeight: '700' }]}>VARIANCE</Text>
                          <Text style={[Typography.headline, { color: !delivery?.measuredReceivedQuantity ? colors.textMuted : varianceL > 0 ? '#DC2626' : '#16A34A', fontWeight: '900', marginTop: 2 }]}>
                            {delivery?.measuredReceivedQuantity !== undefined ? `${varianceL > 0 ? '+' : ''}${varianceL.toFixed(1)} L` : '0.0 L'}
                          </Text>
                        </View>
                      </View>

                      {/* Full Audit Metadata Table */}
                      <View style={[styles.modalDetailsTable, { borderColor: colors.border }]}>
                        <View style={styles.modalDetailRow}>
                          <Text style={[Typography.caption1, { color: colors.textSecondary }]}>Collection Date:</Text>
                          <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700' }]}>
                            {selectedDetailReceipt.collectionDate} ({selectedDetailReceipt.session.toUpperCase()} Shift)
                          </Text>
                        </View>
                        <View style={styles.modalDetailRow}>
                          <Text style={[Typography.caption1, { color: colors.textSecondary }]}>Contributing Producers:</Text>
                          <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700' }]}>
                            {selectedDetailReceipt.totalFarmersCount} Farmers ({selectedDetailReceipt.totalRecordsCount} Batches)
                          </Text>
                        </View>
                        <View style={styles.modalDetailRow}>
                          <Text style={[Typography.caption1, { color: colors.textSecondary }]}>Audit Measurement Basis:</Text>
                          <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700' }]}>
                            {selectedDetailReceipt.measurementBasis.toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.modalDetailRow}>
                          <Text style={[Typography.caption1, { color: colors.textSecondary }]}>Verification Token:</Text>
                          <Text style={[Typography.subhead, { color: colors.primary, fontWeight: '800' }]}>
                            {selectedDetailReceipt.verificationCode}
                          </Text>
                        </View>
                        <View style={styles.modalDetailRow}>
                          <Text style={[Typography.caption1, { color: colors.textSecondary }]}>Authorized Officer:</Text>
                          <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700' }]}>
                            {selectedDetailReceipt.createdBy}
                          </Text>
                        </View>
                        {selectedDetailReceipt.notes && (
                          <View style={styles.modalDetailRow}>
                            <Text style={[Typography.caption1, { color: colors.textSecondary }]}>Consignment Remarks:</Text>
                            <Text style={[Typography.caption1, { color: colors.text, fontWeight: '600', flex: 1, textAlign: 'right' }]}>
                              {selectedDetailReceipt.notes}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })()}
              </ScrollView>

              {/* Modal Action Buttons */}
              <View style={[styles.modalFooterActions, { borderTopColor: colors.border }]}>
                <Button
                  title="Open Full Digital Waybill Slip ➔"
                  size="md"
                  onPress={() => {
                    const rId = selectedDetailReceipt.id;
                    setSelectedDetailReceipt(null);
                    router.push(`/(booth)/receipt-preview?receiptId=${rId}` as any);
                  }}
                />
                <Button
                  title="Close"
                  variant="outline"
                  size="md"
                  onPress={() => setSelectedDetailReceipt(null)}
                  style={{ marginTop: 8 }}
                />
              </View>
            </View>
          </Pressable>
        </Modal>
      )}
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
  },
  kpiContainer: {
    padding: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  kpiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kpiItem: {
    flex: 1,
    alignItems: 'center',
  },
  kpiValue: {
    fontSize: 16,
    fontWeight: '900',
  },
  kpiDivider: {
    width: 1,
    height: 24,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  listContent: {
    padding: 14,
    gap: 12,
    paddingBottom: 40,
  },
  compactReceiptCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  compactHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  compactTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  compactBodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  compactVolumeCol: {
    flex: 1,
  },
  compactBigVolume: {
    fontSize: 24,
    fontWeight: '900',
    marginTop: 2,
    letterSpacing: -0.3,
  },
  compactVDivider: {
    width: 1,
    height: 36,
    marginHorizontal: 12,
  },
  compactMetaCol: {
    flex: 1.2,
    gap: 4,
  },
  compactMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  moreViewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  moreViewBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  waybillQuickLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 2,
  },

  /* Modal Popup Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContentBox: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '85%',
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScrollBody: {
    padding: 16,
  },
  modalStatusStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  modalStatusText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  modalVolumeBox: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  modalBigVolumeNumber: {
    fontSize: 32,
    fontWeight: '900',
    marginVertical: 2,
  },
  modalCorridorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  modalCorridorNode: {
    flex: 1,
    alignItems: 'center',
  },
  modalReconGrid: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
  },
  modalReconCol: {
    flex: 1,
    alignItems: 'center',
  },
  modalReconColBorder: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  modalDetailsTable: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  modalDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalFooterActions: {
    padding: 14,
    borderTopWidth: 1,
  },
});
