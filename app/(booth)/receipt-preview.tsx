import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Alert, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAavinStore } from '../../store/AavinStoreContext';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { DemoHeader } from '../../components/DemoHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Ionicons } from '@expo/vector-icons';

export default function ReceiptPreviewScreen() {
  const params = useLocalSearchParams();
  const receiptId = params.receiptId as string;
  const { boothReceipts, sendBoothReceiptToBmc } = useAavinStore();
  const { colors } = useTheme();
  const router = useRouter();

  const receipt = boothReceipts.find(r => r.id === receiptId) || boothReceipts[0];
  const [sending, setSending] = useState(false);

  const handleSendToBmc = () => {
    setSending(true);
    try {
      sendBoothReceiptToBmc(receipt.id);
      Alert.alert(
        'Receipt Sent to BMC!',
        `Digital Dispatch Receipt #${receipt.id} (${receipt.dispatchQuantity} L) has been transmitted to ${receipt.bmcName}.\n\nA new pending arrival record is now live in the BMC receiving dashboard.`,
        [
          {
            text: 'View Dispatches',
            onPress: () => router.push('/(booth)/sent-receipts'),
          },
          {
            text: 'Done',
            onPress: () => router.replace('/(booth)'),
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not send receipt.');
    } finally {
      setSending(false);
    }
  };

  const isAlreadySent = receipt.status === 'sent_to_bmc';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <DemoHeader 
        title="Digital Dispatch Receipt"
        subtitle={`Receipt #${receipt.id} • Status: ${receipt.status.toUpperCase()}`}
        showBack
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Printable Digital Slip Format */}
        <Card style={styles.slipCard}>
          <View style={styles.slipHeader}>
            <Text style={[Typography.title2, { color: colors.primary, fontWeight: '900' }]}>
              AAVIN CO-OPERATIVE DAIRY
            </Text>
            <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
              Madurai Milk Safety Twin • Dispatch Ledger
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: isAlreadySent ? '#DCFCE7' : '#FEF3C7', marginTop: 6 }]}>
              <Text style={[styles.statusBadgeText, { color: isAlreadySent ? '#15803D' : '#B45309' }]}>
                {isAlreadySent ? 'SENT TO BMC • AWAITING MEASUREMENT' : 'CONFIRMED DRAFT'}
              </Text>
            </View>
          </View>

          <View style={styles.slipDivider} />

          {/* Details Table */}
          <View style={styles.detailsTable}>
            <View style={styles.detailRow}>
              <Text style={[Typography.caption1, { color: colors.textSecondary }]}>Receipt ID:</Text>
              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]}>{receipt.id}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={[Typography.caption1, { color: colors.textSecondary }]}>Origin Society:</Text>
              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700' }]}>{receipt.boothName}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={[Typography.caption1, { color: colors.textSecondary }]}>Destination BMC:</Text>
              <Text style={[Typography.subhead, { color: colors.primary, fontWeight: '800' }]}>{receipt.bmcName}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={[Typography.caption1, { color: colors.textSecondary }]}>Collection Date:</Text>
              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '600' }]}>{receipt.collectionDate}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={[Typography.caption1, { color: colors.textSecondary }]}>Measurement Basis:</Text>
              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '600' }]}>{receipt.measurementBasis.toUpperCase()}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={[Typography.caption1, { color: colors.textSecondary }]}>Included Records:</Text>
              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '600' }]}>{receipt.totalRecordsCount} Records ({receipt.totalFarmersCount} Farmers)</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={[Typography.caption1, { color: colors.textSecondary }]}>Created Timestamp:</Text>
              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '600' }]}>{receipt.createdAt.split('T')[0]}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={[Typography.caption1, { color: colors.textSecondary }]}>Authorized By:</Text>
              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '600' }]}>{receipt.createdBy}</Text>
            </View>
          </View>

          <View style={styles.slipDivider} />

          {/* Big Quantity Box */}
          <View style={[styles.qtyBox, { backgroundColor: colors.primaryLight }]}>
            <Text style={[Typography.caption1, { color: colors.primary, fontWeight: '800' }]}>
              OFFICIAL DECLARED DISPATCH QUANTITY
            </Text>
            <Text style={[styles.bigQtyText, { color: colors.primary }]}>
              {receipt.dispatchQuantity.toFixed(2)} Litres
            </Text>
            <Text style={[Typography.caption2, { color: colors.primary, marginTop: 2 }]}>
              Immutable dispatch quantity sent to BMC for reconciliation
            </Text>
          </View>

          {/* Verification Code Box */}
          <View style={styles.qrSection}>
            <View style={styles.qrIconFrame}>
              <Ionicons name="qr-code" size={54} color="#0072BC" />
            </View>
            <Text style={[Typography.footnote, { color: colors.text, fontWeight: '800', marginTop: 6 }]}>
              VERIFICATION TOKEN: {receipt.verificationCode}
            </Text>
            <Text style={[Typography.caption2, { color: colors.textSecondary, textAlign: 'center', marginTop: 2 }]}>
              Digitally signed dispatch seal. Present this receipt to BMC operator upon tanker arrival.
            </Text>
          </View>
        </Card>

        {/* Action Button */}
        {!isAlreadySent ? (
          <Button
            title={sending ? "Transmitting to BMC..." : `Send Receipt to BMC (${receipt.bmcName})`}
            size="lg"
            loading={sending}
            onPress={handleSendToBmc}
            style={{ marginTop: 8 }}
          />
        ) : (
          <View style={[styles.sentNotice, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
            <Ionicons name="checkmark-circle" size={20} color="#16A34A" />
            <Text style={[Typography.subhead, { color: '#166534', fontWeight: '700', marginLeft: 8 }]}>
              Receipt Already Sent to BMC
            </Text>
          </View>
        )}

        <Button
          title="View All Dispatched Receipts"
          variant="outline"
          onPress={() => router.push('/(booth)/sent-receipts')}
          style={{ marginTop: 10, marginBottom: 30 }}
        />
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
  slipCard: {
    padding: 16,
  },
  slipHeader: {
    alignItems: 'center',
    marginBottom: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  slipDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 12,
  },
  detailsTable: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  qtyBox: {
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 4,
  },
  bigQtyText: {
    fontSize: 30,
    fontWeight: '900',
    marginTop: 2,
  },
  qrSection: {
    alignItems: 'center',
    marginTop: 14,
  },
  qrIconFrame: {
    padding: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sentNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
});
