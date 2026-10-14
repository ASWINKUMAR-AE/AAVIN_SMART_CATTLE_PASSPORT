import React, { useState, useMemo } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  Pressable, 
  RefreshControl, 
  TextInput,
  useWindowDimensions,
  Platform,
  ImageBackground 
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAavinStore } from '../../store/AavinStoreContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { DemoHeader } from '../../components/DemoHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Ionicons } from '@expo/vector-icons';

type SocietyFilter = 'all' | 'active' | 'inactive' | 'pending' | 'submitted' | 'discrepancy' | 'high_yield' | 'low_yield';
type SocietySort = 'milk_desc' | 'milk_asc' | 'alpha_asc' | 'discrepancy';

export default function BMCDashboard() {
  const { user } = useAuth();
  const { 
    bmcs, 
    booths, 
    bmcDeliveries, 
    discrepancyCases, 
    getBmcStats,
    getSocietyDetailedStats,
    bmcReceipts,
    societyIncomeRecords 
  } = useAavinStore();
  const { colors } = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();

  // Responsive layout: 2 columns on mobile (<768px), 4 columns on web/desktop (>=768px)
  const isWeb = Platform.OS === 'web';
  const isWebOrDesktop = (isWeb && width >= 768) || width >= 992;
  const numCols = isWebOrDesktop ? 4 : 2;
  const overviewCardWidth = (isWeb
    ? (isWebOrDesktop ? 'calc(25% - 8px)' : 'calc(50% - 6px)')
    : Math.floor((width - 32 - (numCols - 1) * 10) / numCols)) as any;

  // Responsive grid layout for feeder society cards: 1 col mobile, 2 col tablet, 3 col desktop
  const isDesktop = width >= 1150;
  const isTablet = width >= 720 && width < 1150;
  const societyCardWidth = (isWeb
    ? (isDesktop ? 'calc(33.333% - 8px)' : (isTablet ? 'calc(50% - 6px)' : '100%'))
    : (isDesktop ? Math.floor((width - 32 - 16) / 3) : (isTablet ? Math.floor((width - 32 - 12) / 2) : '100%'))) as any;

  // Compact summary card width: 4 cols on desktop/tablet, 2 cols on mobile
  const summaryMetricWidth = (isWeb
    ? (width >= 850 ? 'calc(25% - 9px)' : 'calc(50% - 6px)')
    : (width >= 850 ? Math.floor((width - 32 - 27) / 4) : Math.floor((width - 32 - 10) / 2))) as any;

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [societyFilter, setSocietyFilter] = useState<SocietyFilter>('all');
  const [selectedVillage, setSelectedVillage] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SocietySort>('milk_desc');

  const bmcId = user?.associatedId || 'BMC001';
  const bmc = bmcs.find(b => b.id === bmcId) || bmcs[0];
  const assignedBooths = booths.filter(b => b.assignedBmcId === bmc.id);

  const stats = getBmcStats(bmc.id);
  const deliveries = bmcDeliveries.filter(d => d.bmcId === bmc.id);
  const pendingArrivals = deliveries.filter(d => d.status === 'pending_arrival');
  const discrepancies = discrepancyCases.filter(c => c.bmcId === bmc.id);
  const openDiscrepancies = discrepancies.filter(
    c => c.status === 'open' || c.status === 'under_investigation' || c.status === 'escalated_to_union'
  );

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 300);
  };

  // Filtered assigned societies with detailed stats
  const processedSocieties = useMemo(() => {
    return assignedBooths.map(society => {
      const detail = getSocietyDetailedStats(society.id);
      const delivery = deliveries.find(d => d.boothId === society.id && d.collectionDate === '2026-10-12');
      return {
        ...society,
        detail,
        hasPendingDelivery: delivery?.status === 'pending_arrival',
        isSubmitted: delivery?.status !== undefined && delivery?.status !== 'pending_arrival',
        hasDiscrepancy: detail.unresolvedDiscrepanciesCount > 0 || detail.reconciliationStatus === 'variance',
      };
    });
  }, [assignedBooths, deliveries, getSocietyDetailedStats]);

  const villages = useMemo(() => {
    return Array.from(new Set(assignedBooths.map(b => b.village).filter(Boolean)));
  }, [assignedBooths]);

  const filteredSocieties = useMemo(() => {
    let result = processedSocieties.filter(s => {
      // Search
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        s.name.toLowerCase().includes(q) || 
        s.code.toLowerCase().includes(q) || 
        s.village.toLowerCase().includes(q) ||
        s.taluk.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      // Location / Village filter
      if (selectedVillage !== 'all' && s.village !== selectedVillage) return false;

      // Filter chips
      if (societyFilter === 'active') return s.detail.isActive;
      if (societyFilter === 'inactive') return !s.detail.isActive;
      if (societyFilter === 'pending') return s.hasPendingDelivery;
      if (societyFilter === 'submitted') return s.isSubmitted;
      if (societyFilter === 'discrepancy') return s.hasDiscrepancy;
      if (societyFilter === 'high_yield') return s.detail.dailyMilk >= 400;
      if (societyFilter === 'low_yield') return s.detail.dailyMilk < 400;

      return true;
    });

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'milk_desc') return b.detail.dailyMilk - a.detail.dailyMilk;
      if (sortBy === 'milk_asc') return a.detail.dailyMilk - b.detail.dailyMilk;
      if (sortBy === 'alpha_asc') return a.name.localeCompare(b.name);
      if (sortBy === 'discrepancy') {
        return (b.detail.unresolvedDiscrepanciesCount - a.detail.unresolvedDiscrepanciesCount) ||
               (Math.abs(b.detail.differenceLitres) - Math.abs(a.detail.differenceLitres));
      }
      return 0;
    });

    return result;
  }, [processedSocieties, searchQuery, selectedVillage, societyFilter, sortBy]);

  // Operations & Governance Overview: dynamic n-cards configuration
  interface OverviewCardItem {
    id: string;
    title: string;
    subtitle: string;
    value: string | number;
    valueSecondary?: string;
    valueColor?: string;
    icon: React.ComponentProps<typeof Ionicons>['name'];
    iconColor: string;
    badgeText?: string;
    badgeBg?: string;
    badgeColor?: string;
    onPress: () => void;
  }

  const summaryCards: OverviewCardItem[] = useMemo(() => [
    {
      id: 'registered_societies',
      icon: 'business',
      iconColor: colors.primary,
      value: stats.registeredBoothsCount,
      title: 'Registered Societies',
      subtitle: 'Feeder societies assigned',
      onPress: () => setSocietyFilter('all'),
    },
    {
      id: 'active_status',
      icon: 'radio',
      iconColor: '#16A34A',
      badgeText: `${stats.activeBoothsCount} Active`,
      badgeBg: '#DCFCE7',
      badgeColor: '#166534',
      value: stats.activeBoothsCount,
      valueSecondary: `/ ${stats.inactiveBoothsCount} Inactive`,
      title: 'Active / Inactive Status',
      subtitle: 'Supplying this cycle',
      onPress: () => setSocietyFilter(societyFilter === 'active' ? 'inactive' : 'active'),
    },
    {
      id: 'today_collected',
      icon: 'water',
      iconColor: '#0284C7',
      value: `${stats.todayCollected.toFixed(1)} L`,
      valueColor: '#0284C7',
      title: 'Total Milk Collected Today',
      subtitle: 'Society weigh scales',
      onPress: () => router.push('/(bmc)/reports'),
    },
    {
      id: 'today_received',
      icon: 'flask',
      iconColor: colors.primary,
      value: `${stats.todayReceived.toFixed(1)} L`,
      valueColor: colors.primary,
      title: 'Milk Received at BMC',
      subtitle: 'Chilling flow meter verified',
      onPress: () => router.push('/(bmc)/receive-milk'),
    },
    {
      id: 'dispatched_to_union',
      icon: 'arrow-up-circle',
      iconColor: '#7C3AED',
      value: `${stats.todayDispatchedToUnion.toFixed(1)} L`,
      valueColor: '#7C3AED',
      title: 'Reported to Union',
      subtitle: 'Consolidated submissions',
      onPress: () => router.push('/(bmc)/submit-union-report'),
    },
    {
      id: 'net_discrepancy',
      icon: 'swap-vertical',
      iconColor: stats.totalDifference > 0 ? '#DC2626' : '#16A34A',
      badgeText: stats.totalDifference > 0 ? 'Variance' : 'Reconciled',
      badgeBg: stats.totalDifference > 0 ? '#FEE2E2' : '#DCFCE7',
      badgeColor: stats.totalDifference > 0 ? '#991B1B' : '#166534',
      value: stats.totalDifference > 0 ? `-${stats.totalDifference.toFixed(1)} L` : '0.0 L',
      valueColor: stats.totalDifference > 0 ? '#DC2626' : '#16A34A',
      title: 'Net Discrepancy Litres',
      subtitle: 'Difference requiring review',
      onPress: () => router.push('/(bmc)/investigations'),
    },
    {
      id: 'recorded_income',
      icon: 'wallet',
      iconColor: '#059669',
      value: `₹${stats.totalRecordedIncome.toLocaleString('en-IN')}`,
      valueColor: '#059669',
      title: 'Recorded Society Income',
      subtitle: 'Total ledger transactions',
      onPress: () => router.push('/(bmc)/society-income'),
    },
    {
      id: 'submitted_to_union',
      icon: 'receipt',
      iconColor: '#2563EB',
      value: `₹${stats.totalSubmittedToUnionIncome.toLocaleString('en-IN')}`,
      valueColor: '#2563EB',
      title: 'Amount Reported to Union',
      subtitle: 'In submitted BMC receipts',
      onPress: () => router.push('/(bmc)/submit-union-report'),
    },
    {
      id: 'pending_reports',
      icon: 'hourglass',
      iconColor: '#D97706',
      badgeText: stats.pendingDeliveriesCount > 0 ? 'Pending' : 'Done',
      badgeBg: stats.pendingDeliveriesCount > 0 ? '#FEF3C7' : '#F1F5F9',
      badgeColor: stats.pendingDeliveriesCount > 0 ? '#B45309' : '#475569',
      value: stats.pendingDeliveriesCount,
      valueColor: stats.pendingDeliveriesCount > 0 ? '#D97706' : colors.text,
      title: 'Pending Society Reports',
      subtitle: 'Dispatches awaiting intake',
      onPress: () => router.push('/(bmc)/receive-milk'),
    },
    {
      id: 'union_signoff',
      icon: 'shield-checkmark',
      iconColor: '#4338CA',
      value: stats.reportsAwaitingUnionCount,
      valueColor: '#4338CA',
      title: 'Awaiting Union Sign-Off',
      subtitle: 'Under review by Union GM',
      onPress: () => router.push('/(bmc)/submit-union-report'),
    },
  ], [stats, societyFilter, colors, router]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <DemoHeader 
        title={bmc.name}
        subtitle={`${assignedBooths.length} Feeder Societies • Chilling Capacity: ${bmc.capacityLitres.toLocaleString()} L`}
      />

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Urgent Action Banners */}
        {pendingArrivals.length > 0 && (
          <View style={[styles.alertBanner, { backgroundColor: '#E0F2FE', borderColor: '#38BDF8' }]}>
            <Ionicons name="time" size={24} color="#0284C7" />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={[Typography.headline, { color: '#0369A1', fontWeight: '800' }]}>
                {pendingArrivals.length} Society Delivery Awaiting Measurement
              </Text>
              <Text style={[Typography.caption1, { color: '#0284C7', marginTop: 2 }]}>
                {pendingArrivals[0].boothName} dispatched {pendingArrivals[0].declaredDispatchQuantity} L. Weigh-scale intake pending.
              </Text>
            </View>
            <Button
              title="Measure"
              size="sm"
              onPress={() => router.push('/(bmc)/receive-milk')}
            />
          </View>
        )}

        {openDiscrepancies.length > 0 && (
          <View style={[styles.alertBanner, { backgroundColor: '#FEF2F2', borderColor: '#EF4444' }]}>
            <Ionicons name="alert-circle" size={24} color="#DC2626" />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={[Typography.headline, { color: '#B91C1C', fontWeight: '800' }]}>
                ⚠️ {openDiscrepancies.length} Active Discrepancy Case(s)
              </Text>
              <Text style={[Typography.caption1, { color: '#991B1B', marginTop: 2 }]}>
                Variance detected between Society dispatch receipt and BMC flow meter.
              </Text>
            </View>
            <Button
              title="Audit"
              variant="destructive"
              size="sm"
              onPress={() => router.push('/(bmc)/investigations')}
            />
          </View>
        )}

        {/* Signature Hero Dark Navy Card with Assets bmc.png Background & Dark Overlay */}
        <ImageBackground
          source={require('../../assets/bmc.png')}
          style={styles.heroNavyCard}
          imageStyle={styles.heroBgImage}
          resizeMode="cover"
        >
          {/* Dark Color Layer above image */}
          <View style={styles.darkOverlayLayer}>
            <View style={styles.heroCardHeaderRow}>
              <View style={styles.heroHeaderPill}>
                <Text style={styles.heroHeaderPillText}>BMC Intake Volume ›</Text>
              </View>
              <View style={[styles.heroStatusBadge, { backgroundColor: stats.totalDifference > 0 ? '#DC2626' : '#16A34A' }]}>
                <Text style={styles.heroStatusBadgeText}>
                  {stats.totalDifference > 0 ? '⚠️ VARIANCE DETECTED' : '✓ BALANCED'}
                </Text>
              </View>
            </View>

            <Text style={styles.heroBalanceNumber}>
              {stats.todayReceived.toFixed(1)} <Text style={{ fontSize: 20, fontWeight: '600' }}>Litres</Text>
            </Text>

            <View style={styles.heroSubRow}>
              <View style={[styles.growthPill, { backgroundColor: stats.totalDifference > 0 ? 'rgba(220, 38, 38, 0.2)' : 'rgba(22, 163, 74, 0.2)' }]}>
                <Text style={[styles.growthPillText, { color: stats.totalDifference > 0 ? '#F87171' : '#4ADE80' }]}>
                  {stats.totalDifference > 0 ? `-${stats.totalDifference.toFixed(1)} L Diff` : '100% Reconciled'}
                </Text>
              </View>
              <Text style={styles.heroSubText}>
                Society Declared: {stats.todayDeclared.toFixed(1)} L • Income: ₹{stats.totalRecordedIncome.toLocaleString('en-IN')}
              </Text>
            </View>
          </View>
        </ImageBackground>

        {/* Section 2: Requirement #2 — Ten Summary Metric Cards */}
        <View style={styles.sectionTitleRow}>
          <Text style={[Typography.headline, { color: colors.text, fontWeight: '800' }]}>
            📊 Operations & Governance Overview
          </Text>
          <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
            Real-time Database Audit
          </Text>
        </View>

        <View style={styles.tenCardsGrid}>
          {summaryCards.map((card) => (
            <Pressable 
              key={card.id}
              style={[styles.tenCardWrapper, { width: overviewCardWidth }]} 
              onPress={card.onPress}
            >
              <Card style={styles.tenCard}>
                <View style={styles.tenCardTop}>
                  <Ionicons name={card.icon} size={18} color={card.iconColor} />
                  {card.badgeText ? (
                    <View style={[styles.pillBadge, { backgroundColor: card.badgeBg }]}>
                      <Text style={[styles.pillText, { color: card.badgeColor }]}>{card.badgeText}</Text>
                    </View>
                  ) : (
                    <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                  )}
                </View>
                <Text style={[styles.tenCardNumber, card.valueColor ? { color: card.valueColor } : null]}>
                  {card.value} {card.valueSecondary ? <Text style={{ fontSize: 13, color: colors.textMuted }}>{card.valueSecondary}</Text> : null}
                </Text>
                <Text style={[Typography.caption1, { color: colors.text, fontWeight: '700' }]}>
                  {card.title}
                </Text>
                <Text style={[Typography.caption2, { color: colors.textMuted }]}>
                  {card.subtitle}
                </Text>
              </Card>
            </Pressable>
          ))}
        </View>

        {/* Section 3: Redesigned Assigned Feeder Societies Directory */}
        <View style={styles.sectionHeaderWithAction}>
          <View>
            <Text style={[Typography.headline, { color: colors.text, fontWeight: '800' }]}>
              🏢 Assigned Feeder Societies
            </Text>
            <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
              Real-time intake tracking, reconciliation, and financial status for assigned cooperatives
            </Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button
              title="📊 Compare"
              size="sm"
              variant="outline"
              onPress={() => router.push('/(bmc)/society-comparison')}
            />
            <Button
              title="+ Income"
              size="sm"
              variant="outline"
              onPress={() => router.push('/(bmc)/society-income')}
            />
          </View>
        </View>

        {/* 4 Compact Summary Cards */}
        <View style={styles.compactSummaryGrid}>
          <Pressable 
            style={[styles.compactSummaryCardWrapper, { width: summaryMetricWidth }]}
            onPress={() => setSocietyFilter('all')}
          >
            <Card style={[styles.compactSummaryCard, societyFilter === 'all' && { borderColor: colors.primary }]}>
              <View style={styles.compactSummaryCardTop}>
                <Ionicons name="business" size={16} color={colors.primary} />
                <View style={[styles.pillBadge, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.pillText, { color: colors.primary }]}>Total</Text>
                </View>
              </View>
              <Text style={[styles.compactSummaryValue, { color: colors.text }]}>{assignedBooths.length}</Text>
              <Text style={[Typography.caption2, { color: colors.textSecondary, fontWeight: '600' }]}>Assigned Societies</Text>
            </Card>
          </Pressable>

          <Pressable 
            style={[styles.compactSummaryCardWrapper, { width: summaryMetricWidth }]}
            onPress={() => setSocietyFilter('active')}
          >
            <Card style={[styles.compactSummaryCard, societyFilter === 'active' && { borderColor: '#16A34A' }]}>
              <View style={styles.compactSummaryCardTop}>
                <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
                <View style={[styles.pillBadge, { backgroundColor: '#DCFCE7' }]}>
                  <Text style={[styles.pillText, { color: '#166534' }]}>{stats.inactiveBoothsCount} inactive</Text>
                </View>
              </View>
              <Text style={[styles.compactSummaryValue, { color: '#16A34A' }]}>{stats.activeBoothsCount}</Text>
              <Text style={[Typography.caption2, { color: colors.textSecondary, fontWeight: '600' }]}>Active Societies</Text>
            </Card>
          </Pressable>

          <Pressable 
            style={[styles.compactSummaryCardWrapper, { width: summaryMetricWidth }]}
            onPress={() => setSocietyFilter('pending')}
          >
            <Card style={[styles.compactSummaryCard, societyFilter === 'pending' && { borderColor: '#D97706' }]}>
              <View style={styles.compactSummaryCardTop}>
                <Ionicons name="hourglass" size={16} color="#D97706" />
                <View style={[styles.pillBadge, { backgroundColor: '#FEF3C7' }]}>
                  <Text style={[styles.pillText, { color: '#B45309' }]}>Awaiting</Text>
                </View>
              </View>
              <Text style={[styles.compactSummaryValue, { color: '#D97706' }]}>{stats.pendingDeliveriesCount}</Text>
              <Text style={[Typography.caption2, { color: colors.textSecondary, fontWeight: '600' }]}>Reports Pending</Text>
            </Card>
          </Pressable>

          <Pressable 
            style={[styles.compactSummaryCardWrapper, { width: summaryMetricWidth }]}
            onPress={() => setSocietyFilter('discrepancy')}
          >
            <Card style={[styles.compactSummaryCard, societyFilter === 'discrepancy' && { borderColor: '#DC2626' }]}>
              <View style={styles.compactSummaryCardTop}>
                <Ionicons name="alert-circle" size={16} color="#DC2626" />
                <View style={[styles.pillBadge, { backgroundColor: stats.totalDifference > 0 ? '#FEE2E2' : '#DCFCE7' }]}>
                  <Text style={[styles.pillText, { color: stats.totalDifference > 0 ? '#991B1B' : '#166534' }]}>
                    {stats.totalDifference > 0 ? `${stats.totalDifference.toFixed(1)}L var` : 'Reconciled'}
                  </Text>
                </View>
              </View>
              <Text style={[styles.compactSummaryValue, { color: stats.activeDiscrepanciesCount > 0 ? '#DC2626' : '#16A34A' }]}>
                {stats.activeDiscrepanciesCount}
              </Text>
              <Text style={[Typography.caption2, { color: colors.textSecondary, fontWeight: '600' }]}>Discrepancy Review</Text>
            </Card>
          </Pressable>
        </View>

        {/* Search Bar */}
        <View style={[styles.searchBox, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search by society name, code, unique ID, or village..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <Pressable onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>

        {/* Location / Village Filter Pills */}
        {villages.length > 0 && (
          <View style={styles.filterGroupRow}>
            <Text style={[Typography.caption2, { color: colors.textMuted, fontWeight: '700', alignSelf: 'center', marginRight: 4 }]}>
              LOCATION:
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterPillsContainer}>
              <Pressable
                style={[
                  styles.filterPill,
                  selectedVillage === 'all' && { backgroundColor: colors.primary, borderColor: colors.primary },
                  selectedVillage !== 'all' && { backgroundColor: colors.card, borderColor: colors.border }
                ]}
                onPress={() => setSelectedVillage('all')}
              >
                <Text style={[Typography.caption2, { fontWeight: '700' }, selectedVillage === 'all' ? { color: '#FFFFFF' } : { color: colors.textSecondary }]}>
                  All Locations ({assignedBooths.length})
                </Text>
              </Pressable>
              {villages.map(v => {
                const count = assignedBooths.filter(b => b.village === v).length;
                const isSelected = selectedVillage === v;
                return (
                  <Pressable
                    key={v}
                    style={[
                      styles.filterPill,
                      isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
                      !isSelected && { backgroundColor: colors.card, borderColor: colors.border }
                    ]}
                    onPress={() => setSelectedVillage(isSelected ? 'all' : v)}
                  >
                    <Text style={[Typography.caption2, { fontWeight: '700' }, isSelected ? { color: '#FFFFFF' } : { color: colors.textSecondary }]}>
                      📍 {v} ({count})
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Status / Category Filter Pills */}
        <View style={styles.filterGroupRow}>
          <Text style={[Typography.caption2, { color: colors.textMuted, fontWeight: '700', alignSelf: 'center', marginRight: 4 }]}>
            STATUS:
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterPillsContainer}>
            {[
              { id: 'all', label: `All (${assignedBooths.length})` },
              { id: 'active', label: `Active (${stats.activeBoothsCount})` },
              { id: 'inactive', label: `Inactive (${stats.inactiveBoothsCount})` },
              { id: 'pending', label: `Reports Pending (${stats.pendingDeliveriesCount})` },
              { id: 'submitted', label: `Submitted Today` },
              { id: 'discrepancy', label: `Discrepancies (${stats.activeDiscrepanciesCount})` },
              { id: 'high_yield', label: `High Yield (≥400L)` },
              { id: 'low_yield', label: `Low Yield (<400L)` },
            ].map(f => {
              const isActive = societyFilter === f.id;
              return (
                <Pressable
                  key={f.id}
                  style={[
                    styles.filterPill,
                    isActive && { backgroundColor: colors.primary, borderColor: colors.primary },
                    !isActive && { backgroundColor: colors.card, borderColor: colors.border }
                  ]}
                  onPress={() => setSocietyFilter(f.id as SocietyFilter)}
                >
                  <Text style={[
                    Typography.caption2,
                    { fontWeight: '700' },
                    isActive ? { color: '#FFFFFF' } : { color: colors.textSecondary }
                  ]}>
                    {f.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Sort Controls & Active Results Summary */}
        <View style={styles.sortAndCountRow}>
          <Text style={[Typography.caption2, { color: colors.textSecondary, fontWeight: '700' }]}>
            Showing {filteredSocieties.length} of {assignedBooths.length} societies
            {(searchQuery || societyFilter !== 'all' || selectedVillage !== 'all') ? ' (Filtered)' : ''}
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[Typography.caption2, { color: colors.textMuted }]}>Sort:</Text>
            <Pressable
              style={[styles.sortButton, sortBy === 'milk_desc' && styles.sortButtonActive]}
              onPress={() => setSortBy('milk_desc')}
            >
              <Text style={[styles.sortButtonText, sortBy === 'milk_desc' && styles.sortButtonTextActive]}>Milk ↓</Text>
            </Pressable>
            <Pressable
              style={[styles.sortButton, sortBy === 'milk_asc' && styles.sortButtonActive]}
              onPress={() => setSortBy('milk_asc')}
            >
              <Text style={[styles.sortButtonText, sortBy === 'milk_asc' && styles.sortButtonTextActive]}>Milk ↑</Text>
            </Pressable>
            <Pressable
              style={[styles.sortButton, sortBy === 'alpha_asc' && styles.sortButtonActive]}
              onPress={() => setSortBy('alpha_asc')}
            >
              <Text style={[styles.sortButtonText, sortBy === 'alpha_asc' && styles.sortButtonTextActive]}>A-Z</Text>
            </Pressable>
            <Pressable
              style={[styles.sortButton, sortBy === 'discrepancy' && styles.sortButtonActive]}
              onPress={() => setSortBy('discrepancy')}
            >
              <Text style={[styles.sortButtonText, sortBy === 'discrepancy' && styles.sortButtonTextActive]}>Discrepancy</Text>
            </Pressable>

            {(searchQuery || societyFilter !== 'all' || selectedVillage !== 'all') && (
              <Pressable 
                onPress={() => { setSearchQuery(''); setSocietyFilter('all'); setSelectedVillage('all'); setSortBy('milk_desc'); }}
                style={styles.clearFilterButton}
              >
                <Text style={styles.clearFilterText}>Reset</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Responsive Societies Grid */}
        {filteredSocieties.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Ionicons name="search-outline" size={40} color={colors.textMuted} />
            <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700', marginTop: 10 }]}>
              No Societies Found
            </Text>
            <Text style={[Typography.caption2, { color: colors.textSecondary, textAlign: 'center', marginTop: 4, maxWidth: 360 }]}>
              No assigned feeder societies match your search query "{searchQuery}" or the active filters.
            </Text>
            <Button
              title="Reset All Filters"
              size="sm"
              variant="outline"
              style={{ marginTop: 14 }}
              onPress={() => { setSearchQuery(''); setSocietyFilter('all'); setSelectedVillage('all'); setSortBy('milk_desc'); }}
            />
          </Card>
        ) : (
          <View style={styles.societiesGrid}>
            {filteredSocieties.map((society) => {
              const detail = society.detail;
              return (
                <View key={society.id} style={[styles.societyCardWrapper, { width: societyCardWidth }]}>
                  <Pressable
                    style={{ flex: 1 }}
                    onPress={() => router.push({ pathname: '/(bmc)/societies/[societyId]', params: { societyId: society.id } })}
                  >
                    <Card style={styles.societyCard}>
                      {/* Card Header: Icon, Name, Status Badge */}
                      <View style={styles.societyCardHeader}>
                        <View style={[styles.societyIconBadge, { backgroundColor: colors.primaryLight }]}>
                          <Ionicons name="business" size={20} color={colors.primary} />
                        </View>

                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <View style={styles.societyNameRow}>
                            <Text style={[Typography.headline, { color: colors.text, fontWeight: '800', flex: 1 }]} numberOfLines={1}>
                              {society.name}
                            </Text>
                            <View style={[styles.statusBadge, { 
                              backgroundColor: detail.isActive ? '#DCFCE7' : '#F1F5F9' 
                            }]}>
                              <Text style={[styles.statusText, { 
                                color: detail.isActive ? '#166534' : '#64748B' 
                              }]}>
                                {detail.isActive ? 'ACTIVE' : 'INACTIVE'}
                              </Text>
                            </View>
                          </View>

                          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
                            <View style={styles.idChip}>
                              <Text style={styles.idChipText}>ID: {society.id}</Text>
                            </View>
                            <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                              Code: {society.code} • 📍 {society.village}, {society.taluk}
                            </Text>
                          </View>

                          <Text style={[Typography.caption2, { color: colors.textMuted, marginTop: 2 }]}>
                            In-Charge: {society.operatorName} • 📞 {society.phone}
                          </Text>
                        </View>
                      </View>

                      {/* Primary Metric: Today's Milk Collection Callout */}
                      <View style={[styles.primaryMetricBanner, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
                        <View style={{ flex: 1 }}>
                          <Text style={[Typography.caption2, { color: colors.primary, fontWeight: '800', letterSpacing: 0.5 }]}>
                            TODAY'S MILK INTAKE
                          </Text>
                          <Text style={[Typography.title2, { color: colors.primary, fontWeight: '900', marginTop: 2 }]}>
                            {detail.dailyMilk > 0 ? `${detail.dailyMilk.toFixed(1)} L` : 'Pending Intake'}
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <View style={[styles.intakeBadge, { backgroundColor: detail.dailyMilk > 0 ? '#DCFCE7' : '#FEF3C7' }]}>
                            <Ionicons 
                              name={detail.dailyMilk > 0 ? "checkmark-circle" : "time-outline"} 
                              size={12} 
                              color={detail.dailyMilk > 0 ? "#166534" : "#B45309"} 
                            />
                            <Text style={[styles.intakeBadgeText, { color: detail.dailyMilk > 0 ? "#166534" : "#B45309" }]}>
                              {detail.dailyMilk > 0 ? 'Received' : 'Pending Arrival'}
                            </Text>
                          </View>
                          <Text style={[Typography.caption2, { color: colors.textMuted, marginTop: 4 }]}>
                            Date: {detail.latestSubmissionDate || '12 Oct 2026'}
                          </Text>
                        </View>
                      </View>

                      {/* Secondary Volume & Financial Metrics Grid */}
                      <View style={[styles.societyVolGrid, { borderTopColor: colors.border }]}>
                        <View style={styles.volCell}>
                          <Text style={[Typography.caption2, { color: colors.textSecondary }]}>THIS MONTH</Text>
                          <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]}>
                            {detail.monthlyTotalMilk.toLocaleString()} L
                          </Text>
                        </View>

                        <View style={styles.volCell}>
                          <Text style={[Typography.caption2, { color: '#7C3AED' }]}>THIS YEAR</Text>
                          <Text style={[Typography.subhead, { color: '#7C3AED', fontWeight: '800' }]}>
                            {detail.yearlyTotalMilk.toLocaleString()} L
                          </Text>
                        </View>

                        <View style={styles.volCell}>
                          <Text style={[Typography.caption2, { color: '#059669' }]}>RECORDED INCOME</Text>
                          <Text style={[Typography.subhead, { color: '#059669', fontWeight: '800' }]}>
                            ₹{detail.totalRecordedIncome.toLocaleString('en-IN')}
                          </Text>
                        </View>
                      </View>

                      {/* Card Footer: Discrepancy & Reporting Indicators + View Details Action */}
                      <View style={[styles.societyFooter, { backgroundColor: '#F8FAFC', borderColor: colors.border }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, flexWrap: 'wrap', gap: 6 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons 
                              name={detail.reconciliationStatus === 'variance' ? 'warning' : 'checkmark-circle'} 
                              size={14} 
                              color={detail.reconciliationStatus === 'variance' ? '#DC2626' : '#16A34A'} 
                            />
                            <Text style={[Typography.caption2, { 
                              color: detail.reconciliationStatus === 'variance' ? '#B91C1C' : '#15803D',
                              fontWeight: '700',
                              marginLeft: 4,
                            }]}>
                              {detail.reconciliationStatus === 'variance' ? 'Discrepancy Review' : 'Reconciled'}
                              {detail.differenceLitres !== 0 ? ` (${detail.differenceLitres > 0 ? '-' : '+'}${Math.abs(detail.differenceLitres).toFixed(1)}L)` : ''}
                            </Text>
                          </View>

                          {society.hasPendingDelivery && (
                            <View style={[styles.miniPendingPill, { backgroundColor: '#FEF3C7' }]}>
                              <Text style={[styles.miniPendingText, { color: '#B45309' }]}>Report Pending</Text>
                            </View>
                          )}
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={[Typography.caption2, { color: colors.primary, fontWeight: '800', marginRight: 2 }]}>
                            View Analytics
                          </Text>
                          <Ionicons name="chevron-forward" size={14} color={colors.primary} />
                        </View>
                      </View>
                    </Card>
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}

        {/* Quick Operations Actions Grid */}
        <View style={styles.actionGrid}>
          <Button
            title="📥 Confirm Milk Received (Intake)"
            size="lg"
            onPress={() => router.push('/(bmc)/receive-milk')}
          />
          <Button
            title="📊 Multi-Society Comparison & Analytics"
            variant="secondary"
            onPress={() => router.push('/(bmc)/society-comparison')}
          />
          <Button
            title="📋 Close Consolidated Report for Union"
            variant="outline"
            onPress={() => router.push('/(bmc)/submit-union-report')}
          />
        </View>
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
    gap: 14,
    paddingBottom: 40,
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  heroNavyCard: {
    borderRadius: 24,
    marginBottom: 4,
    overflow: 'hidden',
    shadowColor: '#071325',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  heroBgImage: {
    borderRadius: 24,
    width: '100%',
    height: '100%',
  },
  darkOverlayLayer: {
    backgroundColor: 'rgba(8, 20, 38, 0.82)',
    padding: 18,
    borderRadius: 24,
    width: '100%',
  },
  heroCardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  heroHeaderPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  heroHeaderPillText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11,
    fontWeight: '700',
  },
  heroStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  heroStatusBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  heroBalanceNumber: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginVertical: 4,
  },
  heroSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  growthPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginRight: 8,
  },
  growthPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  heroSubText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontWeight: '600',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  sectionHeaderWithAction: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  tenCardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tenCardWrapper: {
    flexGrow: 0,
    flexShrink: 0,
  },
  tenCard: {
    padding: 12,
    borderRadius: 14,
  },
  tenCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  tenCardNumber: {
    fontSize: 19,
    fontWeight: '900',
    marginVertical: 4,
  },
  pillBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pillText: {
    fontSize: 9,
    fontWeight: '800',
  },
  compactSummaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  compactSummaryCardWrapper: {
    flexGrow: 0,
    flexShrink: 0,
  },
  compactSummaryCard: {
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  compactSummaryCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  compactSummaryValue: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 2,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
  },
  filterGroupRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterPillsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  sortAndCountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 4,
  },
  sortButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  sortButtonActive: {
    backgroundColor: '#00529B',
  },
  sortButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  sortButtonTextActive: {
    color: '#FFFFFF',
  },
  clearFilterButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    marginLeft: 4,
  },
  clearFilterText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DC2626',
  },
  societiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  societyCardWrapper: {
    flexGrow: 0,
    flexShrink: 0,
  },
  societyCard: {
    padding: 14,
    borderRadius: 16,
    flex: 1,
  },
  societyCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  societyIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  societyNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 6,
  },
  idChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  idChipText: {
    fontSize: 10,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#475569',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '800',
  },
  primaryMetricBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    marginTop: 10,
    borderWidth: 1,
  },
  intakeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  intakeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  societyVolGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    marginTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  volCell: {
    alignItems: 'flex-start',
  },
  societyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  miniPendingPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  miniPendingText: {
    fontSize: 9,
    fontWeight: '800',
  },
  emptyCard: {
    padding: 28,
    alignItems: 'center',
    borderRadius: 16,
  },
  actionGrid: {
    gap: 10,
    marginTop: 6,
  },
});
