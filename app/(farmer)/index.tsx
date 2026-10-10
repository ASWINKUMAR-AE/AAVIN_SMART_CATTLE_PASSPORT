import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, RefreshControl, Pressable, Alert } from 'react-native';

import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { LargeTitleHeader } from '../../components/ui/LargeTitleHeader';
import { StatTile } from '../../components/ui/StatTile';
import { Card } from '../../components/ui/Card';
import { StatusChip } from '../../components/ui/StatusChip';
import { Button } from '../../components/ui/Button';
import { GroupedList } from '../../components/ui/GroupedList';
import { ListRow } from '../../components/ui/ListRow';
import { ProductionChart } from '../../components/charts/ProductionChart';
import { QRScannerModal } from '../../components/scanner/QRScannerModal';
import { api } from '../../services/api';
import { Ionicons } from '@expo/vector-icons';

export default function FarmerDashboard() {
  const { user, logout } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();

  const [refreshing, setRefreshing] = useState(false);
  const [cows, setCows] = useState<any[]>([]);
  const [productionSummary, setProductionSummary] = useState<any>(null);
  const [recentCollections, setRecentCollections] = useState<any[]>([]);
  const [scannerVisible, setScannerVisible] = useState(false);

  const loadData = async () => {
    try {
      const [cowsRes, prodRes, collRes] = await Promise.all([
        api.get('/cows'),
        api.get('/production/summary').catch(() => ({ data: { data: null } })),
        api.get('/collections?limit=5').catch(() => ({ data: { data: [] } })),
      ]);

      if (cowsRes.data?.data) setCows(cowsRes.data.data);
      if (prodRes.data?.data) setProductionSummary(prodRes.data.data);
      if (collRes.data?.data) setRecentCollections(collRes.data.data);
    } catch (e) {
      console.warn('Failed to load farmer dashboard:', e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleScan = (scannedValue: string) => {
    router.push({ pathname: '/(farmer)/cow-details', params: { identifier: scannedValue } });
  };

  const activeWithdrawalCows = cows.filter((c) => c.active_withdrawal_status === 'active');
  const todayTotalLitres = productionSummary?.today?.reduce((acc: number, curr: any) => acc + Number(curr.total_litres), 0) || 0;

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      `Sign out from account ${user?.fullName || 'Farmer'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <LargeTitleHeader
        title="My Farm"
        subtitle={`Welcome, ${user?.fullName?.split(' ')[0] || 'Farmer'}`}
        rightAction={{
          icon: 'qr-code-outline',
          onPress: () => setScannerVisible(true),
        }}
        onLogout={handleLogout}
      />


      {/* Active Withdrawal Alert Banner if any cow has active withdrawal */}
      {activeWithdrawalCows.length > 0 && (
        <Card style={[styles.withdrawalAlertCard, { backgroundColor: colors.holdBg, borderColor: colors.hold }]}>
          <View style={styles.alertHeader}>
            <Ionicons name="hand-left" size={22} color={colors.hold} />
            <Text style={[Typography.headline, { color: colors.hold, marginLeft: 8 }]}>
              Active Withdrawal Hold ({activeWithdrawalCows.length})
            </Text>
          </View>
          <Text style={[Typography.subhead, { color: colors.text, marginTop: 4 }]}>
            Milk from {activeWithdrawalCows.map((c) => c.name).join(', ')} CANNOT be supplied to collection center due to active clinical treatment.
          </Text>
        </Card>
      )}

      {/* Stat Tiles Row */}
      <View style={styles.statsRow}>
        <StatTile
          title="Total Cattle"
          value={cows.length}
          unit="cows"
          icon="paw-outline"
          onPress={() => router.push('/(farmer)/cows')}
        />
        <StatTile
          title="Today's Yield"
          value={todayTotalLitres.toFixed(1)}
          unit="L"
          icon="water-outline"
          trend={{ value: '+4.2%', isPositive: true }}
          onPress={() => router.push('/(farmer)/milk-entry')}
        />
      </View>

      {/* 7-Day Stacked Production Chart */}
      <ProductionChart
        data={productionSummary?.weeklyTrend?.map((t: any) => ({
          date: t.production_date,
          morning: Number(t.morning_litres),
          evening: Number(t.evening_litres),
          total: Number(t.total_litres),
        }))}
      />

      {/* Quick Action Buttons */}
      <View style={styles.quickActions}>
        <Button
          title="Record Milk Yield"
          icon="add-circle-outline"
          onPress={() => router.push('/(farmer)/milk-entry')}
          style={{ flex: 1, marginRight: 6 }}
        />
        <Button
          title="Register Cow"
          variant="secondary"
          icon="qr-code-outline"
          onPress={() => router.push('/(farmer)/register-cow')}
          style={{ flex: 1, marginLeft: 6 }}
        />
      </View>

      {/* Registered Cattle Overview */}
      <GroupedList title="My Cattle Passports" footer="Tap any cow to view full medical history, withdrawal status, & QR">
        {cows.slice(0, 4).map((cow, idx) => (
          <ListRow
            key={cow.id}
            title={cow.name}
            subtitle={`Tag: ${cow.tag_number} • ${cow.breed}`}
            icon="paw"
            iconColor={cow.active_withdrawal_status === 'active' ? colors.hold : colors.primary}
            iconBg={cow.active_withdrawal_status === 'active' ? colors.holdBg : colors.primaryLight}
            rightComponent={
              <StatusChip
                status={cow.active_withdrawal_status === 'active' ? 'HOLD' : cow.health_status}
                size="sm"
              />
            }
            showChevron
            onPress={() => router.push({ pathname: '/(farmer)/cow-details', params: { id: cow.id } })}
            isLast={idx === Math.min(cows.length, 4) - 1}
          />
        ))}
      </GroupedList>

      {/* Recent Collections */}
      <GroupedList title="Recent Milk Collections">
        {recentCollections.map((col, idx) => (
          <ListRow
            key={col.id}
            title={`${col.quantity_litres} Litres`}
            subtitle={`Receipt: ${col.receipt_number} • Fat: ${col.fat_percentage}%`}
            icon="receipt-outline"
            rightComponent={
              <StatusChip status={col.safety_decision || 'CLEAR'} size="sm" />
            }
            isLast={idx === recentCollections.length - 1}
          />
        ))}
      </GroupedList>

      {/* Account Info & Logout */}
      <View style={{ marginHorizontal: 16, marginTop: 16 }}>
        <Button
          title="Sign Out of Aavin Account"
          variant="destructive"
          icon="log-out-outline"
          onPress={handleLogout}
        />

      </View>

      <QRScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onScan={handleScan}
      />
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
  withdrawalAlertCard: {
    marginHorizontal: 16,
    borderWidth: 1.5,
    marginBottom: 8,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    marginVertical: 6,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginVertical: 10,
  },
});
