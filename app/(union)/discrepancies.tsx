import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, TextInput, Alert, Modal, Pressable, BackHandler } from 'react-native';
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
import { DiscrepancyCase } from '../../types/aavin';

export default function UnionDiscrepanciesScreen() {
  const { user } = useAuth();
  const { discrepancyCases, resolveDiscrepancyCase, addInvestigationNote } = useAavinStore();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();

  const handleBackToHome = () => {
    router.replace('/(union)' as any);
  };

  useEffect(() => {
    const onBackPress = () => {
      handleBackToHome();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, []);

  const [selectedCase, setSelectedCase] = useState<DiscrepancyCase | null>(null);
  const [activeModal, setActiveModal] = useState<'directive' | 'resolve' | null>(null);
  const [directiveText, setDirectiveText] = useState('');
  const [resolutionText, setResolutionText] = useState('');

  const handleAddDirective = () => {
    if (!selectedCase || !directiveText.trim()) return;
    addInvestigationNote(
      selectedCase.id,
      `[UNION EXECUTIVE DIRECTIVE]: ${directiveText.trim()}`,
      user?.fullName || 'Dr. S. Sundaram (General Manager)',
      'Union Audit Order'
    );
    setDirectiveText('');
    setActiveModal(null);
    Alert.alert(
      t('union.discrepancies.directiveLoggedTitle', 'Directive Logged'),
      t('union.discrepancies.directiveLoggedMsg', 'Union directive logged to the case audit ledger.')
    );
  };

  const handleUnionResolve = () => {
    if (!selectedCase || !resolutionText.trim()) return;
    const caseId = selectedCase.id;
    resolveDiscrepancyCase(
      selectedCase.id,
      `[UNION RESOLUTION]: ${resolutionText.trim()}`,
      user?.fullName || 'Dr. S. Sundaram (General Manager)'
    );
    setResolutionText('');
    setActiveModal(null);
    Alert.alert(
      t('union.discrepancies.caseResolvedTitle', 'Case Resolved'),
      t('union.discrepancies.caseResolvedMsg', { id: caseId }, `Discrepancy case #${caseId} closed by Union GM order.`)
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <DemoHeader
        title={t('union.discrepancies.title', 'District Discrepancy Ledger')}
        subtitle={t('union.discrepancies.subtitle', 'Cross-Facility Reconciliation & Integrity Audit')}
        showBack
        onBack={handleBackToHome}
      />

      <FlatList
        data={discrepancyCases}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            title={t('union.discrepancies.emptyTitle', 'No Discrepancies')}
            message={t('union.discrepancies.emptyDesc', 'No quantity variances reported across the district.')}
            icon="shield-checkmark-outline"
          />
        }
        renderItem={({ item }) => {
          const isOpen = item.status === 'open' || item.status === 'under_investigation';
          const isEscalated = item.status === 'escalated_to_union';
          const isResolved = item.status === 'resolved';

          const getBadge = () => {
            if (isEscalated) return { label: t('union.discrepancies.escalatedToGm', '⚠️ ESCALATED TO GM'), bg: '#FAF5FF', color: '#9333EA' };
            if (isOpen) return { label: t('union.discrepancies.openInvestigation', 'OPEN INVESTIGATION'), bg: '#FEF2F2', color: '#DC2626' };
            return { label: t('union.discrepancies.resolvedByAudit', 'RESOLVED BY AUDIT'), bg: '#DCFCE7', color: '#15803D' };
          };

          const badge = getBadge();

          return (
            <Card style={[styles.card, (isOpen || isEscalated) && { borderColor: '#EF4444', borderWidth: 1.5 }]}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                  <Text style={[Typography.headline, { color: colors.text, fontWeight: '900' }]}>
                    {t('union.discrepancies.caseTitle', { id: item.id }, `Case #${item.id}`)}
                  </Text>
                  <View style={styles.routeBox}>
                    <Text style={[Typography.caption2, { color: colors.textSecondary }]} numberOfLines={2}>
                      {t('union.discrepancies.origin', 'Origin:')} <Text style={{ color: colors.text, fontWeight: '600' }}>{item.boothName?.replace(/cooling booth/gi, 'Society').replace(/booth/gi, 'Society')}</Text>
                    </Text>
                    <Text style={[Typography.caption2, { color: colors.textSecondary, marginTop: 2 }]} numberOfLines={2}>
                      {t('union.discrepancies.destination', 'Destination:')} <Text style={{ color: colors.text, fontWeight: '600' }}>{item.bmcName}</Text>
                    </Text>
                  </View>
                </View>

                <View style={[styles.badge, { backgroundColor: badge.bg, flexShrink: 0 }]}>
                  <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
                </View>
              </View>

              {/* Quantities Table */}
              <View style={[styles.varianceBox, { backgroundColor: colors.background }]}>
                <View style={styles.vRow}>
                  <Text style={[Typography.caption1, { color: colors.textSecondary, flex: 1, minWidth: 0 }]}>
                    {t('union.discrepancies.societyDeclared', 'Society Declared Quantity:')}
                  </Text>
                  <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700', flexShrink: 0 }]}>
                    {item.declaredQuantity.toFixed(1)} L
                  </Text>
                </View>
                <View style={styles.vRow}>
                  <Text style={[Typography.caption1, { color: colors.textSecondary, flex: 1, minWidth: 0 }]}>
                    {t('union.discrepancies.bmcMeasured', 'BMC Intake Measured:')}
                  </Text>
                  <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700', flexShrink: 0 }]}>
                    {item.measuredQuantity.toFixed(1)} L
                  </Text>
                </View>
                <View style={[styles.vRow, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: 6, marginTop: 4 }]}>
                  <Text style={[Typography.subhead, { color: '#DC2626', fontWeight: '800', flex: 1, minWidth: 0 }]}>
                    {t('union.discrepancies.transitVariance', 'Transit Variance:')}
                  </Text>
                  <Text style={[Typography.headline, { color: '#DC2626', fontWeight: '900', flexShrink: 0 }]}>
                    -{item.differenceLitres.toFixed(1)} L ({item.differencePercent}%)
                  </Text>
                </View>
              </View>

              {/* Investigation Trail */}
              <View style={styles.trailBox}>
                <Text style={[Typography.caption1, { color: colors.text, fontWeight: '800', marginBottom: 4 }]}>
                  {t('union.discrepancies.investigationHistory', { count: item.investigationNotes.length }, `Investigation History (${item.investigationNotes.length} notes)`)}
                </Text>
                {item.investigationNotes.map((n) => (
                  <View key={n.id} style={styles.noteItem}>
                    <Text style={[Typography.caption2, { color: '#8e1111ff', fontWeight: '700' }]}>
                      {n.author?.replace(/booth staff/gi, 'Society Staff').replace(/booth/gi, 'Society')} • {n.timestamp}
                    </Text>
                    <Text style={[Typography.caption1, { color: '#1d1e52ff', marginTop: 2 }]}>
                      {n.note?.replace(/booth weigh-scale/gi, 'Society weigh-scale').replace(/booth weigh scale/gi, 'Society weigh-scale').replace(/booth/gi, 'society')}
                    </Text>
                    {n.evidenceReference && (
                      <Text style={[Typography.caption2, { color: '#059669', fontWeight: '600', marginTop: 2 }]}>
                        {t('union.discrepancies.tagLabel', { tag: n.evidenceReference }, `Tag: ${n.evidenceReference}`)}
                      </Text>
                    )}
                  </View>
                ))}

                {item.resolutionReason && (
                  <View style={[styles.resolutionBox, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
                    <Text style={[Typography.caption1, { color: '#166534', fontWeight: '800' }]}>
                      {t('union.discrepancies.finalResolution', { reason: item.resolutionReason?.replace(/booth/gi, 'society') }, `✓ FINAL RESOLUTION: ${item.resolutionReason?.replace(/booth/gi, 'society')}`)}
                    </Text>
                    <Text style={[Typography.caption2, { color: '#15803D', marginTop: 2 }]}>
                      {t('union.discrepancies.closedByOn', { by: item.resolvedBy || '', date: item.resolvedAt?.split('T')[0] || '' }, `Closed by: ${item.resolvedBy} on ${item.resolvedAt?.split('T')[0]}`)}
                    </Text>
                  </View>
                )}
              </View>

              {/* Actions */}
              <View style={styles.actionRow}>
                <Button
                  title={t('union.discrepancies.issueDirectiveBtn', '+ Issue GM Directive')}
                  variant="secondary"
                  size="sm"
                  onPress={() => {
                    setSelectedCase(item);
                    setActiveModal('directive');
                  }}
                  style={{ flex: 1 }}
                />

                {!isResolved && (
                  <Button
                    title={t('union.discrepancies.resolveOrderBtn', 'Resolve Case by Order')}
                    size="sm"
                    onPress={() => {
                      setSelectedCase(item);
                      setActiveModal('resolve');
                    }}
                    style={{ flex: 1 }}
                  />
                )}
              </View>
            </Card>
          );
        }}
      />

      {/* Directive Modal */}
      {activeModal === 'directive' && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setActiveModal(null)}>
          <Pressable style={styles.modalOverlay} onPress={() => setActiveModal(null)}>
            <View style={[styles.modalSheet, { backgroundColor: colors.card }]} onStartShouldSetResponder={() => true}>
              <View style={styles.modalHeader}>
                <Text style={[Typography.title2, { color: colors.text, fontWeight: '800' }]}>
                  {t('union.discrepancies.issueDirectiveModalTitle', 'Issue Executive Directive')}
                </Text>
                <Pressable onPress={() => setActiveModal(null)}><Ionicons name="close" size={24} color={colors.text} /></Pressable>
              </View>
              <TextInput
                placeholder={t('union.discrepancies.directivePlaceholder', 'e.g. Mandatory re-calibration of tanker flow meters required within 24 hours.')}
                placeholderTextColor={colors.textMuted}
                value={directiveText}
                onChangeText={setDirectiveText}
                multiline
                numberOfLines={3}
                style={[styles.inputField, { color: colors.text, borderColor: colors.border }]}
              />
              <Button 
                title={t('union.discrepancies.issueOrderBtn', 'Issue Order')} 
                onPress={handleAddDirective} 
                style={{ marginTop: 14 }} 
              />
            </View>
          </Pressable>
        </Modal>
      )}

      {/* Resolve Modal */}
      {activeModal === 'resolve' && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setActiveModal(null)}>
          <Pressable style={styles.modalOverlay} onPress={() => setActiveModal(null)}>
            <View style={[styles.modalSheet, { backgroundColor: colors.card }]} onStartShouldSetResponder={() => true}>
              <View style={styles.modalHeader}>
                <Text style={[Typography.title2, { color: colors.text, fontWeight: '800' }]}>
                  {t('union.discrepancies.resolveModalTitle', 'Resolve Discrepancy Case')}
                </Text>
                <Pressable onPress={() => setActiveModal(null)}><Ionicons name="close" size={24} color={colors.text} /></Pressable>
              </View>
              <TextInput
                placeholder={t('union.discrepancies.resolvePlaceholder', 'e.g. Joint physical audit verified variance within acceptable evaporation allowance.')}
                placeholderTextColor={colors.textMuted}
                value={resolutionText}
                onChangeText={setResolutionText}
                multiline
                numberOfLines={3}
                style={[styles.inputField, { color: colors.text, borderColor: colors.border }]}
              />
              <Button 
                title={t('union.discrepancies.closeCaseBtn', 'Close Discrepancy Case')} 
                onPress={handleUnionResolve} 
                style={{ marginTop: 14 }} 
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
  listContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 40,
  },
  card: {
    padding: 16,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  routeBox: {
    marginTop: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flexShrink: 0,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  varianceBox: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    gap: 6,
  },
  vRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  trailBox: {
    gap: 6,
    marginBottom: 10,
  },
  noteItem: {
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#7C3AED',
  },
  resolutionBox: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
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
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  inputField: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
  },
});
