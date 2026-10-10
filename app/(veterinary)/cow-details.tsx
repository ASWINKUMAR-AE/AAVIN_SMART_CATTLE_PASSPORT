import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, ActivityIndicator, Image, Modal, Alert, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { Card } from '../../components/ui/Card';
import { StatusChip } from '../../components/ui/StatusChip';
import { GroupedList } from '../../components/ui/GroupedList';
import { ListRow } from '../../components/ui/ListRow';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/TextField';
import { CattleHealthCharts } from '../../components/ui/CattleHealthCharts';
import { api } from '../../services/api';
import { Ionicons } from '@expo/vector-icons';

export default function VetCowDetailsScreen() {
  const { id, identifier } = useLocalSearchParams<{ id?: string; identifier?: string }>();
  const { colors, isDark } = useTheme();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [passport, setPassport] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Cattle Data Edit Modal State
  const [editCowVisible, setEditCowVisible] = useState(false);
  const [savingCow, setSavingCow] = useState(false);
  const [cowFormData, setCowFormData] = useState<any>({});

  // Farmer Data Edit Modal State
  const [editFarmerVisible, setEditFarmerVisible] = useState(false);
  const [savingFarmer, setSavingFarmer] = useState(false);
  const [farmerFormData, setFarmerFormData] = useState<any>({});

  useEffect(() => {
    fetchPassport();
  }, [id, identifier]);

  const fetchPassport = async () => {
    setLoading(true);
    setError(null);
    try {
      let cowId = id;
      if (!cowId && identifier) {
        const lookupRes = await api.get(`/cows/lookup/${encodeURIComponent(identifier)}`);
        if (lookupRes.data?.data?.id) {
          cowId = lookupRes.data.data.id;
        }
      }

      if (!cowId) {
        setError('Cattle record identifier not specified');
        return;
      }

      const res = await api.get(`/cows/${cowId}/passport`);
      if (res.data?.data) {
        setPassport(res.data.data);
      } else {
        setError('Digital Passport could not be loaded');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve clinical cattle record');
    } finally {
      setLoading(false);
    }
  };

  const openEditCowModal = () => {
    if (!passport?.cow) return;
    const c = passport.cow;
    setCowFormData({
      name: c.name || '',
      tagNumber: c.tag_number || '',
      breed: c.breed || 'Jersey Cross',
      lactationStage: c.lactation_stage || 'peak',
      milkingStatus: c.milking_status || 'lactating',
      averageDailyYield: String(c.average_daily_yield ?? '12.0'),
      somaticCellCount: String(c.somatic_cell_count ?? '145000'),
      inseminationStatus: c.insemination_status || 'not_bred',
      dailyGreenFodderKg: String(c.daily_green_fodder_kg ?? '25.0'),
      dailyConcentrateKg: String(c.daily_concentrate_kg ?? '4.0'),
      mineralMixtureGrams: String(c.mineral_mixture_grams ?? '50'),
      vaccinationStatus: c.vaccination_status || 'up_to_date',
      lastDewormingDate: c.last_deworming_date ? String(c.last_deworming_date).slice(0, 10) : '2026-09-10',
      identificationMarks: c.identification_marks || '',
      photoUrl: c.photo_url || '',
    });
    setEditCowVisible(true);
  };

  const handleSaveCow = async () => {
    setSavingCow(true);
    try {
      const payload: any = {
        name: cowFormData.name,
        tagNumber: cowFormData.tagNumber,
        breed: cowFormData.breed,
        lactationStage: cowFormData.lactationStage,
        milkingStatus: cowFormData.milkingStatus,
        averageDailyYield: parseFloat(cowFormData.averageDailyYield) || 12.0,
        somaticCellCount: parseInt(cowFormData.somaticCellCount) || 145000,
        inseminationStatus: cowFormData.inseminationStatus,
        dailyGreenFodderKg: parseFloat(cowFormData.dailyGreenFodderKg) || 25.0,
        dailyConcentrateKg: parseFloat(cowFormData.dailyConcentrateKg) || 4.0,
        mineralMixtureGrams: parseInt(cowFormData.mineralMixtureGrams) || 50,
        vaccinationStatus: cowFormData.vaccinationStatus,
        lastDewormingDate: cowFormData.lastDewormingDate,
        identificationMarks: cowFormData.identificationMarks,
      };

      if (cowFormData.photoUrl) {
        payload.photoUrl = cowFormData.photoUrl;
      }

      const res = await api.patch(`/cows/${passport.cow.id}`, payload);
      if (res.data?.data) {
        setPassport((prev: any) => ({
          ...prev,
          cow: { ...prev.cow, ...res.data.data },
        }));
        Alert.alert('Doctor Update Saved', 'Cattle details, breeding & feeding parameters updated without affecting other systems.');
        setEditCowVisible(false);
      }
    } catch (err: any) {
      Alert.alert('Update Failed', err.response?.data?.message || err.message || 'Could not update cattle data.');
    } finally {
      setSavingCow(false);
    }
  };

  const openEditFarmerModal = async () => {
    if (!passport?.cow) return;
    const c = passport.cow;
    const ownerId = c.owner_id || c.current_owner_user_id;
    try {
      const res = await api.get(`/farmers/${ownerId}`);
      const f = res.data?.data || {};
      setFarmerFormData({
        fullName: f.full_name || c.owner_name || '',
        phone: f.phone || c.owner_phone || '',
        village: f.village || c.owner_village || '',
        taluk: f.taluk || 'Melur',
        bankAccountName: f.bank_account_name || '',
        bankName: f.bank_name || '',
        bankAccountNumber: f.bank_account_number || '',
        bankIfsc: f.bank_ifsc || '',
        upiId: f.upi_id || '',
      });
      setEditFarmerVisible(true);
    } catch (e) {
      setFarmerFormData({
        fullName: c.owner_name || '',
        phone: c.owner_phone || '',
        village: c.owner_village || '',
        taluk: 'Melur',
        bankAccountName: '',
        bankName: '',
        bankAccountNumber: '',
        bankIfsc: '',
        upiId: '',
      });
      setEditFarmerVisible(true);
    }
  };

  const handleSaveFarmer = async () => {
    setSavingFarmer(true);
    try {
      const ownerId = passport.cow.owner_id || passport.cow.current_owner_user_id;
      const payload = {
        fullName: farmerFormData.fullName,
        phone: farmerFormData.phone,
        village: farmerFormData.village,
        taluk: farmerFormData.taluk,
        bankAccountName: farmerFormData.bankAccountName,
        bankName: farmerFormData.bankName,
        bankAccountNumber: farmerFormData.bankAccountNumber,
        bankIfsc: farmerFormData.bankIfsc,
        upiId: farmerFormData.upiId,
      };

      const res = await api.patch(`/farmers/${ownerId}`, payload);
      if (res.data?.data) {
        setPassport((prev: any) => ({
          ...prev,
          cow: {
            ...prev.cow,
            owner_name: farmerFormData.fullName,
            owner_phone: farmerFormData.phone,
            owner_village: farmerFormData.village,
          },
        }));
        Alert.alert('Doctor Update Saved', 'Farmer profile, contact and banking details updated successfully.');
        setEditFarmerVisible(false);
      }
    } catch (err: any) {
      Alert.alert('Update Failed', err.response?.data?.message || err.message || 'Could not update farmer details.');
    } finally {
      setSavingFarmer(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[Typography.subhead, { color: colors.textSecondary, marginTop: 12 }]}>
          Loading Veterinary Cattle Passport...
        </Text>
      </View>
    );
  }

  if (error || !passport) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, padding: 24 }]}>
        <Ionicons name="alert-circle-outline" size={54} color={colors.hold} />
        <Text style={[Typography.title2, { color: colors.text, marginTop: 16, textAlign: 'center' }]}>
          Patient Record Not Found
        </Text>
        <Text style={[Typography.subhead, { color: colors.textSecondary, marginTop: 8, textAlign: 'center' }]}>
          {error || 'Unable to find this cattle medical record.'}
        </Text>
        <Button title="Go Back to Vet Desk" onPress={() => router.replace('/(veterinary)')} style={{ marginTop: 24 }} />
      </View>
    );
  }

  const { cow, healthRecords, treatments, vaccinations, production } = passport;
  const isWithdrawalActive = cow.active_withdrawal_status === 'active';

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      {/* Passport Header Card */}
      <Card style={styles.passportCard}>
        <View style={styles.headerTop}>
          <View style={styles.badgeHeader}>
            <Text style={[Typography.caption2, { color: colors.primary, fontWeight: '800', letterSpacing: 1 }]}>
              VETERINARY CLINICAL PASSPORT
            </Text>
            <Text style={[Typography.title1, { color: colors.text, marginTop: 4 }]}>
              {cow.name}
            </Text>
            <Text style={[Typography.headline, { color: colors.primary }]}>
              Tag: {cow.tag_number}
            </Text>
          </View>
          <StatusChip status={isWithdrawalActive ? 'HOLD' : cow.health_status} size="md" />
        </View>

        {cow.photo_url && (
          <Image source={{ uri: cow.photo_url }} style={styles.cowImage} resizeMode="cover" />
        )}

        <View style={styles.metaGrid}>
          <View style={styles.metaItem}>
            <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Breed</Text>
            <Text style={[Typography.callout, { color: colors.text, fontWeight: '600' }]}>{cow.breed}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Lactation</Text>
            <Text style={[Typography.callout, { color: colors.text, fontWeight: '600' }]}>{cow.lactation_stage || 'Peak'}</Text>
          </View>
          <View style={styles.metaItem}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Owner / Farmer</Text>
              <TouchableOpacity onPress={openEditFarmerModal} style={{ marginLeft: 6 }}>
                <Ionicons name="pencil" size={13} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <Text style={[Typography.callout, { color: colors.text, fontWeight: '600' }]}>{cow.owner_name}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Village / Society</Text>
            <Text style={[Typography.callout, { color: colors.text, fontWeight: '600' }]}>{cow.owner_village || cow.centre_name || 'Melur'}</Text>
          </View>
        </View>

        {/* Clinical & Milk Quality Metrics Scorecard */}
        <View style={[styles.scorecardBox, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
          <View style={styles.scorecardHeader}>
            <Ionicons name="medkit" size={20} color="#16A34A" />
            <Text style={[Typography.subhead, { color: '#16A34A', fontWeight: '700', marginLeft: 6 }]}>
              Clinical Health & Dairy Company Scorecard
            </Text>
          </View>

          <View style={styles.scorecardGrid}>
            <View style={styles.scorecardItem}>
              <Text style={[Typography.caption2, { color: colors.textSecondary }]}>MILK SAFETY INDEX</Text>
              <Text style={[Typography.headline, { color: (cow.milk_safety_index || 98) >= 90 ? '#16A34A' : '#DC2626', fontWeight: '800' }]}>
                {cow.milk_safety_index || 98}/100 { (cow.milk_safety_index || 98) >= 90 ? '⭐ Safe' : '⚠️ Withheld' }
              </Text>
            </View>
            <View style={styles.scorecardItem}>
              <Text style={[Typography.caption2, { color: colors.textSecondary }]}>SOMATIC CELLS (SCC)</Text>
              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700' }]}>
                {Number(cow.somatic_cell_count || 145000).toLocaleString('en-IN')} cells/mL
              </Text>
            </View>
            <View style={styles.scorecardItem}>
              <Text style={[Typography.caption2, { color: colors.textSecondary }]}>BREEDING STATUS</Text>
              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '600', textTransform: 'capitalize' }]}>
                {(cow.insemination_status || 'not_bred').replace('_', ' ')}
              </Text>
            </View>
            <View style={styles.scorecardItem}>
              <Text style={[Typography.caption2, { color: colors.textSecondary }]}>VACCINATION & DEWORMING</Text>
              <Text style={[Typography.caption1, { color: '#16A34A', fontWeight: '600' }]}>
                Vaccine: {(cow.vaccination_status || 'up_to_date').replace(/_/g, ' ')}
              </Text>
              <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                Dewormed: {cow.last_deworming_date || '2026-09-10'}
              </Text>
            </View>
          </View>

          <View style={styles.feedBar}>
            <Text style={[Typography.caption2, { color: colors.textSecondary, marginBottom: 2, fontWeight: '700' }]}>
              NUTRITIONAL RATION TRACKER
            </Text>
            <Text style={[Typography.footnote, { color: colors.text }]}>
              Green Fodder: <Text style={{ fontWeight: '700' }}>{cow.daily_green_fodder_kg || '25.0'}kg</Text> • Concentrate: <Text style={{ fontWeight: '700' }}>{cow.daily_concentrate_kg || '4.0'}kg</Text> • Mineral Mix: <Text style={{ fontWeight: '700' }}>{cow.mineral_mixture_grams || '50'}g</Text>
            </Text>
          </View>
        </View>
      </Card>

      {/* Active Antibiotic Withdrawal Warning Banner */}
      {isWithdrawalActive && (
        <Card style={[styles.withdrawalAlertCard, { backgroundColor: colors.holdBg, borderColor: colors.hold }]}>
          <View style={styles.alertHeader}>
            <Ionicons name="hand-left" size={22} color={colors.hold} />
            <Text style={[Typography.headline, { color: colors.hold, marginLeft: 8 }]}>
              Active Antibiotic Withdrawal Period
            </Text>
          </View>
          <Text style={[Typography.subhead, { color: colors.text, marginTop: 6 }]}>
            Diagnosis: {cow.withdrawal_reason || 'Clinical Mastitis / Antimicrobial Therapy'}.
          </Text>
          <Text style={[Typography.footnote, { color: colors.hold, marginTop: 4, fontWeight: '700' }]}>
            Mandatory withholding active until: {cow.withdrawal_end_time ? new Date(cow.withdrawal_end_time).toLocaleString('en-IN') : 'In Force'}
          </Text>
        </Card>
      )}

      {/* Quick Vet Actions */}
      <View style={styles.actionRow}>
        <Button
          title="Prescribe Treatment"
          icon="bandage-outline"
          onPress={() => router.push({ pathname: '/(veterinary)/treatment-entry', params: { cowId: cow.id, tag: cow.tag_number } })}
          style={{ flex: 1, marginRight: 6 }}
        />
        <Button
          title="Log Health Exam"
          icon="pulse-outline"
          variant="secondary"
          onPress={() => router.push({ pathname: '/(veterinary)/examination-entry', params: { cowId: cow.id, tag: cow.tag_number } })}
          style={{ flex: 1, marginLeft: 6 }}
        />
      </View>

      {/* Doctor Master Edit Controls (Both Cattle and Farmer Data) */}
      <View style={styles.actionRow}>
        <Button
          title="Edit Cattle Details"
          icon="create-outline"
          variant="outline"
          onPress={openEditCowModal}
          style={{ flex: 1, marginRight: 6, borderColor: colors.primary }}
        />
        <Button
          title="Edit Farmer Profile"
          icon="person-outline"
          variant="outline"
          onPress={openEditFarmerModal}
          style={{ flex: 1, marginLeft: 6, borderColor: '#16A34A' }}
        />
      </View>


      {/* Visual Chart Hub & Vaccination Predictor */}
      <View style={{ marginHorizontal: 16, marginTop: 8, marginBottom: 12 }}>
        <CattleHealthCharts
          cow={cow}
          production={production}
          vaccinations={vaccinations}
          healthRecords={healthRecords}
          showDoctorControls={true}
        />
      </View>

      {/* Clinical Examination History */}
      <GroupedList title="Clinical Examination History">
        {healthRecords && healthRecords.length > 0 ? (
          healthRecords.map((hr: any, idx: number) => (
            <ListRow
              key={hr.id}
              title={hr.diagnosis || 'General Examination'}
              subtitle={`Temp: ${hr.body_temperature_c}°C • BCS: ${hr.body_condition_score} • Examined by: ${hr.vet_name}`}
              icon="pulse-outline"
              rightComponent={<StatusChip status={hr.health_status_assigned || 'healthy'} size="sm" />}
              isLast={idx === healthRecords.length - 1}
            />
          ))
        ) : (
          <ListRow title="No clinical records logged yet" subtitle="Tap Log Health Exam above to record findings" isLast />
        )}
      </GroupedList>

      {/* Treatment & Prescription History */}
      <GroupedList title="Prescriptions & Medical Treatments">
        {treatments && treatments.length > 0 ? (
          treatments.map((tr: any, idx: number) => (
            <ListRow
              key={tr.id}
              title={`${tr.brand_name || tr.custom_medicine_name || 'Treatment'} • ${tr.dosage}`}
              subtitle={`Route: ${tr.route_of_administration} • Withdrawal: ${tr.withdrawal_period_days} Days (${tr.withdrawal_period_hours || tr.withdrawal_period_days * 24}h)`}
              icon="medkit-outline"
              rightComponent={
                <StatusChip
                  status={new Date(tr.milk_withholding_end_time) > new Date() ? 'HOLD' : 'CLEAR'}
                  size="sm"
                />
              }
              isLast={idx === treatments.length - 1}
            />
          ))
        ) : (
          <ListRow title="No treatments recorded" subtitle="Tap Prescribe Treatment above to log medication" isLast />
        )}
      </GroupedList>

      {/* Vaccination Records */}
      <GroupedList title="Vaccination Ledger">
        {vaccinations && vaccinations.length > 0 ? (
          vaccinations.map((vr: any, idx: number) => (
            <ListRow
              key={vr.id}
              title={`${vr.vaccine_name} • Dose: ${vr.dose}`}
              subtitle={`Batch: ${vr.batch_number} • Administered: ${new Date(vr.administration_date).toLocaleDateString('en-IN')}`}
              icon="shield-checkmark-outline"
              isLast={idx === vaccinations.length - 1}
            />
          ))
        ) : (
          <ListRow title="Routine immunization up to date (FMD / Anthrax)" isLast />
        )}
      </GroupedList>

      {/* Production History */}
      <GroupedList title="Recent Milk Production (14 Days)">
        {production && production.length > 0 ? (
          production.slice(0, 5).map((pr: any, idx: number) => (
            <ListRow
              key={pr.id}
              title={`${pr.quantity_litres} Litres (${pr.session.toUpperCase()})`}
              subtitle={`Date: ${pr.production_date} • Note: ${pr.cow_condition_notes || 'Normal'}`}
              icon="water-outline"
              isLast={idx === Math.min(production.length, 5) - 1}
            />
          ))
        ) : (
          <ListRow title="No production logs available" isLast />
        )}
      </GroupedList>

      {/* Return button */}
      <View style={{ marginHorizontal: 16, marginTop: 12 }}>
        <Button
          title="Back to Vet Desk"
          variant="outline"
          onPress={() => router.replace('/(veterinary)')}
        />
      </View>

      {/* MODAL 1: EDIT CATTLE DATA */}
      <Modal
        visible={editCowVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditCowVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[Typography.title3, { color: colors.text }]}>✏️ Edit Cattle Data</Text>
                <Text style={[Typography.caption1, { color: colors.textSecondary }]}>
                  Doctor override for Tag #{cow.tag_number} ({cow.name})
                </Text>
              </View>
              <TouchableOpacity onPress={() => setEditCowVisible(false)} hitSlop={12}>
                <Ionicons name="close-circle" size={26} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <TextField
                label="Cattle Official Tag"
                value={cowFormData.tagNumber}
                onChangeText={(t) => setCowFormData({ ...cowFormData, tagNumber: t })}
                placeholder="e.g. TN-MDU-COW-1001"
              />
              <TextField
                label="Cattle Name"
                value={cowFormData.name}
                onChangeText={(t) => setCowFormData({ ...cowFormData, name: t })}
                placeholder="e.g. Kamadhenu"
              />
              <TextField
                label="Breed"
                value={cowFormData.breed}
                onChangeText={(t) => setCowFormData({ ...cowFormData, breed: t })}
                placeholder="e.g. Jersey Cross / Holstein Friesian"
              />
              <TextField
                label="Average Daily Yield (Litres)"
                value={cowFormData.averageDailyYield}
                onChangeText={(t) => setCowFormData({ ...cowFormData, averageDailyYield: t })}
                keyboardType="numeric"
                placeholder="14.0"
              />
              <TextField
                label="Lactation Stage"
                value={cowFormData.lactationStage}
                onChangeText={(t) => setCowFormData({ ...cowFormData, lactationStage: t })}
                placeholder="early / peak / mid / late / dry / heifer"
              />
              <TextField
                label="Milking Status"
                value={cowFormData.milkingStatus}
                onChangeText={(t) => setCowFormData({ ...cowFormData, milkingStatus: t })}
                placeholder="lactating / dry / pregnant / quarantine_hold"
              />
              <TextField
                label="Breeding / Insemination Status"
                value={cowFormData.inseminationStatus}
                onChangeText={(t) => setCowFormData({ ...cowFormData, inseminationStatus: t })}
                placeholder="confirmed_pregnant / inseminated / not_bred / dry"
              />
              <TextField
                label="Somatic Cell Count (cells/mL)"
                value={cowFormData.somaticCellCount}
                onChangeText={(t) => setCowFormData({ ...cowFormData, somaticCellCount: t })}
                keyboardType="numeric"
                placeholder="145000"
              />
              <TextField
                label="Daily Green Fodder (kg)"
                value={cowFormData.dailyGreenFodderKg}
                onChangeText={(t) => setCowFormData({ ...cowFormData, dailyGreenFodderKg: t })}
                keyboardType="numeric"
                placeholder="25.0"
              />
              <TextField
                label="Daily Concentrate Feed (kg)"
                value={cowFormData.dailyConcentrateKg}
                onChangeText={(t) => setCowFormData({ ...cowFormData, dailyConcentrateKg: t })}
                keyboardType="numeric"
                placeholder="4.0"
              />
              <TextField
                label="Daily Mineral Mixture (grams)"
                value={cowFormData.mineralMixtureGrams}
                onChangeText={(t) => setCowFormData({ ...cowFormData, mineralMixtureGrams: t })}
                keyboardType="numeric"
                placeholder="50"
              />
              <TextField
                label="Vaccination Status"
                value={cowFormData.vaccinationStatus}
                onChangeText={(t) => setCowFormData({ ...cowFormData, vaccinationStatus: t })}
                placeholder="up_to_date / due_soon / booster_pending"
              />
              <TextField
                label="Last Deworming Date (YYYY-MM-DD)"
                value={cowFormData.lastDewormingDate}
                onChangeText={(t) => setCowFormData({ ...cowFormData, lastDewormingDate: t })}
                placeholder="2026-09-10"
              />
              <TextField
                label="Identification Marks"
                value={cowFormData.identificationMarks}
                onChangeText={(t) => setCowFormData({ ...cowFormData, identificationMarks: t })}
                placeholder="e.g. White patch on forehead"
              />
            </ScrollView>

            <View style={styles.modalActionRow}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setEditCowVisible(false)}
                style={{ flex: 1, marginRight: 6 }}
              />
              <Button
                title={savingCow ? 'Saving...' : 'Save Cattle Records'}
                onPress={handleSaveCow}
                disabled={savingCow}
                style={{ flex: 1, marginLeft: 6 }}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL 2: EDIT FARMER PROFILE */}
      <Modal
        visible={editFarmerVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditFarmerVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[Typography.title3, { color: colors.text }]}>👤 Edit Farmer Profile</Text>
                <Text style={[Typography.caption1, { color: colors.textSecondary }]}>
                  Update personal, village & banking ledger data
                </Text>
              </View>
              <TouchableOpacity onPress={() => setEditFarmerVisible(false)} hitSlop={12}>
                <Ionicons name="close-circle" size={26} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <TextField
                label="Farmer Full Name"
                value={farmerFormData.fullName}
                onChangeText={(t) => setFarmerFormData({ ...farmerFormData, fullName: t })}
                placeholder="e.g. K. Murugesan"
              />
              <TextField
                label="Phone Number"
                value={farmerFormData.phone}
                onChangeText={(t) => setFarmerFormData({ ...farmerFormData, phone: t })}
                keyboardType="phone-pad"
                placeholder="e.g. +91 98421 12345"
              />
              <TextField
                label="Village / Society"
                value={farmerFormData.village}
                onChangeText={(t) => setFarmerFormData({ ...farmerFormData, village: t })}
                placeholder="e.g. Melur"
              />
              <TextField
                label="Taluk / District"
                value={farmerFormData.taluk}
                onChangeText={(t) => setFarmerFormData({ ...farmerFormData, taluk: t })}
                placeholder="e.g. Melur, Madurai"
              />
              <TextField
                label="Bank Account Name"
                value={farmerFormData.bankAccountName}
                onChangeText={(t) => setFarmerFormData({ ...farmerFormData, bankAccountName: t })}
                placeholder="e.g. K Murugesan"
              />
              <TextField
                label="Bank Name"
                value={farmerFormData.bankName}
                onChangeText={(t) => setFarmerFormData({ ...farmerFormData, bankName: t })}
                placeholder="e.g. State Bank of India"
              />
              <TextField
                label="Bank Account Number"
                value={farmerFormData.bankAccountNumber}
                onChangeText={(t) => setFarmerFormData({ ...farmerFormData, bankAccountNumber: t })}
                keyboardType="numeric"
                placeholder="e.g. 30894561230"
              />
              <TextField
                label="Bank IFSC Code"
                value={farmerFormData.bankIfsc}
                onChangeText={(t) => setFarmerFormData({ ...farmerFormData, bankIfsc: t })}
                placeholder="e.g. SBIN0001234"
              />
              <TextField
                label="UPI ID"
                value={farmerFormData.upiId}
                onChangeText={(t) => setFarmerFormData({ ...farmerFormData, upiId: t })}
                placeholder="e.g. murugan@sbi"
              />
            </ScrollView>

            <View style={styles.modalActionRow}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setEditFarmerVisible(false)}
                style={{ flex: 1, marginRight: 6 }}
              />
              <Button
                title={savingFarmer ? 'Saving...' : 'Save Farmer Details'}
                onPress={handleSaveFarmer}
                disabled={savingFarmer}
                style={{ flex: 1, marginLeft: 6, backgroundColor: '#16A34A' }}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passportCard: {
    margin: 16,
    padding: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  badgeHeader: {
    flex: 1,
  },
  cowImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginVertical: 12,
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  metaItem: {
    width: '50%',
    paddingVertical: 6,
  },
  scorecardBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginTop: 14,
  },
  scorecardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  scorecardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 10,
  },
  scorecardItem: {
    width: '50%',
    paddingRight: 6,
  },
  feedBar: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#BBF7D0',
  },
  withdrawalAlertCard: {
    marginHorizontal: 16,
    borderWidth: 1.5,
    marginBottom: 12,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginVertical: 6,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxHeight: '85%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#CBD5E1',
  },
  modalScroll: {
    maxHeight: 380,
  },
  modalActionRow: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#CBD5E1',
  },
});

