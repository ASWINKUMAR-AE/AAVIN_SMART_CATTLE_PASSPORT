import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Alert, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useAavinStore } from '../../store/AavinStoreContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from '../../context/LanguageContext';
import { Typography } from '../../constants/Typography';
import { DemoHeader } from '../../components/DemoHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Ionicons } from '@expo/vector-icons';

export default function BMCDailySummaryScreen() {
  const { user } = useAuth();
  const { 
    bmcs, 
    bmcDeliveries, 
    bmcReceipts, 
    createBmcReceipt, 
    sendBmcReceiptToUnion,
    discrepancyCases 
  } = useAavinStore();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();

  const bmcId = user?.associatedId || 'BMC001';
  const bmc = bmcs.find(b => b.id === bmcId) || bmcs[0];

  const todayStr = '2026-10-12';
  const myDeliveries = bmcDeliveries.filter(d => d.bmcId === bmc.id);

  const totalDeclared = myDeliveries.reduce((sum, d) => sum + d.declaredDispatchQuantity, 0);
  const totalReceived = myDeliveries.reduce((sum, d) => sum + (d.measuredReceivedQuantity || 0), 0);
  const totalVariance = parseFloat((totalDeclared - totalReceived).toFixed(2));

  const openCases = discrepancyCases.filter(c => c.bmcId === bmc.id && (c.status === 'open' || c.status === 'under_investigation'));

  // Today's generated BMC receipt
  const todayBmcReceipt = bmcReceipts.find(r => r.bmcId === bmc.id && r.collectionDate === todayStr);

  const [generating, setGenerating] = useState(false);
  const [transmitting, setTransmitting] = useState(false);

  const handleGenerateBmcReceipt = () => {
    if (myDeliveries.length === 0) {
      Alert.alert(t('bmc.noDeliveriesTitle'), t('bmc.noDeliveriesMsg'));
      return;
    }

    setGenerating(true);
    try {
      const receipt = createBmcReceipt(
        bmc.id,
        'UNION001',
        todayStr,
        myDeliveries.map(d => d.id),
        user?.fullName || 'R. Sundar (BMC In-Charge)'
      );

      Alert.alert(
        t('bmc.bmcReceiptCreated'),
        t('bmc.bmcReceiptCreatedMsg', { id: receipt.id, qty: receipt.totalReceivedQuantity }),
        [{ text: t('common.done') }]
      );
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message || t('bmc.couldNotCreateReceipt'));
    } finally {
      setGenerating(false);
    }
  };

  const handleSendToUnion = (receiptId: string) => {
    setTransmitting(true);
    try {
      sendBmcReceiptToUnion(receiptId);
      Alert.alert(
        t('bmc.receiptSentToUnion'),
        t('bmc.receiptSentToUnionMsg', { id: receiptId }),
        [{ text: t('common.done') }]
      );
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message || t('bmc.couldNotSendReceipt'));
    } finally {
      setTransmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <DemoHeader 
        title={t('bmc.dailySummaryTitle')}
        subtitle={t('bmc.dailySummarySubtitle')}
        showBack
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Big Net Received Volume Card */}
        <Card style={styles.card}>
          <Text style={[Typography.caption2, { color: colors.primary, fontWeight: '800' }]}>
            {t('bmc.totalBmcNetIntakeVolume')}
          </Text>
          <Text style={[styles.largeTotal, { color: colors.text }]}>
            {totalReceived.toFixed(2)} <Text style={{ fontSize: 20 }}>{t('common.litres')}</Text>
          </Text>
          <Text style={[Typography.footnote, { color: colors.textSecondary }]}>
            {t('bmc.measuredAcrossSocieties', { count: myDeliveries.length })}
          </Text>

          {/* Reconciliation Table */}
          <View style={[styles.table, { borderTopColor: colors.border }]}>
            <View style={styles.tableRow}>
              <Text style={[Typography.subhead, { color: colors.textSecondary }]}>{t('bmc.feederDispatchesDeclared')}</Text>
              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]}>{totalDeclared.toFixed(2)} L</Text>
            </View>

            <View style={styles.tableRow}>
              <Text style={[Typography.subhead, { color: colors.textSecondary }]}>{t('bmc.flowMeterNetReceived')}</Text>
              <Text style={[Typography.subhead, { color: colors.primary, fontWeight: '800' }]}>{totalReceived.toFixed(2)} L</Text>
            </View>

            <View style={styles.tableRow}>
              <Text style={[Typography.subhead, { color: totalVariance > 0 ? '#DC2626' : '#16A34A', fontWeight: '800' }]}>
                {t('bmc.netDiffShortfall')}
              </Text>
              <Text style={[Typography.headline, { color: totalVariance > 0 ? '#DC2626' : '#16A34A', fontWeight: '900' }]}>
                {totalVariance > 0 ? `-${totalVariance.toFixed(2)} L` : '0.00 L'}
              </Text>
            </View>

            <View style={styles.tableRow}>
              <Text style={[Typography.subhead, { color: colors.textSecondary }]}>{t('bmc.activeDiscrepancyCases')}</Text>
              <Text style={[Typography.subhead, { color: openCases.length > 0 ? '#DC2626' : '#16A34A', fontWeight: '800' }]}>
                {t('bmc.unresolvedCount', { count: openCases.length })}
              </Text>
            </View>
          </View>
        </Card>

        {/* Existing BMC Receipt (if already created) */}
        {todayBmcReceipt && (
          <Card style={[styles.card, { borderColor: colors.primary, borderWidth: 1.5 }]}>
            <View style={styles.receiptHeader}>
              <View>
                <Text style={[Typography.headline, { color: colors.text, fontWeight: '900' }]}>
                  {todayBmcReceipt.id}
                </Text>
                <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                  {t('bmc.dateToken', { date: todayBmcReceipt.collectionDate, token: todayBmcReceipt.verificationCode })}
                </Text>
              </View>

              <View style={[styles.statusBadge, { backgroundColor: todayBmcReceipt.status === 'sent_to_union' ? '#DCFCE7' : '#FEF3C7' }]}>
                <Text style={[styles.statusText, { color: todayBmcReceipt.status === 'sent_to_union' ? '#15803D' : '#B45309' }]}>
                  {todayBmcReceipt.status === 'sent_to_union' ? t('bmc.sentToUnionCaps') : t('bmc.draftCaps')}
                </Text>
              </View>
            </View>

            <View style={styles.receiptSummary}>
              <Text style={[Typography.subhead, { color: colors.primary, fontWeight: '800' }]}>
                {t('bmc.netDispatchedVolume', { qty: todayBmcReceipt.totalReceivedQuantity })}
              </Text>
              <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                {t('bmc.feederSocietiesVariance', { count: todayBmcReceipt.totalBoothsCount, variance: todayBmcReceipt.netDifference })}
              </Text>
            </View>

            {todayBmcReceipt.status !== 'sent_to_union' ? (
              <Button
                title={transmitting ? t('bmc.sendingToUnion') : t('bmc.transmitReceiptToUnion')}
                loading={transmitting}
                onPress={() => handleSendToUnion(todayBmcReceipt.id)}
                style={{ marginTop: 12 }}
              />
            ) : (
              <View style={styles.sentNotice}>
                <Ionicons name="checkmark-done-circle" size={20} color="#16A34A" />
                <Text style={[Typography.caption1, { color: '#166534', fontWeight: '700', marginLeft: 6 }]}>
                  {t('bmc.receiptTransmittedLive')}
                </Text>
              </View>
            )}
          </Card>
        )}

        {/* Feeder Society Deliveries List */}
        <Card style={styles.card}>
          <Text style={[Typography.headline, { color: colors.text, fontWeight: '800', marginBottom: 10 }]}>
            {t('bmc.feederBreakdown')}
          </Text>

          {myDeliveries.map((d) => (
            <View key={d.id} style={[styles.deliveryItem, { borderBottomColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700' }]}>
                  {d.boothName}
                </Text>
                <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                  {t('bmc.receiptStatus', { receiptId: d.boothReceiptId, status: d.status.toUpperCase() })}
                </Text>
              </View>

              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[Typography.subhead, { color: colors.primary, fontWeight: '800' }]}>
                  {d.measuredReceivedQuantity !== undefined ? `${d.measuredReceivedQuantity.toFixed(1)} L` : t('bmc.pending')}
                </Text>
                <Text style={[Typography.caption2, { color: (d.difference || 0) > 0 ? '#DC2626' : colors.textMuted }]}>
                  {d.difference !== undefined ? (d.difference > 0 ? t('bmc.diffShort', { diff: d.difference }) : t('bmc.balancedState')) : t('bmc.awaitingArrival')}
                </Text>
              </View>
            </View>
          ))}
        </Card>

        {/* Action Button */}
        {!todayBmcReceipt && (
          <Button
            title={generating ? t('bmc.generatingReceipt') : t('bmc.generateBmcReceipt')}
            size="lg"
            loading={generating}
            onPress={handleGenerateBmcReceipt}
            style={{ marginTop: 8 }}
          />
        )}
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
  card: {
    padding: 16,
  },
  largeTotal: {
    fontSize: 34,
    fontWeight: '900',
    marginTop: 4,
  },
  table: {
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  receiptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  receiptSummary: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
  },
  sentNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  deliveryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
