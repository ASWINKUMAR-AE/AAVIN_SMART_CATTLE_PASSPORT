import React, { useState } from 'react';
import { StyleSheet, View, Text, FlatList, TextInput, Alert, Modal, Pressable } from 'react-native';
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

  const [selectedReceipt, setSelectedReceipt] = useState<BMCReceipt | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewing, setReviewing] = useState(false);

  const handleOpenReview = (receipt: BMCReceipt) => {
    setSelectedReceipt(receipt);
    setReviewNotes(receipt.unionReviewNotes || '');
  };

  const handleSaveReview = () => {
    if (!selectedReceipt) return;

    if (!reviewNotes.trim()) {
      Alert.alert('Notes Required', 'Please enter executive review findings or directives.');
      return;
    }

    setReviewing(true);
    try {
      reviewBmcReceipt(
        selectedReceipt.id,
        reviewNotes.trim(),
        user?.fullName || 'Dr. S. Sundaram (General Manager)'
      );

      setSelectedReceipt(null);
      Alert.alert(
        'Executive Review Saved',
        `Receipt #${selectedReceipt.id} marked as 'Reviewed by Union' with executive directives. Audit history preserved.`
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
      />

      <FlatList
        data={bmcReceipts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            title="No BMC Receipts"
            message="No daily collection receipts have been submitted by BMC centers yet."
            icon="document-text-outline"
          />
        }
        renderItem={({ item }) => {
          const isPending = item.status === 'sent_to_union';
          const isReviewed = item.status === 'reviewed_by_union';
          const linkedDeliveries = bmcDeliveries.filter(d => item.includedDeliveryIds.includes(d.id));

          return (
            <Card style={[styles.card, item.hasDiscrepancies && { borderColor: '#F59E0B', borderWidth: 1.5 }]}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                  <Text style={[Typography.headline, { color: colors.text, fontWeight: '900' }]}>
                    {item.id}
                  </Text>
                  <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                    BMC: {item.bmcName} • Date: {item.collectionDate}
                  </Text>
                </View>

                <View style={[styles.statusBadge, { backgroundColor: isReviewed ? '#DCFCE7' : '#FEF3C7', flexShrink: 0 }]}>
                  <Text style={[styles.statusText, { color: isReviewed ? '#15803D' : '#B45309' }]}>
                    {isReviewed ? 'REVIEWED & AUDITED' : 'PENDING REVIEW'}
                  </Text>
                </View>
              </View>

              {/* Volume Comparison Table */}
              <View style={[styles.volumeGrid, { borderTopColor: colors.border }]}>
                <View style={styles.volItem}>
                  <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Declared by Societies</Text>
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

              {/* Linked Feeder Deliveries list preview */}
              <View style={styles.linkedSection}>
                <Text style={[Typography.caption2, { color: colors.textSecondary, fontWeight: '800', marginBottom: 6 }]}>
                  LINKED FEEDER DELIVERIES ({linkedDeliveries.length})
                </Text>
                {linkedDeliveries.map((d) => (
                  <View key={d.id} style={styles.deliveryCard}>
                    <View style={styles.deliveryTopRow}>
                      <Text style={[Typography.caption1, { color: colors.primaryDark, fontWeight: '700', flex: 1, minWidth: 0, marginRight: 8 }]} numberOfLines={1}>
                        • {d.boothName?.replace(/cooling booth/gi, 'Society').replace(/booth/gi, 'Society')}
                      </Text>
                      <Text
                        style={[
                          Typography.caption2,
                          {
                            fontWeight: '800',
                            color: (d.difference || 0) > 0 ? '#DC2626' : '#16A34A',
                            flexShrink: 0
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

              {item.unionReviewNotes && (
                <View style={[styles.reviewNotesBox, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
                  <Text style={[Typography.caption1, { color: '#166534', fontWeight: '800' }]}>
                    GM DIRECTIVE: {item.unionReviewNotes}
                  </Text>
                  <Text style={[Typography.caption2, { color: '#15803D', marginTop: 2 }]}>
                    Reviewed by: {item.reviewedBy || 'General Manager'} on {item.reviewedAt?.split('T')[0]}
                  </Text>
                </View>
              )}

              {/* Action */}
              <Button
                title={isReviewed ? "Update Directives / Notes" : "Audit & Review BMC Receipt"}
                variant={isReviewed ? "outline" : "primary"}
                onPress={() => handleOpenReview(item)}
                style={{ marginTop: 12 }}
              />
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
                    Review BMC Receipt #{selectedReceipt.id}
                  </Text>
                  <Text style={[Typography.caption1, { color: colors.textSecondary }]}>
                    {selectedReceipt.bmcName} • Net Received: {selectedReceipt.totalReceivedQuantity} L
                  </Text>
                </View>
                <Pressable onPress={() => setSelectedReceipt(null)}><Ionicons name="close" size={24} color={colors.text} /></Pressable>
              </View>

              <Text style={[Typography.caption1, { color: colors.textSecondary, marginBottom: 4 }]}>
                Executive Directives / Findings *
              </Text>
              <TextInput
                placeholder="e.g. Approved for central dairy plant transfer. Investigation case DISC-101 referred for tanker seal inspection."
                placeholderTextColor={colors.textMuted}
                value={reviewNotes}
                onChangeText={setReviewNotes}
                multiline
                numberOfLines={4}
                style={[styles.inputField, { color: colors.text, borderColor: colors.border }]}
              />

              <Button
                title={reviewing ? "Saving..." : "Confirm Review & Record Audit Entry"}
                size="lg"
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
