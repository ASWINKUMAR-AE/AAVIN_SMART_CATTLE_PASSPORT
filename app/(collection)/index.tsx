import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, RefreshControl, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { LargeTitleHeader } from '../../components/ui/LargeTitleHeader';
import { StatTile } from '../../components/ui/StatTile';
import { GroupedList } from '../../components/ui/GroupedList';
import { ListRow } from '../../components/ui/ListRow';
import { StatusChip } from '../../components/ui/StatusChip';
import { Button } from '../../components/ui/Button';
import { api } from '../../services/api';

export default function CollectionDashboard() {
  const { user, logout } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();

  const [refreshing, setRefreshing] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [collections, setCollections] = useState<any[]>([]);

  const loadData = async () => {
    try {
      const [sessionRes, collRes] = await Promise.all([
        api.get('/collections/session'),
        api.get('/collections?limit=10'),
      ]);
      if (sessionRes.data?.data) setSession(sessionRes.data.data);
      if (collRes.data?.data) setCollections(collRes.data.data);
    } catch (e) {
      console.warn('Failed to load collection dashboard:', e);
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

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      `Sign out from account ${user?.fullName || 'Collection Operator'}?`,
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

  const clearCount = collections.filter((c) => c.safety_decision === 'CLEAR').length;
  const reviewCount = collections.filter((c) => c.safety_decision === 'REVIEW').length;
  const holdCount = collections.filter((c) => c.safety_decision === 'HOLD').length;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <LargeTitleHeader
        title="Melur Collection Centre"
        subtitle="Aavin Madurai Milk Union"
        rightAction={{
          icon: 'add',
          onPress: () => router.push('/(collection)/new-collection'),
        }}
        onLogout={handleLogout}
      />


      {/* Metrics */}
      <View style={styles.statsRow}>
        <StatTile
          title="Session Milk"
          value={session?.total_litres_collected || '19.5'}
          unit="L"
          icon="water-outline"
          subtitle={`${session?.session_type || 'Morning'} Session`}
        />
        <StatTile
          title="Farmers Served"
          value={session?.total_farmers_attended || '2'}
          icon="people-outline"
        />
      </View>

      <View style={styles.statsRow}>
        <StatTile
          title="CLEAR Intakes"
          value={clearCount}
          icon="checkmark-circle"
          iconColor={colors.clear}
          iconBg={colors.clearBg}
        />
        <StatTile
          title="REVIEW / HOLD"
          value={`${reviewCount} / ${holdCount}`}
          icon="hand-left"
          iconColor={colors.hold}
          iconBg={colors.holdBg}
        />
      </View>

      <View style={styles.actionRow}>
        <Button
          title="Scan Cattle QR & Intake Milk"
          icon="qr-code-outline"
          onPress={() => router.push('/(collection)/new-collection')}
          style={{ flex: 1 }}
        />
      </View>

      {/* Today's Intake Queue */}
      <GroupedList title="Today's Intake Queue & Decisions" footer="Receipts are permanently registered with Aavin Milk Safety Twin">
        {collections.map((col, idx) => (
          <ListRow
            key={col.id}
            title={`${col.farmer_name} • ${col.quantity_litres} Litres`}
            subtitle={`Cow: ${col.cow_name} (${col.tag_number}) • Fat: ${col.fat_percentage}%`}
            icon="receipt-outline"
            rightComponent={
              <View style={{ alignItems: 'flex-end' }}>
                <StatusChip status={col.safety_decision || 'CLEAR'} size="sm" />
                <Text style={[Typography.caption2, { color: colors.textSecondary, marginTop: 2 }]}>
                  ₹{col.calculated_amount_inr}
                </Text>
              </View>
            }
            onPress={() => router.push({ pathname: '/(collection)/receipt', params: { id: col.id } })}
            showChevron
            isLast={idx === collections.length - 1}
          />
        ))}
      </GroupedList>

      {/* Account Info & Logout */}
      <View style={{ marginHorizontal: 16, marginTop: 16 }}>
        <Button
          title="Sign Out of Collection Operator Account"
          variant="destructive"
          icon="log-out-outline"
          onPress={handleLogout}
        />

      </View>
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
    marginBottom: 8,
  },
  actionRow: {
    paddingHorizontal: 16,
    marginVertical: 10,
  },
});
