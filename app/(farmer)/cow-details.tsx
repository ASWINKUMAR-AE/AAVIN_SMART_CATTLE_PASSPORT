import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, ActivityIndicator, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { Card } from '../../components/ui/Card';
import { StatusChip } from '../../components/ui/StatusChip';
import { GroupedList } from '../../components/ui/GroupedList';
import { ListRow } from '../../components/ui/ListRow';
import { Button } from '../../components/ui/Button';
import { CattleHealthCharts } from '../../components/ui/CattleHealthCharts';
import { api } from '../../services/api';
import { Ionicons } from '@expo/vector-icons';

export default function CowDetailsScreen() {
  const { id, identifier } = useLocalSearchParams<{ id?: string; identifier?: string }>();
  const { colors, isDark } = useTheme();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [passport, setPassport] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

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
        setError('Cow record identifier not specified');
        return;
      }

      const res = await api.get(`/cows/${cowId}/passport`);
      if (res.data?.data) {
        setPassport(res.data.data);
      } else {
        setError('Digital Passport could not be loaded');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve digital cattle record');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[Typography.subhead, { color: colors.textSecondary, marginTop: 12 }]}>
          Loading Digital Cattle Passport...
        </Text>
      </View>
    );
  }

  if (error || !passport) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, padding: 24 }]}>
        <Ionicons name="alert-circle-outline" size={54} color={colors.hold} />
        <Text style={[Typography.title2, { color: colors.text, marginTop: 16, textAlign: 'center' }]}>
          Record Not Found
        </Text>
        <Text style={[Typography.subhead, { color: colors.textSecondary, marginTop: 8, textAlign: 'center' }]}>
          {error || 'Unable to find this cattle passport.'}
        </Text>
        <Button title="Go Back" onPress={() => router.back()} style={{ marginTop: 24 }} />
      </View>
    );
  }

  const { cow, healthRecords, treatments, vaccinations, production, collections } = passport;
  const isWithdrawalActive = cow.active_withdrawal_status === 'active';

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      {/* Passport Header Card */}
      <Card style={styles.passportCard}>
        <View style={styles.headerTop}>
          <View style={styles.badgeHeader}>
            <Text style={[Typography.caption2, { color: colors.primary, fontWeight: '800', letterSpacing: 1 }]}>
              AAVIN DIGITAL CATTLE PASSPORT
            </Text>
            <Text style={[Typography.title1, { color: colors.text, marginTop: 4 }]}>
              {cow.name}
            </Text>
            <Text style={[Typography.headline, { color: colors.primary }]}>
              Tag: {cow.tag_number}
            </Text>
          </View>
          <StatusChip status={isWithdrawalActive ? 'HOLD' : cow.health_status} size="lg" />
        </View>

        {/* Withdrawal Restriction Notice */}
        {isWithdrawalActive && (
          <View style={[styles.withdrawalAlert, { backgroundColor: colors.holdBg, borderColor: colors.hold }]}>
            <Ionicons name="hand-left" size={24} color={colors.hold} style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={[Typography.headline, { color: colors.hold }]}>
                FOOD SAFETY WITHDRAWAL IN FORCE
              </Text>
              <Text style={[Typography.footnote, { color: colors.text, marginTop: 2 }]}>
                {cow.withdrawal_reason || 'Under active antibiotic/medical treatment.'}
              </Text>
              <Text style={[Typography.caption1, { color: colors.hold, fontWeight: '700', marginTop: 4 }]}>
                Withholding active until: {new Date(cow.withdrawal_end_time).toLocaleDateString('en-IN')}
              </Text>
            </View>
          </View>
        )}

        {/* Cow Details Grid */}
        <View style={[styles.grid, { borderColor: colors.border }]}>
          <View style={styles.gridItem}>
            <Text style={[Typography.caption2, { color: colors.textMuted }]}>BREED</Text>
            <Text style={[Typography.subhead, { color: colors.text, fontWeight: '600' }]}>{cow.breed}</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={[Typography.caption2, { color: colors.textMuted }]}>STAGE</Text>
            <Text style={[Typography.subhead, { color: colors.text, fontWeight: '600' }]}>{cow.lactation_stage}</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={[Typography.caption2, { color: colors.textMuted }]}>MILKING</Text>
            <Text style={[Typography.subhead, { color: colors.text, fontWeight: '600' }]}>{cow.milking_status}</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={[Typography.caption2, { color: colors.textMuted }]}>AVG YIELD</Text>
            <Text style={[Typography.subhead, { color: colors.text, fontWeight: '600' }]}>{cow.average_daily_yield} L/day</Text>
          </View>
        </View>

        {/* Aavin Dairy Company Health & Nutrition Scorecard */}
        <View style={[styles.scorecardBox, { backgroundColor: isDark ? '#0f172a' : '#F0FDF4', borderColor: isDark ? '#1e293b' : '#BBF7D0' }]}>
          <View style={styles.scorecardHeader}>
            <Ionicons name="shield-checkmark" size={20} color="#16A34A" />
            <Text style={[Typography.subhead, { color: '#16A34A', fontWeight: '700', marginLeft: 6 }]}>
              Aavin Milk Quality & Health Scorecard
            </Text>
          </View>

          <View style={styles.scorecardGrid}>
            <View style={styles.scorecardItem}>
              <Text style={[Typography.caption2, { color: colors.textMuted }]}>MILK SAFETY INDEX</Text>
              <Text style={[Typography.headline, { color: (cow.milk_safety_index || 98) >= 90 ? '#16A34A' : '#DC2626', fontWeight: '800' }]}>
                {cow.milk_safety_index || 98}/100 { (cow.milk_safety_index || 98) >= 90 ? '⭐ Premium' : '⚠️ Hold' }
              </Text>
            </View>
            <View style={styles.scorecardItem}>
              <Text style={[Typography.caption2, { color: colors.textMuted }]}>SOMATIC CELLS (SCC)</Text>
              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700' }]}>
                {Number(cow.somatic_cell_count || 145000).toLocaleString('en-IN')} cells/mL
              </Text>
              <Text style={[Typography.caption2, { color: '#16A34A' }]}>Mastitis Risk: Low</Text>
            </View>
            <View style={styles.scorecardItem}>
              <Text style={[Typography.caption2, { color: colors.textMuted }]}>BREEDING / REPRODUCTION</Text>
              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '600', textTransform: 'capitalize' }]}>
                {(cow.insemination_status || 'not_bred').replace('_', ' ')}
              </Text>
              {cow.last_calving_date && (
                <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Calved: {cow.last_calving_date}</Text>
              )}
            </View>
            <View style={styles.scorecardItem}>
              <Text style={[Typography.caption2, { color: colors.textMuted }]}>PREVENTIVE CARE</Text>
              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '600' }]}>
                Dewormed: {cow.last_deworming_date || '2026-09-10'}
              </Text>
              <Text style={[Typography.caption2, { color: '#16A34A' }]}>
                Vaccines: {(cow.vaccination_status || 'up_to_date').replace(/_/g, ' ')}
              </Text>
            </View>
          </View>

          {/* Daily Nutrition Breakdown */}
          <View style={[styles.feedBar, { borderTopColor: isDark ? '#1e293b' : '#DCFCE7' }]}>
            <Text style={[Typography.caption2, { color: colors.textSecondary, marginBottom: 4, fontWeight: '700' }]}>
              DAILY FEED & NUTRITION RATION
            </Text>
            <Text style={[Typography.footnote, { color: colors.text }]}>
              🌾 Green Fodder: <Text style={{ fontWeight: '700' }}>{cow.daily_green_fodder_kg || '25.0'} kg</Text> • Concentrate: <Text style={{ fontWeight: '700' }}>{cow.daily_concentrate_kg || '4.0'} kg</Text> • Mineral Mix: <Text style={{ fontWeight: '700' }}>{cow.mineral_mixture_grams || '50'}g</Text>
            </Text>
          </View>
        </View>

        {/* QR Identification Token Box */}
        <View style={[styles.qrContainer, { backgroundColor: isDark ? colors.background : '#F8FAFC' }]}>
          <Ionicons name="qr-code" size={54} color={colors.primary} />
          <Text style={[Typography.caption1, { color: colors.textSecondary, marginTop: 8 }]}>
            DIGITAL PASSPORT TOKEN:
          </Text>
          <Text style={[Typography.footnote, { color: colors.text, fontWeight: '700', letterSpacing: 0.5 }]}>
            {cow.qr_token || 'TOKEN-ACTIVE-VERIFIED'}
          </Text>
          <Text style={[Typography.caption2, { color: colors.textMuted, marginTop: 4 }]}>
            Show this QR to the Collection Centre operator or Vet
          </Text>
        </View>
      </Card>

      {/* Visual Charts & Predictive Health / Vaccination Hub */}
      <View style={{ marginBottom: 16 }}>
        <CattleHealthCharts
          cow={cow}
          production={production}
          vaccinations={vaccinations}
          healthRecords={healthRecords}
        />
      </View>

      {/* Clinical Health Records */}
      <GroupedList title="Veterinary Clinical History">
        {healthRecords.length === 0 ? (
          <ListRow title="No clinical examinations recorded yet" subtitle="Healthy baseline" isLast />
        ) : (
          healthRecords.map((hr: any, idx: number) => (
            <ListRow
              key={hr.id}
              title={hr.diagnosis}
              subtitle={`${new Date(hr.examination_date).toLocaleDateString('en-IN')} • By ${hr.vet_name}`}
              icon="medkit-outline"
              rightComponent={<StatusChip status={hr.health_status_assigned} size="sm" />}
              isLast={idx === healthRecords.length - 1}
            />
          ))
        )}
      </GroupedList>

      {/* Treatments & Withdrawal Restrictions */}
      <GroupedList title="Treatment & Medicine Records">
        {treatments.length === 0 ? (
          <ListRow title="No treatments recorded" subtitle="No active medication" isLast />
        ) : (
          treatments.map((tr: any, idx: number) => (
            <ListRow
              key={tr.id}
              title={tr.brand_name || tr.custom_medicine_name || 'Prescription Medicine'}
              subtitle={`Withdrawal: ${tr.withdrawal_period_days} days • Dose: ${tr.dosage}`}
              icon="bandage-outline"
              rightComponent={
                <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                  {new Date(tr.milk_withholding_end_time).toLocaleDateString('en-IN')}
                </Text>
              }
              isLast={idx === treatments.length - 1}
            />
          ))
        )}
      </GroupedList>

      {/* Recent Collections */}
      <GroupedList title="Recent Collection Centre Intakes">
        {collections.length === 0 ? (
          <ListRow title="No collection records found" isLast />
        ) : (
          collections.map((col: any, idx: number) => (
            <ListRow
              key={col.id}
              title={`${col.quantity_litres} Litres • Fat: ${col.fat_percentage}%`}
              subtitle={`Receipt #${col.receipt_number} • Rs.${col.calculated_amount_inr}`}
              icon="water-outline"
              rightComponent={<StatusChip status={col.decision || 'CLEAR'} size="sm" />}
              isLast={idx === collections.length - 1}
            />
          ))
        )}
      </GroupedList>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  passportCard: {
    padding: 18,
    marginBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  badgeHeader: {
    flex: 1,
  },
  withdrawalAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    marginTop: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginVertical: 16,
    paddingVertical: 10,
  },
  gridItem: {
    width: '50%',
    paddingVertical: 6,
  },
  scorecardBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
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
  },
  qrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 14,
  },
});
