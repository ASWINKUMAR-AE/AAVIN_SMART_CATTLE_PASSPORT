import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, SectionList, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from '../../context/LanguageContext';
import { useDispatchRefresh, useDispatchWorkflow } from '../../context/DispatchContext';
import { useAavinStore } from '../../store/AavinStoreContext';
import { DemoHeader } from '../../components/DemoHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { CollectionBarChart } from '../../components/bmc/CollectionBarChart';
import { BmcAggregate, BmcPeriod, buildBmcAnalysis } from '../../services/bmcDashboard';
import { indiaDate } from '../../services/milkCollectionsApi';

type Analysis = ReturnType<typeof buildBmcAnalysis>;
type AnalysisRow = { kind: 'society'; value: Analysis['societies'][number] } | { kind: 'day'; value: Analysis['daily'][number] };
type AnalysisSection = { key: 'societies' | 'daily'; data: AnalysisRow[] };

export default function BMCCentreDashboard() {
  const { context, bmcDeliveries, loading, error, refresh } = useDispatchWorkflow();
  useDispatchRefresh();
  const { union } = useAavinStore();
  const { colors } = useTheme();
  const { t, language } = useTranslation();
  const { width, fontScale } = useWindowDimensions();
  const stacked = width < 360 || fontScale > 1.2;
  const router = useRouter();
  const [period, setPeriod] = useState<BmcPeriod>('today');
  const [search, setSearch] = useState('');
  const today = indiaDate();
  const summary = useMemo(() => buildBmcAnalysis(bmcDeliveries, context?.bmc.id || '', today, period, union.mismatchThresholdLitres, context?.societies),
    [bmcDeliveries, context?.bmc.id, context?.societies, today, period, union.mismatchThresholdLitres]);
  const tr = (key: string) => t(`bmcAnalysis.${key}`);
  const locale = language === 'ta' ? 'ta-IN' : 'en-IN';
  const dateLabel = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
  const rangeLabel = (start: string, end: string) => start === end ? dateLabel(start) : `${dateLabel(start)} – ${dateLabel(end)}`;
  const litres = (value: number | null) => value == null ? tr('notMeasured') : `${value.toLocaleString(locale, { maximumFractionDigits: 1 })} L`;
  const difference = (value: number | null) => value == null ? '—' : `${value > 0 ? '+' : ''}${litres(value)}`;
  const partial = (value: BmcAggregate) => value.measuredCount > 0 && value.measuredCount < value.deliveryCount;
  const coverage = (value: BmcAggregate) => `${value.measuredCount} / ${value.deliveryCount} ${tr('measured')}`;
  const openDeliveries = (statusFilter = 'all', societyId = '', collectionDate = '') => router.push({ pathname: '/(bmc)/receive-milk', params: { statusFilter, dateFilter: period, societyId, collectionDate } });
  const chartDays = useMemo(() => {
    if (period === 'last7' || period === 'month') return summary.daily;
    const previousDay = buildBmcAnalysis(bmcDeliveries, context?.bmc.id || '', summary.range.previousEnd, 'today', union.mismatchThresholdLitres);
    return [...previousDay.daily, ...summary.daily];
  }, [period, summary, bmcDeliveries, context?.bmc.id, union.mismatchThresholdLitres]);
  const change = summary.sentLitres - summary.previousSentLitres;
  const societyRows = summary.societies.filter(item => item.name.toLocaleLowerCase(locale).includes(search.trim().toLocaleLowerCase(locale)));
  const sections: AnalysisSection[] = context ? [
    { key: 'societies', data: societyRows.map(value => ({ kind: 'society', value })) },
    { key: 'daily', data: [...summary.daily].reverse().map(value => ({ kind: 'day', value })) },
  ] : [];
  const statuses = [
    { label: t('bmcCentre.pending'), count: summary.pendingCount, status: 'pending', color: colors.review, bg: colors.reviewBg },
    { label: tr('matched'), count: summary.matchedCount, status: 'matched', color: colors.clear, bg: colors.clearBg },
    { label: t('bmcCentre.reviews'), count: summary.reviewCount, status: 'needs_review', color: colors.hold, bg: colors.holdBg },
  ];
  const metrics = [
    { label: tr('sent'), value: litres(summary.sentLitres), note: summary.previousCount ? `${difference(change)} · ${tr('vsPrevious')}` : tr('noPrevious') },
    { label: partial(summary) ? tr('receivedPartial') : tr('received'), value: litres(summary.receivedLitres), note: coverage(summary) },
    { label: tr('deliveries'), value: summary.deliveryCount, note: tr('inSelectedPeriod') },
    { label: tr('supplying'), value: summary.societyCount, note: tr('withDeliveries') },
  ];
  const quantities = (value: BmcAggregate) => <>
    <View style={styles.quantities}>
      {[{ label: tr('sent'), value: litres(value.sentLitres) }, { label: partial(value) ? tr('receivedPartial') : tr('received'), value: litres(value.receivedLitres) }, { label: tr('difference'), value: difference(value.differenceLitres) }].map(item =>
        <View key={item.label} style={[styles.quantity, stacked && styles.quantityStacked]}>
          <Text style={[styles.caption, { color: colors.textSecondary }]}>{item.label}</Text>
          <Text style={[styles.quantityValue, { color: colors.text }]}>{item.value}</Text>
        </View>)}
    </View>
    <Text style={[styles.caption, { color: colors.textSecondary }]}>{value.deliveryCount ? coverage(value) : tr('noDeliveries')}</Text>
  </>;

  const header = <View style={styles.headerContent}>
    <View style={styles.row}>
      <View style={styles.flex}>
        <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>{tr('title')}</Text>
        <Text style={[styles.caption, { color: colors.textSecondary }]}>{tr('dateHelp')}</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={t('common.refresh', 'Refresh')} disabled={loading} onPress={refresh} style={[styles.iconButton, { backgroundColor: colors.card }]}>
        {loading ? <ActivityIndicator color={colors.primary} /> : <Ionicons name="refresh-outline" size={22} color={colors.primary} />}
      </Pressable>
    </View>
    <View style={styles.periods}>
      {(['today', 'yesterday', 'last7', 'month'] as const).map(value => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: period === value }} onPress={() => setPeriod(value)}
        style={[styles.period, { backgroundColor: period === value ? colors.primary : colors.card, borderColor: period === value ? colors.primary : colors.border }]}>
        <Text style={[styles.periodText, { color: period === value ? colors.navy : colors.text }]}>{tr(value)}</Text>
      </Pressable>)}
    </View>
    <Text accessibilityLiveRegion="polite" style={[styles.body, { color: colors.textSecondary }]}>{rangeLabel(summary.range.start, summary.range.end)}</Text>
    {error && <Card style={styles.panel}>
      <Text accessibilityRole="alert" style={[styles.body, { color: colors.hold }]}>{context ? t('bmcCentre.staleDashboard') : error}</Text>
      <Button title={t('common.retry', 'Retry')} onPress={refresh} disabled={loading} size="sm" variant="outline" />
    </Card>}
    {!context ? loading ? <View style={styles.loading}><ActivityIndicator color={colors.primary} /><Text style={{ color: colors.textSecondary }}>{t('bmcCentre.loading')}</Text></View> :
      <EmptyState title={t('bmcCentre.dashboardUnavailable')} actionTitle={t('common.refresh', 'Refresh')} onAction={refresh} /> : <>
      <View style={[styles.metrics, stacked && styles.stacked]}>
        {metrics.map(metric => <View key={metric.label} style={[styles.metric, stacked && styles.metricStacked, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.caption, { color: colors.textSecondary }]}>{metric.label}</Text>
          <Text style={[styles.metricValue, { color: colors.text }]}>{metric.value}</Text>
          <Text style={[styles.caption, { color: colors.textSecondary }]}>{metric.note}</Text>
        </View>)}
      </View>
      <View style={styles.comparisonNote}>
        <Text style={[styles.caption, { color: colors.textSecondary }]}>{tr('comparison')}: {rangeLabel(summary.range.previousStart, summary.range.previousEnd)}</Text>
        {period !== 'yesterday' && <Text style={[styles.caption, { color: colors.textSecondary }]}>{tr('inProgress')}</Text>}
      </View>
      {!summary.deliveryCount && <Text style={[styles.body, { color: colors.textSecondary }]}>{tr('empty')}</Text>}
      <Card style={styles.panel}>
        <Text accessibilityRole="header" style={[styles.sectionTitle, { color: colors.text }]}>{tr('barTitle')}</Text>
        <Text style={[styles.caption, { color: colors.textSecondary }]}>{tr(period === 'today' || period === 'yesterday' ? 'barCompare' : 'barDaily')}</Text>
        <CollectionBarChart key={period} days={chartDays} dateLabel={dateLabel} litres={litres} />
      </Card>
      <View style={styles.statusSection}>
        <View style={[styles.row, stacked && styles.stacked]}>
          <Text accessibilityRole="header" style={[styles.sectionTitle, { color: colors.text }]}>{tr('deliveryStatus')}</Text>
          <Button title={tr('viewDeliveries')} size="sm" variant="ghost" onPress={() => openDeliveries()} style={{ flexShrink: 1 }} />
        </View>
        <View style={styles.statuses}>
          {statuses.map(item => <Pressable key={item.status} accessibilityRole="button" accessibilityLabel={`${item.label}: ${item.count}`} onPress={() => openDeliveries(item.status)}
            style={[styles.status, { backgroundColor: item.bg }]}>
            <Text style={[styles.statusCount, { color: item.color }]}>{item.count}</Text>
            <Text style={[styles.caption, { color: colors.text }]}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={16} color={item.color} />
          </Pressable>)}
        </View>
        <Text style={[styles.caption, { color: colors.textSecondary }]}>{tr('differenceHelp')}</Text>
      </View>
    </>}
  </View>;

  return <View style={[styles.container, { backgroundColor: colors.background }]}>
    <DemoHeader title={t('bmcCentre.dashboard', 'Dashboard')} subtitle={context?.bmc.name || tr('title')} />
    <SectionList<AnalysisRow, AnalysisSection> sections={sections} stickySectionHeadersEnabled={false}
      keyExtractor={item => item.kind === 'society' ? `society:${item.value.id}` : `day:${item.value.date}`}
      contentContainerStyle={styles.content} ListHeaderComponent={header}
      refreshing={loading && !!context} onRefresh={refresh} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
      initialNumToRender={10} maxToRenderPerBatch={10}
      renderSectionHeader={({ section }) => <View style={styles.sectionHeader}>
        <View style={[styles.row, stacked && styles.stacked]}>
          <Text accessibilityRole="header" style={[styles.sectionTitle, !stacked && styles.flex, { color: colors.text }]}>{tr(section.key === 'societies' ? 'societyAnalysis' : 'dailyAnalysis')}</Text>
          {section.key === 'societies' && <Pressable accessibilityRole="button" onPress={() => router.push('/(bmc)/my-societies')} style={styles.directoryLink}>
            <Text style={[styles.linkText, { color: colors.primary }]}>{tr('directory')}</Text><Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </Pressable>}
        </View>
        <Text style={[styles.caption, { color: colors.textSecondary }]}>{tr(section.key === 'societies' ? 'societyAnalysisHelp' : 'dailyAnalysisHelp')}</Text>
        {section.key === 'societies' && <>
          <View style={[styles.search, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
            <TextInput value={search} onChangeText={setSearch} accessibilityLabel={tr('searchSocieties')} placeholder={tr('searchSocieties')} placeholderTextColor={colors.textSecondary} autoCorrect={false} style={[styles.searchInput, { color: colors.text }]} />
            {!!search && <Pressable accessibilityRole="button" accessibilityLabel={t('bmcCentre.clearSearch')} onPress={() => setSearch('')} style={styles.iconButton}><Ionicons name="close-circle" size={20} color={colors.textSecondary} /></Pressable>}
          </View>
          <Text accessibilityLiveRegion="polite" style={[styles.caption, { color: colors.textSecondary }]}>{societyRows.length} / {summary.societies.length} {t('bmcCentre.societies')}</Text>
          {context?.societies === undefined && <Text style={[styles.caption, { color: colors.textSecondary }]}>{tr('directoryUnavailable')}</Text>}
          {!societyRows.length && <Text style={[styles.body, { color: colors.textSecondary }]}>{search.trim() ? t('bmcCentre.noMatches') : t('bmcCentre.noSocieties')}</Text>}
        </>}
      </View>}
      renderItem={({ item }) => <Pressable accessibilityRole="button"
        accessibilityHint={tr('viewDeliveries')}
        onPress={() => item.kind === 'society' ? openDeliveries('all', item.value.id) : openDeliveries('all', '', item.value.date)}
        style={({ pressed }) => [styles.analysisRow, { backgroundColor: pressed ? colors.primaryLight : colors.card, borderColor: colors.border }]}>
        <View style={styles.row}>
          <View style={styles.flex}>
            <Text style={[styles.rowTitle, { color: colors.text }]}>{item.kind === 'society' ? item.value.name : dateLabel(item.value.date)}</Text>
            {item.kind === 'society' && <Text style={[styles.caption, { color: colors.textSecondary }]}>{tr(item.value.linkStatus === 'linked' ? 'linked' : item.value.linkStatus === 'historical' ? 'historical' : 'linkUnknown')}</Text>}
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.primary} />
        </View>
        {quantities(item.value)}
        <View style={[styles.rowFooter, { borderColor: colors.border }]}>
          <Text style={[styles.caption, { color: colors.textSecondary }]}>{item.value.deliveryCount} {tr('deliveries')}</Text>
          {item.kind === 'day' ? <Text style={[styles.caption, { color: colors.textSecondary }]}>{item.value.societyCount} {tr('supplying')}</Text> : <>
            <Text style={[styles.caption, { color: item.value.pendingCount ? colors.review : colors.textSecondary }]}>{item.value.pendingCount} {t('bmcCentre.pending')}</Text>
            <Text style={[styles.caption, { color: item.value.reviewCount ? colors.hold : colors.textSecondary }]}>{item.value.reviewCount} {t('bmcCentre.reviews')}</Text>
          </>}
        </View>
      </Pressable>}
    />
  </View>;
}

