import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Image, Pressable, Modal, TextInput, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAavinStore } from '../../store/AavinStoreContext';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { DemoHeader } from '../../components/DemoHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Ionicons } from '@expo/vector-icons';

export default function VetCowDetailsScreen() {
  const params = useLocalSearchParams();
  const cowId = (params.cowId as string) || (params.id as string) || 'COW002';
  const { cows, addMedicalRecord } = useAavinStore();
  const { colors } = useTheme();
  const router = useRouter();

  const cow = cows.find(c => c.id === cowId || c.tagId === cowId) || cows[1] || cows[0];

  const [activeTab, setActiveTab] = useState<'profile' | 'medical' | 'vaccines' | 'treatments' | 'breeding'>('profile');

  // Examination Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [diagnosis, setDiagnosis] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [temp, setTemp] = useState('38.6');
  const [recommendations, setRecommendations] = useState('');

  const handleSaveMedicalRecord = () => {
    if (!diagnosis.trim()) {
      Alert.alert('Required Field', 'Please enter a diagnosis or clinical assessment.');
      return;
    }

    addMedicalRecord(cow.id, {
      date: new Date().toISOString().split('T')[0],
      vetName: 'Dr. R. Anand BVSc',
      diagnosis: diagnosis.trim(),
      symptoms: symptoms.trim() || 'Veterinary physical exam',
      bodyTemperatureC: parseFloat(temp) || 38.6,
      heartRateBpm: 72,
      rumenMotility: 'Normal (3/2min)',
      recommendations: recommendations.trim() || 'Continue standard diet and hydration',
    });

    setModalVisible(false);
    setDiagnosis('');
    setSymptoms('');
    setRecommendations('');
    Alert.alert('Success', 'Clinical examination record added to Veterinary Health Passport.');
  };

  const hasWithdrawal = cow?.activeWithdrawal?.hasActiveWithdrawal;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <DemoHeader 
        title={cow.name}
        subtitle={`Veterinary Surveillance • Tag #${cow.tagId}`}
        showBack
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Cow Profile Hero Card */}
        <Card style={styles.heroCard}>
          <View style={styles.heroTop}>
            <Image
              source={{ uri: cow.photoUrl || 'https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?w=500' }}
              style={styles.heroImage}
            />
            <View style={styles.heroMeta}>
              <View style={styles.tagBadge}>
                <Ionicons name="pricetag" size={14} color="#0072BC" />
                <Text style={styles.tagText}>{cow.tagId}</Text>
              </View>
              <Text style={[Typography.title2, { color: colors.text, fontWeight: '900', marginTop: 4 }]}>
                {cow.name}
              </Text>
              <Text style={[Typography.subhead, { color: colors.primary, fontWeight: '700' }]}>
                {cow.breed}
              </Text>
              <Text style={[Typography.caption1, { color: colors.textSecondary, marginTop: 2 }]}>
                Owner: {cow.farmerName} ({cow.farmerId})
              </Text>
              <View style={[styles.verifBadge, { backgroundColor: cow.verificationStatus === 'verified' ? '#DCFCE7' : '#FEF3C7' }]}>
                <Ionicons 
                  name={cow.verificationStatus === 'verified' ? 'checkmark-circle' : 'time'} 
                  size={12} 
                  color={cow.verificationStatus === 'verified' ? '#15803D' : '#B45309'} 
                />
                <Text style={[styles.verifText, { color: cow.verificationStatus === 'verified' ? '#15803D' : '#B45309' }]}>
                  {cow.verificationStatus === 'verified' ? 'Verified Cattle Passport' : 'Pending Verification'}
                </Text>
              </View>
            </View>
          </View>

          {/* Active Medicine Withdrawal Alert Banner */}
          {hasWithdrawal && (
            <View style={styles.withdrawalBanner}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="warning" size={24} color="#DC2626" />
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={[Typography.headline, { color: '#B91C1C', fontWeight: '900' }]}>
                    ⚠️ ACTIVE MEDICINE WITHDRAWAL
                  </Text>
                  <Text style={[Typography.subhead, { color: '#7F1D1D', fontWeight: '700', marginTop: 2 }]}>
                    Drug: {cow.activeWithdrawal?.medicineName}
                  </Text>
                  <Text style={[Typography.caption1, { color: '#991B1B', marginTop: 2 }]}>
                    Clinical Reason: {cow.activeWithdrawal?.reason}
                  </Text>
                  <Text style={[Typography.caption1, { color: '#B91C1C', fontWeight: '800', marginTop: 4 }]}>
                    Withholding End Date: {cow.activeWithdrawal?.withdrawalEndDate} ({cow.activeWithdrawal?.daysRemaining} days remaining)
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Quick Actions for Vet */}
          <View style={styles.actionRow}>
            <Button
              title="Prescribe Treatment"
              size="sm"
              onPress={() => router.push('/(veterinary)/treatment-entry')}
              style={{ flex: 1 }}
            />
            <Button
              title="Add Examination"
              variant="secondary"
              size="sm"
              onPress={() => setModalVisible(true)}
              style={{ flex: 1 }}
            />
          </View>

          {/* Quick Stats Grid */}
          <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
            <View style={styles.statCol}>
              <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Daily Yield</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>{cow.dailyMilkYield.toFixed(1)} L</Text>
            </View>
            <View style={styles.statCol}>
              <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Lactation</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>{cow.lactationStage.toUpperCase()}</Text>
            </View>
            <View style={styles.statCol}>
              <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Age</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>{cow.approxAgeMonths} Mo</Text>
            </View>
            <View style={styles.statCol}>
              <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Health</Text>
              <Text style={[styles.statValue, { color: cow.healthStatus === 'healthy' ? '#16A34A' : '#DC2626' }]}>
                {cow.healthStatus === 'healthy' ? 'Healthy' : 'Hold'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Sub Navigation Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll}>
          <View style={styles.tabsContainer}>
            {[
              { key: 'profile', label: 'Overview', icon: 'information-circle' },
              { key: 'medical', label: `Clinical (${cow.medicalHistory.length})`, icon: 'fitness' },
              { key: 'vaccines', label: `Vaccines (${cow.vaccinationHistory.length})`, icon: 'shield-checkmark' },
              { key: 'treatments', label: `Treatments (${cow.treatmentRecords.length})`, icon: 'medkit' },
              { key: 'breeding', label: `Breeding (${cow.inseminationHistory.length})`, icon: 'heart' },
            ].map((tab) => (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key as any)}
                style={[
                  styles.tabBtn,
                  activeTab === tab.key && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
              >
                <Ionicons 
                  name={tab.icon as any} 
                  size={15} 
                  color={activeTab === tab.key ? '#FFFFFF' : colors.textSecondary} 
                  style={{ marginRight: 6 }} 
                />
                <Text style={[styles.tabLabel, { color: activeTab === tab.key ? '#FFFFFF' : colors.textSecondary }]}>
                  {tab.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'profile' && (
          <Card style={styles.tabContentCard}>
            <Text style={[Typography.headline, { color: colors.text, fontWeight: '800', marginBottom: 12 }]}>
              Animal Identification & Pedigree
            </Text>

            <View style={styles.specRow}>
              <Text style={[Typography.subhead, { color: colors.textSecondary }]}>12-Digit Tag Number:</Text>
              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]}>{cow.tagId}</Text>
            </View>
            <View style={styles.specRow}>
              <Text style={[Typography.subhead, { color: colors.textSecondary }]}>Date of Birth:</Text>
              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '600' }]}>{cow.dateOfBirth}</Text>
            </View>
            <View style={styles.specRow}>
              <Text style={[Typography.subhead, { color: colors.textSecondary }]}>Gender:</Text>
              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '600' }]}>{cow.sex.toUpperCase()}</Text>
            </View>
            <View style={styles.specRow}>
              <Text style={[Typography.subhead, { color: colors.textSecondary }]}>Physical Marks:</Text>
              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '600', flex: 1, textAlign: 'right' }]}>
                {cow.identificationMarks}
              </Text>
            </View>
          </Card>
        )}

        {/* TAB 2: MEDICAL */}
        {activeTab === 'medical' && (
          <Card style={styles.tabContentCard}>
            <Text style={[Typography.headline, { color: colors.text, fontWeight: '800', marginBottom: 12 }]}>
              Clinical Examinations Log
            </Text>

            {cow.medicalHistory.length === 0 ? (
              <Text style={[Typography.subhead, { color: colors.textSecondary, textAlign: 'center', marginVertical: 20 }]}>
                No prior clinical examinations recorded.
              </Text>
            ) : (
              cow.medicalHistory.map((m) => (
                <View key={m.id} style={[styles.historyItem, { borderBottomColor: colors.border }]}>
                  <View style={styles.historyItemHeader}>
                    <Text style={[Typography.subhead, { color: colors.primary, fontWeight: '800' }]}>
                      {m.diagnosis}
                    </Text>
                    <Text style={[Typography.caption2, { color: colors.textSecondary }]}>{m.date}</Text>
                  </View>
                  <Text style={[Typography.caption1, { color: colors.text, marginTop: 4 }]}>
                    Symptoms: {m.symptoms}
                  </Text>
                  <Text style={[Typography.caption2, { color: colors.textSecondary, marginTop: 2 }]}>
                    Temp: {m.bodyTemperatureC}°C • Heart Rate: {m.heartRateBpm} bpm • Rumen: {m.rumenMotility}
                  </Text>
                  <Text style={[Typography.caption1, { color: '#047857', fontWeight: '600', marginTop: 4 }]}>
                    Recommendations: {m.recommendations}
                  </Text>
                </View>
              ))
            )}
          </Card>
        )}

        {/* TAB 3: VACCINES */}
        {activeTab === 'vaccines' && (
          <Card style={styles.tabContentCard}>
            <Text style={[Typography.headline, { color: colors.text, fontWeight: '800', marginBottom: 12 }]}>
              Vaccination Records
            </Text>

            {cow.vaccinationHistory.length === 0 ? (
              <Text style={[Typography.subhead, { color: colors.textSecondary, textAlign: 'center', marginVertical: 20 }]}>
                No vaccination entries logged yet.
              </Text>
            ) : (
              cow.vaccinationHistory.map((v) => (
                <View key={v.id} style={[styles.historyItem, { borderBottomColor: colors.border }]}>
                  <View style={styles.historyItemHeader}>
                    <Text style={[Typography.subhead, { color: '#15803D', fontWeight: '800' }]}>
                      🛡️ {v.vaccineName}
                    </Text>
                    <Text style={[Typography.caption2, { color: colors.textSecondary }]}>{v.date}</Text>
                  </View>
                  <Text style={[Typography.caption1, { color: colors.textSecondary, marginTop: 4 }]}>
                    Batch: {v.batchNumber} • Administered by: {v.administeredBy}
                  </Text>
                  <Text style={[Typography.caption1, { color: colors.primary, fontWeight: '700', marginTop: 2 }]}>
                    Next Due Date: {v.nextDueDate}
                  </Text>
                </View>
              ))
            )}
          </Card>
        )}

        {/* TAB 4: TREATMENTS */}
        {activeTab === 'treatments' && (
          <Card style={styles.tabContentCard}>
            <Text style={[Typography.headline, { color: colors.text, fontWeight: '800', marginBottom: 12 }]}>
              Prescribed Treatments & Drug Withdrawals
            </Text>

            {cow.treatmentRecords.length === 0 ? (
              <Text style={[Typography.subhead, { color: colors.textSecondary, textAlign: 'center', marginVertical: 20 }]}>
                No treatments on record.
              </Text>
            ) : (
              cow.treatmentRecords.map((t) => (
                <View key={t.id} style={[styles.historyItem, { borderBottomColor: colors.border }]}>
                  <View style={styles.historyItemHeader}>
                    <Text style={[Typography.subhead, { color: '#DC2626', fontWeight: '800' }]}>
                      💊 {t.medicineName}
                    </Text>
                    <Text style={[Typography.caption2, { color: colors.textSecondary }]}>{t.date}</Text>
                  </View>
                  <Text style={[Typography.caption1, { color: colors.text, marginTop: 2 }]}>
                    Dosage: {t.dosage} ({t.route})
                  </Text>
                  <Text style={[Typography.caption1, { color: '#991B1B', fontWeight: '700', marginTop: 4 }]}>
                    Withdrawal Period: {t.withdrawalPeriodDays} Days (Withhold until {t.withdrawalEndDate})
                  </Text>
                  <Text style={[Typography.caption2, { color: colors.textSecondary, marginTop: 2 }]}>
                    Reason: {t.reason}
                  </Text>
                </View>
              ))
            )}
          </Card>
        )}

        {/* TAB 5: BREEDING */}
        {activeTab === 'breeding' && (
          <Card style={styles.tabContentCard}>
            <Text style={[Typography.headline, { color: colors.text, fontWeight: '800', marginBottom: 12 }]}>
              Artificial Insemination & Breeding History
            </Text>

            {cow.inseminationHistory.length === 0 ? (
              <Text style={[Typography.subhead, { color: colors.textSecondary, textAlign: 'center', marginVertical: 20 }]}>
                No insemination records logged.
              </Text>
            ) : (
              cow.inseminationHistory.map((ins) => (
                <View key={ins.id} style={[styles.historyItem, { borderBottomColor: colors.border }]}>
                  <View style={styles.historyItemHeader}>
                    <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]}>
                      Semen Bull: {ins.bullId}
                    </Text>
                    <Text style={[Typography.caption2, { color: colors.textSecondary }]}>{ins.date}</Text>
                  </View>
                  <Text style={[Typography.caption1, { color: colors.textSecondary, marginTop: 2 }]}>
                    Breed: {ins.breed} • AI Tech: {ins.technicianName}
                  </Text>
                  <Text style={[Typography.caption1, { color: colors.primary, fontWeight: '700', marginTop: 4 }]}>
                    Status: {ins.pregnancyStatus.replace('_', ' ').toUpperCase()}
                  </Text>
                </View>
              ))
            )}
          </Card>
        )}
      </ScrollView>

      {/* Add Examination Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={[Typography.title2, { color: colors.text }]}>Add Clinical Examination</Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView>
              <Text style={[Typography.caption1, { color: colors.textSecondary, marginBottom: 4 }]}>
                Diagnosis / Primary Finding *
              </Text>
              <TextInput
                placeholder="e.g. Udder examination, mastitis follow-up"
                placeholderTextColor={colors.textMuted}
                value={diagnosis}
                onChangeText={setDiagnosis}
                style={[styles.inputField, { color: colors.text, borderColor: colors.border }]}
              />

              <Text style={[Typography.caption1, { color: colors.textSecondary, marginBottom: 4, marginTop: 10 }]}>
                Symptoms Observed
              </Text>
              <TextInput
                placeholder="e.g. Swelling reduced, clotted milk absent"
                placeholderTextColor={colors.textMuted}
                value={symptoms}
                onChangeText={setSymptoms}
                style={[styles.inputField, { color: colors.text, borderColor: colors.border }]}
              />

              <Text style={[Typography.caption1, { color: colors.textSecondary, marginBottom: 4, marginTop: 10 }]}>
                Body Temperature (°C)
              </Text>
              <TextInput
                placeholder="38.6"
                placeholderTextColor={colors.textMuted}
                value={temp}
                onChangeText={setTemp}
                keyboardType="numeric"
                style={[styles.inputField, { color: colors.text, borderColor: colors.border }]}
              />

              <Text style={[Typography.caption1, { color: colors.textSecondary, marginBottom: 4, marginTop: 10 }]}>
                Recommendations
              </Text>
              <TextInput
                placeholder="e.g. Continue antibiotic until withdrawal period expires"
                placeholderTextColor={colors.textMuted}
                value={recommendations}
                onChangeText={setRecommendations}
                style={[styles.inputField, { color: colors.text, borderColor: colors.border }]}
              />

              <Button
                title="Save Examination to Passport"
                onPress={handleSaveMedicalRecord}
                style={{ marginTop: 18 }}
              />
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  heroCard: {
    padding: 16,
    marginBottom: 16,
  },
  heroTop: {
    flexDirection: 'row',
  },
  heroImage: {
    width: 100,
    height: 100,
    borderRadius: 16,
  },
  heroMeta: {
    flex: 1,
    marginLeft: 14,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAF5FC',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    gap: 4,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0072BC',
  },
  verifBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 6,
    gap: 4,
  },
  verifText: {
    fontSize: 11,
    fontWeight: '700',
  },
  withdrawalBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#EF4444',
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  statCol: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
  },
  tabsScroll: {
    marginBottom: 16,
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  tabContentCard: {
    padding: 16,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F1F5F9',
  },
  historyItem: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  historyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  inputField: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
});
