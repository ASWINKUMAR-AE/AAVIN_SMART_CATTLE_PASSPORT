import React, { useState, useMemo } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  Pressable, 
  RefreshControl, 
  TextInput,
  useWindowDimensions 
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

type SocietyFilter = 'all' | 'active' | 'inactive' | 'pending' | 'submitted' | 'discrepancy';

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

  const isTablet = width >= 768;

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [societyFilter, setSocietyFilter] = useState<SocietyFilter>('all');

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

  const filteredSocieties = useMemo(() => {
    return processedSocieties.filter(s => {
      // Search
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        s.name.toLowerCase().includes(q) || 
        s.code.toLowerCase().includes(q) || 
        s.village.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      // Filter chips
      if (societyFilter === 'active') return s.detail.isActive;
      if (societyFilter === 'inactive') return !s.detail.isActive;
      if (societyFilter === 'pending') return s.hasPendingDelivery;
      if (societyFilter === 'submitted') return s.isSubmitted;
      if (societyFilter === 'discrepancy') return s.hasDiscrepancy;

      return true;
    });
  }, [processedSocieties, searchQuery, societyFilter]);

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

        {/* Signature Hero Dark Navy Card */}
        <View style={styles.heroNavyCard}>
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

          {/* Quick Action Circle Buttons */}
          <View style={styles.heroActionsRow}>
            <Pressable 
              style={styles.heroCircleAction}
              onPress={() => router.push('/(bmc)/receive-milk')}
            >
              <View style={styles.circleBtn}>
                <Ionicons name="arrow-down" size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.circleBtnLabel}>Intake</Text>
            </Pressable>

            <Pressable 
              style={styles.heroCircleAction}
              onPress={() => router.push('/(bmc)/society-income')}
            >
              <View style={styles.circleBtn}>
                <Ionicons name="cash-outline" size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.circleBtnLabel}>Income</Text>
            </Pressable>

            <Pressable 
              style={styles.heroCircleAction}
              onPress={() => router.push('/(bmc)/society-comparison')}
            >
              <View style={styles.circleBtn}>
                <Ionicons name="bar-chart-outline" size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.circleBtnLabel}>Compare</Text>
            </Pressable>

            <Pressable 
              style={styles.heroCircleAction}
              onPress={() => router.push('/(bmc)/reports')}
            >
              <View style={styles.circleBtn}>
                <Ionicons name="document-text-outline" size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.circleBtnLabel}>Reports</Text>
            </Pressable>

            <Pressable 
              style={styles.heroCircleAction}
              onPress={() => router.push('/(bmc)/submit-union-report')}
            >
              <View style={[styles.circleBtn, { backgroundColor: '#1E40AF' }]}>
                <Ionicons name="paper-plane" size={17} color="#FFFFFF" />
              </View>
              <Text style={styles.circleBtnLabel}>Union</Text>
            </Pressable>
          </View>
        </View>

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
          {/* Card 1: Registered Societies */}
          <Pressable 
            style={styles.tenCardWrapper} 
            onPress={() => setSocietyFilter('all')}
          >
            <Card style={styles.tenCard}>
              <View style={styles.tenCardTop}>
                <Ionicons name="business" size={18} color={colors.primary} />
                <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
              </View>
              <Text style={styles.tenCardNumber}>{stats.registeredBoothsCount}</Text>
              <Text style={[Typography.caption1, { color: colors.text, fontWeight: '700' }]}>
                Registered Societies
              </Text>
              <Text style={[Typography.caption2, { color: colors.textMuted }]}>
                Feeder societies assigned
              </Text>
            </Card>
          </Pressable>

          {/* Card 2: Active vs Inactive Societies */}
          <Pressable 
            style={styles.tenCardWrapper}
            onPress={() => setSocietyFilter(societyFilter === 'active' ? 'inactive' : 'active')}
          >
            <Card style={styles.tenCard}>
              <View style={styles.tenCardTop}>
                <Ionicons name="radio" size={18} color="#16A34A" />
                <View style={[styles.pillBadge, { backgroundColor: '#DCFCE7' }]}>
                  <Text style={[styles.pillText, { color: '#166534' }]}>{stats.activeBoothsCount} Active</Text>
                </View>
              </View>
              <Text style={styles.tenCardNumber}>
                {stats.activeBoothsCount} <Text style={{ fontSize: 13, color: colors.textMuted }}>/ {stats.inactiveBoothsCount} Inactive</Text>
              </Text>
              <Text style={[Typography.caption1, { color: colors.text, fontWeight: '700' }]}>
                Active / Inactive Status
              </Text>
              <Text style={[Typography.caption2, { color: colors.textMuted }]}>
                Supplying this cycle
              </Text>
            </Card>
          </Pressable>

          {/* Card 3: Total Milk Collected Today */}
          <Pressable 
            style={styles.tenCardWrapper}
            onPress={() => router.push('/(bmc)/reports')}
          >
            <Card style={styles.tenCard}>
              <View style={styles.tenCardTop}>
                <Ionicons name="water" size={18} color="#0284C7" />
                <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
              </View>
              <Text style={[styles.tenCardNumber, { color: '#0284C7' }]}>
                {stats.todayCollected.toFixed(1)} L
              </Text>
              <Text style={[Typography.caption1, { color: colors.text, fontWeight: '700' }]}>
                Total Milk Collected Today
              </Text>
              <Text style={[Typography.caption2, { color: colors.textMuted }]}>
                Society weigh scales
              </Text>
            </Card>
          </Pressable>

          {/* Card 4: Total Milk Received at BMC */}
          <Pressable 
            style={styles.tenCardWrapper}
            onPress={() => router.push('/(bmc)/receive-milk')}
          >
            <Card style={styles.tenCard}>
              <View style={styles.tenCardTop}>
                <Ionicons name="flask" size={18} color={colors.primary} />
                <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
              </View>
              <Text style={[styles.tenCardNumber, { color: colors.primary }]}>
                {stats.todayReceived.toFixed(1)} L
              </Text>
              <Text style={[Typography.caption1, { color: colors.text, fontWeight: '700' }]}>
                Milk Received at BMC
              </Text>
              <Text style={[Typography.caption2, { color: colors.textMuted }]}>
                Chilling flow meter verified
              </Text>
            </Card>
          </Pressable>

          {/* Card 5: Dispatched / Reported to Union */}
          <Pressable 
            style={styles.tenCardWrapper}
            onPress={() => router.push('/(bmc)/submit-union-report')}
          >
            <Card style={styles.tenCard}>
              <View style={styles.tenCardTop}>
                <Ionicons name="arrow-up-circle" size={18} color="#7C3AED" />
                <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
              </View>
              <Text style={[styles.tenCardNumber, { color: '#7C3AED' }]}>
                {stats.todayDispatchedToUnion.toFixed(1)} L
              </Text>
              <Text style={[Typography.caption1, { color: colors.text, fontWeight: '700' }]}>
                Reported to Union
              </Text>
              <Text style={[Typography.caption2, { color: colors.textMuted }]}>
                Consolidated submissions
              </Text>
            </Card>
          </Pressable>

          {/* Card 6: Total Milk Discrepancy */}
          <Pressable 
            style={styles.tenCardWrapper}
            onPress={() => router.push('/(bmc)/investigations')}
          >
            <Card style={styles.tenCard}>
              <View style={styles.tenCardTop}>
                <Ionicons name="swap-vertical" size={18} color={stats.totalDifference > 0 ? '#DC2626' : '#16A34A'} />
                <View style={[styles.pillBadge, { backgroundColor: stats.totalDifference > 0 ? '#FEE2E2' : '#DCFCE7' }]}>
                  <Text style={[styles.pillText, { color: stats.totalDifference > 0 ? '#991B1B' : '#166534' }]}>
                    {stats.totalDifference > 0 ? 'Variance' : 'Reconciled'}
                  </Text>
                </View>
              </View>
              <Text style={[styles.tenCardNumber, { color: stats.totalDifference > 0 ? '#DC2626' : '#16A34A' }]}>
                {stats.totalDifference > 0 ? `-${stats.totalDifference.toFixed(1)} L` : '0.0 L'}
              </Text>
              <Text style={[Typography.caption1, { color: colors.text, fontWeight: '700' }]}>
                Net Discrepancy Litres
              </Text>
              <Text style={[Typography.caption2, { color: colors.textMuted }]}>
                Difference requiring review
              </Text>
            </Card>
          </Pressable>

          {/* Card 7: Total Recorded Society Income */}
          <Pressable 
            style={styles.tenCardWrapper}
            onPress={() => router.push('/(bmc)/society-income')}
          >
            <Card style={styles.tenCard}>
              <View style={styles.tenCardTop}>
                <Ionicons name="wallet" size={18} color="#059669" />
                <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
              </View>
              <Text style={[styles.tenCardNumber, { color: '#059669' }]}>
                ₹{stats.totalRecordedIncome.toLocaleString('en-IN')}
              </Text>
              <Text style={[Typography.caption1, { color: colors.text, fontWeight: '700' }]}>
                Recorded Society Income
              </Text>
              <Text style={[Typography.caption2, { color: colors.textMuted }]}>
                Total ledger transactions
              </Text>
            </Card>
          </Pressable>

          {/* Card 8: Submitted / Reported to Union (Amount) */}
          <Pressable 
            style={styles.tenCardWrapper}
            onPress={() => router.push('/(bmc)/submit-union-report')}
          >
            <Card style={styles.tenCard}>
              <View style={styles.tenCardTop}>
                <Ionicons name="receipt" size={18} color="#2563EB" />
                <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
              </View>
              <Text style={[styles.tenCardNumber, { color: '#2563EB' }]}>
                ₹{stats.totalSubmittedToUnionIncome.toLocaleString('en-IN')}
              </Text>
              <Text style={[Typography.caption1, { color: colors.text, fontWeight: '700' }]}>
                Amount Reported to Union
              </Text>
              <Text style={[Typography.caption2, { color: colors.textMuted }]}>
                In submitted BMC receipts
              </Text>
            </Card>
          </Pressable>

          {/* Card 9: Number of Pending Society Reports */}
          <Pressable 
            style={styles.tenCardWrapper}
            onPress={() => router.push('/(bmc)/receive-milk')}
          >
            <Card style={styles.tenCard}>
              <View style={styles.tenCardTop}>
                <Ionicons name="hourglass" size={18} color="#D97706" />
                <View style={[styles.pillBadge, { backgroundColor: stats.pendingDeliveriesCount > 0 ? '#FEF3C7' : '#F1F5F9' }]}>
                  <Text style={[styles.pillText, { color: stats.pendingDeliveriesCount > 0 ? '#B45309' : '#475569' }]}>
                    {stats.pendingDeliveriesCount > 0 ? 'Pending' : 'Done'}
                  </Text>
                </View>
              </View>
              <Text style={[styles.tenCardNumber, { color: stats.pendingDeliveriesCount > 0 ? '#D97706' : colors.text }]}>
                {stats.pendingDeliveriesCount}
              </Text>
              <Text style={[Typography.caption1, { color: colors.text, fontWeight: '700' }]}>
                Pending Society Reports
              </Text>
              <Text style={[Typography.caption2, { color: colors.textMuted }]}>
                Dispatches awaiting intake
              </Text>
            </Card>
          </Pressable>

          {/* Card 10: Reports Awaiting Union Confirmation */}
          <Pressable 
            style={styles.tenCardWrapper}
            onPress={() => router.push('/(bmc)/submit-union-report')}
          >
            <Card style={styles.tenCard}>
              <View style={styles.tenCardTop}>
                <Ionicons name="shield-checkmark" size={18} color="#4338CA" />
                <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
              </View>
              <Text style={[styles.tenCardNumber, { color: '#4338CA' }]}>
                {stats.reportsAwaitingUnionCount}
              </Text>
              <Text style={[Typography.caption1, { color: colors.text, fontWeight: '700' }]}>
                Awaiting Union Sign-Off
              </Text>
              <Text style={[Typography.caption2, { color: colors.textMuted }]}>
                Under review by Union GM
              </Text>
            </Card>
          </Pressable>
        </View>

        {/* Section 3: Requirement #3 — Society Management Directory */}
        <View style={styles.sectionHeaderWithAction}>
          <View>
            <Text style={[Typography.headline, { color: colors.text, fontWeight: '800' }]}>
              🏢 Assigned Feeder Societies ({assignedBooths.length})
            </Text>
            <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
              Search, filter and inspect society dashboards
            </Text>
          </View>

          <Button
            title="+ Record Income"
            size="sm"
            variant="outline"
            onPress={() => router.push('/(bmc)/society-income')}
          />
        </View>

        {/* Search Bar */}
        <View style={[styles.searchBox, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search by Society Name, Code, ID, or Village..."
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

        {/* Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterPillsContainer}>
          {[
            { id: 'all', label: `All (${assignedBooths.length})` },
            { id: 'active', label: `Active (${stats.activeBoothsCount})` },
            { id: 'inactive', label: `Inactive (${stats.inactiveBoothsCount})` },
            { id: 'pending', label: `Reports Pending (${stats.pendingDeliveriesCount})` },
            { id: 'submitted', label: `Submitted Today` },
            { id: 'discrepancy', label: `Discrepancies (${stats.activeDiscrepanciesCount})` },
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

        {/* Societies List */}
        {filteredSocieties.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Ionicons name="search-outline" size={36} color={colors.textMuted} />
            <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700', marginTop: 8 }]}>
              No Societies Found
            </Text>
            <Text style={[Typography.caption2, { color: colors.textSecondary, textAlign: 'center', marginTop: 4 }]}>
              No assigned feeder societies match the query "{searchQuery}" and active filter.
            </Text>
            <Button
              title="Reset Filters"
              size="sm"
              variant="outline"
              style={{ marginTop: 12 }}
              onPress={() => { setSearchQuery(''); setSocietyFilter('all'); }}
            />
          </Card>
        ) : (
          filteredSocieties.map((society) => {
            const detail = society.detail;
            return (
              <Pressable
                key={society.id}
                onPress={() => router.push({ pathname: '/(bmc)/society-details', params: { societyId: society.id } })}
              >
                <Card style={styles.societyCard}>
                  {/* Card Header */}
                  <View style={styles.societyCardHeader}>
                    <View style={[styles.societyIconBadge, { backgroundColor: colors.primaryLight }]}>
                      <Ionicons name="business" size={20} color={colors.primary} />
                    </View>

                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <View style={styles.societyNameRow}>
                        <Text style={[Typography.headline, { color: colors.text, fontWeight: '800' }]} numberOfLines={1}>
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

                      <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                        ID: {society.id} • Code: {society.code} • {society.village}, {society.taluk}
                      </Text>
                      <Text style={[Typography.caption2, { color: colors.textMuted }]}>
                        In-Charge: {society.operatorName} • 📞 {society.phone} • Assigned BMC: {bmc.name}
                      </Text>
                    </View>
                  </View>

                  {/* Volume Grid */}
                  <View style={[styles.societyVolGrid, { borderTopColor: colors.border }]}>
                    <View style={styles.volCell}>
                      <Text style={[Typography.caption2, { color: colors.textSecondary }]}>TODAY</Text>
                      <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]}>
                        {detail.dailyMilk > 0 ? `${detail.dailyMilk} L` : 'Pending'}
                      </Text>
                    </View>

                    <View style={styles.volCell}>
                      <Text style={[Typography.caption2, { color: colors.primary }]}>MONTH</Text>
                      <Text style={[Typography.subhead, { color: colors.primary, fontWeight: '800' }]}>
                        {detail.monthlyTotalMilk.toLocaleString()} L
                      </Text>
                    </View>

                    <View style={styles.volCell}>
                      <Text style={[Typography.caption2, { color: '#7C3AED' }]}>YEAR</Text>
                      <Text style={[Typography.subhead, { color: '#7C3AED', fontWeight: '800' }]}>
                        {detail.yearlyTotalMilk.toLocaleString()} L
                      </Text>
                    </View>

                    <View style={styles.volCell}>
                      <Text style={[Typography.caption2, { color: '#059669' }]}>INCOME</Text>
                      <Text style={[Typography.subhead, { color: '#059669', fontWeight: '800' }]}>
                        ₹{detail.totalRecordedIncome.toLocaleString('en-IN')}
                      </Text>
                    </View>
                  </View>

                  {/* Card Footer: Reconciliation & Submission Status */}
                  <View style={[styles.societyFooter, { backgroundColor: '#F8FAFC' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
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
                        Reconciliation: {detail.reconciliationStatus.toUpperCase()}
                        {detail.differenceLitres !== 0 ? ` (${detail.differenceLitres > 0 ? '-' : '+'}${Math.abs(detail.differenceLitres)}L)` : ''}
                      </Text>
                    </View>

                    <Text style={[Typography.caption2, { color: colors.primary, fontWeight: '700' }]}>
                      View Dashboard ›
                    </Text>
                  </View>
                </Card>
              </Pressable>
            );
          })
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
    backgroundColor: '#0D1E36',
    borderRadius: 24,
    padding: 18,
    shadowColor: '#071325',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
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
    marginBottom: 18,
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
  heroActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
    paddingTop: 14,
  },
  heroCircleAction: {
    alignItems: 'center',
    flex: 1,
  },
  circleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#162C4E',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  circleBtnLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
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
    width: '48.5%',
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
  societyCard: {
    padding: 14,
    borderRadius: 16,
    marginBottom: 2,
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
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 10,
  },
  emptyCard: {
    padding: 24,
    alignItems: 'center',
    borderRadius: 14,
  },
  actionGrid: {
    gap: 10,
    marginTop: 6,
  },
});
