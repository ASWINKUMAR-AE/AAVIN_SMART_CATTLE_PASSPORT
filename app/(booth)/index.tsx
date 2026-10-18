import { BoothScreen } from '../../components/booth/BoothScreen';
import { BoothText as Text } from '../../components/booth/BoothText';
import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, Pressable, RefreshControl, ImageBackground, useWindowDimensions, Text as NativeText } from 'react-native';
import { useRouter } from 'expo-router';
import { useDispatchWorkflow, useDispatchRefresh } from '../../context/DispatchContext';
import { indiaDate } from '../../services/milkCollectionsApi';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { BoothHeader as DemoHeader } from '../../components/booth/BoothHeader';
import { Card } from '../../components/ui/Card';
import { BoothButton as Button } from '../../components/booth/BoothButton';
import { Ionicons } from '@expo/vector-icons';
import { SmartCattleTagScannerModal } from '../../components/scanner/SmartCattleTagScannerModal';
import { SocietyMonitoringSection } from '../../components/monitoring/SocietyMonitoringSection';

export default function BoothDashboard() {
  const { width, fontScale } = useWindowDimensions();
  const styles = createStyles(width, fontScale);
  const { user } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const { context, milkRecords, boothReceipts, error, loading, refresh } = useDispatchWorkflow();
  useDispatchRefresh();
  const [refreshing, setRefreshing] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);
  const boothId = user?.id || '';
  const booth = context?.society || { id: boothId, name: user?.fullName || '', assignedBmcId: '' };
  const boothDisplayName = booth.name;
  const assignedBmc = context?.bmc || { id: '', name: 'Loading linked BMC…' };
  const boothRecords = milkRecords.filter(r => r.boothId === booth.id);
  const todayRecords = boothRecords.filter(r => r.collectionDate === indiaDate());
  const assignedFarmers = context?.farmers || [];
  const todayReceipt = boothReceipts.find(r => r.boothId === booth.id && r.collectionDate === indiaDate());
  const total = (records: typeof milkRecords) => records.reduce((sum, record) => sum + record.quantityLitres, 0).toFixed(2);
  const summary = context ? { todaySupply: total(todayRecords), shifts: {
    morning: total(todayRecords.filter(r => r.session === 'morning')),
    evening: total(todayRecords.filter(r => r.session === 'evening')),
  }} : null;

  const onRefresh = async () => { setRefreshing(true); try { await refresh(); } finally { setRefreshing(false); } };

  return (
    <BoothScreen style={[styles.container, { backgroundColor: colors.background }]}>
      <DemoHeader 
        title={booth.name}
        subtitle={`Society: ${boothDisplayName} • Linked to BMC: ${assignedBmc.name}`}
      />

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {!summary && <Text style={{ color: colors.textSecondary }}>{loading ? 'Loading collections…' : 'Collections unavailable. Pull down to retry.'}</Text>}
        {error && <Text style={{ color: colors.hold }}>{error}</Text>}
        {/* Signature Hero Dark Navy Card with Assets soc.png Background & Dark Overlay */}
        <ImageBackground
          source={require('../../assets/soc.png')}
          style={styles.heroNavyCard}
          imageStyle={styles.heroBgImage}
          resizeMode="cover"
        >
          {/* Dark Color Layer above image */}
          <View style={styles.darkOverlayLayer}>
            <View style={styles.heroCardHeaderRow}>
              <View style={styles.heroHeaderPill}>
                <Text style={styles.heroHeaderPillText} numberOfLines={1}>{boothDisplayName} ›</Text>
              </View>
              <View style={[styles.heroStatusBadge, { backgroundColor: todayReceipt ? '#16A34A' : '#D97706' }]}>
                <Text style={styles.heroStatusBadgeText}>
                  {todayReceipt ? '✓ DISPATCH READY' : 'CLOSURE PENDING'}
                </Text>
              </View>
            </View>

            <Text style={styles.heroBalanceNumber}>
              {summary ? Number(summary.todaySupply).toFixed(2) : '—'} <Text style={{ fontSize: 20, fontWeight: '600' }}>Litres</Text>
            </Text>

            <View style={styles.heroSubRow}>
              <View style={styles.growthPill}>
                <Text style={styles.growthPillText}>Collected today</Text>
              </View>
              <Text style={styles.heroSubText}>
                {summary ? `Morning: ${summary.shifts.morning} L • Evening: ${summary.shifts.evening} L` : 'Awaiting server data'}
              </Text>
            </View>
          </View>
        </ImageBackground>

        {/* Quick Operations Row */}
        <View style={styles.actionBtnRow}>
          <Pressable 
            onPress={() => router.push('/(booth)/farmers')}
            style={[styles.quickActionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={[styles.quickActionIconCircle, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="people" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]}>
                Farmers Directory & KYC
              </Text>
              <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                {assignedFarmers.length} Assigned • Tap to Edit Data
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </Pressable>

          <Pressable 
            onPress={() => setScannerVisible(true)}
            style={[styles.quickActionCard, { backgroundColor: colors.card, borderColor: '#0284C7', borderWidth: 1.5 }]}
          >
            <View style={[styles.quickActionIconCircle, { backgroundColor: '#E0F2FE' }]}>
              <Ionicons name="scan" size={20} color="#0284C7" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]}>
                Scan Cattle Ear Tag (Dual-Mode)
              </Text>
              <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                Barcode First + 12-Digit OCR • Check Withdrawal Hold
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#0284C7" />
          </Pressable>

          <Pressable 
            onPress={() => router.push(todayReceipt ? `/(booth)/receipt-preview?receiptId=${todayReceipt.id}` as any : '/(booth)/review-collection')}
            style={[styles.quickActionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={[styles.quickActionIconCircle, { backgroundColor: todayReceipt ? '#DCFCE7' : '#FEF3C7' }]}>
              <Ionicons name="paper-plane" size={20} color={todayReceipt ? '#15803D' : '#D97706'} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]}>
                Send Dispatch Receipts
              </Text>
              <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                {todayReceipt ? `Waybill • ${todayReceipt.dispatchQuantity.toFixed(1)} L` : 'Audit Batch & Transmit to BMC'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </Pressable>
        </View>

        {/* Morning & Evening Milk Monitoring Section */}
        <SocietyMonitoringSection
          societyId={booth.id}
          societyName={boothDisplayName}
        />

        {/* Today's Recorded Entries List */}
        <Card style={styles.entriesCard}>
          <View style={styles.entriesHeader}>
            <Text style={[Typography.headline, styles.entriesTitle, { color: colors.text, fontWeight: '800' }]}>
              Today's Entries ({todayRecords.length})
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="New milk collection entry"
              testID="booth-new-entry"
              style={({ pressed }) => [styles.newEntryButton, { opacity: pressed ? 0.7 : 1 }]}
              onPress={() => router.push('/(booth)/record-milk')}
            >
              <NativeText numberOfLines={1} style={[Typography.caption1, { color: colors.primary, fontWeight: '700' }]}>
                + New Entry
              </NativeText>
            </Pressable>
          </View>

          {todayRecords.length === 0 ? (
            <Text style={[Typography.subhead, { color: colors.textSecondary, textAlign: 'center', marginVertical: 20 }]}>
              No milk entries recorded today yet.
            </Text>
          ) : (
            todayRecords.map((r) => (
              <View key={r.id} style={[styles.entryItem, { borderBottomColor: colors.border }]}>
                <View style={[styles.entryIconCircle, { backgroundColor: r.measurementMethod === 'farmer_wise' ? '#DCFCE7' : '#E0E7FF' }]}>
                  <Ionicons 
                    name={r.measurementMethod === 'farmer_wise' ? 'person' : 'bus'} 
                    size={16} 
                    color={r.measurementMethod === 'farmer_wise' ? '#15803D' : '#4338CA'} 
                  />
                </View>

                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]}>
                    {r.farmerName || `${r.vendorName || 'Combined Vendor'}`}
                  </Text>
                  <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                    {r.measurementMethod === 'farmer_wise' ? 'Direct Farmer Measurement' : 'Vendor Combined (Individual N/A)'}
                  </Text>
                  <Text style={[Typography.caption2, { color: colors.textMuted }]}>
                    {r.session.toUpperCase()} • Recorded by: {r.createdBy}
                  </Text>
                </View>

                <View style={styles.entryQtyBox}>
                  <Text style={[styles.entryQtyNum, { color: colors.primary }]}>
                    {r.quantityLitres.toFixed(1)} L
                  </Text>
                </View>
              </View>
            ))
          )}
        </Card>
      </ScrollView>
      <SmartCattleTagScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onScan={(tagId) => {
          setScannerVisible(false);
          router.push({
            pathname: '/cow-details',
            params: { tagId },
          } as any);
        }}
        userRoleLabel="Society Staff"
      />
    </BoothScreen>
  );
}

