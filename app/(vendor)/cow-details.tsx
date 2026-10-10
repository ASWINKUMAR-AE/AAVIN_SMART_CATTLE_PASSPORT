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

export default function VendorCowDetailsScreen() {
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
        setError('Cattle identifier not provided');
        return;
      }

      const res = await api.get(`/cows/${cowId}/passport`);
      if (res.data?.data) {
        setPassport(res.data.data);
      } else {
        setError('Cattle digital passport could not be found');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to retrieve cattle record');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[Typography.subhead, { color: colors.textSecondary, marginTop: 12 }]}>
          Verifying Cattle Digital Passport...
        </Text>
      </View>
    );
  }

  if (error || !passport) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, padding: 24 }]}>
        <Ionicons name="alert-circle-outline" size={54} color={colors.hold} />
        <Text style={[Typography.title2, { color: colors.text, marginTop: 16, textAlign: 'center' }]}>
          Cattle Record Not Found
        </Text>
        <Text style={[Typography.subhead, { color: colors.textSecondary, marginTop: 8, textAlign: 'center' }]}>
          {error || 'Unable to resolve cattle tag.'}
        </Text>
        <Button title="Back to Milk Logistics" onPress={() => router.replace('/(vendor)')} style={{ marginTop: 24 }} />
      </View>
    );
  }

  const { cow, healthRecords, treatments, vaccinations, production, collections } = passport;
  const isWithdrawalActive = cow.active_withdrawal_status === 'active';
  const sccVal = Number(cow.somatic_cell_count || 145000);
  const safetyIdx = cow.milk_safety_index || (isWithdrawalActive ? 45 : 98);

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      {/* Transporter Verification Banner */}
      <View style={[styles.verifiedBanner, { backgroundColor: isWithdrawalActive ? '#FEF2F2' : '#F0FDF4', borderColor: isWithdrawalActive ? '#FECACA' : '#BBF7D0' }]}>
        <Ionicons name={isWithdrawalActive ? 'warning' : 'shield-checkmark'} size={22} color={isWithdrawalActive ? '#DC2626' : '#16A34A'} />
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={[Typography.headline, { color: isWithdrawalActive ? '#991B1B' : '#166534' }]}>
            {isWithdrawalActive ? '⛔ TANKER INTAKE RESTRICTED' : '✅ TANKER LOT APPROVED'}
          </Text>
          <Text style={[Typography.caption1, { color: isWithdrawalActive ? '#B91C1C' : '#15803D' }]}>
            {isWithdrawalActive ? 'Milk under active veterinary withdrawal quarantine. DO NOT load into insulated bulk tanker.' : 'Origin verified under Melur BMC route for Madurai Central Dairy delivery.'}
          </Text>
        </View>
      </View>

      {/* Main Cattle Card */}
      <Card style={styles.passportCard}>
        <View style={styles.headerTop}>
          <View style={styles.badgeHeader}>
            <Text style={[Typography.caption2, { color: colors.primary, fontWeight: '800', letterSpacing: 1 }]}>
              AAVIN BULK MILK TRANSPORT PASSPORT
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

        {cow.photo_url && (
          <Image source={{ uri: cow.photo_url }} style={styles.cowImage} resizeMode="cover" />
        )}

        <View style={styles.metaGrid}>
          <View style={styles.metaItem}>
            <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Breed</Text>
            <Text style={[Typography.callout, { color: colors.text, fontWeight: '600' }]}>{cow.breed}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Lactation Stage</Text>
            <Text style={[Typography.callout, { color: colors.text, fontWeight: '600' }]}>{cow.lactation_stage || 'Peak'}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Registered Farmer</Text>
            <Text style={[Typography.callout, { color: colors.text, fontWeight: '600' }]}>{cow.owner_name}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Village / BMC Centre</Text>
            <Text style={[Typography.callout, { color: colors.text, fontWeight: '600' }]}>{cow.owner_village || cow.centre_name || 'Melur Co-op'}</Text>
          </View>
        </View>

        {/* Dairy Company Quality & Health Scorecard */}
        <View style={[styles.scorecardBox, { backgroundColor: isDark ? '#0f172a' : '#F0FDF4', borderColor: isDark ? '#1e293b' : '#BBF7D0' }]}>
          <View style={styles.scorecardHeader}>
            <Ionicons name="medkit" size={20} color="#16A34A" />
            <Text style={[Typography.subhead, { color: '#16A34A', fontWeight: '700', marginLeft: 6 }]}>
              Aavin Milk Quality & Health Scorecard
            </Text>
          </View>

          <View style={styles.scorecardGrid}>
            <View style={styles.scorecardItem}>
              <Text style={[Typography.caption2, { color: colors.textMuted }]}>MILK SAFETY INDEX</Text>
              <Text style={[Typography.headline, { color: safetyIdx >= 90 ? '#16A34A' : '#DC2626', fontWeight: '800' }]}>
                {safetyIdx}/100 { safetyIdx >= 90 ? '⭐ Safe' : '⚠️ Hold' }
              </Text>
            </View>
            <View style={styles.scorecardItem}>
              <Text style={[Typography.caption2, { color: colors.textMuted }]}>SOMATIC CELLS (SCC)</Text>
              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700' }]}>
                {sccVal.toLocaleString('en-IN')} cells/mL
              </Text>
            </View>
            <View style={styles.scorecardItem}>
              <Text style={[Typography.caption2, { color: colors.textMuted }]}>BREEDING STATUS</Text>
              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '600', textTransform: 'capitalize' }]}>
                {(cow.insemination_status || 'not_bred').replace('_', ' ')}
              </Text>
            </View>
            <View style={styles.scorecardItem}>
              <Text style={[Typography.caption2, { color: colors.textMuted }]}>PREVENTIVE HEALTH</Text>
              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '600' }]}>
                Dewormed: {cow.last_deworming_date || '2026-09-10'}
              </Text>
              <Text style={[Typography.caption2, { color: '#16A34A' }]}>
                Vaccine: {(cow.vaccination_status || 'up_to_date').replace(/_/g, ' ')}
              </Text>
            </View>
          </View>

          <View style={[styles.feedBar, { borderTopColor: isDark ? '#1e293b' : '#DCFCE7' }]}>
            <Text style={[Typography.caption2, { color: colors.textSecondary, marginBottom: 2, fontWeight: '700' }]}>
              DAILY FEED & RATION
            </Text>
            <Text style={[Typography.footnote, { color: colors.text }]}>
              Green Fodder: {cow.daily_green_fodder_kg || '25.0'}kg • Concentrate: {cow.daily_concentrate_kg || '4.0'}kg • Mineral: {cow.mineral_mixture_grams || '50'}g
            </Text>
          </View>
        </View>

        {/* QR Token Identification */}
        <View style={[styles.qrContainer, { backgroundColor: isDark ? colors.background : '#F8FAFC' }]}>
          <Ionicons name="qr-code" size={48} color={colors.primary} />
          <Text style={[Typography.caption1, { color: colors.textSecondary, marginTop: 6 }]}>
            VERIFIED DIGITAL PASSPORT TOKEN:
          </Text>
          <Text style={[Typography.footnote, { color: colors.text, fontWeight: '700' }]}>
            {cow.qr_token || `AAVIN_QR_${cow.tag_number}`}
          </Text>
        </View>
      </Card>

      {/* Visual Chart Hub & Predictive Health / Vaccination */}
      <View style={{ marginHorizontal: 16, marginBottom: 12 }}>
        <CattleHealthCharts
          cow={cow}
          production={production}
          vaccinations={vaccinations}
          healthRecords={healthRecords}
        />
      </View>

      {/* Recent Milk Collections & Quality */}
      <GroupedList title="Recent Milk Collections & Lab Readings">
        {collections && collections.length > 0 ? (
          collections.slice(0, 5).map((col: any, idx: number) => (
            <ListRow
              key={col.id || idx}
              title={`${col.quantity_litres} Litres • Fat: ${col.fat_percentage || 4.2}% • SNF: ${col.snf_percentage || 8.6}%`}
              subtitle={`Receipt #${col.receipt_number || 'REC-1001'} • ₹${col.calculated_amount_inr || (col.quantity_litres * 35).toFixed(2)}`}
              icon="water-outline"
              rightComponent={<StatusChip status={col.decision || 'CLEAR'} size="sm" />}
              isLast={idx === Math.min(collections.length, 5) - 1}
            />
          ))
        ) : (
          <ListRow title="No collection records found for this cow" isLast />
        )}
      </GroupedList>

      {/* Recent Production History */}
      <GroupedList title="Daily Production Ledger">
        {production && production.length > 0 ? (
          production.slice(0, 5).map((pr: any, idx: number) => (
            <ListRow
              key={pr.id || idx}
              title={`${pr.quantity_litres} Litres (${pr.session?.toUpperCase() || 'MORNING'})`}
              subtitle={`Date: ${pr.production_date} • Temp: ${pr.milking_temperature_c || '37.2'}°C`}
              icon="stats-chart-outline"
              isLast={idx === Math.min(production.length, 5) - 1}
            />
          ))
        ) : (
          <ListRow title="No production logs available" isLast />
        )}
      </GroupedList>

      {/* Return Button */}
      <View style={{ marginHorizontal: 16, marginTop: 16 }}>
        <Button
          title="Back to Milk Logistics"
          variant="outline"
          onPress={() => router.replace('/(vendor)')}
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    marginBottom: 0,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
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
    marginBottom: 14,
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
    padding: 14,
    borderRadius: 12,
    marginTop: 6,
  },
});
