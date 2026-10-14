import React, { useState } from 'react';
import { StyleSheet, View, Text, FlatList, Pressable, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useAavinStore } from '../../store/AavinStoreContext';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from '../../context/LanguageContext';
import { Typography } from '../../constants/Typography';
import { DemoHeader } from '../../components/DemoHeader';
import { Card } from '../../components/ui/Card';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState } from '../../components/ui/EmptyState';

export default function CattleRegistryScreen() {
  const { cows } = useAavinStore();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'under_treatment' | 'healthy'>('all');

  const filteredCows = cows.filter(c => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = c.name.toLowerCase().includes(q);
      const matchTag = c.tagId.includes(q);
      const matchFarmer = c.farmerName.toLowerCase().includes(q);
      const matchBreed = c.breed.toLowerCase().includes(q);
      if (!matchName && !matchTag && !matchFarmer && !matchBreed) return false;
    }
    if (filter === 'under_treatment') return c.healthStatus === 'under_treatment' || c.activeWithdrawal?.hasActiveWithdrawal;
    if (filter === 'healthy') return c.healthStatus === 'healthy';
    return true;
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <DemoHeader 
        title={t('veterinary.registry.title', 'District Cattle Registry')}
        subtitle={t('veterinary.registry.subtitle', '{count} Bovines in Veterinary Surveillance Grid', { count: cows.length })}
        showBack
      />

      <View style={[styles.filterBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Ionicons name="search" size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
          <TextInput
            placeholder={t('veterinary.registry.searchPlaceholder', 'Search by Tag ID, Name, Farmer, Breed...')}
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { color: colors.text }]}
          />
        </View>

        <View style={styles.chipsRow}>
          {(['all', 'under_treatment', 'healthy'] as const).map(f => (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              style={[
                styles.chip,
                {
                  backgroundColor: filter === f ? colors.primary : colors.background,
                  borderColor: filter === f ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: filter === f ? '#FFFFFF' : colors.textSecondary },
                ]}
              >
                {f === 'all' 
                  ? t('veterinary.registry.filterAll', 'All Herds') 
                  : f === 'under_treatment' 
                  ? t('veterinary.registry.filterUnderTreatment', '⚠️ Under Treatment / Hold') 
                  : t('veterinary.registry.filterHealthy', 'Healthy Only')}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <FlatList
        data={filteredCows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            title={t('veterinary.registry.noCattleTitle', 'No Cattle Found')}
            message={t('veterinary.registry.noCattleMsg', 'No registered cows match your criteria.')}
            icon="paw-outline"
          />
        }
        renderItem={({ item }) => {
          const hasWithdrawal = item.activeWithdrawal?.hasActiveWithdrawal;
          return (
            <Pressable onPress={() => router.push(`/(veterinary)/cow-details?cowId=${item.id}` as any)}>
              <Card style={[styles.card, hasWithdrawal && { borderColor: '#EF4444', borderWidth: 1.5 }]}>
                <View style={styles.headerRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[Typography.headline, { color: colors.text, fontWeight: '800' }]}>
                      {item.name}
                    </Text>
                    <Text style={[Typography.caption1, { color: colors.primary, fontWeight: '700' }]}>
                      Tag #{item.tagId} • {item.breed}
                    </Text>
                    <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                      {t('veterinary.common.ownerInfo', 'Owner: {name} ({id})', {
                        name: item.farmerName,
                        id: item.farmerId
                      })}
                    </Text>
                  </View>

                  <View style={[styles.badge, { backgroundColor: item.healthStatus === 'healthy' ? '#DCFCE7' : '#FEE2E2' }]}>
                    <Text style={[styles.badgeText, { color: item.healthStatus === 'healthy' ? '#15803D' : '#DC2626' }]}>
                      {t('statuses.' + item.healthStatus, item.healthStatus.replace('_', ' ').toUpperCase())}
                    </Text>
                  </View>
                </View>

                {hasWithdrawal && (
                  <View style={styles.withdrawalBox}>
                    <Ionicons name="warning" size={16} color="#DC2626" />
                    <View style={{ marginLeft: 8, flex: 1 }}>
                      <Text style={[Typography.caption1, { color: '#B91C1C', fontWeight: '800' }]}>
                        {t('veterinary.registry.withdrawalActiveMedicine', 'WITHDRAWAL ACTIVE: {medicine}', {
                          medicine: item.activeWithdrawal?.medicineName || ''
                        })}
                      </Text>
                      <Text style={[Typography.caption2, { color: '#991B1B' }]}>
                        {t('veterinary.registry.endsDaysLeft', 'Ends: {endDate} ({days} days left)', {
                          endDate: item.activeWithdrawal?.withdrawalEndDate || '',
                          days: item.activeWithdrawal?.daysRemaining || 0
                        })}
                      </Text>
                    </View>
                  </View>
                )}

                <View style={[styles.metaRow, { borderTopColor: colors.border }]}>
                  <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                    {t('veterinary.registry.historySummary', 'History: {exams} Exams • {treatments} Treatments • {vaccines} Vaccines', {
                      exams: item.medicalHistory.length,
                      treatments: item.treatmentRecords.length,
                      vaccines: item.vaccinationHistory.length
                    })}
                  </Text>
                  <Text style={[Typography.caption2, { color: colors.primary, fontWeight: '700' }]}>
                    {t('veterinary.registry.openPassport', 'Open Passport →')}
                  </Text>
                </View>
              </Card>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterBar: {
    padding: 14,
    borderBottomWidth: 1,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  card: {
    padding: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  withdrawalBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
