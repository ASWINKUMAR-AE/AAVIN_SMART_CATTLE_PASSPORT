import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, RefreshControl, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { LargeTitleHeader } from '../../components/ui/LargeTitleHeader';
import { StatTile } from '../../components/ui/StatTile';
import { Card } from '../../components/ui/Card';
import { GroupedList } from '../../components/ui/GroupedList';
import { ListRow } from '../../components/ui/ListRow';
import { StatusChip } from '../../components/ui/StatusChip';
import { Button } from '../../components/ui/Button';
import { api } from '../../services/api';
import { Ionicons } from '@expo/vector-icons';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();

  const [refreshing, setRefreshing] = useState(false);
  const [adminData, setAdminData] = useState<any>(null);

  const loadData = async () => {
    try {
      const res = await api.get('/admin/dashboard');
      if (res.data?.data) {
        setAdminData(res.data.data);
      }
    } catch (e) {
      console.warn('Failed to load admin dashboard:', e);
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
      `Sign out from Administrator account (${user?.fullName || 'Aavin Admin'})?`,
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

  const metrics = adminData?.metrics || { active_farmers: 2, total_cows: 4, active_vets: 1, active_centres: 2, active_batches: 1, active_withdrawals: 1 };
  const today = adminData?.today || { total_litres_today: 19.5, total_value_today: 750, total_entries_today: 3 };
  const aiState = adminData?.aiState;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <LargeTitleHeader
        title="Operations Control"
        subtitle="Aavin Madurai District Union"
        onLogout={handleLogout}
      />


      {/* Row 1 Stats */}
      <View style={styles.statsRow}>
        <StatTile
          title="Active Farmers"
          value={metrics.active_farmers}
          icon="people-outline"
          onPress={() => router.push('/(admin)/users')}
        />
        <StatTile
          title="Registered Cows"
          value={metrics.total_cows}
          icon="paw-outline"
        />
      </View>

      {/* Row 2 Stats */}
      <View style={styles.statsRow}>
        <StatTile
          title="Today's Milk Intake"
          value={Number(today.total_litres_today).toFixed(1)}
          unit="L"
          icon="water-outline"
        />
        <StatTile
          title="Active Withdrawals"
          value={metrics.active_withdrawals}
          icon="hand-left"
          iconColor={colors.hold}
          iconBg={colors.holdBg}
          onPress={() => router.push('/(admin)/safety-reviews')}
        />
      </View>

      {/* AI Provider Status Card */}
      <Card style={styles.aiStatusCard}>
        <View style={styles.aiHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={[Typography.caption2, { color: colors.primary, fontWeight: '800' }]}>
              BACKEND AI INFERENCE ENGINE
            </Text>
            <Text style={[Typography.headline, { color: colors.text, marginTop: 2 }]}>
              Active Provider: {aiState?.config?.active_provider?.toUpperCase() || 'OPENROUTER'}
            </Text>
            <Text style={[Typography.caption1, { color: colors.textSecondary }]}>
              Model: {aiState?.config?.openrouter_model || 'meta-llama/llama-3.3-70b-instruct:free'}
            </Text>
          </View>
          <Button
            title="Configure"
            size="sm"
            variant="outline"
            onPress={() => router.push('/(admin)/ai-settings')}
          />
        </View>

        <View style={[styles.aiMetaRow, { borderTopColor: colors.separator }]}>
          <Text style={[Typography.caption1, { color: colors.textSecondary }]}>
            Fallback: {aiState?.config?.fallback_enabled ? `✅ Enabled (${aiState.config.fallback_provider})` : '❌ Disabled by default'}
          </Text>
          <Text style={[Typography.caption1, { color: colors.textMuted }]}>
            Requests Today: {aiState?.usageToday?.total_ai_requests_today || 0}
          </Text>
        </View>
      </Card>

      {/* Quick Admin Actions */}
      <View style={styles.actionBtns}>
        <Button
          title="Safety Review Queue"
          icon="alert-circle-outline"
          variant="secondary"
          onPress={() => router.push('/(admin)/safety-reviews')}
          style={{ flex: 1, marginRight: 6 }}
        />
        <Button
          title="Manage Users"
          icon="people-outline"
          variant="secondary"
          onPress={() => router.push('/(admin)/users')}
          style={{ flex: 1, marginLeft: 6 }}
        />
      </View>

      {/* Pending Safety Overrides */}
      <GroupedList title="Recent Safety Review Requests" footer="Supervisors can approve or reject flagged collection holds">
        {adminData?.pendingReviews?.length === 0 ? (
          <ListRow title="No pending review requests in queue" subtitle="All decisions verified" isLast />
        ) : (
          adminData?.pendingReviews?.map((rev: any, idx: number) => (
            <ListRow
              key={rev.id}
              title={`Receipt #${rev.receipt_number} • ${rev.farmer_name}`}
              subtitle={`Cow: ${rev.cow_name} (${rev.tag_number}) • Reason: ${rev.override_reason || rev.primary_reason}`}
              icon="alert-circle"
              iconColor={colors.hold}
              iconBg={colors.holdBg}
              rightComponent={<StatusChip status={rev.decision} size="sm" />}
              onPress={() => router.push('/(admin)/safety-reviews')}
              showChevron
              isLast={idx === adminData.pendingReviews.length - 1}
            />
          ))
        )}
      </GroupedList>

      {/* Account Info & Logout */}
      <View style={{ marginHorizontal: 16, marginTop: 16 }}>
        <Button
          title="Sign Out of Administrator Account"
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
  aiStatusCard: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
  },
  aiHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aiMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    marginTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionBtns: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginVertical: 8,
  },
});