const styles = StyleSheet.create({
  container: { flex: 1 }, content: { width: '100%', maxWidth: 1000, alignSelf: 'center', padding: 16, paddingBottom: 24 },
  headerContent: { gap: 14 }, row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  flex: { flex: 1, minWidth: 0 }, title: { fontSize: 22, lineHeight: 30, fontWeight: '800' },
  caption: { fontSize: 12, lineHeight: 19 }, body: { fontSize: 14, lineHeight: 22 },
  iconButton: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  periods: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, period: { minHeight: 44, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderRadius: 24, justifyContent: 'center' },
  periodText: { fontSize: 13, fontWeight: '700' }, metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, stacked: { flexDirection: 'column', alignItems: 'stretch' },
  metric: { flexGrow: 1, flexBasis: '46%', minWidth: 0, borderWidth: 1, borderRadius: 16, padding: 14, gap: 5 }, metricStacked: { flexBasis: 'auto', flexGrow: 0 },
  metricValue: { fontSize: 23, lineHeight: 32, fontWeight: '800', fontVariant: ['tabular-nums'] }, comparisonNote: { gap: 3 },
  sectionTitle: { fontSize: 18, lineHeight: 26, fontWeight: '700' }, panel: { padding: 16, marginVertical: 0, gap: 10 },
  loading: { minHeight: 140, alignItems: 'center', justifyContent: 'center', gap: 12 },
  statusSection: { gap: 10 }, statuses: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, status: { flex: 1, minWidth: 90, padding: 12, borderRadius: 14, gap: 4 }, statusCount: { fontSize: 23, fontWeight: '800' },
  sectionHeader: { paddingTop: 26, paddingBottom: 12, gap: 8 }, directoryLink: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 4 }, linkText: { fontSize: 13, fontWeight: '700' },
  search: { flexDirection: 'row', alignItems: 'center', paddingLeft: 12, borderWidth: 1, borderRadius: 14, gap: 8 }, searchInput: { flex: 1, minWidth: 0, minHeight: 48, paddingVertical: 12, paddingRight: 12, fontSize: 14 },
  analysisRow: { padding: 16, gap: 12, borderWidth: 1, borderRadius: 16, marginBottom: 10 }, rowTitle: { fontSize: 16, lineHeight: 24, fontWeight: '700' },
  quantities: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, quantity: { flex: 1, minWidth: 100, gap: 4 }, quantityStacked: { flexBasis: '100%' },
  quantityValue: { fontSize: 17, lineHeight: 25, fontWeight: '700', fontVariant: ['tabular-nums'] }, rowFooter: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, borderTopWidth: 1, paddingTop: 10 },
});
