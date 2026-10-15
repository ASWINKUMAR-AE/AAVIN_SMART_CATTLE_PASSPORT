import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatchRefresh, useDispatchWorkflow } from '../../context/DispatchContext';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from '../../context/LanguageContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { goBackOrReplace } from '../../services/navigation';

export default function BMCMySocietiesScreen() {
  const { context, bmcDeliveries, loading, error, refresh } = useDispatchWorkflow();
  useDispatchRefresh();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const societies = context?.societies;
  const query = search.trim().toLowerCase();
  const filtered = (societies || []).filter(society => [society.name, society.phone].some(value => value.toLowerCase().includes(query)));
  const counts = useMemo(() => {
    const result = new Map<string, number>();
    for (const delivery of bmcDeliveries) {
      if (delivery.bmcId === context?.bmc.id) result.set(delivery.boothId, (result.get(delivery.boothId) || 0) + 1);
    }
    return result;
  }, [bmcDeliveries, context?.bmc.id]);

  return <View style={[styles.container, { backgroundColor: colors.background }]}>
    <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
      <View style={styles.headerInner}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.back', 'Back')} onPress={() => goBackOrReplace(router, '/(bmc)/dashboard')}
          style={[styles.iconButton, { backgroundColor: colors.background }]}><Ionicons name="arrow-back" size={22} color={colors.text} /></Pressable>
        <View style={styles.flex}>
          <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>{t('bmcCentre.mySocieties', 'My societies')}</Text>
          <Text style={[styles.caption, { color: colors.textSecondary }]}>{context?.bmc.name}</Text>
        </View>
      </View>
    </View>
    <FlatList data={filtered} keyExtractor={item => item.id} refreshing={loading} onRefresh={refresh}
      contentContainerStyle={styles.listContent} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
      ListHeaderComponent={<View style={styles.listHeader}>
        <Text style={[styles.body, { color: colors.textSecondary }]}>{t('bmcCentre.directoryHelp', 'Societies assigned to your centre, including those with no deliveries yet.')}</Text>
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
          <TextInput accessibilityLabel={t('bmcCentre.searchSocieties', 'Search society or phone')} placeholder={t('bmcCentre.searchSocieties', 'Search society or phone')}
            placeholderTextColor={colors.textSecondary} value={search} onChangeText={setSearch} autoCorrect={false} style={[styles.searchInput, { color: colors.text }]} />
          {!!search && <Pressable accessibilityRole="button" accessibilityLabel={t('bmcCentre.clearSearch', 'Clear search')} onPress={() => setSearch('')} style={styles.iconButton}>
            <Ionicons name="close-circle" size={20} color={colors.textSecondary} /></Pressable>}
        </View>
        {societies !== undefined && <Text accessibilityLiveRegion="polite" style={[styles.caption, { color: colors.textSecondary }]}>{filtered.length} / {societies.length} {t('bmcCentre.societies', 'societies')}</Text>}
        {error && <View accessibilityRole="alert" style={[styles.notice, { backgroundColor: colors.holdBg }]}>
          <Text style={[styles.body, styles.flex, { color: colors.text }]}>{societies ? t('bmcCentre.stale', 'Could not refresh. Showing previously loaded societies.') : error}</Text>
          <Button title={t('common.retry', 'Retry')} size="sm" variant="outline" disabled={loading} onPress={refresh} />
        </View>}
      </View>}
      ListEmptyComponent={loading && societies === undefined ? <View style={styles.loading}><ActivityIndicator color={colors.primary} /></View> :
        <EmptyState icon="business-outline" title={societies === undefined ? t('bmcCentre.unavailable', 'Society list unavailable') : query ? t('bmcCentre.noMatches', 'No matching societies') : t('bmcCentre.noSocieties', 'No linked societies yet')}
          message={societies === undefined ? t('bmcCentre.unavailableHelp', 'Refresh to load your linked society list.') : query ? t('bmcCentre.searchHelp', 'Try another society name or phone number.') : t('bmcCentre.noSocietiesHelp', 'Societies will appear here when they are assigned to your centre.')}
          actionTitle={query && societies !== undefined ? t('bmcCentre.clearSearch', 'Clear search') : t('common.refresh', 'Refresh')}
          onAction={query && societies !== undefined ? () => setSearch('') : refresh} />}
      renderItem={({ item }) => <Card style={styles.societyCard}>
        <View style={styles.societyHeader}>
          <View style={[styles.societyIcon, { backgroundColor: colors.primaryLight }]}><Ionicons name="business-outline" size={23} color={colors.primary} /></View>
          <View style={styles.flex}>
            <Text accessibilityRole="header" style={[styles.societyName, { color: colors.text }]}>{item.name}</Text>
            <Text style={[styles.caption, { color: item.isActive ? colors.clear : colors.textSecondary }]}>{item.isActive ? t('bmcCentre.active', 'Active') : t('bmcCentre.inactive', 'Inactive')}</Text>
          </View>
        </View>
        {!!item.phone && <View style={styles.contact}><Ionicons name="call-outline" size={17} color={colors.textSecondary} /><Text selectable style={[styles.body, { color: colors.text }]}>{item.phone}</Text></View>}
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <Text style={[styles.caption, { color: colors.textSecondary }]}>{counts.get(item.id) || 0} {t('bmcCentre.deliveryRecords', 'delivery records')}</Text>
          <Button title={t('bmcCentre.viewDeliveries', 'View deliveries')} variant="outline" size="sm"
            onPress={() => router.push({ pathname: '/(bmc)/receive-milk', params: { societyId: item.id, dateFilter: 'all', statusFilter: 'all', collectionDate: '' } })} />
        </View>
      </Card>} />
  </View>;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  headerInner: { flexDirection: 'row', alignItems: 'center', gap: 12, width: '100%', maxWidth: 760, alignSelf: 'center' },
  flex: { flex: 1, minWidth: 0 },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 13 },
  title: { fontSize: 22, lineHeight: 30, fontWeight: '800' },
  body: { fontSize: 14, lineHeight: 22 },
  caption: { fontSize: 12, lineHeight: 19 },
  listContent: { padding: 16, paddingBottom: 24, gap: 14 },
  listHeader: { width: '100%', maxWidth: 760, alignSelf: 'center', gap: 12 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 14, paddingLeft: 12 },
  searchInput: { flex: 1, minWidth: 0, fontSize: 14, paddingVertical: 14 },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12 },
  loading: { padding: 32 },
  societyCard: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 16, marginVertical: 0, gap: 14 },
  societyHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  societyIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  societyName: { fontSize: 17, lineHeight: 25, fontWeight: '700' },
  contact: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  footer: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12 },
});
