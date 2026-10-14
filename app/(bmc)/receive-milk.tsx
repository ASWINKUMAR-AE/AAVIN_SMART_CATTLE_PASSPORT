import React, { useState } from 'react';
import { StyleSheet, View, Text, FlatList, Alert, Modal, TextInput, Pressable } from 'react-native';
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
import { EmptyState } from '../../components/ui/EmptyState';
import { BMCDelivery } from '../../types/aavin';

export default function BMCReceiveMilkScreen() {
  const { user } = useAuth();
  const { bmcDeliveries, bmcs, receiveBmcDelivery, union } = useAavinStore();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();

  const bmcId = user?.associatedId || 'BMC001';
  const bmc = bmcs.find(b => b.id === bmcId) || bmcs[0];

  const deliveries = bmcDeliveries.filter(d => d.bmcId === bmc.id);

  // Modal State for Measurement Entry
  const [selectedDelivery, setSelectedDelivery] = useState<BMCDelivery | null>(null);
  const [measuredQty, setMeasuredQty] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleOpenReceiveModal = (delivery: BMCDelivery) => {
    setSelectedDelivery(delivery);
    // Pre-fill with declared quantity for easy testing, but allow changing to create discrepancy!
    setMeasuredQty(delivery.measuredReceivedQuantity?.toString() || delivery.declaredDispatchQuantity.toString());
  };

  const handleConfirmMeasurement = () => {
    if (!selectedDelivery) return;

    const qty = parseFloat(measuredQty);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert(t('bmc.invalidVolumeTitle'), t('bmc.invalidVolumeDesc'));
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
          t('bmc.mismatchDetectedAlert'),
          t('bmc.mismatchAlertBody', {
            declared: targetDelivery.declaredDispatchQuantity.toFixed(2),
            measured: qty.toFixed(2),
            diff: result.difference.toFixed(2),
            percent: ((Math.abs(result.difference) / targetDelivery.declaredDispatchQuantity) * 100).toFixed(1)
          }),
          [
            {
              text: t('bmc.openInvestigationCase'),
              onPress: () => router.push('/(bmc)/investigations'),
            },
            {
              text: t('common.done'),
            },
          ]
        );
      } else {
        Alert.alert(
          t('bmc.deliveryConfirmedAlert'),
          t('bmc.deliveryConfirmedBody', {
            qty: qty.toFixed(2),
            booth: targetDelivery.boothName
          }),
          [{ text: t('common.done') }]
        );
      }
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message || t('bmc.couldNotRecord'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <DemoHeader 
        title={t('bmc.receiveDeliveriesTitle')}
        subtitle={t('bmc.intakeStationSubtitle', { bmcName: bmc.name })}
        showBack
      />

      {/* Threshold Rule Info Strip */}
      <View style={[styles.thresholdStrip, { backgroundColor: colors.primaryLight }]}>
        <Ionicons name="information-circle" size={16} color={colors.primary} style={{ marginRight: 6 }} />
        <Text style={[Typography.caption2, { color: colors.primary, flex: 1 }]}>
          {t('bmc.varianceThresholdStrip', {
            litres: union.mismatchThresholdLitres.toFixed(1),
            percent: union.mismatchThresholdPercent
          })}
        </Text>
      </View>

      <FlatList
        data={deliveries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            title={t('bmc.noFeederDeliveries')}
            message={t('bmc.noFeederDeliveriesDesc')}
            icon="cube-outline"
          />
        }
        renderItem={({ item }) => {
          const isPending = item.status === 'pending_arrival';
          const isMismatch = item.status === 'mismatch_investigation';
          const isMatched = item.status === 'matched';

          const getStatusMeta = () => {
            if (isPending) return { label: t('bmc.awaitingMeasurementCaps'), bg: '#E0F2FE', color: '#0284C7' };
            if (isMismatch) return { label: t('bmc.mismatchInvestigationCaps'), bg: '#FEF2F2', color: '#DC2626' };
            if (isMatched) return { label: t('bmc.matchedConfirmedCaps'), bg: '#DCFCE7', color: '#15803D' };
            return { label: item.status.toUpperCase(), bg: '#F3E8FF', color: '#7E22CE' };
          };

          const status = getStatusMeta();

          return (
            <Card style={[styles.card, isMismatch && { borderColor: '#EF4444', borderWidth: 1.5 }]}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={[Typography.headline, { color: colors.text, fontWeight: '800' }]}>
                    {item.boothName}
                  </Text>
                  <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                    {t('bmc.receiptDispatched', { receiptId: item.boothReceiptId, time: item.dispatchTime })}
                  </Text>
                </View>

                <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                  <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                </View>
              </View>

              {/* Quantities Side-by-Side Comparison */}
              <View style={[styles.compareGrid, { borderTopColor: colors.border }]}>
                <View style={styles.compareCol}>
                  <Text style={[Typography.caption2, { color: colors.textSecondary }]}>{t('bmc.societyDeclared')}</Text>
                  <Text style={[Typography.title2, { color: colors.primary, fontWeight: '900' }]}>
                    {item.declaredDispatchQuantity.toFixed(1)} L
                  </Text>
                  <Text style={[Typography.caption2, { color: colors.textMuted }]}>{t('bmc.originalDispatchSlip')}</Text>
                </View>

                <View style={styles.vDivider} />

                <View style={styles.compareCol}>
                  <Text style={[Typography.caption2, { color: colors.textSecondary }]}>{t('bmc.bmcMeasured')}</Text>
                  <Text style={[Typography.title2, { color: colors.text, fontWeight: '900' }]}>
                    {item.measuredReceivedQuantity !== undefined ? `${item.measuredReceivedQuantity.toFixed(1)} L` : t('bmc.pending')}
                  </Text>
                  <Text style={[Typography.caption2, { color: colors.textMuted }]}>
                    {item.receivedBy || t('bmc.awaitingEntry')}
                  </Text>
                </View>

                <View style={styles.vDivider} />

                <View style={styles.compareCol}>
                  <Text style={[Typography.caption2, { color: colors.textSecondary }]}>{t('bmc.difference')}</Text>
                  <Text 
                    style={[
                      Typography.title2, 
                      { 
                        fontWeight: '900', 
                        color: (item.difference || 0) > 0 ? '#DC2626' : '#16A34A' 
                      }
                    ]}
                  >
                    {item.difference !== undefined ? `${item.difference > 0 ? '-' : ''}${Math.abs(item.difference).toFixed(1)} L` : '-'}
                  </Text>
                  <Text style={[Typography.caption2, { color: (item.difference || 0) > 0 ? '#DC2626' : colors.textMuted }]}>
                    {item.difference !== undefined ? (item.difference > 0 ? t('bmc.shortfall') : t('bmc.balancedState')) : t('bmc.unmeasured')}
                  </Text>
                </View>
              </View>

              {/* Actions */}
              <View style={styles.cardActions}>
                {isPending ? (
                  <Button
                    title={t('bmc.confirmMilkReceived')}
                    onPress={() => handleOpenReceiveModal(item)}
                    style={{ flex: 1 }}
                  />
                ) : (
                  <View style={{ flexDirection: 'row', gap: 8, flex: 1 }}>
                    <Button
                      title={t('bmc.remeasureEdit')}
                      variant="outline"
                      size="sm"
                      onPress={() => handleOpenReceiveModal(item)}
                      style={{ flex: 1 }}
                    />
                    {isMismatch && (
                      <Button
                        title={t('bmc.viewInvestigation')}
                        variant="destructive"
                        size="sm"
                        onPress={() => router.push('/(bmc)/investigations')}
                        style={{ flex: 1 }}
                      />
                    )}
                  </View>
                )}
              </View>
            </Card>
          );
        }}
      />

      {/* Measurement Entry Modal */}
      {selectedDelivery && (
        <Modal
          visible={true}
          transparent
          animationType="slide"
          onRequestClose={() => setSelectedDelivery(null)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setSelectedDelivery(null)}>
            <View style={[styles.modalSheet, { backgroundColor: colors.card }]} onStartShouldSetResponder={() => true}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={[Typography.title2, { color: colors.text, fontWeight: '900' }]}>
                    {t('bmc.confirmMilkReceived')}
                  </Text>
                  <Text style={[Typography.caption1, { color: colors.textSecondary }]}>
                    {selectedDelivery.boothName} (Receipt #{selectedDelivery.boothReceiptId})
                  </Text>
                </View>
                <Pressable onPress={() => setSelectedDelivery(null)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </Pressable>
              </View>

              <View style={[styles.declaredBox, { backgroundColor: colors.primaryLight }]}>
                <Text style={[Typography.caption2, { color: colors.primary, fontWeight: '800' }]}>
                  {t('bmc.societyDeclaredDispatchQty')}
                </Text>
                <Text style={[styles.declaredNum, { color: colors.primary }]}>
                  {selectedDelivery.declaredDispatchQuantity.toFixed(2)} {t('common.litres')}
                </Text>
                <Text style={[Typography.caption2, { color: colors.primary }]}>
                  {t('bmc.preservedAuditNote')}
                </Text>
              </View>

              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700', marginTop: 14, marginBottom: 4 }]}>
                {t('bmc.actualMeasuredPrompt')}
              </Text>
              <TextInput
                placeholder={t('bmc.enterMeasuredPlaceholder')}
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
                          {t('bmc.calculatedDifference', { diff: diff.toFixed(2) })}
                        </Text>
                        <Text style={[Typography.caption2, { color: isDiff ? '#991B1B' : '#166534' }]}>
                          {isDiff 
                            ? t('bmc.varianceExceedsAlert', { threshold: union.mismatchThresholdLitres.toString() })
                            : t('bmc.balancedIntakeSuccess')}
                        </Text>
                      </View>
                    </View>
                  );
                }
                return null;
              })()}

              <Button
                title={submitting ? t('bmc.savingMeasurement') : t('bmc.confirmSaveMeasurement')}
                size="lg"
                loading={submitting}
                onPress={handleConfirmMeasurement}
                style={{ marginTop: 16 }}
              />
            </View>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  thresholdStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  listContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 40,
  },
  card: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    maxWidth: '50%',
  },
  statusText: {
    fontSize: 9,
    fontWeight: '800',
    textAlign: 'center',
  },
  compareGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  compareCol: {
    flex: 1,
    alignItems: 'center',
  },
  vDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 4,
  },
  cardActions: {
    marginTop: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
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
