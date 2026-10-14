import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  useWindowDimensions,
  Platform,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import Svg, {
  Rect,
  Text as SvgText,
  Line,
  Path,
  Circle,
  G,
  ClipPath,
  Defs,
  LinearGradient as SvgGradient,
  Stop,
} from 'react-native-svg';
import { useRouter } from 'expo-router';
import { useAavinStore } from '../../store/AavinStoreContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from '../../context/LanguageContext';
import { Typography } from '../../constants/Typography';
import { DemoHeader } from '../../components/DemoHeader';
import { Button } from '../../components/ui/Button';
import { Ionicons } from '@expo/vector-icons';

export default function UnionDashboard() {
  const { user } = useAuth();
  const {
    union,
    bmcs,
    booths,
    bmcReceipts,
    discrepancyCases,
    bmcDeliveries,
    farmers,
    cows,
    getUnionStats,
    addInvestigationNote,
    reviewBmcReceipt,
  } = useAavinStore();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();

  // Responsive breakpoints
  const isDesktop = width >= 1060;
  const isTablet = width >= 700 && width < 1060;
  const isMobile = width < 700;

  const [refreshing, setRefreshing] = useState(false);
  const [selectedDayIdx, setSelectedDayIdx] = useState<number>(2); // Default to Wed (middle)
  const [activeTabFilter, setActiveTabFilter] = useState<'Overview' | 'Booths & Low Yield' | 'MCP Chilling' | 'Herd & Cows' | 'Payments'>('Overview');
  const [statusMode, setStatusMode] = useState<'sum' | 'percent'>('sum');
  const [trendRange, setTrendRange] = useState<'Daily' | 'Weekly'>('Daily');

  // Directive Modal state (Input Fields & Actions)
  const [showDirectiveModal, setShowDirectiveModal] = useState(false);
  const [targetBmcId, setTargetBmcId] = useState(bmcs[0]?.id || 'bmc-1');
  const [directiveCategory, setDirectiveCategory] = useState<'Low Yield Inquiry' | 'Transit Shrinkage' | 'Quality Audit' | 'Temperature Breach'>('Low Yield Inquiry');
  const [directivePriority, setDirectivePriority] = useState<'Normal' | 'High' | 'Critical GM Order'>('High');
  const [directiveText, setDirectiveText] = useState('');

  // Quick Sign-Off Modal state
  const [showSignOffModal, setShowSignOffModal] = useState(false);
  const [selectedReceiptId, setSelectedReceiptId] = useState('');
  const [signOffNotes, setSignOffNotes] = useState('');

  const stats = getUnionStats();
  const netTransitDiscrepancy = Math.max(0, stats.totalBoothDispatched - stats.totalBmcReceived);
  const retentionPercent =
    stats.totalBoothDispatched > 0
      ? Math.min(100, Math.max(0, (stats.totalBmcReceived / stats.totalBoothDispatched) * 100))
      : 100;
  const transitLossPercent = Math.max(0, 100 - retentionPercent);

  // Financial & Today's Income Analysis
  const todayLitres = stats.totalBmcReceived > 0 ? stats.totalBmcReceived : 825.0;
  const procurementRatePerLitre = 40.5; // Average Aavin procurement rate ₹/Litre based on 4.35% Fat & 8.52% SNF
  const todayIncomeRevenue = todayLitres * procurementRatePerLitre;
  const farmerPayoutShare = todayIncomeRevenue * 0.85; // 85% directly to farmers via DBT
  const logisticsShare = todayIncomeRevenue * 0.10; // 10% tanker logistics
  const societyIncentiveShare = todayIncomeRevenue * 0.05; // 5% society handling commission

  // Low-Yielding Booths Analysis compared with Previous Month
  const boothComparisons = [
    {
      id: 'BOOTH003',
      code: 'AAVIN-CC-MDU-03',
      name: 'Vadipatti Milk Collection Booth',
      operator: 'K. Balu',
      phone: '9842000012',
      assignedBmc: 'Vadipatti Bulk Milk Cooler',
      currentMonthLitres: 310.0,
      prevMonthLitres: 440.0,
      changePercent: -29.5,
      isLowest: true,
      reason: t('union.lowestVolumeReason', 'Lowest volume in district • 6 cows in dry lactation period'),
    },
    {
      id: 'BOOTH002',
      code: 'AAVIN-CC-MDU-02',
      name: 'Navinipatti Village Collection Booth #2',
      operator: 'S. Muthu',
      phone: '9842000011',
      assignedBmc: 'Madurai East BMC',
      currentMonthLitres: 680.0,
      prevMonthLitres: 790.0,
      changePercent: -13.9,
      isLowest: false,
      reason: t('union.seasonalDropReason', 'Seasonal drop in evening yield • Prompt payout needed'),
    },
    {
      id: 'BOOTH001',
      code: 'AAVIN-CC-MDU-01',
      name: 'Melur Primary Milk Producers Co-op',
      operator: 'P. Kannan',
      phone: '9842000005',
      assignedBmc: 'Madurai East BMC',
      currentMonthLitres: 1280.0,
      prevMonthLitres: 1150.0,
      changePercent: 11.3,
      isLowest: false,
      reason: t('union.topProducerReason', 'Top producer • High crossbred yield & 100% farmer attendance'),
    },
  ];

  const lowestBooth = boothComparisons.find(b => b.isLowest) || boothComparisons[0];

  // Cows under quarantine / withdrawal
  const quarantineCowsCount = cows.filter(c => c.activeWithdrawal?.hasActiveWithdrawal).length;

  // 5 Days for Productivity Trend matching reference Mon..Fri with real milk inflow data
  const daysData = [
    { day: 'Mon', dayKey: 'Mon', activeL: '738.5', incomeK: '29.9', inflow: 738.5, loss: 1.5, fat: 4.3, snf: 8.5, blueY: 52, pinkY: 88 },
    { day: 'Tue', dayKey: 'Tue', activeL: '765.0', incomeK: '30.9', inflow: 765.0, loss: 0.0, fat: 4.4, snf: 8.5, blueY: 34, pinkY: 92 },
    { day: 'Wed', dayKey: 'Wed', activeL: todayLitres.toFixed(0), incomeK: (todayIncomeRevenue / 1000).toFixed(1), inflow: todayLitres, loss: netTransitDiscrepancy, fat: 4.4, snf: 8.6, blueY: 38, pinkY: 80 },
    { day: 'Thu', dayKey: 'Thu', activeL: '754.0', incomeK: '30.5', inflow: 754.0, loss: 1.0, fat: 4.2, snf: 8.6, blueY: 60, pinkY: 72 },
    { day: 'Fri', dayKey: 'Fri', activeL: '808.0', incomeK: '32.7', inflow: 808.0, loss: 2.0, fat: 4.3, snf: 8.5, blueY: 46, pinkY: 76 },
  ];

  const currentTrendPoint = daysData[selectedDayIdx] || daysData[2];

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 400);
  };

  // Dispatch Directive Action Handler
  const handleDispatchDirective = () => {
    if (!directiveText.trim()) {
      Alert.alert(
        t('union.directiveRequiredTitle', 'Directive Required'),
        t('union.directiveRequiredMsg', 'Please enter specific audit instructions or investigation directives.')
      );
      return;
    }

    const targetBmc = bmcs.find(b => b.id === targetBmcId) || bmcs[0];
    const relatedCase = discrepancyCases.find(c => c.bmcId === targetBmcId && c.status !== 'resolved');

    if (relatedCase) {
      addInvestigationNote(
        relatedCase.id,
        `[UNION ${directivePriority.toUpperCase()} DIRECTIVE • ${directiveCategory}]: ${directiveText.trim()}`,
        user?.fullName || 'Dr. S. Sundaram (General Manager)',
        'Union Executive Order'
      );
    }

    Alert.alert(
      t('union.directiveDispatchedTitle', 'Directive Dispatched'),
      t(
        'union.directiveDispatchedMsg',
        {
          bmc: targetBmc?.name || 'BMC',
          category: directiveCategory,
          priority: directivePriority,
          author: user?.fullName || 'General Manager',
        },
        `Executive Directive issued to ${targetBmc?.name || 'BMC'}.\n\nCategory: ${directiveCategory}\nPriority: ${directivePriority}\nAuthorized by: ${user?.fullName || 'General Manager'}`
      )
    );

    setDirectiveText('');
    setShowDirectiveModal(false);
  };

  // Quick GM Sign-off Action Handler
  const handleQuickSignOff = () => {
    if (!selectedReceiptId) return;
    try {
      reviewBmcReceipt(
        selectedReceiptId,
        signOffNotes.trim() || t('union.approvedAuditedGm', 'Approved and audited by Union General Manager.'),
        user?.fullName || 'Dr. S. Sundaram (General Manager)'
      );
      Alert.alert(
        t('union.signOffRecordedTitle', 'Sign-Off Recorded'),
        t('union.signOffRecordedMsg', { id: selectedReceiptId }, `Receipt #${selectedReceiptId} successfully signed off and ledger reconciled.`)
      );
      setShowSignOffModal(false);
      setSignOffNotes('');
    } catch (err: any) {
      Alert.alert(t('common.error', 'Error'), err.message || t('union.signOffError', 'Could not sign off receipt.'));
    }
  };

  // Render Diagonal Striped Rect for Progress Capsule
  const renderHatchPattern = (
    id: string,
    widthVal: number,
    heightVal: number,
    rxVal: number,
    color: string,
    bgColor: string,
    lineGap: number = 7
  ) => {
    const lines = [];
    const span = widthVal + heightVal;
    for (let x = -heightVal; x <= span; x += lineGap) {
      lines.push(
        <Line
          key={x}
          x1={x}
          y1={heightVal}
          x2={x + heightVal}
          y2={0}
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
        />
      );
    }

    return (
      <G>
        <ClipPath id={id}>
          <Rect x={0} y={0} width={widthVal} height={heightVal} rx={rxVal} />
        </ClipPath>
        <G clipPath={`url(#${id})`}>
          <Rect x={0} y={0} width={widthVal} height={heightVal} fill={bgColor} rx={rxVal} />
          {lines}
        </G>
      </G>
    );
  };

  const totalDeliveries = bmcDeliveries.length > 0 ? bmcDeliveries.length : 12;
  const verifiedDeliveries = Math.max(0, totalDeliveries - stats.activeDiscrepanciesCount);

  const filterTabs = [
    { key: 'Overview', label: t('union.filterOverview', 'Overview') },
    { key: 'Booths & Low Yield', label: t('union.filterBooths', 'Booths & Low Yield') },
    { key: 'MCP Chilling', label: t('union.filterMcp', 'MCP Chilling') },
    { key: 'Herd & Cows', label: t('union.filterHerd', 'Herd & Cows') },
    { key: 'Payments', label: t('union.filterPayments', 'Payments') },
  ] as const;

  return (
    <View style={styles.outerContainer}>
      {/* Retain DemoHeader (Layout Header is completely preserved) */}
      <DemoHeader
        title={t('union.title', 'Aavin Union Headquarters')}
        subtitle={t('union.subtitle', { name: union.name }, `${union.name} • Madurai District Co-op`)}
      />

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={[
          styles.scrollContent,
          isDesktop && styles.desktopScrollContent,
          isTablet && styles.tabletScrollContent,
        ]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.mainDashboardCanvas, isDesktop && styles.desktopDashboardCanvas]}>

          {/* TOP SECTION: Sub-header with Title, Nav Filter Tabs & "+ New Directive" CTA */}
          <View style={[styles.sectionTitleRow, isMobile && styles.mobileSectionTitleRow]}>
            <View style={styles.titleTextContainer}>
              <Text style={styles.dashboardMainTitle}>{t('union.operationsAnalytics', 'Union Operations & Analytics')}</Text>
              <Text style={styles.dashboardSubtitle}>
                {t('union.operationsSubtitle', "Madurai Co-operative Milk Producers' Union • Real-time Procurement Income & Herd Audit")}
              </Text>
            </View>

            <View style={[styles.headerControlsRow, isMobile && styles.mobileHeaderControlsRow]}>
              {/* Filter Tabs */}
              {!isMobile && (
                <View style={styles.filterPillsGroup}>
                  {filterTabs.map((tab) => {
                    const isActive = activeTabFilter === tab.key;
                    return (
                      <Pressable
                        key={tab.key}
                        onPress={() => setActiveTabFilter(tab.key as any)}
                        style={[styles.filterPill, isActive && styles.filterPillActive]}
                      >
                        <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
                          {tab.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {/* Action Pill Button */}
              <Pressable
                style={styles.newTaskBtn}
                onPress={() => setShowDirectiveModal(true)}
              >
                <Ionicons name="add" size={17} color="#FFFFFF" />
                <Text style={styles.newTaskBtnText}>{t('union.newDirective', 'New Directive')}</Text>
              </Pressable>
            </View>
          </View>

          {/* URGENT EXECUTIVE AUDIT BANNER */}
          {(stats.activeDiscrepanciesCount > 0 || stats.pendingReceiptsCount > 0) && (
            <View style={styles.alertNoticeBanner}>
              <View style={styles.alertNoticeLeft}>
                <View style={styles.alertNoticeIconBox}>
                  <Ionicons name="warning-outline" size={18} color="#DC2626" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.alertNoticeTitle}>
                    {t('union.executiveAuditRequired', { count: stats.activeDiscrepanciesCount }, `EXECUTIVE AUDIT REQUIRED: ${stats.activeDiscrepanciesCount} Discrepancy Case(s)`)}
                  </Text>
                  <Text style={styles.alertNoticeDesc}>
                    {t('union.pendingReceiptsDesc', { count: stats.pendingReceiptsCount, shrinkage: netTransitDiscrepancy.toFixed(1) }, `${stats.pendingReceiptsCount} BMC daily receipt(s) awaiting GM sign-off • Net shrinkage: ${netTransitDiscrepancy.toFixed(1)} L.`)}
                  </Text>
                </View>
              </View>

              <View style={styles.alertBannerButtonsRow}>
                {stats.pendingReceiptsCount > 0 && (
                  <Pressable
                    style={styles.signOffBtnMini}
                    onPress={() => {
                      const firstPending = bmcReceipts.find(r => r.status === 'sent_to_union');
                      if (firstPending) {
                        setSelectedReceiptId(firstPending.id);
                        setShowSignOffModal(true);
                      } else {
                        router.push('/(union)/receipt-review' as any);
                      }
                    }}
                  >
                    <Ionicons name="checkmark-done" size={13} color="#15803D" />
                    <Text style={styles.signOffBtnMiniText}>{t('union.signOff', 'Sign-Off')}</Text>
                  </Pressable>
                )}

                <Pressable
                  style={styles.alertNoticeActionBtn}
                  onPress={() => router.push('/(union)/discrepancies' as any)}
                >
                  <Text style={styles.alertNoticeActionText}>{t('union.auditCases', 'Audit Cases')}</Text>
                  <Ionicons name="arrow-forward" size={13} color="#FFFFFF" />
                </Pressable>
              </View>
            </View>
          )}

          {/* =========================================================================
              ROW 1: THREE COGNIFY METRIC CARDS (Kept in a Single Row on Mobile!)
              Card 1: Active Societies | Card 2: Today's Milk & Revenue | Card 3: Active Discrepancies
             ========================================================================= */}
          <View style={[styles.topCardsGrid, isDesktop && styles.desktopTopCardsGrid, isTablet && styles.tabletTopCardsGrid]}>
            
            {/* CARD 1: GREEN - ACTIVE SOCIETIES (DCS) */}
            <View style={[styles.cognifyCard, styles.kpiCardItem, isDesktop && styles.desktopKpiCardItem]}>
              <View style={styles.cardTopHeaderRow}>
                <View style={[styles.kpiIconBadge, isDesktop && styles.desktopKpiIconBadge, { backgroundColor: '#22C55E' }]}>
                  <Ionicons name="storefront" size={isDesktop ? 20 : 16} color="#FFFFFF" />
                </View>
                <Pressable
                  style={[styles.arrowCircleBtn, isDesktop && styles.desktopArrowCircleBtn]}
                  onPress={() => router.push('/(union)/bmc-monitoring' as any)}
                >
                  <Ionicons name="arrow-up" size={isDesktop ? 17 : 13} color="#475569" style={{ transform: [{ rotate: '45deg' }] }} />
                </Pressable>
              </View>

              <Text style={styles.cardKpiLabel} numberOfLines={1}>{t('union.activeSocieties', 'Active Societies')}</Text>

              <View style={styles.statValueWithTrendRow}>
                <Text style={[styles.cardBigNumber, isDesktop && styles.desktopCardBigNumber]}>
                  {booths.length > 0 ? booths.length : 24}
                </Text>
                <View style={styles.trendPillDown}>
                  <Ionicons name="arrow-up" size={isDesktop ? 13 : 10} color="#16A34A" />
                  <Text style={[styles.trendTextDown, { color: '#16A34A' }]}>100%</Text>
                </View>
              </View>

              <View style={[styles.cardFooterRow, isDesktop && styles.desktopCardFooterRow]}>
                <View style={styles.dynamicLabelRow}>
                  <Ionicons name="infinite-outline" size={isDesktop ? 15 : 12} color="#94A3B8" />
                  <Text style={styles.dynamicLabelText} numberOfLines={1}>{t('union.districtNetwork', 'District Network')}</Text>
                </View>
                <View style={styles.periodPill}>
                  <Text style={styles.periodPillText}>{t('union.online', 'Online')}</Text>
                </View>
              </View>
            </View>

            {/* CARD 2: BLUE - TODAY'S LITRES & PROCUREMENT INCOME */}
            <View style={[styles.cognifyCard, styles.kpiCardItem, isDesktop && styles.desktopKpiCardItem]}>
              <View style={styles.cardTopHeaderRow}>
                <View style={[styles.kpiIconBadge, isDesktop && styles.desktopKpiIconBadge, { backgroundColor: '#3B82F6' }]}>
                  <Ionicons name="cash-outline" size={isDesktop ? 20 : 16} color="#FFFFFF" />
                </View>
                <Pressable
                  style={[styles.arrowCircleBtn, isDesktop && styles.desktopArrowCircleBtn]}
                  onPress={() => router.push('/(union)/receipt-review' as any)}
                >
                  <Ionicons name="arrow-up" size={isDesktop ? 17 : 13} color="#475569" style={{ transform: [{ rotate: '45deg' }] }} />
                </Pressable>
              </View>

              <Text style={styles.cardKpiLabel} numberOfLines={1}>{t('union.todaysValue', "Today's Value")}</Text>

              <View style={styles.statValueWithTrendRow}>
                <Text style={[styles.cardBigNumber, isDesktop && styles.desktopCardBigNumber]}>
                  ₹{(todayIncomeRevenue / 1000).toFixed(1)}k
                </Text>
                <View style={styles.trendPillUp}>
                  <Ionicons name="water" size={isDesktop ? 12 : 9} color="#10B981" />
                  <Text style={styles.trendTextUp}>{todayLitres.toFixed(0)}L</Text>
                </View>
              </View>

              <View style={[styles.cardFooterRow, isDesktop && styles.desktopCardFooterRow]}>
                <View style={styles.dynamicLabelRow}>
                  <Ionicons name="infinite-outline" size={isDesktop ? 15 : 12} color="#94A3B8" />
                  <Text style={styles.dynamicLabelText} numberOfLines={1}>
                    {t('union.ratePerLitre', { rate: procurementRatePerLitre }, `@₹${procurementRatePerLitre}/L`)}
                  </Text>
                </View>
                <View style={styles.periodPill}>
                  <Text style={styles.periodPillText}>{t('union.today', 'Today')}</Text>
                </View>
              </View>
            </View>

            {/* CARD 3: PINK - ACTIVE DISCREPANCIES & LOW-YIELD ALERT */}
            <View style={[styles.cognifyCard, styles.kpiCardItem, isDesktop && styles.desktopKpiCardItem]}>
              <View style={styles.cardTopHeaderRow}>
                <View style={[styles.kpiIconBadge, isDesktop && styles.desktopKpiIconBadge, { backgroundColor: '#EC4899' }]}>
                  <Ionicons name="trending-down-outline" size={isDesktop ? 20 : 16} color="#FFFFFF" />
                </View>
                <Pressable
                  style={[styles.arrowCircleBtn, isDesktop && styles.desktopArrowCircleBtn]}
                  onPress={() => router.push('/(union)/discrepancies' as any)}
                >
                  <Ionicons name="arrow-up" size={isDesktop ? 17 : 13} color="#475569" style={{ transform: [{ rotate: '45deg' }] }} />
                </Pressable>
              </View>

              <Text style={styles.cardKpiLabel} numberOfLines={1}>{t('union.lowYieldBooth', 'Low-Yield Booth')}</Text>

              <View style={styles.statValueWithTrendRow}>
                <Text style={[styles.cardBigNumber, isDesktop && styles.desktopCardBigNumber, { color: '#DC2626' }]}>
                  -29.5%
                </Text>
                <View style={[styles.trendPillDown, { backgroundColor: '#FEE2E2' }]}>
                  <Text style={[styles.trendTextDown, { color: '#DC2626' }]}>
                    Vadipatti
                  </Text>
                </View>
              </View>

              <View style={[styles.cardFooterRow, isDesktop && styles.desktopCardFooterRow]}>
                <Text style={styles.manageCustText} numberOfLines={1}>{t('union.vsPrevMonth', 'vs Prev Month')}</Text>
                <View style={styles.avatarCluster}>
                  <Pressable 
                    style={styles.avatarAddBtn}
                    onPress={() => {
                      setDirectiveCategory('Low Yield Inquiry');
                      setShowDirectiveModal(true);
                    }}
                  >
                    <Ionicons name="alert" size={isDesktop ? 13 : 10} color="#DC2626" />
                  </Pressable>
                  <View style={[styles.miniAvatarCircle, { backgroundColor: '#FDE047', zIndex: 2 }]}>
                    <Text style={styles.avatarInitials}>👨‍💼</Text>
                  </View>
                  <View style={[styles.miniAvatarCircle, { backgroundColor: '#FED7AA', marginLeft: -6, zIndex: 3 }]}>
                    <Text style={styles.avatarInitials}>👩‍🔬</Text>
                  </View>
                </View>
              </View>
            </View>

          </View>

          {/* =========================================================================
              NEW FEATURE 1: TODAY'S TOTAL LITRES & INCOME ANALYSIS (FINANCIAL SUMMARY)
             ========================================================================= */}
          <View style={[styles.cognifyCard, styles.incomeAnalyticsCard]}>
            <View style={styles.incomeHeaderRow}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={styles.incomeBadgeIcon}>
                    <Ionicons name="cash" size={18} color="#16A34A" />
                  </View>
                  <Text style={styles.analyticsTitle}>{t('union.incomeAnalysisTitle', "Today's Milk Procurement & Income Analysis")}</Text>
                </View>
                <Text style={styles.analyticsSubtitle}>
                  {t('union.incomeAnalysisSubtitle', { litres: todayLitres.toFixed(1), rate: procurementRatePerLitre.toFixed(2) }, `Realized District Value based on ${todayLitres.toFixed(1)} L Intake @ ₹${procurementRatePerLitre.toFixed(2)}/L Aavin Tariff`)}
                </Text>
              </View>

              <View style={styles.incomeStatBadge}>
                <Text style={styles.incomeStatBadgeText}>₹{todayIncomeRevenue.toLocaleString('en-IN')}</Text>
                <Text style={styles.incomeStatBadgeSub}>{t('union.grossProcurementValue', 'Gross Procurement Value')}</Text>
              </View>
            </View>

            {/* Income Distribution Breakdown */}
            <View style={styles.incomeBreakdownGrid}>
              {/* Box 1: Farmer DBT Payout (85%) */}
              <View style={[styles.incomeBoxItem, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
                <View style={styles.incomeBoxTop}>
                  <Ionicons name="people" size={16} color="#16A34A" />
                  <Text style={[styles.incomeBoxTag, { color: '#15803D' }]}>{t('union.farmerShareTag', '85% Share')}</Text>
                </View>
                <Text style={styles.incomeBoxValue}>₹{farmerPayoutShare.toLocaleString('en-IN')}</Text>
                <Text style={styles.incomeBoxLabel}>{t('union.farmerPayoutTitle', 'Direct Farmer DBT Payout')}</Text>
                <Text style={styles.incomeBoxSub}>{t('union.farmerPayoutSub', 'Direct credit to Canara / SBI accounts')}</Text>
              </View>

              {/* Box 2: Tanker Logistics (10%) */}
              <View style={[styles.incomeBoxItem, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
                <View style={styles.incomeBoxTop}>
                  <Ionicons name="bus" size={16} color="#2563EB" />
                  <Text style={[styles.incomeBoxTag, { color: '#1D4ED8' }]}>{t('union.logisticsShareTag', '10% Share')}</Text>
                </View>
                <Text style={styles.incomeBoxValue}>₹{logisticsShare.toLocaleString('en-IN')}</Text>
                <Text style={styles.incomeBoxLabel}>{t('union.logisticsTitle', 'Insulated Tanker Logistics')}</Text>
                <Text style={styles.incomeBoxSub}>{t('union.logisticsSub', 'Transit allowance & chill transport')}</Text>
              </View>

              {/* Box 3: Society Handling Commission (5%) */}
              <View style={[styles.incomeBoxItem, { backgroundColor: '#FAF5FF', borderColor: '#E9D5FF' }]}>
                <View style={styles.incomeBoxTop}>
                  <Ionicons name="business" size={16} color="#9333EA" />
                  <Text style={[styles.incomeBoxTag, { color: '#7E22CE' }]}>{t('union.societyShareTag', '5% Share')}</Text>
                </View>
                <Text style={styles.incomeBoxValue}>₹{societyIncentiveShare.toLocaleString('en-IN')}</Text>
                <Text style={styles.incomeBoxLabel}>{t('union.societyCommissionTitle', 'DCS Handling Commission')}</Text>
                <Text style={styles.incomeBoxSub}>{t('union.societyCommissionSub', 'Booth operator testing allowance')}</Text>
              </View>
            </View>
          </View>

          {/* =========================================================================
              NEW FEATURE 2: BOOTH LOW-YIELD COMPARATIVE ANALYSIS (VERSUS PREVIOUS MONTH)
             ========================================================================= */}
          <View style={[styles.cognifyCard, styles.lowYieldCard]}>
            <View style={styles.sectionHeaderRow}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="trending-down" size={20} color="#DC2626" />
                  <Text style={styles.analyticsTitle}>{t('union.lowYieldTitle', 'Booth Low-Yield Analysis vs Previous Month')}</Text>
                </View>
                <Text style={styles.analyticsSubtitle}>
                  {t('union.lowYieldSubtitle', 'Comparative volume deficit audit identifying collection centers below benchmark')}
                </Text>
              </View>

              <View style={styles.lowYieldAlertBadge}>
                <Text style={styles.lowYieldAlertBadgeText}>{t('union.deficitAlertBadge', { count: 1 }, '1 Deficit Alert')}</Text>
              </View>
            </View>

            {/* Critical Low-Yield Warning Banner */}
            <View style={styles.lowYieldWarningBanner}>
              <Ionicons name="alert-circle" size={24} color="#DC2626" />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.lowYieldWarningTitle}>
                  {t('union.lowestProducingBooth', { name: lowestBooth.name }, `LOWEST PRODUCING BOOTH: ${lowestBooth.name}`)}
                </Text>
                <Text style={styles.lowYieldWarningDesc}>
                  {t('union.lowestProducingDesc', {
                    current: lowestBooth.currentMonthLitres,
                    prev: lowestBooth.prevMonthLitres,
                    percent: lowestBooth.changePercent,
                    reason: lowestBooth.reason,
                  }, `Supplied only ${lowestBooth.currentMonthLitres} L this month vs ${lowestBooth.prevMonthLitres} L last month (${lowestBooth.changePercent}% Drop). Reason: ${lowestBooth.reason}.`)}
                </Text>
              </View>

              <Pressable
                style={styles.lowYieldInquiryBtn}
                onPress={() => {
                  setDirectiveCategory('Low Yield Inquiry');
                  setDirectiveText(t('union.executiveInquiryText', { name: lowestBooth.name, percent: lowestBooth.changePercent }, `Executive Inquiry for ${lowestBooth.name}: Explain volume drop of ${lowestBooth.changePercent}% compared to previous month average.`));
                  setShowDirectiveModal(true);
                }}
              >
                <Text style={styles.lowYieldInquiryBtnText}>{t('union.issueInquiry', 'Issue Inquiry')}</Text>
              </Pressable>
            </View>

            {/* Comparative Breakdown Table for All Booths */}
            <View style={styles.boothCompareList}>
              {boothComparisons.map((b) => {
                const isNegative = b.changePercent < 0;
                return (
                  <View key={b.id} style={styles.boothCompareItem}>
                    <View style={styles.boothCompareLeft}>
                      <View style={[styles.boothCodeBadge, { backgroundColor: isNegative ? '#FEE2E2' : '#DCFCE7' }]}>
                        <Text style={[styles.boothCodeBadgeText, { color: isNegative ? '#DC2626' : '#15803D' }]}>
                          {b.code}
                        </Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.boothCompareName}>{b.name}</Text>
                        <Text style={styles.boothCompareSub}>
                          {t('union.operator', 'Operator')}: {b.operator} • {t('union.inCharge', 'In-Charge')}: {b.assignedBmc}
                        </Text>
                      </View>
                    </View>

                    {/* Volume Comparison Meters */}
                    <View style={styles.boothCompareMeters}>
                      <View style={styles.meterCol}>
                        <Text style={styles.meterLabel}>{t('union.thisMonth', 'This Month')}</Text>
                        <Text style={[styles.meterValue, { color: isNegative ? '#DC2626' : '#0F172A' }]}>
                          {b.currentMonthLitres.toFixed(1)} L
                        </Text>
                      </View>

                      <View style={styles.meterDivider} />

                      <View style={styles.meterCol}>
                        <Text style={styles.meterLabel}>{t('union.prevMonth', 'Prev Month')}</Text>
                        <Text style={styles.meterValue}>{b.prevMonthLitres.toFixed(1)} L</Text>
                      </View>

                      <View style={[styles.variancePercentBadge, { backgroundColor: isNegative ? '#FEF2F2' : '#F0FDF4' }]}>
                        <Ionicons 
                          name={isNegative ? "arrow-down" : "arrow-up"} 
                          size={12} 
                          color={isNegative ? "#DC2626" : "#16A34A"} 
                        />
                        <Text style={[styles.variancePercentText, { color: isNegative ? "#DC2626" : "#16A34A" }]}>
                          {Math.abs(b.changePercent)}%
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* =========================================================================
              NEW FEATURE 3: FULL ACCESS PORTAL FOR BOOTH, MCP, FARMER/COWS, PAYMENTS
             ========================================================================= */}
          <View style={[styles.cognifyCard, styles.fullAccessContainer]}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.analyticsTitle}>{t('union.executiveAccessHub', 'District Executive Access Hub')}</Text>
                <Text style={styles.analyticsSubtitle}>
                  {t('union.executiveAccessSubtitle', 'Full administrative command for Booths, MCP Coolers, Farmers, Cattle Herd & DBT Payments')}
                </Text>
              </View>
              <View style={styles.fullAccessRolePill}>
                <Ionicons name="shield-checkmark" size={13} color="#7C3AED" />
                <Text style={styles.fullAccessRoleText}>{t('union.gmHighPrivilege', 'GM High Privilege')}</Text>
              </View>
            </View>

            <View style={styles.fullAccessGrid}>
              {/* Access 1: Booths / Collection Centers */}
              <Pressable
                style={styles.accessTileCard}
                onPress={() => router.push('/(booth)' as any)}
              >
                <View style={[styles.accessTileIcon, { backgroundColor: '#E0F2FE' }]}>
                  <Ionicons name="storefront" size={22} color="#0284C7" />
                </View>
                <Text style={styles.accessTileTitle}>{t('union.villageBooths', 'Village Booths')}</Text>
                <Text style={styles.accessTileStat}>{t('union.societiesCount', { count: booths.length }, `${booths.length} Societies`)}</Text>
                <Text style={styles.accessTileDesc}>{t('union.boothsTileDesc', 'Record milk, sessions, dispatch manifests')}</Text>
                <View style={styles.accessTileLinkRow}>
                  <Text style={styles.accessTileLinkText}>{t('union.manageBooths', 'Manage Booths')}</Text>
                  <Ionicons name="arrow-forward" size={13} color="#0284C7" />
                </View>
              </Pressable>

              {/* Access 2: MCP / Bulk Milk Coolers */}
              <Pressable
                style={styles.accessTileCard}
                onPress={() => router.push('/(union)/bmc-monitoring' as any)}
              >
                <View style={[styles.accessTileIcon, { backgroundColor: '#DCFCE7' }]}>
                  <Ionicons name="snow" size={22} color="#16A34A" />
                </View>
                <Text style={styles.accessTileTitle}>{t('union.mcpChillingHubs', 'MCP Chilling Hubs')}</Text>
                <Text style={styles.accessTileStat}>{t('union.bulkCoolersCount', { count: bmcs.length }, `${bmcs.length} Bulk Coolers`)}</Text>
                <Text style={styles.accessTileDesc}>{t('union.mcpTileDesc', '3.8°C temperature telemetry, flow meters')}</Text>
                <View style={styles.accessTileLinkRow}>
                  <Text style={[styles.accessTileLinkText, { color: '#16A34A' }]}>{t('union.inspectMcps', 'Inspect MCPs')}</Text>
                  <Ionicons name="arrow-forward" size={13} color="#16A34A" />
                </View>
              </Pressable>

              {/* Access 3: Farmers & Cows Registry */}
              <Pressable
                style={styles.accessTileCard}
                onPress={() => router.push('/(veterinary)/cattle-registry' as any)}
              >
                <View style={[styles.accessTileIcon, { backgroundColor: '#FDF2F8' }]}>
                  <Ionicons name="heart" size={22} color="#EC4899" />
                </View>
                <Text style={styles.accessTileTitle}>{t('union.herdPashuAadhaar', 'Herd & Pashu Aadhaar')}</Text>
                <Text style={styles.accessTileStat}>{t('union.taggedCowsCount', { count: cows.length }, `${cows.length} Tagged Cows`)}</Text>
                <Text style={styles.accessTileDesc}>
                  {t('union.herdTileDesc', {
                    farmers: farmers.length,
                    withdrawal: quarantineCowsCount > 0 ? t('union.inWithdrawal', { count: quarantineCowsCount }, `${quarantineCowsCount} in withdrawal`) : t('union.zeroHold', 'Zero hold'),
                  }, `${farmers.length} Farmers • ${quarantineCowsCount > 0 ? `${quarantineCowsCount} in withdrawal` : 'Zero hold'}`)}
                </Text>
                <View style={styles.accessTileLinkRow}>
                  <Text style={[styles.accessTileLinkText, { color: '#EC4899' }]}>{t('union.viewHerd', 'View Herd')}</Text>
                  <Ionicons name="arrow-forward" size={13} color="#EC4899" />
                </View>
              </Pressable>

              {/* Access 4: Payments & DBT Ledger */}
              <Pressable
                style={styles.accessTileCard}
                onPress={() => router.push('/(farmer)/payments' as any)}
              >
                <View style={[styles.accessTileIcon, { backgroundColor: '#FAF5FF' }]}>
                  <Ionicons name="wallet" size={22} color="#9333EA" />
                </View>
                <Text style={styles.accessTileTitle}>{t('union.dbtPayments', 'DBT Payments')}</Text>
                <Text style={styles.accessTileStat}>
                  {t('union.todayAmount', { amount: `₹${(todayIncomeRevenue / 1000).toFixed(1)}k` }, `₹${(todayIncomeRevenue / 1000).toFixed(1)}k Today`)}
                </Text>
                <Text style={styles.accessTileDesc}>{t('union.paymentsTileDesc', 'Bank account IFSC, milk supply credit passbook')}</Text>
                <View style={styles.accessTileLinkRow}>
                  <Text style={[styles.accessTileLinkText, { color: '#9333EA' }]}>{t('union.reviewPayments', 'Review Payments')}</Text>
                  <Ionicons name="arrow-forward" size={13} color="#9333EA" />
                </View>
              </Pressable>
            </View>
          </View>

          {/* =========================================================================
              ANALYTICS CARDS: RETENTION, BATCHES & TRENDS
             ========================================================================= */}
          <View style={[styles.bottomCardsGrid, isDesktop && styles.desktopBottomCardsGrid, isTablet && styles.tabletBottomCardsGrid]}>
            
            {/* CARD 4: YIELD RETENTION & PHYSICAL TWIN STAGES */}
            <View style={[styles.cognifyCard, styles.analyticsCardItem]}>
              <View style={styles.analyticsHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.analyticsTitle}>{t('union.transitRetentionTitle', 'Transit Yield Retention')}</Text>
                  <Text style={styles.taskProgressBigNum}>{retentionPercent.toFixed(1)}%</Text>
                  <Text style={styles.analyticsSubtitle}>
                    {t('union.toleranceShrinkage', { shrinkage: netTransitDiscrepancy.toFixed(1) }, `Tolerance ±0.50% • Shrinkage: ${netTransitDiscrepancy.toFixed(1)} L`)}
                  </Text>
                </View>

                <View style={styles.taskCategoriesCol}>
                  <View style={styles.taskCategoryItem}>
                    <View style={[styles.categoryMiniIcon, { backgroundColor: '#FDF2F8' }]}>
                      <Ionicons name="water" size={13} color="#EC4899" />
                    </View>
                    <View>
                      <Text style={styles.categoryNameText}>{t('union.avgFat', 'Avg FAT')}</Text>
                      <Text style={styles.categoryPercentText}>4.35%</Text>
                    </View>
                  </View>

                  <View style={styles.taskCategoryItem}>
                    <View style={[styles.categoryMiniIcon, { backgroundColor: '#EFF6FF' }]}>
                      <Ionicons name="analytics" size={13} color="#3B82F6" />
                    </View>
                    <View>
                      <Text style={styles.categoryNameText}>{t('union.avgSnf', 'Avg SNF')}</Text>
                      <Text style={styles.categoryPercentText}>8.52%</Text>
                    </View>
                  </View>

                  <View style={styles.taskCategoryItem}>
                    <View style={[styles.categoryMiniIcon, { backgroundColor: '#F0FDF4' }]}>
                      <Ionicons name="thermometer" size={13} color="#22C55E" />
                    </View>
                    <View>
                      <Text style={styles.categoryNameText}>{t('union.chilling', 'Chilling')}</Text>
                      <Text style={styles.categoryPercentText}>3.8°C</Text>
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.cylinderChartContainer}>
                <Svg width="100%" height={160} viewBox="0 0 280 160">
                  <Defs>
                    <SvgGradient id="pinkHeadGrad" x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0" stopColor="#F43F5E" />
                      <Stop offset="1" stopColor="#EC4899" />
                    </SvgGradient>
                    <SvgGradient id="blueHeadGrad" x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0" stopColor="#60A5FA" />
                      <Stop offset="1" stopColor="#3B82F6" />
                    </SvgGradient>
                    <SvgGradient id="greenHeadGrad" x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0" stopColor="#4ADE80" />
                      <Stop offset="1" stopColor="#22C55E" />
                    </SvgGradient>
                  </Defs>

                  <G transform="translate(10, 10)">
                    <G transform="translate(0, 36)">
                      {renderHatchPattern('pinkPillHatch', 66, 104, 18, '#F472B6', '#FDF2F8', 6)}
                    </G>
                    <Rect x={0} y={0} width={66} height={42} rx={18} fill="url(#pinkHeadGrad)" />
                    <SvgText x={33} y={26} fill="#FFFFFF" fontSize="11" fontWeight="800" textAnchor="middle">
                      {stats.totalBoothDispatched.toFixed(0)}L
                    </SvgText>
                  </G>

                  <G transform="translate(90, 40)">
                    <G transform="translate(0, 34)">
                      {renderHatchPattern('bluePillHatch', 82, 76, 18, '#60A5FA', '#EFF6FF', 6)}
                    </G>
                    <Rect x={0} y={0} width={82} height={40} rx={18} fill="url(#blueHeadGrad)" />
                    <SvgText x={41} y={25} fill="#FFFFFF" fontSize="11" fontWeight="800" textAnchor="middle">
                      {stats.totalBmcReceived.toFixed(0)}L
                    </SvgText>
                  </G>

                  <G transform="translate(186, 38)">
                    <G transform="translate(0, 34)">
                      {renderHatchPattern('greenPillHatch', 84, 78, 18, '#4ADE80', '#F0FDF4', 6)}
                    </G>
                    <Rect x={0} y={0} width={84} height={40} rx={18} fill="url(#greenHeadGrad)" />
                    <SvgText x={42} y={25} fill="#FFFFFF" fontSize="11" fontWeight="800" textAnchor="middle">
                      {stats.totalReportedByBmcReceipts.toFixed(0)}L
                    </SvgText>
                  </G>
                </Svg>
              </View>
            </View>

            {/* CARD 5: BATCH DELIVERY RECONCILIATION */}
            <View style={[styles.cognifyCard, styles.analyticsCardItem]}>
              <View style={styles.analyticsHeaderRow}>
                <Text style={styles.analyticsTitle}>{t('union.batchReconciliation', 'Batch Reconciliation')}</Text>
                
                <View style={styles.sumPercentTogglePill}>
                  <Pressable
                    onPress={() => setStatusMode('sum')}
                    style={[styles.togglePillBtn, statusMode === 'sum' && styles.togglePillBtnActive]}
                  >
                    <Text style={[styles.togglePillText, statusMode === 'sum' && styles.togglePillTextActive]}>
                      Σ
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setStatusMode('percent')}
                    style={[styles.togglePillBtn, statusMode === 'percent' && styles.togglePillBtnActive]}
                  >
                    <Text style={[styles.togglePillText, statusMode === 'percent' && styles.togglePillTextActive]}>
                      %
                    </Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.donutContainer}>
                <Svg width="100%" height={150} viewBox="0 0 240 150">
                  <G transform="rotate(-90 120 75)">
                    <Circle
                      cx="120"
                      cy="75"
                      r="50"
                      fill="none"
                      stroke="#22C55E"
                      strokeWidth="11"
                      strokeDasharray="145 314"
                      strokeDashoffset="75"
                      strokeLinecap="round"
                    />
                    <Circle
                      cx="120"
                      cy="75"
                      r="50"
                      fill="none"
                      stroke="#EC4899"
                      strokeWidth="11"
                      strokeDasharray="72 314"
                      strokeDashoffset="-75"
                      strokeLinecap="round"
                    />
                    <Circle
                      cx="120"
                      cy="75"
                      r="50"
                      fill="none"
                      stroke="#3B82F6"
                      strokeWidth="11"
                      strokeDasharray="74 314"
                      strokeDashoffset="-155"
                      strokeLinecap="round"
                    />
                  </G>

                  <SvgText x="120" y="72" fill="#0F172A" fontSize="28" fontWeight="800" textAnchor="middle">
                    {totalDeliveries}
                  </SvgText>
                  <SvgText x="120" y="89" fill="#94A3B8" fontSize="11" fontWeight="600" textAnchor="middle">
                    {t('union.batches', 'batches')}
                  </SvgText>

                  <G transform="translate(36, 12)">
                    <Rect x={0} y={0} width={82} height={22} rx={11} fill="#FFFFFF" stroke="#E2E8F0" strokeWidth={1} />
                    <Circle cx={11} cy={11} r={3} fill="#22C55E" />
                    <SvgText x={20} y={15} fill="#0F172A" fontSize="9.5" fontWeight="700">
                      {verifiedDeliveries} ({retentionPercent.toFixed(0)}%)
                    </SvgText>
                  </G>
                </Svg>
              </View>

              <View style={styles.statusBarsContainer}>
                <View style={styles.statusBarRow}>
                  <Text style={styles.statusBarLabel}>{t('union.balanced', 'Balanced')}</Text>
                  <View style={styles.statusBarTrack}>
                    <Svg width="100%" height={10} viewBox="0 0 160 10">
                      {renderHatchPattern('compHatch', 82, 10, 5, '#16A34A', '#22C55E', 5)}
                    </Svg>
                  </View>
                  <Text style={styles.statusBarCount}>
                    {statusMode === 'sum' ? `${verifiedDeliveries}/${totalDeliveries}` : `${((verifiedDeliveries / totalDeliveries) * 100).toFixed(0)}%`}
                  </Text>
                </View>

                <View style={styles.statusBarRow}>
                  <Text style={styles.statusBarLabel}>{t('union.discrepant', 'Discrepant')}</Text>
                  <View style={styles.statusBarTrack}>
                    <Svg width="100%" height={10} viewBox="0 0 160 10">
                      {renderHatchPattern('progHatch', 28, 10, 5, '#DB2777', '#EC4899', 5)}
                    </Svg>
                  </View>
                  <Text style={styles.statusBarCount}>
                    {statusMode === 'sum' ? `${stats.activeDiscrepanciesCount}/${totalDeliveries}` : `${((stats.activeDiscrepanciesCount / totalDeliveries) * 100).toFixed(0)}%`}
                  </Text>
                </View>

                <View style={styles.statusBarRow}>
                  <Text style={styles.statusBarLabel}>{t('union.pendingGm', 'Pending GM')}</Text>
                  <View style={styles.statusBarTrack}>
                    <Svg width="100%" height={10} viewBox="0 0 160 10">
                      {renderHatchPattern('upcHatch', 52, 10, 5, '#2563EB', '#3B82F6', 5)}
                    </Svg>
                  </View>
                  <Text style={styles.statusBarCount}>
                    {statusMode === 'sum' ? `${stats.pendingReceiptsCount}/${bmcReceipts.length || 1}` : t('statuses.pending', 'Pending')}
                  </Text>
                </View>
              </View>
            </View>

            {/* CARD 6: PRODUCTIVITY & INFLOW TREND */}
            <View style={[styles.cognifyCard, styles.analyticsCardItem]}>
              <View style={styles.analyticsHeaderRow}>
                <Text style={styles.analyticsTitle}>{t('union.districtInflowRevenue', 'District Inflow & Revenue')}</Text>

                <Pressable
                  onPress={() => setTrendRange(trendRange === 'Daily' ? 'Weekly' : 'Daily')}
                  style={styles.dailyDropdownPill}
                >
                  <Ionicons name="calendar-outline" size={13} color="#64748B" />
                  <Text style={styles.dailyDropdownText}>{t(`analytics.periods.${trendRange.toLowerCase()}`, trendRange)}</Text>
                  <Ionicons name="chevron-down" size={12} color="#64748B" />
                </Pressable>
              </View>

              <View style={styles.trendTooltipsHeaderRow}>
                <View style={styles.activeTimePill}>
                  <View style={styles.blueDot} />
                  <Text style={styles.activeTimePillText}>
                    {t('union.inflowLabel', { litres: currentTrendPoint.activeL }, `${currentTrendPoint.activeL} L Inflow`)}
                  </Text>
                </View>
                <View style={styles.pauseTimePill}>
                  <View style={styles.pinkDot} />
                  <Text style={styles.pauseTimePillText}>
                    {t('union.incomeLabel', { income: currentTrendPoint.incomeK }, `₹${currentTrendPoint.incomeK}k Income`)}
                  </Text>
                </View>
              </View>

              <View style={styles.lineChartSvgWrapper}>
                <Svg width="100%" height={110} viewBox="0 0 280 110">
                  <Line x1="10" y1="20" x2="270" y2="20" stroke="#F1F5F9" strokeWidth={1} />
                  <Line x1="10" y1="55" x2="270" y2="55" stroke="#F1F5F9" strokeWidth={1} />
                  <Line x1="10" y1="90" x2="270" y2="90" stroke="#F1F5F9" strokeWidth={1} />

                  {(() => {
                    const selX = 25 + selectedDayIdx * 57.5;
                    return (
                      <Line
                        x1={selX}
                        y1="10"
                        x2={selX}
                        y2="100"
                        stroke="#CBD5E1"
                        strokeWidth={1.5}
                        strokeDasharray="3,3"
                      />
                    );
                  })()}

                  <Path
                    d="M 15 50 C 45 28, 70 45, 95 32 C 120 18, 140 48, 165 30 C 190 15, 215 48, 240 38 C 255 32, 268 40, 275 42"
                    fill="none"
                    stroke="#3B82F6"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                  />

                  <Path
                    d="M 15 88 C 45 92, 70 82, 95 86 C 120 90, 140 70, 165 72 C 190 75, 215 62, 240 70 C 255 75, 268 68, 275 70"
                    fill="none"
                    stroke="#EC4899"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                  />

                  {(() => {
                    const selX = 25 + selectedDayIdx * 57.5;
                    const yBlue = currentTrendPoint.blueY;
                    const yPink = currentTrendPoint.pinkY;
                    return (
                      <G>
                        <Circle cx={selX} cy={yBlue} r={4.5} fill="#3B82F6" stroke="#FFFFFF" strokeWidth={2} />
                        <Circle cx={selX} cy={yPink} r={4.5} fill="#EC4899" stroke="#FFFFFF" strokeWidth={2} />
                      </G>
                    );
                  })()}
                </Svg>
              </View>

              <View style={styles.daysSelectorRow}>
                {daysData.map((d, idx) => {
                  const isSelected = selectedDayIdx === idx;
                  return (
                    <Pressable
                      key={d.day}
                      onPress={() => setSelectedDayIdx(idx)}
                      style={[styles.daySelectorPill, isSelected && styles.daySelectorPillActive]}
                    >
                      <Text style={[styles.daySelectorPillText, isSelected && styles.daySelectorPillTextActive]}>
                        {t(`union.days.${d.dayKey}`, d.day)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.productivityStatsRow}>
                <View>
                  <Text style={styles.prodStatLabel}>{t('union.totalInflow', 'Total Inflow')}</Text>
                  <View style={styles.prodStatNumRow}>
                    <Text style={styles.prodStatValue}>{todayLitres.toFixed(0)} L</Text>
                    <View style={styles.prodTrendGreenPill}>
                      <Ionicons name="arrow-up" size={10} color="#16A34A" />
                      <Text style={styles.prodTrendGreenText}>{retentionPercent.toFixed(0)}%</Text>
                    </View>
                  </View>
                </View>

                <View>
                  <Text style={styles.prodStatLabel}>{t('union.grossIncome', 'Gross Income')}</Text>
                  <View style={styles.prodStatNumRow}>
                    <Text style={styles.prodStatValue}>₹{(todayIncomeRevenue / 1000).toFixed(1)}k</Text>
                    <View style={styles.prodTrendGreenPill}>
                      <Ionicons name="shield-checkmark" size={10} color="#16A34A" />
                      <Text style={styles.prodTrendGreenText}>{t('union.dbt', 'DBT')}</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>

          </View>

          {/* =========================================================================
              SUPPLY CHAIN TWIN LEDGER
             ========================================================================= */}
          <View style={[styles.cognifyCard, styles.supplyChainContainer]}>
            <View style={styles.supplyChainHeader}>
              <View style={styles.chainTitleGroup}>
                <View style={styles.chainIconCircle}>
                  <Ionicons name="git-network-outline" size={18} color="#0284C7" />
                </View>
                <View>
                  <Text style={styles.chainTitleText}>{t('union.supplyChainTitle', 'Supply Chain Stage Reconciliation (Distinct Nodes)')}</Text>
                  <Text style={styles.chainSubtitleText}>
                    {t('union.supplyChainSubtitle', 'Booth declared dispatches and BMC intake measurements represent separate stages of the same milk batch.')}
                  </Text>
                </View>
              </View>

              <View style={[
                styles.retentionPillBadge,
                { backgroundColor: netTransitDiscrepancy === 0 ? '#DCFCE7' : '#FEF3C7' }
              ]}>
                <Ionicons
                  name={netTransitDiscrepancy === 0 ? "checkmark-circle" : "alert-circle"}
                  size={14}
                  color={netTransitDiscrepancy === 0 ? "#15803D" : "#B45309"}
                />
                <Text style={[
                  styles.retentionPillText,
                  { color: netTransitDiscrepancy === 0 ? "#15803D" : "#B45309" }
                ]}>
                  {t('union.yieldRetention', { percent: retentionPercent.toFixed(1) }, `${retentionPercent.toFixed(1)}% Yield Retention`)}
                </Text>
              </View>
            </View>

            <View style={[styles.pipelineRow, isMobile && styles.mobilePipelineCol]}>
              <View style={[styles.pipelineNodeCard, { borderColor: '#BAE6FD', backgroundColor: '#F8FAFC' }]}>
                <View style={styles.nodeHeaderSmall}>
                  <View style={[styles.nodeMiniBadge, { backgroundColor: '#0284C7' }]}>
                    <Text style={styles.nodeMiniBadgeText}>{t('union.stage1Booths', 'STAGE 1: BOOTHS')}</Text>
                  </View>
                  <Ionicons name="storefront" size={15} color="#0284C7" />
                </View>
                <Text style={styles.nodeCardTitle}>{t('union.boothsDispatchedTitle', 'Village Booths Dispatched')}</Text>
                <Text style={styles.nodeCardValue}>{stats.totalBoothDispatched.toFixed(1)} <Text style={styles.nodeCardUnit}>L</Text></Text>
                <Text style={styles.nodeCardSub}>{t('union.assignedSocietiesCount', { count: booths.length }, `${booths.length} Assigned Societies`)}</Text>
              </View>

              <View style={styles.nodeArrowDivider}>
                <Ionicons name="arrow-forward" size={16} color="#94A3B8" />
              </View>

              <View style={[styles.pipelineNodeCard, { borderColor: '#BBF7D0', backgroundColor: '#F8FAFC' }]}>
                <View style={styles.nodeHeaderSmall}>
                  <View style={[styles.nodeMiniBadge, { backgroundColor: '#16A34A' }]}>
                    <Text style={styles.nodeMiniBadgeText}>{t('union.stage2Bmcs', 'STAGE 2: BMCS')}</Text>
                  </View>
                  <Ionicons name="snow" size={15} color="#16A34A" />
                </View>
                <Text style={styles.nodeCardTitle}>{t('union.bmcMeasuredTitle', 'BMC Measured Intake')}</Text>
                <Text style={styles.nodeCardValue}>{stats.totalBmcReceived.toFixed(1)} <Text style={styles.nodeCardUnit}>L</Text></Text>
                <Text style={styles.nodeCardSub}>{t('union.bulkCoolersCount', { count: bmcs.length }, `${bmcs.length} Bulk Coolers`)}</Text>
              </View>

              <View style={styles.nodeArrowDivider}>
                <Ionicons name="arrow-forward" size={16} color="#94A3B8" />
              </View>

              <View style={[styles.pipelineNodeCard, { borderColor: '#E9D5FF', backgroundColor: '#F8FAFC' }]}>
                <View style={styles.nodeHeaderSmall}>
                  <View style={[styles.nodeMiniBadge, { backgroundColor: '#9333EA' }]}>
                    <Text style={styles.nodeMiniBadgeText}>{t('union.stage3Slips', 'STAGE 3: SLIPS')}</Text>
                  </View>
                  <Ionicons name="document-text" size={15} color="#9333EA" />
                </View>
                <Text style={styles.nodeCardTitle}>{t('union.reportedSlipsTitle', 'Reported by BMC Slips')}</Text>
                <Text style={styles.nodeCardValue}>{stats.totalReportedByBmcReceipts.toFixed(1)} <Text style={styles.nodeCardUnit}>L</Text></Text>
                <Text style={styles.nodeCardSub}>
                  {stats.pendingReceiptsCount > 0 ? t('union.pendingSignOffCount', { count: stats.pendingReceiptsCount }, `${stats.pendingReceiptsCount} Pending Sign-Off`) : t('union.allSigned', '100% Signed')}
                </Text>
              </View>
            </View>

            {netTransitDiscrepancy > 0 && (
              <Pressable
                style={styles.inspectDiscrepancyBtn}
                onPress={() => router.push('/(union)/discrepancies' as any)}
              >
                <Ionicons name="search" size={15} color="#FFFFFF" />
                <Text style={styles.inspectDiscrepancyBtnText}>
                  {t('union.auditDiscrepancyBtn', { litres: netTransitDiscrepancy.toFixed(1) }, `Audit ${netTransitDiscrepancy.toFixed(1)} L Discrepancy Case & Tolerance`)}
                </Text>
                <Ionicons name="arrow-forward" size={15} color="#FFFFFF" />
              </Pressable>
            )}
          </View>

        </View>
      </ScrollView>

      {/* =========================================================================
          EXECUTIVE DIRECTIVE INPUT MODAL
         ========================================================================= */}
      <Modal
        visible={showDirectiveModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDirectiveModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentCard}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalMainTitle}>{t('union.dispatchDirectiveTitle', 'Dispatch Executive Directive')}</Text>
                <Text style={styles.modalSubTitle}>{t('union.dispatchDirectiveSubtitle', 'Aavin Madurai District Milk Union Headquarters')}</Text>
              </View>
              <Pressable 
                onPress={() => setShowDirectiveModal(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputFieldLabel}>{t('union.targetBmcLabel', 'Target BMC / Unit')}</Text>
              <View style={styles.bmcSelectorRow}>
                {bmcs.map((b) => {
                  const isSel = targetBmcId === b.id;
                  return (
                    <Pressable
                      key={b.id}
                      onPress={() => setTargetBmcId(b.id)}
                      style={[styles.modalSelectorPill, isSel && styles.modalSelectorPillActive]}
                    >
                      <Text style={[styles.modalSelectorPillText, isSel && styles.modalSelectorPillTextActive]}>
                        {b.name.split(' ')[0]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.inputFieldLabel}>{t('union.directiveCategoryLabel', 'Directive Category')}</Text>
              <View style={styles.bmcSelectorRow}>
                {(['Low Yield Inquiry', 'Transit Shrinkage', 'Quality Audit', 'Temperature Breach'] as const).map((cat) => {
                  const isSel = directiveCategory === cat;
                  const catLabels: Record<typeof cat, string> = {
                    'Low Yield Inquiry': t('union.lowYieldInquiry', 'Low Yield Inquiry'),
                    'Transit Shrinkage': t('union.transitShrinkage', 'Transit Shrinkage'),
                    'Quality Audit': t('union.qualityAudit', 'Quality Audit'),
                    'Temperature Breach': t('union.temperatureBreach', 'Temperature Breach'),
                  };
                  return (
                    <Pressable
                      key={cat}
                      onPress={() => setDirectiveCategory(cat)}
                      style={[styles.modalSelectorPill, isSel && styles.modalSelectorPillActive]}
                    >
                      <Text style={[styles.modalSelectorPillText, isSel && styles.modalSelectorPillTextActive]}>
                        {catLabels[cat]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.inputFieldLabel}>{t('union.priorityLevelLabel', 'Priority Level')}</Text>
              <View style={styles.bmcSelectorRow}>
                {(['Normal', 'High', 'Critical GM Order'] as const).map((p) => {
                  const isSel = directivePriority === p;
                  const pLabels: Record<typeof p, string> = {
                    'Normal': t('union.priorityNormal', 'Normal'),
                    'High': t('union.priorityHigh', 'High'),
                    'Critical GM Order': t('union.priorityCritical', 'Critical GM Order'),
                  };
                  return (
                    <Pressable
                      key={p}
                      onPress={() => setDirectivePriority(p)}
                      style={[
                        styles.modalSelectorPill, 
                        isSel && (p === 'Critical GM Order' ? styles.pillRedActive : styles.modalSelectorPillActive)
                      ]}
                    >
                      <Text style={[styles.modalSelectorPillText, isSel && styles.modalSelectorPillTextActive]}>
                        {pLabels[p]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.inputFieldLabel}>{t('union.executiveInstructionsLabel', 'Executive Instructions & Findings')}</Text>
              <TextInput
                style={styles.modalTextInput}
                placeholder={t('union.directivePlaceholder', 'Enter executive instructions, low yield deficit inquiry, tanker custody seal inspection, or GM order...')}
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={4}
                value={directiveText}
                onChangeText={setDirectiveText}
              />
            </ScrollView>

            <View style={styles.modalFooterActionsRow}>
              <Pressable
                style={styles.modalCancelBtn}
                onPress={() => setShowDirectiveModal(false)}
              >
                <Text style={styles.modalCancelBtnText}>{t('common.cancel', 'Cancel')}</Text>
              </Pressable>

              <Pressable
                style={styles.modalSubmitBtn}
                onPress={handleDispatchDirective}
              >
                <Ionicons name="paper-plane" size={15} color="#FFFFFF" />
                <Text style={styles.modalSubmitBtnText}>{t('union.dispatchDirectiveBtn', 'Dispatch Directive')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* =========================================================================
          QUICK GM SIGN-OFF MODAL
         ========================================================================= */}
      <Modal
        visible={showSignOffModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSignOffModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentCard}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalMainTitle}>{t('union.signOffModalTitle', 'GM Sign-Off & Seal Receipt')}</Text>
                <Text style={styles.modalSubTitle}>{t('union.signOffModalSubtitle', 'Digital Signature for Daily BMC Intake Slip')}</Text>
              </View>
              <Pressable 
                onPress={() => setShowSignOffModal(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </Pressable>
            </View>

            <View style={{ marginVertical: 12 }}>
              <Text style={styles.inputFieldLabel}>{t('union.selectPendingSlip', 'Select Pending Slip')}</Text>
              {bmcReceipts.filter(r => r.status === 'sent_to_union').map((r) => {
                const isSel = selectedReceiptId === r.id;
                return (
                  <Pressable
                    key={r.id}
                    onPress={() => setSelectedReceiptId(r.id)}
                    style={[styles.receiptSelectCard, isSel && styles.receiptSelectCardActive]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.receiptSelectId, isSel && { color: '#0284C7' }]}>
                        {t('union.slipNumber', { id: r.id }, `Slip #${r.id}`)}
                      </Text>
                      <Text style={styles.receiptSelectSub}>
                        {t('union.slipDetails', { name: r.bmcName, qty: r.totalReceivedQuantity }, `BMC: ${r.bmcName} • ${r.totalReceivedQuantity} L`)}
                      </Text>
                    </View>
                    <Ionicons 
                      name={isSel ? "checkmark-circle" : "ellipse-outline"} 
                      size={20} 
                      color={isSel ? "#0284C7" : "#CBD5E1"} 
                    />
                  </Pressable>
                );
              })}

              <Text style={[styles.inputFieldLabel, { marginTop: 12 }]}>{t('union.gmDirectivesLabel', 'GM Audit Directives & Notes')}</Text>
              <TextInput
                style={styles.modalTextInput}
                placeholder={t('union.signOffPlaceholder', 'Audit findings: milk fat compliant, cooling temperature within 4°C, zero adulteration certified.')}
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
                value={signOffNotes}
                onChangeText={setSignOffNotes}
              />
            </View>

            <View style={styles.modalFooterActionsRow}>
              <Pressable
                style={styles.modalCancelBtn}
                onPress={() => setShowSignOffModal(false)}
              >
                <Text style={styles.modalCancelBtnText}>{t('common.close', 'Close')}</Text>
              </Pressable>

              <Pressable
                style={[styles.modalSubmitBtn, { backgroundColor: '#16A34A' }]}
                onPress={handleQuickSignOff}
              >
                <Ionicons name="checkmark-done" size={16} color="#FFFFFF" />
                <Text style={styles.modalSubmitBtnText}>{t('union.signReconcileBtn', 'Sign & Reconcile')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#F3F4F7',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 110,
  },
  tabletScrollContent: {
    paddingHorizontal: 22,
    paddingTop: 20,
    alignItems: 'center',
  },
  desktopScrollContent: {
    paddingHorizontal: 36,
    paddingTop: 24,
    alignItems: 'center',
  },
  mainDashboardCanvas: {
    width: '100%',
    gap: 18,
  },
  desktopDashboardCanvas: {
    maxWidth: 1320,
    gap: 20,
  },

  /* Section Title Bar */
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  mobileSectionTitleRow: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 12,
  },
  titleTextContainer: {
    flex: 1,
  },
  dashboardMainTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  dashboardSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  headerControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mobileHeaderControlsRow: {
    width: '100%',
    justifyContent: 'space-between',
  },
  filterPillsGroup: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 24,
    padding: 3,
    gap: 2,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  filterPillActive: {
    backgroundColor: '#0F172A',
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  newTaskBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  newTaskBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  /* Alert Notice Banner */
  alertNoticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 18,
    padding: 14,
  },
  alertNoticeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 10,
  },
  alertNoticeIconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertNoticeTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#991B1B',
  },
  alertNoticeDesc: {
    fontSize: 11,
    color: '#B91C1C',
    marginTop: 2,
  },
  alertBannerButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  signOffBtnMini: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  signOffBtnMiniText: {
    color: '#15803D',
    fontSize: 11,
    fontWeight: '800',
  },
  alertNoticeActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
  },
  alertNoticeActionText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },

  /* The Signature Cognify White Card Base */
  cognifyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#ECEEF2',
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
  },

  /* Top 3 KPI Grid - SINGLE ROW ON MOBILE */
  topCardsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  tabletTopCardsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  desktopTopCardsGrid: {
    flexDirection: 'row',
    gap: 18,
  },
  kpiCardItem: {
    flex: 1,
    minWidth: 0,
    padding: 12,
  },
  desktopKpiCardItem: {
    padding: 20,
  },
  cardTopHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  kpiIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  desktopKpiIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  arrowCircleBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  desktopArrowCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  cardKpiLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
    marginBottom: 4,
  },
  statValueWithTrendRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  cardBigNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  desktopCardBigNumber: {
    fontSize: 38,
    letterSpacing: -1,
  },
  trendPillDown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 8,
  },
  trendTextDown: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: '800',
  },
  trendPillUp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 8,
  },
  trendTextUp: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '800',
  },
  cardFooterRow: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  desktopCardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
  },
  dynamicLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  dynamicLabelText: {
    fontSize: 9.5,
    color: '#94A3B8',
    fontWeight: '600',
  },
  periodPill: {
    backgroundColor: '#F1F4F8',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  periodPillText: {
    fontSize: 9,
    color: '#475569',
    fontWeight: '700',
  },
  manageCustText: {
    fontSize: 9.5,
    color: '#64748B',
    fontWeight: '600',
  },
  avatarCluster: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarAddBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F1F4F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  miniAvatarCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 10,
  },

  /* NEW SECTION 1: Income Analytics Card */
  incomeAnalyticsCard: {
    gap: 16,
  },
  incomeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 10,
  },
  incomeBadgeIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  incomeStatBadge: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'flex-end',
  },
  incomeStatBadgeText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#15803D',
  },
  incomeStatBadgeSub: {
    fontSize: 10,
    fontWeight: '700',
    color: '#166534',
    marginTop: 1,
  },
  incomeBreakdownGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  incomeBoxItem: {
    flex: 1,
    minWidth: 160,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  incomeBoxTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  incomeBoxTag: {
    fontSize: 10,
    fontWeight: '800',
  },
  incomeBoxValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginVertical: 2,
  },
  incomeBoxLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  incomeBoxSub: {
    fontSize: 9.5,
    color: '#64748B',
    marginTop: 2,
  },

  /* NEW SECTION 2: Low-Yielding Booths Card */
  lowYieldCard: {
    gap: 14,
  },
  lowYieldAlertBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  lowYieldAlertBadgeText: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '800',
  },
  lowYieldWarningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#F87171',
    borderRadius: 18,
    padding: 14,
  },
  lowYieldWarningTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#991B1B',
  },
  lowYieldWarningDesc: {
    fontSize: 11,
    color: '#B91C1C',
    marginTop: 2,
    lineHeight: 16,
  },
  lowYieldInquiryBtn: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    marginLeft: 8,
  },
  lowYieldInquiryBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  boothCompareList: {
    gap: 10,
  },
  boothCompareItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    flexWrap: 'wrap',
    gap: 10,
  },
  boothCompareLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 200,
  },
  boothCodeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  boothCodeBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  boothCompareName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  boothCompareSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  boothCompareMeters: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  meterCol: {
    alignItems: 'flex-end',
  },
  meterLabel: {
    fontSize: 9.5,
    color: '#94A3B8',
    fontWeight: '600',
  },
  meterValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 1,
  },
  meterDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#E2E8F0',
  },
  variancePercentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  variancePercentText: {
    fontSize: 11,
    fontWeight: '800',
  },

  /* NEW SECTION 3: Full Access Hub */
  fullAccessContainer: {
    gap: 16,
  },
  fullAccessRolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  fullAccessRoleText: {
    color: '#7C3AED',
    fontSize: 11,
    fontWeight: '800',
  },
  fullAccessGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  accessTileCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    padding: 14,
  },
  accessTileIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  accessTileTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  accessTileStat: {
    fontSize: 15,
    fontWeight: '800',
    color: '#334155',
    marginVertical: 2,
  },
  accessTileDesc: {
    fontSize: 10,
    color: '#64748B',
    lineHeight: 14,
    marginBottom: 10,
  },
  accessTileLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 'auto',
  },
  accessTileLinkText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0284C7',
  },

  /* Analytics Grid (Bottom 3) */
  bottomCardsGrid: {
    flexDirection: 'column',
    gap: 16,
  },
  tabletBottomCardsGrid: {
    flexDirection: 'column',
    gap: 18,
  },
  desktopBottomCardsGrid: {
    flexDirection: 'row',
    gap: 18,
  },
  analyticsCardItem: {
    flex: 1,
    minWidth: 280,
  },
  analyticsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  analyticsTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  analyticsSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },

  /* Card 4: Task Progress */
  taskProgressBigNum: {
    fontSize: 38,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -1,
    marginTop: 4,
  },
  taskCategoriesCol: {
    gap: 6,
  },
  taskCategoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryMiniIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryNameText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  categoryPercentText: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '800',
  },
  cylinderChartContainer: {
    marginTop: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Card 5: Project Status */
  sumPercentTogglePill: {
    flexDirection: 'row',
    backgroundColor: '#F1F4F8',
    borderRadius: 12,
    padding: 2,
  },
  togglePillBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  togglePillBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  togglePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  togglePillTextActive: {
    color: '#0F172A',
  },
  donutContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  statusBarsContainer: {
    marginTop: 8,
    gap: 9,
  },
  statusBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBarLabel: {
    width: 82,
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  statusBarTrack: {
    flex: 1,
    height: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 5,
    marginHorizontal: 10,
    overflow: 'hidden',
  },
  statusBarCount: {
    width: 58,
    fontSize: 11,
    fontWeight: '800',
    color: '#334155',
    textAlign: 'right',
  },

  /* Card 6: Productivity Trend */
  dailyDropdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F1F4F8',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dailyDropdownText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '700',
  },
  trendTooltipsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 6,
  },
  activeTimePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0F172A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  blueDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#38BDF8',
  },
  activeTimePillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  pauseTimePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pinkDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EC4899',
  },
  pauseTimePillText: {
    color: '#475569',
    fontSize: 10,
    fontWeight: '700',
  },
  lineChartSvgWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  daysSelectorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 8,
  },
  daySelectorPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  daySelectorPillActive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  daySelectorPillText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  daySelectorPillTextActive: {
    color: '#0F172A',
    fontWeight: '800',
  },
  productivityStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  prodStatLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
    marginBottom: 2,
  },
  prodStatNumRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  prodStatValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  prodTrendGreenPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  prodTrendGreenText: {
    color: '#16A34A',
    fontSize: 11,
    fontWeight: '800',
  },
  prodTrendRedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  prodTrendRedText: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '800',
  },

  /* Supply Chain Twin Section */
  supplyChainContainer: {
    gap: 14,
  },
  supplyChainHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chainTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  chainIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chainTitleText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  chainSubtitleText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  retentionPillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  retentionPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  pipelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mobilePipelineCol: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 10,
  },
  pipelineNodeCard: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 12,
  },
  nodeHeaderSmall: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  nodeMiniBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  nodeMiniBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  nodeCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  nodeCardValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginVertical: 2,
  },
  nodeCardUnit: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  nodeCardSub: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
  },
  nodeArrowDivider: {
    paddingHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inspectDiscrepancyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#DC2626',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  inspectDiscrepancyBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },

  /* Modals */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  modalContentCard: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 6,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 12,
  },
  modalMainTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubTitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 4,
  },
  inputFieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    marginTop: 8,
  },
  bmcSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  modalSelectorPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalSelectorPillActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  pillRedActive: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  modalSelectorPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  modalSelectorPillTextActive: {
    color: '#FFFFFF',
  },
  modalTextInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    padding: 12,
    fontSize: 13,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
    textAlignVertical: 'top',
    minHeight: 80,
  },
  modalFooterActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    marginTop: 18,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 14,
  },
  modalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  modalSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0F172A',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
  },
  modalSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  receiptSelectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    marginBottom: 6,
  },
  receiptSelectCardActive: {
    borderColor: '#0284C7',
    backgroundColor: '#F0F9FF',
  },
  receiptSelectId: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  receiptSelectSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
});
