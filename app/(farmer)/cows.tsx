import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusChip } from '../../components/ui/StatusChip';
import { TextField } from '../../components/ui/TextField';
import { EmptyState } from '../../components/ui/EmptyState';
import { QRScannerModal } from '../../components/scanner/QRScannerModal';
import { api } from '../../services/api';
import { Ionicons } from '@expo/vector-icons';

export default function CowsListScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [cows, setCows] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);

  const loadCows = async () => {
    try {
      const res = await api.get(`/cows${search ? `?search=${encodeURIComponent(search)}` : ''}`);
      if (res.data?.data) {
        setCows(res.data.data);
      }
    } catch (e) {
      console.warn('Failed to load cows:', e);
    }
  };

  useEffect(() => {
    loadCows();
  }, [search]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCows();
    setRefreshing(false);
  };

  const handleScan = (scannedValue: string) => {
    router.push({ pathname: '/(farmer)/cow-details', params: { identifier: scannedValue } });
  };

  const renderCowCard = ({ item }: { item: any }) => {
    const isUnderWithdrawal = item.active_withdrawal_status === 'active';

    return (
      <Card
        onPress={() => router.push({ pathname: '/(farmer)/cow-details', params: { id: item.id } })}
        style={styles.cowCard}
      >
        <View style={styles.cardHeader}>
          <View style={styles.infoCol}>
            <Text style={[Typography.title3, { color: colors.text }]}>{item.name}</Text>
            <Text style={[Typography.subhead, { color: colors.primary, fontWeight: '700', marginTop: 2 }]}>
              Tag #{item.tag_number}
            </Text>
            <Text style={[Typography.footnote, { color: colors.textSecondary, marginTop: 2 }]}>
              {item.breed} • {item.lactation_stage} lactation
            </Text>
          </View>
          <StatusChip status={isUnderWithdrawal ? 'HOLD' : item.health_status} />
        </View>

        {isUnderWithdrawal && (
          <View style={[styles.withdrawalBanner, { backgroundColor: colors.holdBg }]}>
            <Ionicons name="warning" size={14} color={colors.hold} style={{ marginRight: 4 }} />
            <Text style={[Typography.caption1, { color: colors.hold, fontWeight: '700' }]}>
              Active Withdrawal Hold (Antibiotic treatment)
            </Text>
          </View>
        )}

        <View style={[styles.divider, { backgroundColor: colors.separator }]} />

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Text style={[Typography.caption2, { color: colors.textMuted }]}>DAILY YIELD</Text>
            <Text style={[Typography.subhead, { color: colors.text, fontWeight: '600' }]}>
              ~{item.average_daily_yield} L/day
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={[Typography.caption2, { color: colors.textMuted }]}>VET IN-CHARGE</Text>
            <Text style={[Typography.subhead, { color: colors.text, fontWeight: '600' }]}>
              {item.assigned_vet_name || 'Dr. Anand'}
            </Text>
          </View>
          <View style={[styles.metaItem, { alignItems: 'flex-end' }]}>
            <Text style={[Typography.caption2, { color: colors.primary, fontWeight: '700' }]}>
              VIEW PASSPORT →
            </Text>
          </View>
        </View>
      </Card>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.topBar}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <TextField
            placeholder="Search by tag number or name..."
            value={search}
            onChangeText={setSearch}
            icon="search-outline"
            clearButton
          />
        </View>
        <Button
          title="Add Cow"
          icon="add"
          size="sm"
          onPress={() => router.push('/(farmer)/register-cow')}
        />
      </View>

      <FlatList
        data={cows}
        keyExtractor={(item) => item.id}
        renderItem={renderCowCard}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <EmptyState
            icon="paw-outline"
            title="No Cattle Records Found"
            description="Register your dairy cows to generate their unique cattle passports and QR codes."
            actionTitle="Register Cow"
            onAction={() => router.push('/(farmer)/register-cow')}
          />
        }
      />

      <QRScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onScan={handleScan}
      />
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
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  cowCard: {
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  infoCol: {
    flex: 1,
  },
  withdrawalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    marginTop: 10,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaItem: {
    flex: 1,
  },
});
