import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, RefreshControl } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { Card } from '../../components/ui/Card';
import { StatTile } from '../../components/ui/StatTile';
import { GroupedList } from '../../components/ui/GroupedList';
import { ListRow } from '../../components/ui/ListRow';
import { StatusChip } from '../../components/ui/StatusChip';
import { api } from '../../services/api';

export default function PaymentsScreen() {
  const { colors } = useTheme();

  const [loading, setLoading] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);

  const loadPayments = async () => {
    setLoading(true);
    try {
      const res = await api.get('/payments/me');
      if (res.data?.data) {
        setPaymentData(res.data.data);
      }
    } catch (e) {
      console.warn('Failed to load farmer payments:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  const summary = paymentData?.summary || { pending_amount: 0, approved_amount: 0, paid_amount: 0, total_litres: 0 };
  const transactions = paymentData?.transactions || [];
  const recentCollections = paymentData?.recentCollections || [];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadPayments} tintColor={colors.primary} />}
    >
      <Text style={[Typography.title2, { color: colors.text, marginHorizontal: 16, marginTop: 8, marginBottom: 12 }]}>
        Payment & Procurement Ledger
      </Text>

      {/* Summary Metrics */}
      <View style={styles.statsRow}>
        <StatTile
          title="Calculated Pending"
          value={`₹${Number(summary.pending_amount).toFixed(2)}`}
          icon="time-outline"
          iconColor={colors.review}
          iconBg={colors.reviewBg}
          subtitle="Current 15-day cycle"
        />
        <StatTile
          title="Approved / Paid"
          value={`₹${(Number(summary.approved_amount) + Number(summary.paid_amount)).toFixed(2)}`}
          icon="checkmark-circle-outline"
          iconColor={colors.clear}
          iconBg={colors.clearBg}
          subtitle="Disbursed via Direct Bank"
        />
      </View>

      {/* Transparent Pricing Matrix Card */}
      <Card style={{ marginHorizontal: 16, marginVertical: 8 }}>
        <Text style={[Typography.headline, { color: colors.text, marginBottom: 4 }]}>
          Aavin Transparent Rate Matrix
        </Text>
        <Text style={[Typography.footnote, { color: colors.textSecondary }]}>
          Standard Cow Milk Base Rate: ₹36.50/L @ 4.0% FAT & 8.5% SNF + Quality Incentive (₹1.00/L for CLEAR samples). Rates calculate automatically on intake.
        </Text>
      </Card>

      {/* 15-Day Cycle Disbursement Transactions */}
      <GroupedList title="15-Day Fortnight Payment Cycles">
        {transactions.length === 0 ? (
          <ListRow title="No billing cycles finalized yet" subtitle="Payments calculate on 15th & 30th of every month" isLast />
        ) : (
          transactions.map((tx: any, idx: number) => (
            <ListRow
              key={tx.id}
              title={`Cycle: ${tx.cycle_code}`}
              subtitle={`${tx.total_litres} Litres • Ref: ${tx.transaction_reference}`}
              value={`₹${tx.net_payable_inr}`}
              rightComponent={<StatusChip status={tx.status} size="sm" />}
              isLast={idx === transactions.length - 1}
            />
          ))
        )}
      </GroupedList>

      {/* Collection-Level Earnings */}
      <GroupedList title="Individual Collection Receipts">
        {recentCollections.map((col: any, idx: number) => (
          <ListRow
            key={col.id}
            title={`${col.quantity_litres} L • ₹${col.calculated_amount_inr}`}
            subtitle={`Rate: ₹${col.rate_per_litre_applied}/L • ${col.cow_name}`}
            rightComponent={<StatusChip status={col.decision || 'CLEAR'} size="sm" />}
            isLast={idx === recentCollections.length - 1}
          />
        ))}
      </GroupedList>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 40,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
  },
});
