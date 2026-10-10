import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, RefreshControl, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { LargeTitleHeader } from '../../components/ui/LargeTitleHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/TextField';
import { StatusChip } from '../../components/ui/StatusChip';
import { GroupedList } from '../../components/ui/GroupedList';
import { ListRow } from '../../components/ui/ListRow';
import { QRScannerModal } from '../../components/scanner/QRScannerModal';
import { api } from '../../services/api';
import { Ionicons } from '@expo/vector-icons';

export default function VendorDashboard() {
  const { user, logout } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();

  const [batches, setBatches] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [transitTemp, setTransitTemp] = useState('4.5');
  const [discrepancyLitres, setDiscrepancyLitres] = useState('');
  const [discrepancyReason, setDiscrepancyReason] = useState('');
  const [updating, setUpdating] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);

  // Cattle Scan & Verification State
  const [cowSearchInput, setCowSearchInput] = useState('');
  const [scannedCow, setScannedCow] = useState<any>(null);
  const [lookingUpCow, setLookingUpCow] = useState(false);

  const loadBatches = async () => {
    try {
      const res = await api.get('/batches');
      if (res.data?.data) {
        setBatches(res.data.data);
        if (res.data.data.length > 0 && !selectedBatch) {
          setSelectedBatch(res.data.data[0]);
        }
      }
    } catch (e) {
      console.warn('Failed to load batches:', e);
    }
  };

  useEffect(() => {
    loadBatches();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBatches();
    setRefreshing(false);
  };

  const handleLookupCattle = async (tokenOrTag: string) => {
    if (!tokenOrTag.trim()) return;
    setLookingUpCow(true);
    try {
      const res = await api.get(`/cows/lookup/${encodeURIComponent(tokenOrTag.trim())}`);
      if (res.data?.data) {
        setScannedCow(res.data.data);
      } else {
        // Check if matching batch
        const matchedBatch = batches.find(b => b.batch_number.toLowerCase() === tokenOrTag.trim().toLowerCase() || b.id === tokenOrTag.trim());
        if (matchedBatch) {
          setSelectedBatch(matchedBatch);
          Alert.alert('Batch Resolved', `Selected tanker batch #${matchedBatch.batch_number}`);
        } else {
          Alert.alert('Not Found', 'No cattle or batch matches this scanned QR token.');
        }
      }
    } catch (err: any) {
      const matchedBatch = batches.find(b => b.batch_number.toLowerCase() === tokenOrTag.trim().toLowerCase());
      if (matchedBatch) {
        setSelectedBatch(matchedBatch);
        Alert.alert('Batch Resolved', `Selected tanker batch #${matchedBatch.batch_number}`);
      } else {
        Alert.alert('Lookup Error', err.response?.data?.message || err.message);
      }
    } finally {
      setLookingUpCow(false);
    }
  };

  const handleAction = async (action: 'dispatched' | 'delivered' | 'discrepancy') => {
    if (!selectedBatch) return;

    // Check if batch is on HOLD
    if (selectedBatch.batch_safety_status === 'HOLD' && action === 'dispatched') {
      Alert.alert('HOLD RESTRICTION', 'This batch contains milk on HOLD and cannot be dispatched or released.');
      return;
    }

    setUpdating(true);
    try {
      if (action === 'dispatched') {
        await api.post(`/batches/${selectedBatch.id}/dispatch`, {
          litresRecorded: selectedBatch.total_litres,
          temperatureC: parseFloat(transitTemp) || 4.5,
        });
        Alert.alert('Dispatched', `Batch ${selectedBatch.batch_number} marked in transit.`);
      } else if (action === 'delivered') {
        await api.post(`/batches/${selectedBatch.id}/deliver`, {
          litresRecorded: selectedBatch.total_litres,
          temperatureC: parseFloat(transitTemp) || 4.5,
        });
        Alert.alert('Delivered', `Batch ${selectedBatch.batch_number} delivered to Aavin Madurai Central Dairy Plant.`);
      } else if (action === 'discrepancy') {
        if (!discrepancyLitres || !discrepancyReason) {
          Alert.alert('Required', 'Please provide discrepancy litres and reason');
          return;
        }
        await api.post(`/batches/${selectedBatch.id}/discrepancies`, {
          litresRecorded: selectedBatch.total_litres,
          discrepancyLitres: parseFloat(discrepancyLitres),
          discrepancyReason,
        });
        Alert.alert('Reported', 'Discrepancy logged in audit trail.');
        setDiscrepancyLitres('');
        setDiscrepancyReason('');
      }
      loadBatches();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      `Sign out from account ${user?.fullName || 'Transport Vendor'}?`,
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
        title="Milk Logistics"
        subtitle="Bulk Milk Transport Vendor"
        rightAction={{
          icon: 'qr-code-outline',
          onPress: () => setScannerVisible(true),
        }}
        onLogout={handleLogout}
      />

      {/* Role Clarification Banner */}
      <View style={[styles.roleNotice, { backgroundColor: colors.primaryLight }]}>
        <Ionicons name="information-circle" size={18} color={colors.primary} style={{ marginRight: 6 }} />
        <Text style={[Typography.caption1, { color: colors.textSecondary, flex: 1 }]}>
          Transport Vendor Mode: You manage bulk insulated tanker transportation from Village Collection Centres to Aavin Central Dairy Plant (Not retail milk selling).
        </Text>
      </View>

      {/* Cattle & Batch QR Verification Card */}
      <Card style={styles.actionCard}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <Text style={[Typography.headline, { color: colors.text }]}>
            🔍 Scan Cattle Tag / Batch Token
          </Text>
          <Button
            title="Open Camera"
            icon="camera-outline"
            size="sm"
            onPress={() => setScannerVisible(true)}
          />
        </View>
        <Text style={[Typography.caption1, { color: colors.textSecondary, marginBottom: 10 }]}>
          Scan any cattle ear-tag QR badge or enter tag number to verify milk origin & safety twin clearance.
        </Text>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <TextField
              placeholder="e.g. TN-MDU-COW-1001"
              value={cowSearchInput}
              onChangeText={setCowSearchInput}
              autoCapitalize="characters"
            />
          </View>
          <Button
            title="Verify"
            loading={lookingUpCow}
            onPress={() => handleLookupCattle(cowSearchInput)}
            style={{ height: 48, justifyContent: 'center' }}
          />
        </View>

        {/* Quick Demo Test Chips */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
          <Button
            title="Cow #1001 (Clear)"
            size="sm"
            variant="secondary"
            onPress={() => {
              setCowSearchInput('TN-MDU-COW-1001');
              handleLookupCattle('TN-MDU-COW-1001');
            }}
          />
          <Button
            title="Cow #1002 (Hold ⚠️)"
            size="sm"
            variant="secondary"
            onPress={() => {
              setCowSearchInput('TN-MDU-COW-1002');
              handleLookupCattle('TN-MDU-COW-1002');
            }}
          />
          <Button
            title="Cow #1005"
            size="sm"
            variant="secondary"
            onPress={() => {
              setCowSearchInput('TN-MDU-COW-1005');
              handleLookupCattle('TN-MDU-COW-1005');
            }}
          />
        </View>
      </Card>

      {/* Scanned Cattle Result Card */}
      {scannedCow && (
        <Card style={[styles.actionCard, { borderColor: scannedCow.active_withdrawal_status === 'active' ? colors.hold : colors.primary }]}>
          <View style={styles.batchHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={[Typography.caption2, { color: colors.primary, fontWeight: '800' }]}>
                SCANNED CATTLE RECORD RESOLVED
              </Text>
              <Text style={[Typography.title2, { color: colors.text, marginTop: 2 }]}>
                {scannedCow.name} ({scannedCow.tag_number})
              </Text>
              <Text style={[Typography.footnote, { color: colors.textSecondary }]}>
                Farmer: {scannedCow.owner_name} ({scannedCow.owner_village || 'Melur'}) • Breed: {scannedCow.breed}
              </Text>
            </View>
            <StatusChip
              status={scannedCow.active_withdrawal_status === 'active' ? 'HOLD' : 'CLEAR'}
              size="md"
            />
          </View>

          {/* Safety Twin Verdict */}
          <View style={[styles.verdictBox, { backgroundColor: scannedCow.active_withdrawal_status === 'active' ? '#FEF2F2' : '#F0FDF4', borderColor: scannedCow.active_withdrawal_status === 'active' ? '#FECACA' : '#BBF7D0' }]}>
            <Ionicons
              name={scannedCow.active_withdrawal_status === 'active' ? 'hand-left' : 'checkmark-circle'}
              size={20}
              color={scannedCow.active_withdrawal_status === 'active' ? '#DC2626' : '#16A34A'}
            />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={[Typography.subhead, { color: scannedCow.active_withdrawal_status === 'active' ? '#991B1B' : '#166534', fontWeight: '700' }]}>
                {scannedCow.active_withdrawal_status === 'active' ? '⚠️ Active Antibiotic Withdrawal Lock' : '✅ Food Safety Twin: Approved for Transport'}
              </Text>
              <Text style={[Typography.caption1, { color: colors.text, marginTop: 2 }]}>
                Safety Index: <Text style={{ fontWeight: '800' }}>{scannedCow.milk_safety_index || (scannedCow.active_withdrawal_status === 'active' ? 45 : 98)}/100</Text> • SCC: <Text style={{ fontWeight: '700' }}>{Number(scannedCow.somatic_cell_count || 145000).toLocaleString('en-IN')} cells/mL</Text>
              </Text>
            </View>
          </View>

          <Button
            title="View Complete Cattle Passport & Records"
            icon="document-text-outline"
            onPress={() => router.push({ pathname: '/(vendor)/cow-details', params: { id: scannedCow.id } })}
            style={{ marginTop: 12 }}
          />
        </Card>
      )}

      {/* Active Batches List */}
      <GroupedList title="Assigned Transport Batches">
        {batches.map((b, idx) => {
          const isSelected = selectedBatch?.id === b.id;
          return (
            <ListRow
              key={b.id}
              title={`${b.batch_number} • ${b.total_litres} Litres`}
              subtitle={`From: ${b.centre_name} • Fat: ${b.avg_fat_percent}% | SNF: ${b.avg_snf_percent}%`}
              icon="bus-outline"
              iconBg={isSelected ? colors.primary : colors.primaryLight}
              iconColor={isSelected ? '#FFFFFF' : colors.primary}
              rightComponent={<StatusChip status={b.status} size="sm" />}
              onPress={() => setSelectedBatch(b)}
              isLast={idx === batches.length - 1}
            />
          );
        })}
      </GroupedList>

      {/* Selected Batch Custody Actions */}
      {selectedBatch && (
        <Card style={styles.actionCard}>
          <View style={styles.batchHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={[Typography.title3, { color: colors.text }]}>
                Batch: {selectedBatch.batch_number}
              </Text>
              <Text style={[Typography.footnote, { color: colors.textSecondary }]}>
                Volume: {selectedBatch.total_litres} L • Tanker #{selectedBatch.storage_tanker_number || 'TN-59-BZ-4819'}
              </Text>
            </View>
            <StatusChip status={selectedBatch.batch_safety_status} />
          </View>

          <TextField
            label="Chilled Transport Temperature (°C)"
            value={transitTemp}
            onChangeText={setTransitTemp}
            keyboardType="decimal-pad"
          />

          <View style={styles.btnRow}>
            <Button
              title="Confirm Pickup & Dispatch"
              icon="arrow-forward-circle-outline"
              loading={updating}
              onPress={() => handleAction('dispatched')}
              style={{ flex: 1, marginRight: 6 }}
            />
            <Button
              title="Confirm Dairy Delivery"
              icon="checkmark-done-outline"
              variant="secondary"
              loading={updating}
              onPress={() => handleAction('delivered')}
              style={{ flex: 1, marginLeft: 6 }}
            />
          </View>

          {/* Discrepancy Reporting Form */}
          <View style={[styles.discrepancyBox, { borderTopColor: colors.separator }]}>
            <Text style={[Typography.headline, { color: colors.text, marginBottom: 4 }]}>
              Report Transit Spillage / Delay / Discrepancy
            </Text>
            <TextField
              label="Discrepancy Volume (Litres)"
              placeholder="e.g. 5.0"
              value={discrepancyLitres}
              onChangeText={setDiscrepancyLitres}
              keyboardType="decimal-pad"
            />
            <TextField
              label="Reason / Notes"
              placeholder="e.g. Minor valve spillage during transfer"
              value={discrepancyReason}
              onChangeText={setDiscrepancyReason}
            />
            <Button
              title="Submit Discrepancy Report"
              variant="destructive"
              size="sm"
              onPress={() => handleAction('discrepancy')}
              style={{ marginTop: 8 }}
            />
          </View>
        </Card>
      )}

      {/* Account Info & Logout */}
      <View style={{ marginHorizontal: 16, marginTop: 16 }}>
        <Button
          title="Sign Out of Transport Vendor Account"
          variant="destructive"
          icon="log-out-outline"
          onPress={handleLogout}
        />
      </View>

      <QRScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onScan={(token) => {
          setScannerVisible(false);
          setCowSearchInput(token);
          handleLookupCattle(token);
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
  roleNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 10,
  },
  actionCard: {
    marginHorizontal: 16,
    marginTop: 10,
    padding: 16,
  },
  batchHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  verdictBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 10,
  },
  btnRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  discrepancyBox: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
