import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/TextField';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { api } from '../../services/api';
import { QRScannerModal } from '../../components/scanner/QRScannerModal';
import { Ionicons } from '@expo/vector-icons';

export default function TreatmentEntryScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [cows, setCows] = useState<any[]>([]);
  const [medicines, setMedicines] = useState<any[]>([]);
  const [selectedCowId, setSelectedCowId] = useState('');
  const [selectedMedicineId, setSelectedMedicineId] = useState('');
  const [customMedicine, setCustomMedicine] = useState('');
  const [dosage, setDosage] = useState('1 tube intramammary BID x 3 days');
  const [routeIndex, setRouteIndex] = useState(3); // 'intramammary'
  const routes = ['IM', 'IV', 'SC', 'Intramammary', 'Oral'];
  const routeKeys = ['intramuscular', 'intravenous', 'subcutaneous', 'intramammary', 'oral'];

  const [treatmentDays, setTreatmentDays] = useState('3');
  const [withdrawalDays, setWithdrawalDays] = useState('4');
  const [reason, setReason] = useState('Clinical Mastitis in Left Quarter');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [cowsRes, medsRes] = await Promise.all([
        api.get('/veterinary/assignments'),
        api.get('/veterinary/medicines'),
      ]);
      if (cowsRes.data?.data?.length > 0) {
        setCows(cowsRes.data.data);
        setSelectedCowId(cowsRes.data.data[0].id);
      }
      if (medsRes.data?.data?.length > 0) {
        setMedicines(medsRes.data.data);
        setSelectedMedicineId(medsRes.data.data[1].id); // Default to Amoxicillin/Cloxacillin
        setWithdrawalDays(String(medsRes.data.data[1].default_milk_withdrawal_days));
      }
    } catch (e) {
      console.warn('Failed to load treatment dependencies:', e);
    }
  };

  const handleMedicineSelect = (med: any) => {
    setSelectedMedicineId(med.id);
    setWithdrawalDays(String(med.default_milk_withdrawal_days));
  };

  const handleScan = (token: string) => {
    api.get(`/cows/lookup/${encodeURIComponent(token)}`).then((res) => {
      if (res.data?.data?.id) {
        setSelectedCowId(res.data.data.id);
      }
    }).catch(() => {
      Alert.alert('Scan Error', 'Cattle not found');
    });
  };

  const handleSubmit = async () => {
    if (!selectedCowId || !dosage || !reason) {
      Alert.alert('Required Fields', 'Please select cow, specify dosage and diagnosis reason');
      return;
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + (parseInt(treatmentDays, 10) || 1));

    setLoading(true);
    try {
      const res = await api.post('/veterinary/treatments', {
        cowId: selectedCowId,
        medicineId: selectedMedicineId || undefined,
        customMedicineName: !selectedMedicineId ? customMedicine : undefined,
        dosage,
        routeOfAdministration: routeKeys[routeIndex],
        treatmentStartDate: startDate.toISOString(),
        treatmentEndDate: endDate.toISOString(),
        withdrawalPeriodDays: parseInt(withdrawalDays, 10) || 0,
        reasonForTreatment: reason,
        notes: notes || undefined,
      });

      const withholdingEnd = res.data?.data?.withholdingEndDate;
      Alert.alert(
        'Treatment & Withdrawal Activated',
        `Prescription saved. Cattle is now placed on MANDATORY MILK WITHDRAWAL HOLD until ${
          withholdingEnd ? new Date(withholdingEnd).toLocaleDateString('en-IN') : 'withdrawal period'
        }. Collection centers will automatically reject milk during this period.`,
        [{ text: 'OK', onPress: () => router.replace('/(veterinary)') }]
      );
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  // Live calculation of withdrawal withholding end date
  const calculatedEnd = new Date();
  calculatedEnd.setDate(calculatedEnd.getDate() + (parseInt(treatmentDays, 10) || 1) + (parseInt(withdrawalDays, 10) || 0));

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <Card>
        <View style={styles.headerRow}>
          <Text style={[Typography.title2, { color: colors.text }]}>
            Clinical Prescription
          </Text>
          <Button
            title="Scan QR"
            icon="qr-code-outline"
            size="sm"
            variant="secondary"
            onPress={() => setScannerVisible(true)}
          />
        </View>

        <Text style={[Typography.subhead, { color: colors.textSecondary, marginTop: 10, marginBottom: 6, fontWeight: '600' }]}>
          Select Patient Cattle:
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
          {cows.map((c) => {
            const isSelected = c.id === selectedCowId;
            return (
              <Button
                key={c.id}
                title={`${c.name} (#${c.tag_number})`}
                variant={isSelected ? 'primary' : 'secondary'}
                size="sm"
                onPress={() => setSelectedCowId(c.id)}
                style={{ marginRight: 8, marginBottom: 8 }}
              />
            );
          })}
        </ScrollView>

        <Text style={[Typography.subhead, { color: colors.textSecondary, marginTop: 10, marginBottom: 6, fontWeight: '600' }]}>
          Approved Veterinary Medicine:
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
          {medicines.map((m) => {
            const isSelected = m.id === selectedMedicineId;
            return (
              <Button
                key={m.id}
                title={`${m.brand_name} (${m.default_milk_withdrawal_days}d WD)`}
                variant={isSelected ? 'primary' : 'secondary'}
                size="sm"
                onPress={() => handleMedicineSelect(m)}
                style={{ marginRight: 8, marginBottom: 8 }}
              />
            );
          })}
        </ScrollView>

        <TextField
          label="Diagnosis / Reason for Treatment *"
          value={reason}
          onChangeText={setReason}
        />

        <TextField
          label="Dosage & Regimen *"
          value={dosage}
          onChangeText={setDosage}
        />

        <Text style={[Typography.subhead, { color: colors.textSecondary, marginTop: 10, marginBottom: 4, fontWeight: '600' }]}>
          Route of Administration
        </Text>
        <SegmentedControl
          values={routes}
          selectedIndex={routeIndex}
          onChange={setRouteIndex}
        />

        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 6 }}>
            <TextField
              label="Treatment Course (Days)"
              value={treatmentDays}
              onChangeText={setTreatmentDays}
              keyboardType="number-pad"
            />
          </View>
          <View style={{ flex: 1, marginLeft: 6 }}>
            <TextField
              label="Milk Withdrawal (Days) *"
              value={withdrawalDays}
              onChangeText={setWithdrawalDays}
              keyboardType="number-pad"
            />
          </View>
        </View>

        {/* Live Withdrawal Preview Calculation */}
        <View style={[styles.withdrawalNotice, { backgroundColor: colors.holdBg, borderColor: colors.hold }]}>
          <Ionicons name="time" size={20} color={colors.hold} style={{ marginRight: 8 }} />
          <View style={{ flex: 1 }}>
            <Text style={[Typography.footnote, { color: colors.hold, fontWeight: '700' }]}>
              AUTOMATIC MILK WITHDRAWAL LOCK
            </Text>
            <Text style={[Typography.caption1, { color: colors.text, marginTop: 2 }]}>
              Milk intake will be locked on HOLD until: {calculatedEnd.toLocaleDateString('en-IN')}.
            </Text>
          </View>
        </View>

        <TextField
          label="Clinical Notes / Recommendations"
          placeholder="e.g. Teat dip post milking, isolate in shed"
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={2}
        />

        <Button
          title="Save Prescription & Enforce Withdrawal"
          onPress={handleSubmit}
          loading={loading}
          variant="destructive"
          style={{ marginTop: 18 }}
        />
      </Card>

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
    padding: 16,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chipsScroll: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
  },
  withdrawalNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginVertical: 10,
  },
});
