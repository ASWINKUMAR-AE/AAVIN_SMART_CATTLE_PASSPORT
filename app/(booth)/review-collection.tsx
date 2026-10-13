import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Alert, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useAavinStore } from '../../store/AavinStoreContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { DemoHeader } from '../../components/DemoHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Ionicons } from '@expo/vector-icons';

export default function ReviewDailyCollectionScreen() {
  const { user } = useAuth();
  const { booths, bmcs, farmers, milkRecords, createBoothReceipt } = useAavinStore();
  const { colors } = useTheme();
  const router = useRouter();

  const boothId = user?.associatedId || 'BOOTH001';
  const booth = booths.find(b => b.id === boothId) || booths[0];
  const assignedBmc = bmcs.find(b => b.id === booth.assignedBmcId) || bmcs[0];

  const todayStr = '2026-10-12';

  // Unprocessed or today's records eligible for dispatch
  const todayRecords = milkRecords.filter(
    r => r.boothId === booth.id && r.collectionDate === todayStr && r.status !== 'included_in_receipt'
  );

  const farmerWiseRecords = todayRecords.filter(r => r.measurementMethod === 'farmer_wise');
  const combinedVendorRecords = todayRecords.filter(r => r.measurementMethod === 'combined');

  const farmerWiseTotal = farmerWiseRecords.reduce((sum, r) => sum + r.quantityLitres, 0);
  const combinedVendorTotal = combinedVendorRecords.reduce((sum, r) => sum + r.quantityLitres, 0);

  // Exact eligible total without double counting
  const eligibleReceiptTotal = parseFloat((farmerWiseTotal + combinedVendorTotal).toFixed(2));

  const uniqueParticipatingFarmerIds = new Set(farmerWiseRecords.map(r => r.farmerId).filter(Boolean));
  const assignedFarmers = farmers.filter(f => f.assignedBoothId === booth.id);
  const missingFarmers = assignedFarmers.filter(f => !uniqueParticipatingFarmerIds.has(f.id));

  const [notes, setNotes] = useState('Daily morning collection verified. Dispatched via insulated tanker.');
  const [generating, setGenerating] = useState(false);

  const handleGenerateReceipt = () => {
    if (todayRecords.length === 0) {
      Alert.alert('No Eligible Records', 'There are no unreceipted milk entries recorded for today.');
      return;
    }

    setGenerating(true);
    try {
      const receipt = createBoothReceipt(
        booth.id,
        assignedBmc.id,
        todayStr,
        'morning',
        todayRecords.map(r => r.id),
        user?.fullName || 'Booth Operator',
        notes
      );

      Alert.alert(
        'Digital Receipt Generated!',
        `Receipt #${receipt.id} generated for ${receipt.dispatchQuantity} Litres. Review and send to ${assignedBmc.name}.`,
        [
          {
            text: 'Preview & Send to BMC',
            onPress: () => router.push(`/(booth)/receipt-preview?receiptId=${receipt.id}` as any),
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not generate receipt.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <DemoHeader 
        title="Review Daily Collection"
        subtitle={`Closure Audit • Destination: ${assignedBmc.name}`}
        showBack
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Verification Summary Card */}
        <Card style={styles.card}>
          <Text style={[Typography.caption2, { color: colors.primary, fontWeight: '800' }]}>
            OFFICIAL BATCH RECONCILIATION • {todayStr}
          </Text>
          <Text style={[styles.bigTotal, { color: colors.text }]}>
            {eligibleReceiptTotal.toFixed(2)} <Text style={{ fontSize: 20 }}>Litres</Text>
          </Text>
          <Text style={[Typography.footnote, { color: colors.textSecondary, marginTop: 2 }]}>
            Total Net Quantity Eligible for BMC Dispatch Receipt
          </Text>

          {/* Double Counting Guard Note */}
          <View style={[styles.guardBox, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
            <Ionicons name="shield-checkmark" size={18} color="#16A34A" style={{ marginRight: 8 }} />
            <Text style={[Typography.caption1, { color: '#166534', flex: 1 }]}>
              Double-Counting Guard Active: Vendor combined quantities and farmer-wise contributions represent distinct physical batches and are strictly audited.
            </Text>
          </View>

          {/* Breakdown Table */}
          <View style={[styles.breakdownTable, { borderTopColor: colors.border }]}>
            <View style={styles.tableRow}>
              <Text style={[Typography.subhead, { color: colors.textSecondary }]}>
                1. Farmer-Wise Measured Litres:
              </Text>
              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]}>
                {farmerWiseTotal.toFixed(2)} L
              </Text>
            </View>

            <View style={styles.tableRow}>
              <Text style={[Typography.subhead, { color: colors.textSecondary }]}>
                2. Combined Vendor Batches:
              </Text>
              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]}>
                {combinedVendorTotal.toFixed(2)} L
              </Text>
            </View>

            <View style={styles.tableRow}>
              <Text style={[Typography.subhead, { color: colors.textSecondary }]}>
                3. Total Included Records:
              </Text>
              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]}>
                {todayRecords.length} Entries
              </Text>
            </View>

            <View style={styles.tableRow}>
              <Text style={[Typography.subhead, { color: colors.textSecondary }]}>
                4. Participating Farmers:
              </Text>
              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]}>
                {uniqueParticipatingFarmerIds.size} of {assignedFarmers.length}
              </Text>
            </View>

            <View style={styles.tableRow}>
              <Text style={[Typography.subhead, { color: colors.textSecondary }]}>
                5. Receiving Facility (BMC):
              </Text>
              <Text style={[Typography.subhead, { color: colors.primary, fontWeight: '800' }]}>
                {assignedBmc.name} ({assignedBmc.id})
              </Text>
            </View>
          </View>
        </Card>

        {/* Missing Expected Farmers Notice */}
        {missingFarmers.length > 0 && (
          <Card style={[styles.card, { borderColor: '#F59E0B' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Ionicons name="time" size={18} color="#D97706" style={{ marginRight: 6 }} />
              <Text style={[Typography.headline, { color: '#B45309', fontWeight: '800' }]}>
                Pending Expected Farmer Entries ({missingFarmers.length})
              </Text>
            </View>
            <Text style={[Typography.caption1, { color: colors.textSecondary, marginBottom: 8 }]}>
              The following registered booth farmers have not yet supplied milk today:
            </Text>
            {missingFarmers.map(mf => (
              <View key={mf.id} style={styles.missingItem}>
                <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700' }]}>
                  • {mf.name} ({mf.farmerIdCode})
                </Text>
                <Text style={[Typography.caption2, { color: colors.textMuted }]}>
                  Expected ~{mf.numberOfCows * 12} L ({mf.village})
                </Text>
              </View>
            ))}
          </Card>
        )}

        {/* Farmer Entries Breakdown */}
        <Card style={styles.card}>
          <Text style={[Typography.headline, { color: colors.text, fontWeight: '800', marginBottom: 10 }]}>
            Included Transactions List
          </Text>

          {todayRecords.length === 0 ? (
            <Text style={[Typography.subhead, { color: colors.textSecondary, textAlign: 'center', marginVertical: 14 }]}>
              All today's entries have already been included in a generated receipt.
            </Text>
          ) : (
            todayRecords.map((r, i) => (
              <View key={r.id} style={[styles.includedItem, { borderBottomColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700' }]}>
                    {i + 1}. {r.farmerName || r.vendorName}
                  </Text>
                  <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                    {r.measurementMethod === 'farmer_wise' ? 'Individual Farmer Supply' : 'Vendor Bulk Batch (Individual N/A)'}
                  </Text>
                </View>
                <Text style={[Typography.headline, { color: colors.primary, fontWeight: '800' }]}>
                  {r.quantityLitres.toFixed(1)} L
                </Text>
              </View>
            ))
          )}
        </Card>

        {/* Action Button */}
        <Button
          title={generating ? "Generating Digital Receipt..." : `Confirm Total (${eligibleReceiptTotal} L) & Generate Receipt`}
          size="lg"
          loading={generating}
          disabled={todayRecords.length === 0}
          onPress={handleGenerateReceipt}
          style={{ marginTop: 8 }}
        />

        <Button
          title="Back to Overview"
          variant="outline"
          onPress={() => router.back()}
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
  card: {
    padding: 16,
  },
  bigTotal: {
    fontSize: 34,
    fontWeight: '900',
    marginTop: 4,
  },
  guardBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 12,
  },
  breakdownTable: {
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  missingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  includedItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
