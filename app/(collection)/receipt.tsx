import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, ActivityIndicator, Alert, Share } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusChip } from '../../components/ui/StatusChip';
import { GroupedList } from '../../components/ui/GroupedList';
import { ListRow } from '../../components/ui/ListRow';
import { api } from '../../services/api';
import { Ionicons } from '@expo/vector-icons';

export default function ReceiptScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, isDark } = useTheme();
  const router = useRouter();

  const [receipt, setReceipt] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      api.get(`/collections/${id}`).then((res) => {
        if (res.data?.data) {
          setReceipt(res.data.data);
        }
      }).catch((e) => {
        Alert.alert('Error', 'Unable to fetch receipt');
      }).finally(() => {
        setLoading(false);
      });
    }
  }, [id]);

  const handleShare = async () => {
    if (!receipt) return;
    try {
      await Share.share({
        message: `🥛 AAVIN MILK COLLECTION RECEIPT\nReceipt: ${receipt.receipt_number}\nFarmer: ${receipt.farmer_name}\nCattle: ${receipt.cow_name} (Tag #${receipt.tag_number})\nLitres: ${receipt.quantity_litres} L\nFat: ${receipt.fat_percentage}% | SNF: ${receipt.snf_percentage}%\nDecision: ${receipt.safety_decision}\nRate: ₹${receipt.rate_per_litre_applied}/L\nTotal Amount: ₹${receipt.calculated_amount_inr}\nCentre: ${receipt.centre_name}`,
      });
    } catch (e) {}
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!receipt) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, padding: 20 }]}>
        <Text style={[Typography.title2, { color: colors.text }]}>Receipt Not Found</Text>
        <Button title="Go Back" onPress={() => router.back()} style={{ marginTop: 16 }} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <Card style={styles.receiptCard}>
        {/* Header Branding */}
        <View style={styles.receiptHeader}>
          <Text style={{ fontSize: 32 }}>🥛</Text>
          <Text style={[Typography.title2, { color: colors.text, marginTop: 4, fontWeight: '800' }]}>
            AAVIN MILK COLLECTION RECEIPT
          </Text>
          <Text style={[Typography.caption1, { color: colors.textSecondary }]}>
            {receipt.centre_name} ({receipt.centre_code})
          </Text>
          <Text style={[Typography.headline, { color: colors.primary, marginTop: 8 }]}>
            #{receipt.receipt_number}
          </Text>
          <Text style={[Typography.caption2, { color: colors.textMuted }]}>
            {new Date(receipt.collection_time).toLocaleString('en-IN')}
          </Text>
        </View>

        {/* Safety Status Banner */}
        <View style={styles.statusRow}>
          <StatusChip status={receipt.safety_decision || 'CLEAR'} size="lg" />
        </View>

        {/* Breakdown Table */}
        <View style={[styles.detailTable, { borderTopColor: colors.border, borderBottomColor: colors.border }]}>
          <View style={styles.tableRow}>
            <Text style={[Typography.subhead, { color: colors.textSecondary }]}>Farmer:</Text>
            <Text style={[Typography.headline, { color: colors.text }]}>{receipt.farmer_name}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[Typography.subhead, { color: colors.textSecondary }]}>Cattle Passport:</Text>
            <Text style={[Typography.headline, { color: colors.text }]}>{receipt.cow_name} (#{receipt.tag_number})</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[Typography.subhead, { color: colors.textSecondary }]}>Volume Collected:</Text>
            <Text style={[Typography.headline, { color: colors.text }]}>{receipt.quantity_litres} Litres</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[Typography.subhead, { color: colors.textSecondary }]}>FAT % / SNF %:</Text>
            <Text style={[Typography.headline, { color: colors.text }]}>{receipt.fat_percentage}% / {receipt.snf_percentage}%</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[Typography.subhead, { color: colors.textSecondary }]}>Intake Temperature:</Text>
            <Text style={[Typography.headline, { color: colors.text }]}>{receipt.temperature_c} °C</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[Typography.subhead, { color: colors.textSecondary }]}>Adulteration Screen:</Text>
            <Text style={[Typography.headline, { color: receipt.adulteration_detected ? colors.hold : colors.clear }]}>
              {receipt.adulteration_detected ? 'DETECTED' : 'CLEARED (Negative)'}
            </Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[Typography.subhead, { color: colors.textSecondary }]}>Analyzer Device ID:</Text>
            <Text style={[Typography.footnote, { color: colors.textMuted }]}>{receipt.analyzer_device_id}</Text>
          </View>
        </View>

        {/* Total Payable Box */}
        <View style={[styles.totalBox, { backgroundColor: colors.primaryLight }]}>
          <View style={styles.tableRow}>
            <Text style={[Typography.headline, { color: colors.text }]}>Applied Rate / Litre:</Text>
            <Text style={[Typography.title3, { color: colors.primary }]}>₹{receipt.rate_per_litre_applied}</Text>
          </View>
          <View style={[styles.tableRow, { marginTop: 6 }]}>
            <Text style={[Typography.title2, { color: colors.text, fontWeight: '800' }]}>Net Payable:</Text>
            <Text style={[Typography.largeTitle, { color: colors.text, fontWeight: '900' }]}>
              ₹{receipt.calculated_amount_inr}
            </Text>
          </View>
        </View>

        {receipt.safety_reason && (
          <Text style={[Typography.caption2, { color: colors.textSecondary, marginTop: 12, textAlign: 'center' }]}>
            Safety Twin: {receipt.safety_reason}
          </Text>
        )}

        <View style={styles.btnRow}>
          <Button
            title="Share Receipt"
            icon="share-outline"
            variant="secondary"
            onPress={handleShare}
            style={{ flex: 1, marginRight: 6 }}
          />
          <Button
            title="Done"
            onPress={() => router.replace('/(collection)')}
            style={{ flex: 1, marginLeft: 6 }}
          />
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  receiptCard: {
    padding: 20,
  },
  receiptHeader: {
    alignItems: 'center',
    marginBottom: 14,
  },
  statusRow: {
    alignItems: 'center',
    marginVertical: 10,
  },
  detailTable: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: 12,
    marginVertical: 12,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  totalBox: {
    padding: 16,
    borderRadius: 14,
    marginVertical: 10,
  },
  btnRow: {
    flexDirection: 'row',
    marginTop: 18,
  },
});
