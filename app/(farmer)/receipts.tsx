import React, { useState } from 'react';
import { StyleSheet, View, Text, FlatList, Pressable, Modal } from 'react-native';
import { useAavinStore } from '../../store/AavinStoreContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { DemoHeader } from '../../components/DemoHeader';
import { Card } from '../../components/ui/Card';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState } from '../../components/ui/EmptyState';
import { BoothReceipt } from '../../types/aavin';

export default function FarmerReceiptsScreen() {
  const { user } = useAuth();
  const { boothReceipts, milkRecords } = useAavinStore();
  const { colors } = useTheme();

  const farmerId = user?.associatedId || 'FARMER001';

  // Find receipts that contain this farmer's milk records
  const farmerRecordIds = new Set(milkRecords.filter(r => r.farmerId === farmerId).map(r => r.id));
  
  const relevantReceipts = boothReceipts.filter(br => 
    br.includedRecordIds.some(id => farmerRecordIds.has(id)) || br.status === 'sent_to_bmc'
  );

  const [selectedReceipt, setSelectedReceipt] = useState<BoothReceipt | null>(null);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <DemoHeader 
        title="Digital Collection Receipts"
        subtitle="Cryptographically verified batch receipts"
        showBack
      />

      <FlatList
        data={relevantReceipts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            title="No Receipts Available"
            message="No closed digital receipts have been generated yet for your deliveries."
            icon="receipt-outline"
          />
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => setSelectedReceipt(item)}>
            <Card style={styles.receiptCard}>
              <View style={styles.cardHeader}>
                <View>
                  <View style={styles.receiptIdRow}>
                    <Ionicons name="document-text" size={16} color={colors.primary} />
                    <Text style={[Typography.headline, { color: colors.text, fontWeight: '800', marginLeft: 6 }]}>
                      {item.id}
                    </Text>
                  </View>
                  <Text style={[Typography.caption2, { color: colors.textSecondary, marginTop: 2 }]}>
                    Date: {item.collectionDate} • {item.session.toUpperCase()}
                  </Text>
                </View>

                <View style={[styles.statusBadge, { backgroundColor: item.status === 'sent_to_bmc' ? '#DCFCE7' : '#FEF3C7' }]}>
                  <Text style={[styles.statusText, { color: item.status === 'sent_to_bmc' ? '#15803D' : '#B45309' }]}>
                    {item.status === 'sent_to_bmc' ? 'SENT TO BMC' : 'CONFIRMED'}
                  </Text>
                </View>
              </View>

              <View style={[styles.infoRow, { borderTopColor: colors.border }]}>
                <View>
                  <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Dispatch Quantity</Text>
                  <Text style={[Typography.title2, { color: colors.primary, fontWeight: '900' }]}>
                    {item.dispatchQuantity.toFixed(1)} L
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Verification Code</Text>
                  <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700' }]}>
                    {item.verificationCode}
                  </Text>
                </View>
              </View>

              <View style={styles.footerRow}>
                <Text style={[Typography.caption2, { color: colors.textMuted }]}>
                  Booth: {item.boothName}
                </Text>
                <Text style={[Typography.caption2, { color: colors.primary, fontWeight: '700' }]}>
                  View Digital Slip →
                </Text>
              </View>
            </Card>
          </Pressable>
        )}
      />

      {/* Digital Receipt Modal View */}
      {selectedReceipt && (
        <Modal
          visible={true}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedReceipt(null)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setSelectedReceipt(null)}>
            <View style={[styles.receiptModalCard, { backgroundColor: colors.card }]} onStartShouldSetResponder={() => true}>
              <View style={styles.modalHeader}>
                <Text style={[Typography.headline, { color: colors.text, fontWeight: '900' }]}>
                  AAVIN DIGITAL RECEIPT
                </Text>
                <Pressable onPress={() => setSelectedReceipt(null)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </Pressable>
              </View>

              <View style={styles.slipContainer}>
                <View style={styles.slipBrand}>
                  <Text style={[Typography.title2, { color: colors.primary, fontWeight: '900' }]}>
                    AAVIN MADURAI
                  </Text>
                  <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                    Milk Safety Twin • Traceability Passport
                  </Text>
                </View>

                <View style={styles.slipDivider} />

                <View style={styles.slipRow}>
                  <Text style={[Typography.caption1, { color: colors.textSecondary }]}>Receipt ID:</Text>
                  <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]}>{selectedReceipt.id}</Text>
                </View>

                <View style={styles.slipRow}>
                  <Text style={[Typography.caption1, { color: colors.textSecondary }]}>Collection Date:</Text>
                  <Text style={[Typography.subhead, { color: colors.text, fontWeight: '600' }]}>{selectedReceipt.collectionDate}</Text>
                </View>

                <View style={styles.slipRow}>
                  <Text style={[Typography.caption1, { color: colors.textSecondary }]}>Origin Booth:</Text>
                  <Text style={[Typography.subhead, { color: colors.text, fontWeight: '600' }]}>{selectedReceipt.boothName}</Text>
                </View>

                <View style={styles.slipRow}>
                  <Text style={[Typography.caption1, { color: colors.textSecondary }]}>Destination BMC:</Text>
                  <Text style={[Typography.subhead, { color: colors.text, fontWeight: '600' }]}>{selectedReceipt.bmcName}</Text>
                </View>

                <View style={styles.slipRow}>
                  <Text style={[Typography.caption1, { color: colors.textSecondary }]}>Total Dispatched:</Text>
                  <Text style={[Typography.title2, { color: colors.primary, fontWeight: '900' }]}>
                    {selectedReceipt.dispatchQuantity.toFixed(2)} Litres
                  </Text>
                </View>

                <View style={styles.slipRow}>
                  <Text style={[Typography.caption1, { color: colors.textSecondary }]}>Participating Farmers:</Text>
                  <Text style={[Typography.subhead, { color: colors.text, fontWeight: '600' }]}>{selectedReceipt.totalFarmersCount} Farmers</Text>
                </View>

                <View style={styles.slipDivider} />

                {/* Simulated Verification Code / QR representation */}
                <View style={styles.qrContainer}>
                  <View style={styles.qrBox}>
                    <Ionicons name="qr-code" size={64} color="#0072BC" />
                  </View>
                  <Text style={[Typography.footnote, { color: colors.text, fontWeight: '800', marginTop: 8 }]}>
                    CODE: {selectedReceipt.verificationCode}
                  </Text>
                  <Text style={[Typography.caption2, { color: colors.textSecondary, textAlign: 'center', marginTop: 4 }]}>
                    Immutable Local Proof Token • Dispatched {selectedReceipt.createdAt.split('T')[0]}
                  </Text>
                </View>
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
  listContent: {
    padding: 16,
    gap: 12,
  },
  receiptCard: {
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  receiptIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  receiptModalCard: {
    borderRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  slipContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  slipBrand: {
    alignItems: 'center',
    marginBottom: 10,
  },
  slipDivider: {
    height: 1,
    backgroundColor: '#CBD5E1',
    marginVertical: 10,
  },
  slipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  qrContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  qrBox: {
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
});
