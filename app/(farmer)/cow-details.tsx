import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Image, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAavinStore } from '../../store/AavinStoreContext';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from '../../context/LanguageContext';
import { Typography } from '../../constants/Typography';
import { DemoHeader } from '../../components/DemoHeader';
import { Card } from '../../components/ui/Card';
import { Ionicons } from '@expo/vector-icons';

export default function CowDetailsScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const cowId = (params.cowId as string) || 'COW001';
  const { cows } = useAavinStore();
  const { colors } = useTheme();
  const { t } = useTranslation();

  const cow = cows.find(c => c.id === cowId) || cows[0];

  // Active Tab
  const [activeTab, setActiveTab] = useState<'profile' | 'medical' | 'vaccines' | 'treatments' | 'breeding'>('profile');

  const hasWithdrawal = cow?.activeWithdrawal?.hasActiveWithdrawal;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <DemoHeader
        title={cow.name}
        subtitle={`Passport #${cow.cowId} • Tag #${cow.tagId}`}
        showBack
        onBack={() => router.replace('/(farmer)/cows')}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Cow Profile Hero Card */}
        <Card style={styles.heroCard}>
          <View style={styles.heroTop}>
            <Image
              source={{ uri: cow.photoUrl || 'https://images.unsplash.com/photo-1546445317-29f4545e9d53?w=500' }}
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
                {t('farmer.owner', 'Owner')}: {cow.farmerName}
              </Text>
              <View style={[styles.verifBadge, { backgroundColor: cow.verificationStatus === 'verified' ? '#DCFCE7' : '#FEF3C7' }]}>
                <Ionicons
                  name={cow.verificationStatus === 'verified' ? 'checkmark-circle' : 'time'}
                  size={12}
                  color={cow.verificationStatus === 'verified' ? '#15803D' : '#B45309'}
                />
                <Text style={[styles.verifText, { color: cow.verificationStatus === 'verified' ? '#15803D' : '#B45309' }]}>
                  {cow.verificationStatus === 'verified'
                    ? t('farmer.verifiedPassport', 'Aavin Verified Passport')
                    : t('farmer.pendingVerification', 'Pending Verification')}
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
                    ⚠️ {t('farmer.activeWithdrawalRestriction', 'ACTIVE MILK WITHDRAWAL RESTRICTION')}
                  </Text>
                  <Text style={[Typography.subhead, { color: '#7F1D1D', fontWeight: '700', marginTop: 2 }]}>
                    {t('farmer.medicine', 'Medicine')}: {cow.activeWithdrawal?.medicineName}
                  </Text>
                  <Text style={[Typography.caption1, { color: '#991B1B', marginTop: 2 }]}>
                    {t('farmer.reason', 'Reason')}: {cow.activeWithdrawal?.reason}
                  </Text>
                  <Text style={[Typography.caption1, { color: '#B91C1C', fontWeight: '800', marginTop: 4 }]}>
                    {t('farmer.withholdingEndDate', 'Withholding End Date')}: {cow.activeWithdrawal?.withdrawalEndDate} ({t('farmer.daysRemaining', { days: cow.activeWithdrawal?.daysRemaining || 0 }, `${cow.activeWithdrawal?.daysRemaining} days remaining`)})
                  </Text>
                  <Text style={[Typography.caption2, { color: '#7F1D1D', marginTop: 4, fontStyle: 'italic' }]}>
                    {t('farmer.withdrawalNoticeAlert', 'Notice: Milk from this animal contains veterinary drug residues and must NOT be poured into the collection society.')}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Quick Stats Grid */}
          <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
            <View style={styles.statCol}>
              <Text style={[Typography.caption2, { color: colors.textSecondary }]}>{t('farmer.dailyYield', 'Daily Yield')}</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>{cow.dailyMilkYield.toFixed(1)} L</Text>
            </View>
            <View style={styles.statCol}>
              <Text style={[Typography.caption2, { color: colors.textSecondary }]}>{t('farmer.lactation', 'Lactation Stage')}</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {t(`statuses.${cow.lactationStage}`, cow.lactationStage).toUpperCase()}
              </Text>
            </View>
            <View style={styles.statCol}>
              <Text style={[Typography.caption2, { color: colors.textSecondary }]}>{t('farmer.age', 'Age')}</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {t('farmer.ageMo', { age: cow.approxAgeMonths }, `${cow.approxAgeMonths} Mo`)}
              </Text>
            </View>
            <View style={styles.statCol}>
              <Text style={[Typography.caption2, { color: colors.textSecondary }]}>{t('farmer.healthStatus', 'Health')}</Text>
              <Text style={[styles.statValue, { color: cow.healthStatus === 'healthy' ? '#16A34A' : '#DC2626' }]}>
                {cow.healthStatus === 'healthy' ? t('farmer.healthy', 'Healthy') : t('farmer.hold', 'Hold')}
              </Text>
            </View>
          </View>
        </Card>

        {/* Sub Navigation Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll}>
          <View style={styles.tabsContainer}>
            {[
              { key: 'profile', label: t('farmer.tabs.overview', 'Overview'), icon: 'information-circle' },
              { key: 'medical', label: t('farmer.tabs.clinical', { count: cow.medicalHistory.length }, `Clinical (${cow.medicalHistory.length})`), icon: 'fitness' },
              { key: 'vaccines', label: t('farmer.tabs.vaccines', { count: cow.vaccinationHistory.length }, `Vaccines (${cow.vaccinationHistory.length})`), icon: 'shield-checkmark' },
              { key: 'treatments', label: t('farmer.tabs.treatments', { count: cow.treatmentRecords.length }, `Treatments (${cow.treatmentRecords.length})`), icon: 'medkit' },
              { key: 'breeding', label: t('farmer.tabs.breeding', { count: cow.inseminationHistory.length }, `Breeding (${cow.inseminationHistory.length})`), icon: 'heart' },
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
              {t('farmer.animalIdPedigree', 'Animal Identification & Pedigree')}
            </Text>

            <View style={styles.specRow}>
              <Text style={[Typography.subhead, { color: colors.textSecondary }]}>{t('farmer.tagNumberColon', '12-Digit Tag Number:')}</Text>
              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]}>{cow.tagId}</Text>
            </View>
            <View style={styles.specRow}>
              <Text style={[Typography.subhead, { color: colors.textSecondary }]}>{t('farmer.dateOfBirthColon', 'Date of Birth:')}</Text>
              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '600' }]}>{cow.dateOfBirth}</Text>
            </View>
            <View style={styles.specRow}>
              <Text style={[Typography.subhead, { color: colors.textSecondary }]}>{t('farmer.genderColon', 'Gender:')}</Text>
              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '600' }]}>
                {cow.sex === 'female' ? t('farmer.cow', 'COW').toUpperCase() : t('farmer.bull', 'BULL').toUpperCase()}
              </Text>
            </View>
            <View style={styles.specRow}>
              <Text style={[Typography.subhead, { color: colors.textSecondary }]}>{t('farmer.milkingStatusColon', 'Milking Status:')}</Text>
              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '600' }]}>
                {t(`statuses.${cow.currentStatus}`, cow.currentStatus).toUpperCase()}
              </Text>
            </View>
            <View style={styles.specRow}>
              <Text style={[Typography.subhead, { color: colors.textSecondary }]}>{t('farmer.physicalMarksColon', 'Physical Marks:')}</Text>
              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '600', flex: 1, textAlign: 'right' }]}>
                {cow.identificationMarks}
              </Text>
            </View>

            <View style={[styles.noteBox, { backgroundColor: colors.background, marginTop: 14 }]}>
              <Text style={[Typography.caption1, { color: colors.textSecondary }]}>
                ℹ️ {t('farmer.passportNote', 'Digital Passport registered on Aavin Milk Safety Twin ledger. Barcode/Tag ID authenticated for Madurai District Union.')}
              </Text>
            </View>
          </Card>
        )}

        {/* TAB 2: MEDICAL HISTORY */}
        {activeTab === 'medical' && (
          <Card style={styles.tabContentCard}>
            <Text style={[Typography.headline, { color: colors.text, fontWeight: '800', marginBottom: 12 }]}>
              {t('farmer.clinicalExaminationsLog', 'Clinical Examinations Log')}
            </Text>

            {cow.medicalHistory.length === 0 ? (
              <Text style={[Typography.subhead, { color: colors.textSecondary, textAlign: 'center', marginVertical: 20 }]}>
                {t('farmer.noPriorClinical', 'No prior clinical examinations recorded.')}
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
                    {t('farmer.symptoms', 'Symptoms')}: {m.symptoms}
                  </Text>
                  <Text style={[Typography.caption2, { color: colors.textSecondary, marginTop: 2 }]}>
                    {t('farmer.temp', 'Temp')}: {m.bodyTemperatureC}°C • {t('farmer.heartRate', 'Heart Rate')}: {m.heartRateBpm} bpm • {t('farmer.rumen', 'Rumen')}: {m.rumenMotility}
                  </Text>
                  <Text style={[Typography.caption1, { color: '#047857', fontWeight: '600', marginTop: 4 }]}>
                    {t('farmer.recommendations', 'Recommendations')}: {m.recommendations}
                  </Text>
                  <Text style={[Typography.caption2, { color: colors.textMuted, marginTop: 2 }]}>
                    {t('farmer.examinedBy', 'Examined by')}: {m.vetName}
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
              {t('farmer.vaccinationRecords', 'Vaccination Records')}
            </Text>

            {cow.vaccinationHistory.length === 0 ? (
              <Text style={[Typography.subhead, { color: colors.textSecondary, textAlign: 'center', marginVertical: 20 }]}>
                {t('farmer.noVaccinationEntries', 'No vaccination entries logged yet.')}
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
                    {t('farmer.batch', 'Batch')}: {v.batchNumber} • {t('farmer.administeredBy', 'Administered by')}: {v.administeredBy}
                  </Text>
                  <Text style={[Typography.caption1, { color: colors.primary, fontWeight: '700', marginTop: 2 }]}>
                    {t('farmer.nextDueDate', 'Next Due Date')}: {v.nextDueDate}
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
              {t('farmer.prescribedTreatments', 'Prescribed Treatments & Drug Withdrawals')}
            </Text>

            {cow.treatmentRecords.length === 0 ? (
              <Text style={[Typography.subhead, { color: colors.textSecondary, textAlign: 'center', marginVertical: 20 }]}>
                {t('farmer.noTreatmentsRecord', 'No treatments on record. Animal is in healthy status.')}
              </Text>
            ) : (
              cow.treatmentRecords.map((tRec) => (
                <View key={tRec.id} style={[styles.historyItem, { borderBottomColor: colors.border }]}>
                  <View style={styles.historyItemHeader}>
                    <Text style={[Typography.subhead, { color: '#DC2626', fontWeight: '800' }]}>
                      💊 {tRec.medicineName}
                    </Text>
                    <Text style={[Typography.caption2, { color: colors.textSecondary }]}>{tRec.date}</Text>
                  </View>
                  <Text style={[Typography.caption1, { color: colors.text, marginTop: 2 }]}>
                    {t('farmer.generic', 'Generic')}: {tRec.genericName} • {t('farmer.dosage', 'Dosage')}: {tRec.dosage} ({tRec.route})
                  </Text>
                  <Text style={[Typography.caption1, { color: '#991B1B', fontWeight: '700', marginTop: 4 }]}>
                    {t('farmer.withdrawalPeriodDetail', {
                      days: tRec.withdrawalPeriodDays,
                      date: tRec.withdrawalEndDate,
                    }, `Withdrawal Period: ${tRec.withdrawalPeriodDays} Days (Withhold until ${tRec.withdrawalEndDate})`)}
                  </Text>
                  <Text style={[Typography.caption2, { color: colors.textSecondary, marginTop: 2 }]}>
                    {t('farmer.reason', 'Reason')}: {tRec.reason}
                  </Text>
                  <Text style={[Typography.caption2, { color: colors.textMuted, marginTop: 2 }]}>
                    {t('farmer.vet', 'Vet')}: {tRec.vetName}
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
              {t('farmer.inseminationHistory', 'Artificial Insemination & Breeding History')}
            </Text>

            {cow.inseminationHistory.length === 0 ? (
              <Text style={[Typography.subhead, { color: colors.textSecondary, textAlign: 'center', marginVertical: 20 }]}>
                {t('farmer.noInseminationRecords', 'No insemination records logged.')}
              </Text>
            ) : (
              cow.inseminationHistory.map((ins) => (
                <View key={ins.id} style={[styles.historyItem, { borderBottomColor: colors.border }]}>
                  <View style={styles.historyItemHeader}>
                    <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]}>
                      {t('farmer.semenBull', 'Semen Bull')}: {ins.bullId}
                    </Text>
                    <Text style={[Typography.caption2, { color: colors.textSecondary }]}>{ins.date}</Text>
                  </View>
                  <Text style={[Typography.caption1, { color: colors.textSecondary, marginTop: 2 }]}>
                    {t('farmer.breed', 'Breed')}: {ins.breed} • {t('farmer.aiTech', 'AI Tech')}: {ins.technicianName}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: ins.pregnancyStatus === 'confirmed_pregnant' ? '#DCFCE7' : '#FEF3C7', marginTop: 6 }]}>
                    <Text style={[styles.statusBadgeText, { color: ins.pregnancyStatus === 'confirmed_pregnant' ? '#15803D' : '#B45309' }]}>
                      {t('farmer.statusColon', 'Status')}: {t(`statuses.${ins.pregnancyStatus}`, ins.pregnancyStatus.replace('_', ' ')).toUpperCase()}
                    </Text>
                  </View>
                  {ins.expectedCalvingDate && (
                    <Text style={[Typography.caption1, { color: colors.primary, fontWeight: '700', marginTop: 4 }]}>
                      {t('farmer.expectedCalving', 'Expected Calving')}: {ins.expectedCalvingDate}
                    </Text>
                  )}
                </View>
              ))
            )}
          </Card>
        )}
      </ScrollView>
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
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
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
  noteBox: {
    padding: 12,
    borderRadius: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
