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
import { QRScannerModal } from '../../components/scanner/QRScannerModal';
import { api } from '../../services/api';
import { Ionicons } from '@expo/vector-icons';

export default function VeterinaryDashboard() {
  const { user, logout } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();

  const [refreshing, setRefreshing] = useState(false);
  const [assignedCows, setAssignedCows] = useState<any[]>([]);
  const [withdrawalAlerts, setWithdrawalAlerts] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [scannerVisible, setScannerVisible] = useState(false);

  const loadData = async () => {
    try {
      const [cowsRes, alertsRes, apptRes] = await Promise.all([
        api.get('/veterinary/assignments').catch(() => ({ data: { data: [] } })),
        api.get('/veterinary/withdrawal-alerts').catch(() => ({ data: { data: [] } })),
        api.get('/veterinary/appointments').catch(() => ({ data: { data: [] } })),
      ]);

      if (cowsRes.data?.data) setAssignedCows(cowsRes.data.data);
      if (alertsRes.data?.data) setWithdrawalAlerts(alertsRes.data.data);
      if (apptRes.data?.data) setAppointments(apptRes.data.data);
    } catch (e) {
      console.warn('Failed to load vet dashboard:', e);
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
      `Sign out from account ${user?.fullName || 'Veterinary Officer'}?`,
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
        title="Veterinary Officer"
        subtitle={user?.fullName || 'Dr. R. Anand BVSc'}
        rightAction={{
          icon: 'qr-code-outline',
          onPress: () => setScannerVisible(true),
        }}
        onLogout={handleLogout}
      />


      {/* Metric Tiles */}
      <View style={styles.statsRow}>
        <StatTile
          title="Assigned Cattle"
          value={assignedCows.length}
          unit="cows"
          icon="paw-outline"
        />
        <StatTile
          title="Active Withdrawals"
          value={withdrawalAlerts.length}
          icon="hand-left"
          iconColor={colors.hold}
          iconBg={colors.holdBg}
          subtitle="Milk Withholding active"
        />
      </View>

      {/* Quick Clinical & Management Actions */}
      <View style={styles.actionBtns}>
        <Button
          title="Prescribe Treatment"
          icon="bandage-outline"
          onPress={() => router.push('/(veterinary)/treatment-entry')}
          style={{ flex: 1, marginRight: 6 }}
        />
        <Button
          title="Clinical Exam"
          variant="secondary"
          icon="pulse-outline"
          onPress={() => router.push('/(veterinary)/examination-entry')}
          style={{ flex: 1, marginLeft: 6 }}
        />
      </View>
      <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
        <Button
          title="Update Cattle & Farmer Profile Data"
          icon="create-outline"
          variant="outline"
          onPress={() => {
            if (assignedCows.length > 0) {
              router.push({ pathname: '/(veterinary)/cow-details', params: { id: assignedCows[0].id } });
            } else {
              setScannerVisible(true);
            }
          }}
          style={{ borderColor: colors.primary }}
        />
      </View>


      {/* Active Withdrawal Alerts */}
      <GroupedList title="Active Withdrawal Enforcement Ledger">
        {withdrawalAlerts.length === 0 ? (
          <ListRow title="No active withdrawal restrictions" subtitle="All assigned cows cleared" isLast />
        ) : (
          withdrawalAlerts.map((alert: any, idx: number) => (
            <ListRow
              key={alert.id}
              title={`Tag #${alert.tag_number} • ${alert.cow_name}`}
              subtitle={`${alert.medicine_name} • Until: ${new Date(alert.restriction_end).toLocaleDateString('en-IN')}`}
              icon="warning"
              iconColor={colors.hold}
              iconBg={colors.holdBg}
              rightComponent={<StatusChip status="HOLD" size="sm" />}
              isLast={idx === withdrawalAlerts.length - 1}
            />
          ))
        )}
      </GroupedList>

      {/* Assigned Cattle List */}
      <GroupedList title="Assigned Bovine Patients">
        {assignedCows.slice(0, 6).map((cow: any, idx: number) => (
          <ListRow
            key={cow.id}
            title={cow.name}
            subtitle={`Tag: ${cow.tag_number} • Owner: ${cow.owner_name}`}
            icon="paw"
            rightComponent={
              <StatusChip status={cow.active_withdrawal_status === 'active' ? 'HOLD' : cow.health_status} size="sm" />
            }
            onPress={() => router.push({ pathname: '/(veterinary)/cow-details', params: { id: cow.id } })}
            showChevron
            isLast={idx === Math.min(assignedCows.length, 6) - 1}
          />
        ))}
      </GroupedList>

      {/* Appointments */}
      <GroupedList title="Farmer Consultation Requests">
        {appointments.map((appt: any, idx: number) => (
          <ListRow
            key={appt.id}
            title={`${appt.appointment_type.replace('_', ' ').toUpperCase()} • ${appt.cow_name}`}
            subtitle={`Farmer: ${appt.farmer_name} • Req: ${new Date(appt.requested_date).toLocaleDateString('en-IN')}`}
            icon="calendar-outline"
            rightComponent={<StatusChip status={appt.status} size="sm" />}
            isLast={idx === appointments.length - 1}
          />
        ))}
      </GroupedList>

      {/* Account Info & Logout */}
      <View style={{ marginHorizontal: 16, marginTop: 16 }}>
        <Button
          title="Sign Out of Veterinary Officer Account"
          variant="destructive"
          icon="log-out-outline"
          onPress={handleLogout}
        />
      </View>

      <QRScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onScan={(token) => {
          router.push({ pathname: '/(veterinary)/cow-details', params: { identifier: token } });
        }}
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
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
  },
  actionBtns: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginVertical: 12,
  },
});
