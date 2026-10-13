import React from 'react';
import { StyleSheet, View, Text, FlatList, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useAavinStore } from '../../store/AavinStoreContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { DemoHeader } from '../../components/DemoHeader';
import { Card } from '../../components/ui/Card';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState } from '../../components/ui/EmptyState';

export default function SentReceiptsScreen() {
  const { user } = useAuth();
  const { boothReceipts, bmcDeliveries, booths } = useAavinStore();
  const { colors } = useTheme();
  const router = useRouter();

  const boothId = user?.associatedId || 'BOOTH001';
  const booth = booths.find(b => b.id === boothId) || booths[0];

  // All receipts from this booth
  const myReceipts = boothReceipts.filter(r => r.boothId === booth.id);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <DemoHeader 
        title="Sent Dispatch Receipts"
        subtitle={`Live BMC Receiving Status • ${booth.name}`}
        showBack
      />

      <FlatList
        data={myReceipts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            title="No Sent Receipts"
            message="No dispatch receipts have been sent yet."
            icon="paper-plane-outline"
          />
        }
        renderItem={({ item }) => {
          // Find corresponding BMC delivery to show live status
          const delivery = bmcDeliveries.find(d => d.boothReceiptId === item.id);

          const getStatusBadge = () => {
            if (!delivery) {
              return { label: 'CONFIRMED DRAFT', bg: '#FEF3C7', color: '#B45309' };
            }
            switch (delivery.status) {
              case 'pending_arrival':
                return { label: 'PENDING ARRIVAL AT BMC', bg: '#E0F2FE', color: '#0284C7' };
              case 'matched':
                return { label: 'MATCHED & CONFIRMED', bg: '#DCFCE7', color: '#15803D' };
              case 'mismatch_investigation':
                return { label: 'MISMATCH - INVESTIGATION', bg: '#FEF2F2', color: '#DC2626' };
              case 'resolved':
                return { label: 'RESOLVED', bg: '#F3E8FF', color: '#7E22CE' };
              default:
                return { label: delivery.status.toUpperCase(), bg: '#F1F5F9', color: '#475569' };
            }
          };

          const badge = getStatusBadge();

          return (
            <Pressable onPress={() => router.push(`/(booth)/receipt-preview?receiptId=${item.id}` as any)}>
              <Card style={styles.card}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={[Typography.headline, { color: colors.text, fontWeight: '800' }]}>
                      {item.id}
                    </Text>
                    <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                      Dispatched {item.collectionDate} • {item.session.toUpperCase()}
                    </Text>
                  </View>

                  <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.statusText, { color: badge.color }]}>{badge.label}</Text>
                  </View>
                </View>

                <View style={[styles.detailGrid, { borderTopColor: colors.border }]}>
                  <View style={styles.detailItem}>
                    <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Declared Litres</Text>
                    <Text style={[Typography.title2, { color: colors.primary, fontWeight: '900' }]}>
                      {item.dispatchQuantity.toFixed(1)} L
                    </Text>
                  </View>

                  <View style={styles.detailItem}>
                    <Text style={[Typography.caption2, { color: colors.textSecondary }]}>BMC Measured</Text>
                    <Text style={[Typography.title2, { color: colors.text, fontWeight: '800' }]}>
                      {delivery?.measuredReceivedQuantity !== undefined ? `${delivery.measuredReceivedQuantity.toFixed(1)} L` : 'Pending'}
                    </Text>
                  </View>

                  <View style={styles.detailItem}>
                    <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Difference</Text>
                    <Text 
                      style={[
                        Typography.title2, 
                        { 
                          fontWeight: '800', 
                          color: (delivery?.difference || 0) > 0 ? '#DC2626' : '#16A34A' 
                        }
                      ]}
                    >
                      {delivery?.difference !== undefined ? `${delivery.difference.toFixed(1)} L` : '-'}
                    </Text>
                  </View>
                </View>

                <View style={styles.footerRow}>
                  <Text style={[Typography.caption2, { color: colors.textMuted }]}>
                    Destination: {item.bmcName}
                  </Text>
                  <Text style={[Typography.caption2, { color: colors.primary, fontWeight: '700' }]}>
                    View Digital Slip →
                  </Text>
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
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    padding: 16,
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
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  detailGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  detailItem: {
    alignItems: 'flex-start',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
});
