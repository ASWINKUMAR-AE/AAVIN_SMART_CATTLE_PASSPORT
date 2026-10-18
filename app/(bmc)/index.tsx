import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useDispatchRefresh, useDispatchWorkflow } from '../../context/DispatchContext';
import { useAavinStore } from '../../store/AavinStoreContext';
import { DemoHeader } from '../../components/DemoHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { indiaDate } from '../../services/milkCollectionsApi';
import { buildBmcDashboard } from '../../services/bmcDashboard';
import { ReportsShortcut } from '../../components/bmc/ReportsShortcut';

export default function BMCDashboard() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { union } = useAavinStore();
  const { context, bmcDeliveries, loading, error, refresh } = useDispatchWorkflow();
  useDispatchRefresh();
  const router = useRouter();
  const { width, fontScale } = useWindowDimensions();
  const compact = width < 360 || fontScale > 1.2;
  const [search, setSearch] = useState('');
  const today = indiaDate();
  const bmcId = context?.bmc.id || user?.id || '';
  const dashboard = useMemo(() => buildBmcDashboard(bmcDeliveries, bmcId, today, union.mismatchThresholdLitres),
    [bmcDeliveries, bmcId, today, union.mismatchThresholdLitres]);
  const societies = dashboard.societies.filter(society => society.name.toLowerCase().includes(search.trim().toLowerCase()));
  const hasData = context !== null;
  const openDeliveries = (statusFilter = 'all', dateFilter = 'all', societyId = '') => router.push({
    pathname: '/(bmc)/receive-milk', params: { statusFilter, dateFilter, societyId, collectionDate: '' },
  });
  const litres = (value: number) => value.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' L';
  const dateLabel = (value: string) => new Date(value + 'T12:00:00Z').toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata',
  });
  const pendingPreview = [...dashboard.pending].sort((a, b) =>
    a.collectionDate.localeCompare(b.collectionDate) || a.dispatchTime.localeCompare(b.dispatchTime)).slice(0, 3);
  const attention = [
    { label: 'Awaiting measurement', detail: 'Review pending deliveries', count: dashboard.pending.length, filter: 'pending', icon: 'time-outline' as const, color: colors.review },
    { label: 'Needs review', detail: 'Mismatches and escalations', count: dashboard.review.length, filter: 'needs_review', icon: 'alert-circle-outline' as const, color: colors.hold },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <DemoHeader title={context?.bmc.name || user?.fullName || 'BMC dashboard'} subtitle="Daily milk intake overview" />
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
        refreshControl={<RefreshControl refreshing={loading && hasData} onRefresh={refresh} colors={[colors.primary]} tintColor={colors.primary} />}>
        <View style={styles.content}>
          <ReportsShortcut />
          <View style={styles.sectionHeader}>
            <View style={styles.flex}>
              <Text accessibilityRole="header" style={[styles.pageTitle, { color: colors.text }]}>Today at a glance</Text>
              <Text style={[styles.caption, { color: colors.textSecondary }]}>{dateLabel(today)} · Collection date</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Refresh dashboard" disabled={loading} onPress={refresh}
              style={[styles.iconButton, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {loading ? <ActivityIndicator color={colors.primary} /> : <Ionicons name="refresh-outline" size={21} color={colors.primary} />}
            </Pressable>
          </View>
          {error && <View accessibilityRole="alert" style={[styles.notice, { backgroundColor: colors.holdBg }]}>
            <Ionicons name="cloud-offline-outline" size={21} color={colors.hold} />
            <View style={styles.flex}>
              <Text style={[styles.rowTitle, { color: colors.text }]}>{hasData ? 'Could not refresh dashboard' : 'Could not load dashboard'}</Text>
              <Text style={[styles.caption, { color: colors.textSecondary }]}>{hasData ? 'Showing previously loaded data. Pull down to retry.' : error}</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={refresh} disabled={loading} style={styles.textButton}>
              <Text style={[styles.link, { color: colors.hold }]}>Retry</Text>
            </Pressable>
          </View>}
          {!hasData ? <View style={styles.loadingState}>
            {loading ? <><ActivityIndicator size="large" color={colors.primary} /><Text style={[styles.body, { color: colors.textSecondary }]}>Loading your BMC overview…</Text></> :
              <EmptyState title="Dashboard unavailable" message="Refresh to load your BMC deliveries." actionTitle="Refresh" onAction={refresh} />}
          </View> : <>
            <Card style={styles.overviewCard}>
              <View style={[styles.quantityGrid, compact && styles.stacked]}>
                <View style={styles.quantityCell}>
                  <Text style={[styles.body, { color: colors.textSecondary }]}>Sent by societies</Text>
                  <Text style={[styles.quantity, { color: colors.primary }]}>{litres(dashboard.sentLitres)}</Text>
                  <Text style={[styles.caption, { color: colors.textSecondary }]}>{dashboard.todayDeliveries.length} {dashboard.todayDeliveries.length === 1 ? 'delivery' : 'deliveries'} · {dashboard.societies.length} {dashboard.societies.length === 1 ? 'society' : 'societies'}</Text>
                </View>
                <View style={[styles.quantityCell, styles.receivedCell, compact && styles.receivedStacked, { borderColor: colors.border }]}>
                  <Text style={[styles.body, { color: colors.textSecondary }]}>Measured at BMC</Text>
                  <Text style={[styles.quantity, dashboard.receivedLitres === null && styles.unmeasured, { color: colors.text }]}>
                    {dashboard.receivedLitres === null ? 'Not measured' : litres(dashboard.receivedLitres)}
                  </Text>
                  <Text style={[styles.caption, { color: colors.textSecondary }]}>{dashboard.measuredCount} of {dashboard.todayDeliveries.length} deliveries measured</Text>
                </View>
              </View>
              <View style={[styles.overviewFooter, { borderTopColor: colors.border }]}>
                <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
                <Text style={[styles.caption, styles.flex, { color: colors.textSecondary }]}>Received totals include measured deliveries only.</Text>
              </View>
              <Button title="View today's deliveries" onPress={() => openDeliveries('all', 'today')} style={{ marginTop: 14 }} />
            </Card>
            <View style={styles.sectionHeader}>
              <Text accessibilityRole="header" style={[styles.sectionTitle, { color: colors.text }]}>Needs attention</Text>
              <Text style={[styles.caption, { color: colors.textSecondary }]}>All dates</Text>
            </View>
            <View style={[styles.attentionGrid, compact && styles.stacked]}>
              {attention.map(item => <Pressable key={item.filter} accessibilityRole="button" accessibilityLabel={item.count + ' ' + item.label + '. View deliveries.'}
                onPress={() => openDeliveries(item.filter)} style={[styles.attentionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.sectionHeader}><Ionicons name={item.icon} size={22} color={item.color} /><Ionicons name="chevron-forward" size={17} color={colors.textSecondary} /></View>
                <Text style={[styles.count, { color: colors.text }]}>{item.count}</Text>
                <Text style={[styles.rowTitle, { color: colors.text }]}>{item.label}</Text>
                <Text style={[styles.caption, { color: colors.textSecondary }]}>{item.detail}</Text>
              </Pressable>)}
            </View>
            {pendingPreview.length > 0 && <Card style={styles.listCard}>
              <Text accessibilityRole="header" style={[styles.sectionTitle, styles.listHeading, { color: colors.text }]}>Pending deliveries</Text>
              {pendingPreview.map(item => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={'View pending delivery from ' + item.boothName}
                onPress={() => openDeliveries('pending', 'all', item.boothId)} style={[styles.deliveryRow, { borderTopColor: colors.border }]}>
                <View style={[styles.rowIcon, { backgroundColor: colors.reviewBg }]}><Ionicons name="cube-outline" size={19} color={colors.review} /></View>
                <View style={styles.flex}>
                  <Text style={[styles.rowTitle, { color: colors.text }]}>{item.boothName}</Text>
                  <Text style={[styles.caption, { color: colors.textSecondary }]}>{dateLabel(item.collectionDate)} · Awaiting measurement</Text>
                </View>
                <Text style={[styles.rowValue, { color: colors.text }]}>{litres(item.declaredDispatchQuantity)}</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
              </Pressable>)}
              {dashboard.pending.length > 3 && <Pressable accessibilityRole="button" onPress={() => openDeliveries('pending')} style={styles.listLink}>
                <Text style={[styles.link, { color: colors.primary }]}>View all {dashboard.pending.length} pending deliveries</Text>
              </Pressable>}
            </Card>}
            <View>
              <Text accessibilityRole="header" style={[styles.sectionTitle, { color: colors.text }]}>Today's society supply</Text>
              <Text style={[styles.caption, { color: colors.textSecondary }]}>All dispatches combined for each society</Text>
            </View>
            {(dashboard.societies.length > 6 || !!search) && <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="search-outline" size={19} color={colors.textSecondary} />
              <TextInput accessibilityLabel="Search today's societies" placeholder="Search society" placeholderTextColor={colors.textSecondary}
                value={search} onChangeText={setSearch} autoCorrect={false} style={[styles.searchInput, { color: colors.text }]} />
              {!!search && <Pressable accessibilityRole="button" accessibilityLabel="Clear society search" onPress={() => setSearch('')} style={styles.textButton}>
                <Ionicons name="close-circle" size={20} color={colors.textSecondary} /></Pressable>}
            </View>}
            {societies.length ? <Card style={styles.listCard}>
              {societies.slice(0, 6).map((society, index) => <Pressable key={society.id} accessibilityRole="button" accessibilityLabel={"View today's deliveries from " + society.name}
                onPress={() => openDeliveries('all', 'today', society.id)}
                style={[styles.societyRow, index > 0 && styles.rowBorder, { borderTopColor: colors.border }]}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.labelRow, styles.flex]}><Ionicons name="business-outline" size={18} color={colors.primary} />
                    <Text style={[styles.rowTitle, styles.flex, { color: colors.text }]}>{society.name}</Text></View>
                  <Ionicons name="chevron-forward" size={17} color={colors.textSecondary} />
                </View>
                <View style={[styles.societyQuantities, compact && styles.stacked]}>
                  <Text style={[styles.body, { color: colors.textSecondary }]}>Sent <Text style={{ color: colors.text, fontWeight: '700' }}>{litres(society.sent)}</Text></Text>
                  <Text style={[styles.body, { color: colors.textSecondary }]}>Received <Text style={{ color: colors.text, fontWeight: '700' }}>{society.measuredCount ? litres(society.received) : 'Not measured'}</Text></Text>
                </View>
                <Text style={[styles.caption, { color: colors.textSecondary }]}>{society.measuredCount} of {society.deliveryCount} deliveries measured</Text>
              </Pressable>)}
              {societies.length > 6 && <Text style={[styles.caption, styles.listHeading, { color: colors.textSecondary }]}>Showing 6 of {societies.length} societies. Search to find another society.</Text>}
            </Card> : <EmptyState icon={search ? 'search-outline' : 'water-outline'} title={search ? 'No matching societies' : 'No dispatches for today'}
              message={search ? 'Try another society name.' : 'Society supply will appear when dispatch receipts arrive. Earlier deliveries are available in Deliveries.'}
              actionTitle={search ? 'Clear search' : 'View all deliveries'} onAction={search ? () => setSearch('') : () => openDeliveries()} />}
          </>}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 24 },
  content: { width: '100%', maxWidth: 960, alignSelf: 'center', gap: 16 },
  flex: { flex: 1, minWidth: 0 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  pageTitle: { fontSize: 23, lineHeight: 31, fontWeight: '800' },
  sectionTitle: { fontSize: 17, lineHeight: 25, fontWeight: '700' },
  body: { fontSize: 13, lineHeight: 20 },
  caption: { fontSize: 12, lineHeight: 19 },
  iconButton: { width: 44, height: 44, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12 },
  loadingState: { minHeight: 240, alignItems: 'center', justifyContent: 'center', gap: 16 },
  overviewCard: { padding: 16, marginVertical: 0 },
  quantityGrid: { flexDirection: 'row', gap: 16 },
  quantityCell: { flex: 1, minWidth: 0, gap: 8 },
  receivedCell: { borderLeftWidth: StyleSheet.hairlineWidth, paddingLeft: 16 },
  receivedStacked: { borderLeftWidth: 0, paddingLeft: 0, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 16 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  quantity: { fontSize: 27, lineHeight: 36, fontWeight: '800', fontVariant: ['tabular-nums'] },
  unmeasured: { fontSize: 18 },
  overviewFooter: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, borderTopWidth: StyleSheet.hairlineWidth, marginTop: 16, paddingTop: 12 },
  attentionGrid: { flexDirection: 'row', gap: 12 },
  stacked: { flexDirection: 'column' },
  attentionCard: { flex: 1, minWidth: 0, borderRadius: 16, borderWidth: 1, padding: 14, gap: 4 },
  count: { fontSize: 29, lineHeight: 38, fontWeight: '800', fontVariant: ['tabular-nums'] },
  rowTitle: { fontSize: 14, lineHeight: 21, fontWeight: '700' },
  rowValue: { fontSize: 14, lineHeight: 21, fontWeight: '700', fontVariant: ['tabular-nums'], flexShrink: 1 },
  listCard: { padding: 0, marginVertical: 0, overflow: 'hidden' },
  listHeading: { padding: 16 },
  deliveryRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, padding: 14, borderTopWidth: StyleSheet.hairlineWidth, minHeight: 76 },
  rowIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  listLink: { padding: 16, minHeight: 48, alignItems: 'center' },
  textButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  link: { fontSize: 13, lineHeight: 20, fontWeight: '700' },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 12, borderWidth: 1, borderRadius: 12 },
  searchInput: { flex: 1, minWidth: 0, fontSize: 14, paddingVertical: 14 },
  societyRow: { padding: 16, gap: 8, minHeight: 110 },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth },
  societyQuantities: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
});
