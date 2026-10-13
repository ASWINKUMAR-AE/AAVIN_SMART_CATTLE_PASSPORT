import React from 'react';
import { StyleSheet, View, Text, FlatList, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useAavinStore } from '../../store/AavinStoreContext';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { DemoHeader } from '../../components/DemoHeader';
import { Card } from '../../components/ui/Card';
import { Ionicons } from '@expo/vector-icons';

export default function BMCMonitoringScreen() {
  const { bmcs, booths, bmcReceipts, discrepancyCases, bmcDeliveries } = useAavinStore();
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <DemoHeader 
        title="BMC Facility Monitoring"
        subtitle="District Bulk Milk Cooling Infrastructure"
        showBack
      />

      <FlatList
        data={bmcs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const bmcBooths = booths.filter(b => b.assignedBmcId === item.id);
          const deliveries = bmcDeliveries.filter(d => d.bmcId === item.id);
          const totalReceived = deliveries.reduce((sum, d) => sum + (d.measuredReceivedQuantity || 0), 0);
          const latestReceipt = bmcReceipts.find(r => r.bmcId === item.id);
          const openCases = discrepancyCases.filter(c => c.bmcId === item.id && (c.status === 'open' || c.status === 'under_investigation'));

          const utilization = Math.min((totalReceived / item.capacityLitres) * 100, 100);

          return (
            <Card style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconFrame, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="snow" size={24} color={colors.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[Typography.title2, { color: colors.text, fontWeight: '800' }]}>
                    {item.name}
                  </Text>
                  <Text style={[Typography.caption1, { color: colors.textSecondary }]}>
                    Code: {item.code} • {item.location} • In-Charge: {item.managerName}
                  </Text>
                </View>
              </View>

              {/* Capacity Bar */}
              <View style={styles.capacitySection}>
                <View style={styles.capLabelRow}>
                  <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                    Daily Cooling Load: {totalReceived.toFixed(1)} L / {item.capacityLitres.toLocaleString()} L
                  </Text>
                  <Text style={[Typography.caption2, { color: colors.primary, fontWeight: '800' }]}>
                    {utilization.toFixed(1)}% Capacity
                  </Text>
                </View>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${utilization}%`, backgroundColor: colors.primary }]} />
                </View>
              </View>

              {/* Feeder Booths Table */}
              <View style={[styles.boothSection, { borderTopColor: colors.border }]}>
                <Text style={[Typography.caption1, { color: colors.text, fontWeight: '800', marginBottom: 4 }]}>
                  Feeder Booths ({bmcBooths.length})
                </Text>
                {bmcBooths.map((b) => (
                  <View key={b.id} style={styles.boothRow}>
                    <Text style={[Typography.subhead, { color: colors.text, fontWeight: '600' }]}>
                      • {b.name}
                    </Text>
                    <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                      {b.code} ({b.operatorName})
                    </Text>
                  </View>
                ))}
              </View>

              {/* Status Footer */}
              <View style={[styles.footerRow, { borderTopColor: colors.border }]}>
                <View style={[styles.statusPill, { backgroundColor: openCases.length > 0 ? '#FEE2E2' : '#DCFCE7' }]}>
                  <Text style={[styles.statusPillText, { color: openCases.length > 0 ? '#DC2626' : '#15803D' }]}>
                    {openCases.length > 0 ? `${openCases.length} Discrepancies Open` : 'Balanced'}
                  </Text>
                </View>

                <Pressable onPress={() => router.push('/(union)/receipt-review' as any)}>
                  <Text style={[Typography.caption1, { color: colors.primary, fontWeight: '700' }]}>
                    Review Receipts →
                  </Text>
                </Pressable>
              </View>
            </Card>
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
    gap: 14,
    paddingBottom: 40,
  },
  card: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconFrame: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  capacitySection: {
    marginBottom: 12,
  },
  capLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  barTrack: {
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  boothSection: {
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  boothRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
});
