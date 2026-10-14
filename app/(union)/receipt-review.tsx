import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, TextInput, Alert, Modal, Pressable, BackHandler } from 'react-native';
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
import { BMCReceipt } from '../../types/aavin';

export default function UnionReceiptReviewScreen() {
  const { user } = useAuth();
  const { bmcReceipts, bmcDeliveries, reviewBmcReceipt } = useAavinStore();
  const { colors } = useTheme();
  const router = useRouter();

  const handleBackToHome = () => {
    router.replace('/(union)' as any);
  };

  useEffect(() => {
    const onBackPress = () => {
      handleBackToHome();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, []);

  const [selectedReceipt, setSelectedReceipt] = useState<BMCReceipt | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [actionType, setActionType] = useState<'reviewed_by_union' | 'returned_for_correction'>('reviewed_by_union');
  const [bmcFilter, setBmcFilter] = useState<string>('all');

  const { bmcs } = useAavinStore();

  const filteredReceipts = bmcReceipts.filter(r => {
    if (bmcFilter !== 'all' && r.bmcId !== bmcFilter) return false;
    return true;
  });

  const handleOpenReview = (receipt: BMCReceipt, type: 'reviewed_by_union' | 'returned_for_correction' = 'reviewed_by_union') => {
    setSelectedReceipt(receipt);
    setActionType(type);
    setReviewNotes(receipt.unionReviewNotes || '');
  };

  const handleSaveReview = () => {
    if (!selectedReceipt) return;

    if (!reviewNotes.trim()) {
      Alert.alert('Notes Required', 'Please enter review findings or directives.');
      return;
    }

    setReviewing(true);
    try {
      reviewBmcReceipt(
        selectedReceipt.id,
        reviewNotes.trim(),
        user?.fullName || 'Dr. S. Sundaram (General Manager)',
        actionType
      );

      setSelectedReceipt(null);
      Alert.alert(
        actionType === 'reviewed_by_union' ? 'Consolidated Report Approved' : 'Report Returned for Correction',
        `Receipt #${selectedReceipt.id} updated with executive directives. Audit history preserved.`
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not save review.');
    } finally {
      setReviewing(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <DemoHeader
        title="BMC Daily Receipts Review"
        subtitle="Executive Audit & Reconciliation • Madurai District"
        showBack
        onBack={handleBackToHome}
      />

      {/* BMC Filter Chips */}
      <View style={styles.bmcFilterRow}>
        <Pressable
          style={[
            styles.bmcFilterChip,
            bmcFilter === 'all' && { backgroundColor: colors.primary, borderColor: colors.primary }
          ]}
          onPress={() => setBmcFilter('all')}
        >
          <Text style={[styles.filterChipText, bmcFilter === 'all' && { color: '#FFFFFF' }]}>
            All BMCs ({bmcReceipts.length})
          </Text>
        </Pressable>

        {bmcs.map(b => (
          <Pressable
            key={b.id}
            style={[
              styles.bmcFilterChip,
              bmcFilter === b.id && { backgroundColor: colors.primary, borderColor: colors.primary }
            ]}
            onPress={() => setBmcFilter(b.id)}
          >
            <Text style={[styles.filterChipText, bmcFilter === b.id && { color: '#FFFFFF' }]}>
              {b.name}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={filteredReceipts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            title="No BMC Receipts Found"
            message="No collection receipts match the current BMC filter criteria."
            icon="document-text-outline"
          />
        }
        renderItem={({ item }) => {
          const isReviewed = item.status === 'reviewed_by_union';
          const isReturned = item.status === 'returned_for_correction';
          const linkedDeliveries = bmcDeliveries.filter(d => item.includedDeliveryIds.includes(d.id));

          return (
            <Card style={[
              styles.card, 
              item.hasDiscrepancies && { borderColor: '#F59E0B', borderWidth: 1.5 },
              isReturned && { borderColor: '#EF4444', borderWidth: 1.5 }
            ]}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                  <Text style={[Typography.headline, { color: colors.text, fontWeight: '900' }]}>
                    {item.id}
                  </Text>
                  <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                    BMC: {item.bmcName} • Period: {item.reportingPeriodType ? item.reportingPeriodType.toUpperCase() : 'DAILY'} ({item.collectionDate})
                  </Text>
                </View>

                <View style={[
                  styles.statusBadge, 
                  { 
                    backgroundColor: isReviewed ? '#DCFCE7' : isReturned ? '#FEE2E2' : '#FEF3C7', 
                    flexShrink: 0 
                  }
                ]}>
                  <Text style={[
                    styles.statusText, 
                    { color: isReviewed ? '#15803D' : isReturned ? '#991B1B' : '#B45309' }
                  ]}>
                    {isReviewed ? 'APPROVED BY UNION' : isReturned ? 'RETURNED FOR CORRECTION' : 'PENDING REVIEW'}
                  </Text>
                </View>
              </View>

              {/* Volume & Financial Grid */}
              <View style={[styles.volumeGrid, { borderTopColor: colors.border }]}>
                <View style={styles.volItem}>
                  <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Declared Litres</Text>
                  <Text style={[Typography.title2, { color: colors.text, fontWeight: '800' }]}>
                    {item.totalDeclaredQuantity.toFixed(1)} L
                  </Text>
                </View>

                <View style={styles.volItem}>
                  <Text style={[Typography.caption2, { color: colors.primary }]}>Received at BMC</Text>
                  <Text style={[Typography.title2, { color: colors.primary, fontWeight: '900' }]}>
                    {item.totalReceivedQuantity.toFixed(1)} L
                  </Text>
                </View>

                <View style={styles.volItem}>
                  <Text style={[Typography.caption2, { color: item.netDifference > 0 ? '#DC2626' : '#16A34A' }]}>
                    Net Variance
                  </Text>
                  <Text
                    style={[
                      Typography.title2,
                      {
                        fontWeight: '900',
                        color: item.netDifference > 0 ? '#DC2626' : '#16A34A'
                      }
                    ]}
                  >
                    {item.netDifference > 0 ? `-${item.netDifference.toFixed(1)} L` : '0.0 L'}
                  </Text>
                </View>
              </View>

              {/* Financial Total if present */}
              {item.totalRecordedIncome !== undefined && item.totalRecordedIncome > 0 && (
                <View style={styles.incomeHighlightStrip}>
                  <Ionicons name="cash-outline" size={16} color="#059669" />
                  <Text style={[Typography.caption1, { color: '#047857', fontWeight: '800', marginLeft: 6 }]}>
                    Recorded Society Income: ₹{item.totalRecordedIncome.toLocaleString('en-IN')}
                  </Text>
                </View>
              )}

              {/* Consolidated Society Breakdown if available */}
              {item.societySummaries && item.societySummaries.length > 0 ? (
                <View style={styles.linkedSection}>
                  <Text style={[Typography.caption2, { color: colors.textSecondary, fontWeight: '800', marginBottom: 6 }]}>
                    CONSOLIDATED FEEDER SOCIETIES ({item.societySummaries.length})
                  </Text>
                  {item.societySummaries.map((s) => (
                    <View key={s.societyId} style={styles.deliveryCard}>
                      <View style={styles.deliveryTopRow}>
                        <Text style={[Typography.caption1, { color: colors.text, fontWeight: '700', flex: 1 }]} numberOfLines={1}>
                          • {s.societyName}
                        </Text>
                        <Text style={[Typography.caption2, { 
                          fontWeight: '800', 
                          color: s.varianceLitres > 0 ? '#DC2626' : '#16A34A' 
                        }]}>
                          {s.varianceLitres > 0 ? `-${s.varianceLitres}L` : 'Balanced'}
                        </Text>
                      </View>
                      <Text style={[Typography.caption2, { color: colors.textSecondary, marginTop: 2 }]}>
                        Declared: {s.declaredLitres}L | Received: {s.receivedLitres}L | Income: ₹{s.recordedIncome.toLocaleString('en-IN')}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.linkedSection}>
                  <Text style={[Typography.caption2, { color: colors.textSecondary, fontWeight: '800', marginBottom: 6 }]}>
                    LINKED FEEDER DELIVERIES ({linkedDeliveries.length})
                  </Text>
                  {linkedDeliveries.map((d) => (
                    <View key={d.id} style={styles.deliveryCard}>
                      <View style={styles.deliveryTopRow}>
                        <Text style={[Typography.caption1, { color: colors.primaryDark, fontWeight: '700', flex: 1 }]} numberOfLines={1}>
                          • {d.boothName?.replace(/cooling booth/gi, 'Society').replace(/booth/gi, 'Society')}
                        </Text>
                        <Text
                          style={[
                            Typography.caption2,
                            {
                              fontWeight: '800',
                              color: (d.difference || 0) > 0 ? '#DC2626' : '#16A34A',
                            }
                          ]}
                        >
                          {d.difference !== undefined ? `${d.difference > 0 ? `-${d.difference}L` : 'OK'}` : ''}
                        </Text>
                      </View>
                      <Text style={[Typography.caption2, { color: colors.textSecondary, marginTop: 2 }]}>
                        Declared: {d.declaredDispatchQuantity}L | Measured: {d.measuredReceivedQuantity || 'Pending'}L
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {item.supervisorNotes && (
                <View style={[styles.reviewNotesBox, { backgroundColor: '#F8FAFC', borderColor: colors.border }]}>
                  <Text style={[Typography.caption2, { color: colors.textSecondary, fontWeight: '700' }]}>
                    BMC SUPERVISOR REMARKS: "{item.supervisorNotes}"
                  </Text>
                </View>
              )}

              {item.unionReviewNotes && (
                <View style={[styles.reviewNotesBox, { 
                  backgroundColor: isReturned ? '#FEF2F2' : '#F0FDF4', 
                  borderColor: isReturned ? '#FCA5A5' : '#BBF7D0' 
                }]}>
                  <Text style={[Typography.caption1, { color: isReturned ? '#991B1B' : '#166534', fontWeight: '800' }]}>
                    GM DIRECTIVE: {item.unionReviewNotes}
                  </Text>
                  <Text style={[Typography.caption2, { color: isReturned ? '#B91C1C' : '#15803D', marginTop: 2 }]}>
                    Actioned by: {item.reviewedBy || 'General Manager'} on {item.reviewedAt?.split('T')[0]}
                  </Text>
                </View>
              )}

              {/* Action Buttons: Approve vs Return for Correction */}
              <View style={styles.cardActionsRow}>
                <Button
                  title="✅ Approve Report"
                  size="sm"
                  variant="primary"
                  style={{ flex: 1 }}
                  onPress={() => handleOpenReview(item, 'reviewed_by_union')}
                />
                <Button
                  title="⚠️ Return for Correction"
                  size="sm"
                  variant="outline"
                  style={{ flex: 1 }}
                  onPress={() => handleOpenReview(item, 'returned_for_correction')}
                />
              </View>
            </Card>
          );
        }}
      />

      {/* Review Modal */}
      {selectedReceipt && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setSelectedReceipt(null)}>
          <Pressable style={styles.modalOverlay} onPress={() => setSelectedReceipt(null)}>
            <View style={[styles.modalSheet, { backgroundColor: colors.card }]} onStartShouldSetResponder={() => true}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={[Typography.title2, { color: colors.text, fontWeight: '900' }]}>
                    {actionType === 'reviewed_by_union' ? 'Approve BMC Report' : 'Return for Correction'}
                  </Text>
                  <Text style={[Typography.caption1, { color: colors.textSecondary }]}>
                    Receipt #{selectedReceipt.id} • {selectedReceipt.bmcName}
                  </Text>
                </View>
                <Pressable onPress={() => setSelectedReceipt(null)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </Pressable>
              </View>

              <Text style={[Typography.caption1, { color: colors.textSecondary, marginBottom: 4 }]}>
                Executive Directives & Audit Notes *
              </Text>
              <TextInput
                placeholder={actionType === 'reviewed_by_union' 
                  ? "e.g. Approved for central dairy plant transfer and fortnight financial disbursement." 
                  : "e.g. Clarification required on Melur society 12.5L variance before approval."}
                placeholderTextColor={colors.textMuted}
                value={reviewNotes}
                onChangeText={setReviewNotes}
                multiline
                numberOfLines={4}
                style={[styles.inputField, { color: colors.text, borderColor: colors.border }]}
              />

              <Button
                title={reviewing ? "Saving Decision..." : actionType === 'reviewed_by_union' ? "Confirm Union Approval" : "Return to BMC for Correction"}
                size="lg"
                variant={actionType === 'reviewed_by_union' ? 'primary' : 'destructive'}
                loading={reviewing}
                onPress={handleSaveReview}
                style={{ marginTop: 16 }}
              />
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
  bmcFilterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
    gap: 8,
  },
  bmcFilterChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  listContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 40,
  },
  card: {
    padding: 16,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flexShrink: 0,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  volumeGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  volItem: {
    flex: 1,
  },
  incomeHighlightStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(5, 150, 105, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 6,
  },
  linkedSection: {
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    marginVertical: 8,
    gap: 8,
  },
  deliveryCard: {
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  deliveryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewNotesBox: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 6,
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  inputField: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
  },
});
