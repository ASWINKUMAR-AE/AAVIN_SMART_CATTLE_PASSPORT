import React, { useState, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  View,
  Text,
  FlatList,
  Alert,
  Modal,
  TextInput,
  Pressable,
  useWindowDimensions
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useAavinStore } from '../../store/AavinStoreContext';
import { useDispatchWorkflow, useDispatchRefresh } from '../../context/DispatchContext';
import { indiaDate, daysBefore } from '../../services/milkCollectionsApi';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { goBackOrReplace } from '../../services/navigation';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState } from '../../components/ui/EmptyState';
import { BMCDelivery } from '../../types/aavin';
import { BmcPeriod, bmcDeliveryStatus, bmcPeriodRange, validCollectionDate } from '../../services/bmcDashboard';

export type DeliveryFilterStatus = 'all' | 'pending' | 'matched' | 'mismatch' | 'pending_reconciliation' | 'needs_review';

export default function BMCReceiveMilkScreen() {
  const { user } = useAuth();
  const { receiveBmcDelivery, union } = useAavinStore();
  const { bmcDeliveries, context, loading, error, refresh } = useDispatchWorkflow();
  useDispatchRefresh();
  const { colors } = useTheme();
  const router = useRouter();
  const { width, fontScale } = useWindowDimensions();
  const stackedMetrics = width < 360 || fontScale > 1.2;
  const insets = useSafeAreaInsets();
  const [filterPicker, setFilterPicker] = useState<'date' | 'status' | null>(null);
  const today = indiaDate();
  const yesterday = daysBefore(today, 1);
  const dateLabel = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });
  const receiptLabel = (id: string) => /^[a-f0-9]{8}-/i.test(id) ? id.slice(0, 8).toUpperCase() : id;
  const dispatchLabel = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });
  };

  const { statusFilter, dateFilter: routeDateFilter, societyId: routeSocietyId, collectionDate: routeCollectionDate } = useLocalSearchParams<{
    statusFilter?: string; dateFilter?: string; societyId?: string; collectionDate?: string;
  }>();

  const bmcId = user?.id || '';
  const bmc = context?.bmc || { id: bmcId, name: user?.fullName || '' };

  // Filters State
  const [activeFilter, setActiveFilter] = useState<DeliveryFilterStatus>('all');
  const [dateFilter, setDateFilter] = useState<'all' | BmcPeriod>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [societyFilter, setSocietyFilter] = useState('');
  const [collectionDate, setCollectionDate] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    const aliases: Record<string, DeliveryFilterStatus> = {
      all: 'all', pending: 'pending', pending_arrival: 'pending', matched: 'matched',
      mismatch: 'mismatch', mismatch_investigation: 'mismatch',
      pending_reconciliation: 'pending_reconciliation', escalated_to_union: 'pending_reconciliation',
      needs_review: 'needs_review',
    };
    setActiveFilter(aliases[statusFilter || 'all'] || 'all');
    setDateFilter(['today', 'yesterday', 'last7', 'month'].includes(routeDateFilter || '') ? routeDateFilter as BmcPeriod : 'all');
    setSocietyFilter(routeSocietyId || '');
    setCollectionDate(validCollectionDate(routeCollectionDate));
    setSearchQuery('');
  }, [statusFilter, routeDateFilter, routeSocietyId, routeCollectionDate]));

  const [selectedDelivery, setSelectedDelivery] = useState<BMCDelivery | null>(null);
  const [measuredQty, setMeasuredQty] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const allBmcDeliveries = useMemo(() => bmcDeliveries.filter(d => d.bmcId === bmc.id), [bmcDeliveries, bmc.id]);

  // Each delivery belongs to exactly one status, shared by cards and filters.
  const deliveryStatus = (item: BMCDelivery): Exclude<DeliveryFilterStatus, 'all' | 'needs_review'> => {
    return bmcDeliveryStatus(item, union.mismatchThresholdLitres);
  };

  // Counts follow date and search selection, before the selected status is applied.
  const dateAndSearchDeliveries = useMemo(() => {
    const query = searchQuery.trim().toLowerCase().replace(/^receipt\s*#?\s*|^#/, '');
    const range = collectionDate ? { start: collectionDate, end: collectionDate } : dateFilter === 'all' ? null : bmcPeriodRange(dateFilter, today);
    return allBmcDeliveries.filter(item => {
      if (societyFilter && item.boothId !== societyFilter) return false;
      if (range && (item.collectionDate < range.start || item.collectionDate > range.end)) return false;
      return !query || [item.boothName, item.boothReceiptId, item.id].some(value => value.toLowerCase().includes(query));
    });
  }, [allBmcDeliveries, dateFilter, collectionDate, searchQuery, societyFilter, today]);

  const filterCounts = { all: dateAndSearchDeliveries.length, pending: 0, matched: 0, mismatch: 0, pending_reconciliation: 0, needs_review: 0 };
  for (const delivery of dateAndSearchDeliveries) filterCounts[deliveryStatus(delivery)]++;
  filterCounts.needs_review = filterCounts.mismatch + filterCounts.pending_reconciliation;
  const filteredDeliveries = dateAndSearchDeliveries.filter(item => activeFilter === 'all' ||
    (activeFilter === 'needs_review' ? ['mismatch', 'pending_reconciliation'].includes(deliveryStatus(item)) : deliveryStatus(item) === activeFilter));
  const hasFilters = !!collectionDate || dateFilter !== 'all' || activeFilter !== 'all' || searchQuery.length > 0 || !!societyFilter;
  const societyFilterLabel = allBmcDeliveries.find(item => item.boothId === societyFilter)?.boothName || 'Selected society';
  const statusLabels: Record<DeliveryFilterStatus, string> = {
    all: 'All statuses', pending: 'Awaiting arrival', matched: 'Matched',
    mismatch: 'Mismatched', pending_reconciliation: 'Under review',
    needs_review: 'Needs review',
  };
  const dateOptions = [
    { value: 'all', label: 'All dates', detail: 'Every collection date' },
    { value: 'today', label: 'Today', detail: dateLabel(today) },
    { value: 'yesterday', label: 'Yesterday', detail: dateLabel(yesterday) },
    { value: 'last7', label: 'Last 7 days', detail: `${dateLabel(bmcPeriodRange('last7', today).start)} – ${dateLabel(today)}` },
    { value: 'month', label: 'This month', detail: `${dateLabel(bmcPeriodRange('month', today).start)} – ${dateLabel(today)}` },
  ] as const;
  const statusOptions = [
    { value: 'all', label: 'All statuses' },
    { value: 'pending', label: 'Awaiting arrival' },
    { value: 'needs_review', label: 'Needs review' },
    { value: 'matched', label: 'Matched' },
    { value: 'mismatch', label: 'Mismatched' },
    { value: 'pending_reconciliation', label: 'Under review' },
  ] as const;
  const selectedDateLabel = collectionDate ? new Date(`${collectionDate}T12:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) : dateOptions.find(option => option.value === dateFilter)!.label;
  const resetFilters = () => {
    setCollectionDate(null); setDateFilter('all'); setActiveFilter('all'); setSearchQuery(''); setSocietyFilter('');
    router.setParams({ collectionDate: '', dateFilter: 'all', statusFilter: 'all', societyId: '' });
  };

  const handleOpenReceiveModal = (delivery: BMCDelivery) => {
    if (delivery.backendSynced) {
      Alert.alert('Dispatch received', 'This receipt is saved in your BMC inbox. Quantity confirmation is not available yet.');
      return;
    }
    setSelectedDelivery(delivery);
    setMeasuredQty(delivery.measuredReceivedQuantity?.toString() || delivery.declaredDispatchQuantity.toString());
  };

  const handleConfirmMeasurement = () => {
    if (!selectedDelivery || selectedDelivery.backendSynced) return;

    const qty = parseFloat(measuredQty);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Invalid Volume', 'Please enter a valid calibrated milk volume in litres.');
      return;
    }

    setSubmitting(true);
    try {
      const result = receiveBmcDelivery(
        selectedDelivery.id,
        qty,
        user?.fullName || 'R. Sundar (BMC In-Charge)'
      );

      const targetDelivery = selectedDelivery;
      setSelectedDelivery(null);

      if (result.isMismatch) {
        Alert.alert(
          'Quantity mismatch',
          `Sent by society: ${targetDelivery.declaredDispatchQuantity.toFixed(2)} L\nReceived at BMC: ${qty.toFixed(2)} L\nDifference: ${result.difference.toFixed(2)} L\n\nThis delivery is marked as needing review.`,
          [
            {
              text: 'Review deliveries',
              onPress: () => { resetFilters(); setActiveFilter('needs_review'); router.setParams({ statusFilter: 'needs_review' }); },
            },
            {
              text: 'OK',
            },
          ]
        );
      } else {
        Alert.alert(
          'Delivery Confirmed & Balanced!',
          `Recorded ${qty.toFixed(2)} Litres from ${targetDelivery.boothName}. Matched with declared receipt quantity without variance. Dispatch receipt confirmed.`,
          [{ text: 'OK' }]
        );
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not record measurement.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.pageHeader, { paddingTop: insets.top + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.pageHeaderInner}>
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => goBackOrReplace(router, '/(bmc)')}
            style={[styles.iconButton, { backgroundColor: colors.background }]}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>
          <View style={styles.headerTitleGroup}>
            <Text accessibilityRole="header" style={[styles.pageTitle, { color: colors.text }]}>Milk deliveries</Text>
            <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>{bmc.name}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Refresh deliveries" disabled={loading} onPress={refresh}
            style={[styles.iconButton, { backgroundColor: colors.background }]}>
            {loading ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="refresh-outline" size={21} color={colors.primary} />}
          </Pressable>
        </View>
      </View>

      <FlatList
        style={styles.deliveryList}
        refreshing={loading}
        onRefresh={refresh}
        data={filteredDeliveries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
              <TextInput placeholder="Search society or receipt" accessibilityLabel="Search deliveries"
                placeholderTextColor={colors.textSecondary} autoCorrect={false} autoCapitalize="none" returnKeyType="search"
                value={searchQuery} onChangeText={setSearchQuery} style={[styles.searchInput, { color: colors.text }]} />
              {!!searchQuery && <Pressable onPress={() => setSearchQuery('')} accessibilityRole="button" accessibilityLabel="Clear delivery search" style={styles.clearSearch}>
                <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
              </Pressable>}
            </View>
            <View style={[styles.filterRow, stackedMetrics && styles.filterRowStacked]}>
              <Pressable accessibilityRole="button" accessibilityLabel={`Collection date: ${selectedDateLabel}. Change date filter`}
                onPress={() => setFilterPicker('date')} style={[styles.filterControl, { backgroundColor: colors.card, borderColor: dateFilter === 'all' && !collectionDate ? colors.border : colors.primary }]}>
                <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                <View style={styles.filterControlText}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Collection date</Text>
                  <Text style={[styles.controlValue, { color: colors.text }]}>{selectedDateLabel}</Text>
                </View>
                <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={`Delivery status: ${statusLabels[activeFilter]}. Change status filter`}
                onPress={() => setFilterPicker('status')} style={[styles.filterControl, { backgroundColor: colors.card, borderColor: activeFilter === 'all' ? colors.border : colors.primary }]}>
                <Ionicons name="options-outline" size={18} color={colors.primary} />
                <View style={styles.filterControlText}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Status</Text>
                  <Text style={[styles.controlValue, { color: colors.text }]}>{statusLabels[activeFilter]}</Text>
                </View>
                <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
              </Pressable>
            </View>
            {!!societyFilter && <Pressable accessibilityRole="button" accessibilityLabel={`Clear society filter: ${societyFilterLabel}`}
              onPress={() => setSocietyFilter('')} style={[styles.societyFilterChip, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="business-outline" size={16} color={colors.primary} />
              <Text style={[styles.controlValue, { color: colors.text, flexShrink: 1 }]}>{societyFilterLabel}</Text>
              <Ionicons name="close-circle" size={18} color={colors.primary} />
            </Pressable>}
            <View style={styles.resultsRow}>
              <Text accessibilityLiveRegion="polite" style={[styles.resultsText, { color: colors.textSecondary }]}>
                {filteredDeliveries.length} {filteredDeliveries.length === 1 ? 'delivery' : 'deliveries'}{hasFilters ? ` of ${allBmcDeliveries.length}` : ''}
              </Text>
              {hasFilters && <Pressable accessibilityRole="button" accessibilityLabel="Reset delivery filters" onPress={resetFilters} style={styles.resetButton}>
                <Text style={[styles.resetText, { color: colors.primary }]}>Clear filters</Text>
              </Pressable>}
            </View>
            {error && <View style={[styles.errorNotice, { borderColor: colors.hold, backgroundColor: colors.card }]}>
              <Ionicons name="cloud-offline-outline" size={20} color={colors.hold} />
              <Text style={[styles.bodyText, { color: colors.hold, flex: 1 }]}>{error}</Text>
            </View>}
          </View>
        }
        ListEmptyComponent={loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[styles.bodyText, { color: colors.textSecondary }]}>Fetching deliveries…</Text>
          </View>
        ) : (
          <EmptyState
            title={error ? 'Unable to load deliveries' : hasFilters ? 'No matching deliveries' : 'No deliveries yet'}
            message={error ? 'Check your connection and try again.' : hasFilters ? 'Try a different date or status, or clear your search.' : 'Receipts sent by your societies will appear here.'}
            icon={error ? 'cloud-offline-outline' : hasFilters ? 'search-outline' : 'cube-outline'}
            actionTitle={error ? 'Try again' : hasFilters ? 'Reset filters' : 'Refresh deliveries'}
            onAction={error ? refresh : hasFilters ? resetFilters : refresh}
          />
        )}
        renderItem={({ item }) => {
          const status = deliveryStatus(item);
          const isPending = status === 'pending';
          const measured = item.measuredReceivedQuantity != null;
          const difference = measured ? item.difference ?? item.declaredDispatchQuantity - item.measuredReceivedQuantity! : undefined;
          const isMismatch = status === 'mismatch';
          const badge = status === 'matched'
            ? { color: colors.clear, background: colors.clearBg, icon: 'checkmark-circle-outline' as const }
            : isMismatch
              ? { color: colors.hold, background: colors.holdBg, icon: 'alert-circle-outline' as const }
              : { color: colors.review, background: colors.reviewBg, icon: 'time-outline' as const };
          const metrics = [
            { label: 'Sent by society', value: `${item.declaredDispatchQuantity.toFixed(1)} L`, color: colors.primary },
            { label: 'Received at BMC', value: measured ? `${item.measuredReceivedQuantity!.toFixed(1)} L` : 'Not measured', color: measured ? colors.text : colors.textSecondary },
          ];
          return (
            <Card style={styles.deliveryCard}>
              <View style={styles.societyHeader}>
                <View style={[styles.societyIcon, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="business-outline" size={22} color={colors.primary} />
                </View>
                <View style={styles.societyIdentity}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>SOCIETY DELIVERY</Text>
                  <Text accessibilityRole="header" style={[styles.societyName, { color: colors.text }]}>{item.boothName}</Text>
                </View>
              </View>
              <View style={styles.deliveryMeta}>
                <View style={[styles.statusBadge, { backgroundColor: badge.background }]}>
                  <Ionicons name={badge.icon} size={15} color={badge.color} />
                  <Text style={[styles.statusText, { color: badge.color }]}>{statusLabels[status]}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                  <Text style={[styles.metaText, { color: colors.textSecondary }]}>{dateLabel(item.collectionDate)} · {dispatchLabel(item.dispatchTime)}</Text>
                </View>
              </View>
              <View style={styles.receiptMeta}>
                <Ionicons name="receipt-outline" size={14} color={colors.textSecondary} />
                <Text selectable style={[styles.metaText, { color: colors.textSecondary }]}>Receipt #{receiptLabel(item.boothReceiptId)}</Text>
              </View>
              <View style={[styles.metricsContainer, stackedMetrics && styles.metricsStacked, { backgroundColor: colors.background, borderColor: colors.border }]}>
                {metrics.map((metric, index) => <View key={metric.label} style={[
                  styles.metricBlock, stackedMetrics && styles.metricRow,
                  index > 0 && (stackedMetrics ? styles.metricTopBorder : styles.metricLeftBorder), { borderColor: colors.border },
                ]}>
                  <Text style={[styles.metricLabel, stackedMetrics && styles.metricLabelStacked, { color: colors.textSecondary }]}>{metric.label}</Text>
                  <Text style={[styles.metricValue, metric.value === 'Not measured' && styles.unmeasuredValue, stackedMetrics && styles.metricValueStacked, { color: metric.color }]}>{metric.value}</Text>
                </View>)}
              </View>
              {difference !== undefined && <View style={[styles.varianceRow, { backgroundColor: isMismatch ? colors.holdBg : colors.clearBg }]}>
                <Ionicons name={isMismatch ? 'alert-circle-outline' : 'checkmark-circle-outline'} size={18} color={isMismatch ? colors.hold : colors.clear} />
                <Text style={[styles.varianceLabel, { color: colors.text }]}>{difference === 0 ? 'Difference' : difference > 0 ? 'Shortfall' : 'Surplus'}</Text>
                <Text style={[styles.varianceValue, { color: isMismatch ? colors.hold : colors.text }]}>{Math.abs(difference).toFixed(1)} L</Text>
              </View>}
              {isPending && <View style={[styles.deliveryNote, { borderTopColor: colors.border }]}>
                <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
                <View style={styles.noteContent}>
                  <Text style={[styles.noteTitle, { color: colors.text }]}>Awaiting BMC measurement</Text>
                  <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
                    {item.backendSynced ? 'Quantity confirmation is not available yet.' : 'Enter the received quantity to verify this delivery.'}
                  </Text>
                </View>
              </View>}
              {item.receivedBy && <Text style={[styles.bodyText, { color: colors.textSecondary }]}>Measured by {item.receivedBy}</Text>}
              {(status === 'pending_reconciliation' || isMismatch) && <Text style={[styles.bodyText, { color: badge.color }]}>This delivery needs a quantity review.</Text>}
              {isPending && !item.backendSynced && <Button title="Enter received quantity" onPress={() => handleOpenReceiveModal(item)}
                style={styles.fullWidthButton} textStyle={styles.buttonText} />}
              {!isPending && <View style={styles.cardActions}>
                {!item.backendSynced && <Button title="Re-measure" variant="outline" size="sm" onPress={() => handleOpenReceiveModal(item)} style={styles.actionButton} textStyle={styles.buttonText} />}
                <Button title="Society details" variant="secondary" size="sm" onPress={() => router.push(`/(bmc)/society-details?societyId=${item.boothId}`)} style={styles.actionButton} textStyle={styles.buttonText} />
              </View>}
            </Card>
          );
        }}
      />

      <Modal visible={filterPicker !== null} transparent animationType="fade" onRequestClose={() => setFilterPicker(null)}>
        <View style={[styles.pickerOverlay, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close filter choices" style={styles.backdrop} onPress={() => setFilterPicker(null)} />
          <View accessibilityViewIsModal style={[styles.pickerSheet, { backgroundColor: colors.card }]}>
            <View style={styles.pickerHeader}>
              <Text accessibilityRole="header" style={[styles.pickerTitle, { color: colors.text }]}>{filterPicker === 'date' ? 'Collection date' : 'Delivery status'}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Close filter choices" style={styles.iconButton} onPress={() => setFilterPicker(null)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.pickerOptions}>
              {filterPicker === 'date' ? dateOptions.map(option => {
                const selected = !collectionDate && dateFilter === option.value;
                return <Pressable key={option.value} accessibilityRole="radio" accessibilityState={{ checked: selected }}
                  onPress={() => {
                    setCollectionDate(null); setDateFilter(option.value); setFilterPicker(null);
                    router.setParams({ collectionDate: '', dateFilter: option.value, statusFilter: activeFilter, societyId: societyFilter });
                  }}
                  style={[styles.pickerOption, { backgroundColor: selected ? colors.primaryLight : colors.card, borderColor: selected ? colors.primary : colors.border }]}>
                  <View style={styles.optionText}>
                    <Text style={[styles.optionLabel, { color: colors.text }]}>{option.label}</Text>
                    <Text style={[styles.bodyText, { color: colors.textSecondary }]}>{option.detail}</Text>
                  </View>
                  <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={22} color={selected ? colors.primary : colors.textSecondary} />
                </Pressable>;
              }) : statusOptions.map(option => {
                const selected = activeFilter === option.value;
                return <Pressable key={option.value} accessibilityRole="radio" accessibilityState={{ checked: selected }}
                  onPress={() => { setActiveFilter(option.value); setFilterPicker(null); }}
                  style={[styles.pickerOption, { backgroundColor: selected ? colors.primaryLight : colors.card, borderColor: selected ? colors.primary : colors.border }]}>
                  <Text style={[styles.optionLabel, styles.optionText, { color: colors.text }]}>{option.label}</Text>
                  <Text style={[styles.optionCount, { color: colors.textSecondary }]}>{filterCounts[option.value]}</Text>
                  <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={22} color={selected ? colors.primary : colors.textSecondary} />
                </Pressable>;
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Calibrated Flow Meter Measurement Entry Modal */}
      {selectedDelivery && (
        <Modal
          visible={true}
          transparent
          animationType="slide"
          onRequestClose={() => setSelectedDelivery(null)}
        >
          <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <Pressable style={styles.backdrop} accessibilityLabel="Close measurement" accessibilityRole="button" onPress={() => setSelectedDelivery(null)} />
            <ScrollView keyboardShouldPersistTaps="handled" style={[styles.modalSheet, { backgroundColor: colors.card }]} contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) }}>
            <View style={styles.measurementContent} onStartShouldSetResponder={() => true}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[Typography.title3, { color: colors.text, fontWeight: '900' }]}>
                    Confirm Milk Received
                  </Text>
                  <Text style={[Typography.caption1, { color: colors.textSecondary, marginTop: 2 }]}>
                    {selectedDelivery.boothName} • Receipt #{receiptLabel(selectedDelivery.boothReceiptId)}
                  </Text>
                </View>
                <Pressable onPress={() => setSelectedDelivery(null)} hitSlop={8}>
                  <Ionicons name="close-circle" size={26} color={colors.textSecondary} />
                </Pressable>
              </View>

              {/* Declared Reference Box */}
              <View style={[styles.declaredBox, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
                <Text style={[Typography.caption2, { color: colors.primary, fontWeight: '800' }]}>
                  SOCIETY DECLARED DISPATCH QUANTITY
                </Text>
                <Text style={[styles.declaredNum, { color: colors.primary }]}>
                  {selectedDelivery.declaredDispatchQuantity.toFixed(2)} Litres
                </Text>
                <Text style={[Typography.caption2, { color: colors.primary }]}>
                  Preserved from society dispatch slip. Immutable digital record.
                </Text>
              </View>

              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800', marginTop: 16, marginBottom: 6 }]}>
                BMC Flow Meter Measured Quantity (Litres) *
              </Text>
              <TextInput
                placeholder="Enter measured litres e.g. 580.0 (or 575.0)"
                placeholderTextColor={colors.textMuted}
                value={measuredQty}
                onChangeText={setMeasuredQty}
                keyboardType="decimal-pad"
                style={[styles.inputField, { color: colors.text, borderColor: colors.border }]}
              />

              {/* Dynamic Live Difference Preview */}
              {(() => {
                const entered = parseFloat(measuredQty);
                if (!isNaN(entered) && entered > 0) {
                  const diff = parseFloat((selectedDelivery.declaredDispatchQuantity - entered).toFixed(2));
                  const isDiff = Math.abs(diff) > union.mismatchThresholdLitres;
                  return (
                    <View style={[styles.diffPreview, { backgroundColor: isDiff ? '#FEF2F2' : '#F0FDF4', borderColor: isDiff ? '#FCA5A5' : '#BBF7D0' }]}>
                      <Ionicons
                        name={isDiff ? 'alert-circle' : 'checkmark-circle'}
                        size={20}
                        color={isDiff ? '#DC2626' : '#16A34A'}
                      />
                      <View style={{ marginLeft: 8, flex: 1 }}>
                        <Text style={[Typography.subhead, { color: isDiff ? '#B91C1C' : '#166534', fontWeight: '800' }]}>
                          Calculated Difference: {diff.toFixed(2)} Litres
                        </Text>
                        <Text style={[Typography.caption2, { color: isDiff ? '#991B1B' : '#166534' }]}>
                          {isDiff
                            ? `⚠️ Variance exceeds threshold (±${union.mismatchThresholdLitres.toFixed(1)} L). Discrepancy Case will be logged automatically.`
                            : '✓ Balanced intake. Delivery will be verified as matched.'}
                        </Text>
                      </View>
                    </View>
                  );
                }
                return null;
              })()}

              <Button
                title={submitting ? "Saving Measurement..." : "Confirm & Save Measurement"}
                size="lg"
                loading={submitting}
                onPress={handleConfirmMeasurement}
                style={{ marginTop: 16 }}
              />
            </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backdrop: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 },
  pageHeader: { paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  pageHeaderInner: { flexDirection: 'row', alignItems: 'center', gap: 12, maxWidth: 900, width: '100%', alignSelf: 'center' },
  headerTitleGroup: { flex: 1, minWidth: 0, gap: 3 },
  pageTitle: { fontSize: 22, lineHeight: 28, fontWeight: '800' },
  pageSubtitle: { fontSize: 13, lineHeight: 19 },
  iconButton: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  deliveryList: { flex: 1 },
  listContent: { padding: 16, gap: 16, paddingBottom: 32 },
  listHeader: { width: '100%', maxWidth: 900, alignSelf: 'center', gap: 12 },
  searchBar: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14, paddingLeft: 14, minHeight: 52 },
  searchInput: { flex: 1, minWidth: 0, paddingVertical: 14, paddingHorizontal: 10, fontSize: 14, lineHeight: 20 },
  clearSearch: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  filterRow: { flexDirection: 'row', gap: 10 },
  filterRowStacked: { flexDirection: 'column' },
  filterControl: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderWidth: 1, borderRadius: 14, minHeight: 64 },
  filterControlText: { flex: 1, minWidth: 0, gap: 3 },
  fieldLabel: { fontSize: 11, lineHeight: 16 },
  controlValue: { fontSize: 13, lineHeight: 19, fontWeight: '700' },
  resultsRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 32 },
  resultsText: { fontSize: 13, lineHeight: 20, fontWeight: '600' },
  societyFilterChip: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 8, paddingHorizontal: 12, paddingVertical: 10, minHeight: 44, borderRadius: 12, maxWidth: '100%' },
  resetButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  resetText: { fontSize: 13, lineHeight: 20, fontWeight: '700' },
  errorNotice: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderWidth: 1, borderRadius: 12 },
  loadingState: { padding: 32, alignItems: 'center', gap: 12 },
  bodyText: { fontSize: 13, lineHeight: 20 },
  deliveryCard: { width: '100%', maxWidth: 900, alignSelf: 'center', padding: 16, borderRadius: 20, marginVertical: 0 },
  societyHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  societyIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  societyIdentity: { flex: 1, minWidth: 0, gap: 2 },
  deliveryMeta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 14 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1 },
  statusBadge: { alignSelf: 'flex-start', maxWidth: '100%', flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, lineHeight: 17, fontWeight: '700', flexShrink: 1 },
  societyName: { fontSize: 20, lineHeight: 27, fontWeight: '800' },
  receiptMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 },
  metaText: { fontSize: 12, lineHeight: 19, flexShrink: 1 },
  metricsContainer: { flexDirection: 'row', borderWidth: 1, borderRadius: 14, marginTop: 16, marginBottom: 14, overflow: 'hidden' },
  metricsStacked: { flexDirection: 'column' },
  metricBlock: { flex: 1, minWidth: 0, paddingHorizontal: 12, paddingVertical: 14, gap: 6 },
  metricRow: { flex: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  metricLeftBorder: { borderLeftWidth: StyleSheet.hairlineWidth },
  metricTopBorder: { borderTopWidth: StyleSheet.hairlineWidth },
  metricLabel: { fontSize: 12, lineHeight: 18 },
  metricLabelStacked: { flexGrow: 1, flexShrink: 1, minHeight: 0 },
  metricValue: { fontSize: 26, lineHeight: 34, fontWeight: '800', fontVariant: ['tabular-nums'], flexShrink: 1 },
  metricValueStacked: { textAlign: 'right', flexShrink: 1 },
  unmeasuredValue: { fontSize: 14, lineHeight: 34, fontWeight: '600' },
  varianceRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, padding: 12, borderRadius: 10, marginBottom: 12 },
  varianceLabel: { flexGrow: 1, flexShrink: 1, fontSize: 13, lineHeight: 20 },
  varianceValue: { fontSize: 15, lineHeight: 22, fontWeight: '700', fontVariant: ['tabular-nums'] },
  deliveryNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  noteContent: { flex: 1, gap: 3 },
  noteTitle: { fontSize: 13, lineHeight: 20, fontWeight: '600' },
  cardActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  fullWidthButton: { width: '100%', marginTop: 14 },
  actionButton: { flexGrow: 1, flexBasis: 140 },
  buttonText: { textAlign: 'center', flexShrink: 1, fontSize: 13 },
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', paddingHorizontal: 12, paddingTop: 24 },
  pickerSheet: { width: '100%', maxWidth: 520, alignSelf: 'center', maxHeight: '90%', borderRadius: 24, padding: 16 },
  pickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 },
  pickerTitle: { flex: 1, fontSize: 20, lineHeight: 28, fontWeight: '800' },
  pickerOptions: { gap: 8, paddingBottom: 8 },
  pickerOption: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderWidth: 1, borderRadius: 14, minHeight: 60 },
  optionText: { flex: 1, minWidth: 0 },
  optionLabel: { fontSize: 15, lineHeight: 22, fontWeight: '600' },
  optionCount: { fontSize: 14, lineHeight: 22, fontVariant: ['tabular-nums'] },
  measurementContent: { padding: 20 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  declaredBox: {
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  declaredNum: {
    fontSize: 26,
    fontWeight: '900',
    marginVertical: 2,
  },
  inputField: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: '700',
  },
  diffPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 12,
  },
});