const createStyles = (width: number, fontScale: number) => {
  const compact = width < 600 || fontScale > 1.2;
  return StyleSheet.create({
    container: {
      flex: 1,
      minWidth: 0,
    },
    scrollContent: {
      width: '100%',
      maxWidth: 960,
      alignSelf: 'center',
      padding: 16,
      gap: 14,
      paddingBottom: 128,
    },
    discrepancyBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      borderRadius: 14,
      borderWidth: 1.5,
    },
    primaryCard: {
      padding: 16,
    },
    primaryHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    largeTotalText: {
      fontSize: 32,
      fontWeight: '900',
      marginTop: 2,
    },
    receiptPill: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
    },
    receiptPillText: {
      fontSize: 11,
      fontWeight: '800',
    },
    breakdownRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    breakdownCol: {
      flex: 1,
      minWidth: 0,
    },
    vDivider: {
      width: 1,
      backgroundColor: '#E2E8F0',
      marginHorizontal: 12,
    },
    actionBtnRow: {
      flexDirection: 'column',
      gap: 10,
      marginTop: 2,
      marginBottom: 6,
    },
    quickActionCard: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 14,
      borderWidth: 1,
      gap: 10,
    },
    quickActionIconCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    entriesCard: {
      padding: 16,
    },
    entriesHeader: {
      gap: 8,
      flexWrap: 'nowrap',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    entriesTitle: {
      flex: 1,
      minWidth: 0,
    },
    newEntryButton: {
      flexShrink: 0,
      minHeight: 48,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 4,
    },
    entryItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    entryIconCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    entryQtyBox: {
      flexShrink: 0,
      backgroundColor: '#F1F5F9',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    entryQtyNum: {
      fontSize: 15,
      fontWeight: '800',
    },
    heroNavyCard: {
      borderRadius: 24,
      marginBottom: 16,
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
      gap: 8,
      flexWrap: 'wrap',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    heroHeaderPill: {
      minWidth: 0,
      flexShrink: 1,
      marginRight: 8,
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
      fontSize: width < 360 ? 28 : 34,
      fontWeight: '800',
      letterSpacing: -0.5,
      marginVertical: 4,
    },
    heroSubRow: {
      gap: 6,
      flexWrap: 'wrap',
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    growthPill: {
      backgroundColor: 'rgba(22, 163, 74, 0.2)',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
      marginRight: 8,
    },
    growthPillText: {
      color: '#4ADE80',
      fontSize: 11,
      fontWeight: '800',
    },
    heroSubText: {
      color: 'rgba(255, 255, 255, 0.7)',
      fontSize: 12,
      fontWeight: '600',
    },
  });
};
