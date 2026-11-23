import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import {
  FarmerBatchMonitoringResult,
  CowBatchYieldEstimate,
  MilkMonitoringAlert,
} from '../../services/monitoring/monitoringTypes';

interface FarmerMonitoringDetailModalProps {
  visible: boolean;
  onClose: () => void;
  result: FarmerBatchMonitoringResult | null;
  activeAlert?: MilkMonitoringAlert | null;
  onRecordReview: (alertId: string, reason: string, notes: string) => void;
  onEscalate: (alertId: string, notes: string) => void;
  onResolve: (alertId: string, notes: string) => void;
  userRole?: string;
}

const REVIEW_REASONS = [
  { id: 'missing_collection_entry', label: 'Missing collection entry / Late arrival' },
  { id: 'dry_cow', label: 'Cattle confirmed dry / non-lactating' },
  { id: 'animal_health_issue', label: 'Animal health issue / Mastitis under treatment' },
  { id: 'measurement_error', label: 'Measurement or weigh-scale error' },
  { id: 'cattle_registration_verification', label: 'Cattle registration requires verification' },
  { id: 'alternative_sale_or_supply', label: 'Alternative household use or local calf feeding' },
  { id: 'other', label: 'Other documented operational reason' },
];

export const FarmerMonitoringDetailModal: React.FC<FarmerMonitoringDetailModalProps> = ({
  visible,
  onClose,
  result,
  activeAlert,
  onRecordReview,
  onEscalate,
  onResolve,
  userRole = 'society',
}) => {
  const { colors } = useTheme();
  const [selectedReason, setSelectedReason] = useState<string>(REVIEW_REASONS[0].id);
  const [reviewNotes, setReviewNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!result) return null;

  const handleSubmitReview = () => {
    if (!activeAlert) {
      Alert.alert('Notice', 'No active alert record exists to attach an investigation note.');
      return;
    }
    if (!reviewNotes.trim()) {
      Alert.alert('Required', 'Please enter investigation notes.');
      return;
    }

    setIsSubmitting(true);
    try {
      const reasonObj = REVIEW_REASONS.find(r => r.id === selectedReason);
      onRecordReview(activeAlert.id, reasonObj ? reasonObj.label : selectedReason, reviewNotes.trim());
      Alert.alert('Investigation Saved', 'Society discrepancy reason has been documented.');
      setReviewNotes('');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEscalateToUnion = () => {
    if (!activeAlert) return;
    Alert.alert(
      'Escalate to Union',
      'Escalate this persistent or critical shortfall to the authorized District Union for field review?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Escalate',
          style: 'destructive',
          onPress: () => {
            onEscalate(activeAlert.id, reviewNotes.trim() || 'Escalated by Society operator.');
            Alert.alert('Escalated', 'Alert escalated to Union.');
            onClose();
          },
        },
      ]
    );
  };

  const handleResolveAlert = () => {
    if (!activeAlert) return;
    Alert.alert(
      'Resolve Alert',
      'Mark this milk supply alert as resolved?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Resolve',
          onPress: () => {
            onResolve(activeAlert.id, reviewNotes.trim() || 'Verified by Society operator.');
            Alert.alert('Resolved', 'Alert marked as resolved.');
            onClose();
          },
        },
      ]
    );
  };

  const getSeverityBadgeColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '#EF4444';
      case 'persistent':
        return '#9333EA';
      case 'warning':
        return '#F59E0B';
      case 'no_record':
        return '#DC2626';
      case 'insufficient_data':
        return '#6B7280';
      case 'supply_above_expected':
        return '#3B82F6';
      default:
        return '#10B981';
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <View style={styles.titleRow}>
                <Text style={[Typography.headline, { color: colors.text, fontWeight: '800' }]}>
                  {result.farmerName}
                </Text>
                <View
                  style={[
                    styles.severityBadge,
                    { backgroundColor: getSeverityBadgeColor(result.severity) },
                  ]}
                >
                  <Text style={styles.severityBadgeText}>{result.severity.toUpperCase()}</Text>
                </View>
              </View>
              <Text style={[Typography.caption1, { color: colors.textSecondary }]}>
                Farmer ID: {result.farmerIdCode} • Date: {result.collectionDate} • {result.batch.toUpperCase()} BATCH
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
            {/* Quick Metrics Card */}
            <View style={[styles.metricsGrid, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <View style={styles.metricItem}>
                <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Declared Cows</Text>
                <Text style={[Typography.title3, { color: colors.text, fontWeight: '800' }]}>{result.declaredCows}</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Registered</Text>
                <Text style={[Typography.title3, { color: colors.text, fontWeight: '800' }]}>{result.registeredCows}</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Eligible Lactating</Text>
                <Text style={[Typography.title3, { color: '#16A34A', fontWeight: '800' }]}>{result.eligibleCows}</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Dry / Hold</Text>
                <Text style={[Typography.title3, { color: '#D97706', fontWeight: '800' }]}>
                  {result.dryCows + result.quarantineCows}
                </Text>
              </View>
            </View>

            {/* Milk Supply Overview Card */}
            <View style={[styles.supplyCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <View style={styles.supplyRow}>
                <View style={styles.supplyCol}>
                  <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Expected {result.batch}</Text>
                  <Text style={[Typography.title2, { color: colors.primary, fontWeight: '800' }]}>
                    {result.expectedBatchLitres.toFixed(2)} <Text style={{ fontSize: 14 }}>L</Text>
                  </Text>
                </View>
                <View style={styles.vDivider} />
                <View style={styles.supplyCol}>
                  <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Actual Verified</Text>
                  <Text style={[Typography.title2, { color: colors.text, fontWeight: '800' }]}>
                    {result.hasRecord ? `${result.actualBatchLitres.toFixed(2)} L` : 'No Entry'}
                  </Text>
                </View>
                <View style={styles.vDivider} />
                <View style={styles.supplyCol}>
                  <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Shortfall Gap</Text>
                  <Text
                    style={[
                      Typography.title2,
                      {
                        color: result.batchGapLitres > 0 ? '#EF4444' : '#10B981',
                        fontWeight: '800',
                      },
                    ]}
                  >
                    {result.batchGapLitres > 0 ? `-${result.batchGapLitres.toFixed(2)} L` : '0.00 L'}
                  </Text>
                  {result.batchGapPercentage !== null && (
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#EF4444' }}>
                      ({result.batchGapPercentage.toFixed(1)}% gap)
                    </Text>
                  )}
                </View>
              </View>
            </View>

            {/* Data Quality Warnings */}
            {result.dataQualityIssues.length > 0 && (
              <View style={styles.issuesBox}>
                <Ionicons name="warning-outline" size={18} color="#D97706" style={{ marginTop: 2 }} />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={[Typography.caption1, { color: '#B45309', fontWeight: '800' }]}>
                    Data Quality & Verification Warnings:
                  </Text>
                  {result.dataQualityIssues.map((issue, idx) => (
                    <Text key={idx} style={[Typography.caption2, { color: '#92400E' }]}>
                      • {issue}
                    </Text>
                  ))}
                </View>
              </View>
            )}

            {/* Registered Cows Breakdown */}
            <View style={styles.sectionHeader}>
              <Ionicons name="list" size={16} color={colors.primary} />
              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800', marginLeft: 6 }]}>
                Cow-Wise Expected Yield Calculation ({result.cowEstimates.length})
              </Text>
            </View>

            {result.cowEstimates.map(cow => (
              <View
                key={cow.cowId}
                style={[
                  styles.cowCard,
                  { backgroundColor: colors.background, borderColor: colors.border },
                ]}
              >
                <View style={styles.cowCardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]}>
                      {cow.name} ({cow.breed})
                    </Text>
                    <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                      Tag #{cow.tagId} • Source: {cow.dataSource}
                    </Text>
                  </View>
                  <View style={styles.cowExpectedPill}>
                    <Text style={styles.cowExpectedPillText}>
                      {cow.expectedLitres.toFixed(1)} L expected
                    </Text>
                  </View>
                </View>

                {cow.eligibilityStatus !== 'eligible' ? (
                  <View style={styles.ineligibleNotice}>
                    <Ionicons name="alert-circle" size={14} color="#D97706" />
                    <Text style={styles.ineligibleNoticeText}>
                      {cow.unavailabilityReason || 'Cow not eligible for current milk production.'}
                    </Text>
                  </View>
                ) : (
                  <Text style={[Typography.caption2, { color: colors.textSecondary, marginTop: 4 }]}>
                    {cow.notes || `Reliability: ${cow.reliabilityCategory.toUpperCase()} • ${cow.baselinePeriod}`}
                  </Text>
                )}
              </View>
            ))}

            {/* Active Alert & Investigation Actions */}
            {activeAlert && (
              <View style={[styles.reviewSection, { borderColor: colors.border }]}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="clipboard" size={16} color={colors.primary} />
                  <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800', marginLeft: 6 }]}>
                    Society Discrepancy Investigation & Review
                  </Text>
                </View>

                {activeAlert.reviewReason ? (
                  <View style={styles.existingReviewBox}>
                    <Text style={[Typography.caption1, { color: colors.text, fontWeight: '800' }]}>
                      Existing Review: {activeAlert.reviewReason}
                    </Text>
                    <Text style={[Typography.caption2, { color: colors.textSecondary, marginTop: 2 }]}>
                      "{activeAlert.reviewNotes}"
                    </Text>
                    <Text style={[Typography.caption2, { color: colors.textMuted, marginTop: 4 }]}>
                      Reviewed by: {activeAlert.reviewedBy} at {activeAlert.reviewedAt?.slice(0, 16)}
                    </Text>
                  </View>
                ) : (
                  <Text style={[Typography.caption2, { color: colors.textSecondary, marginBottom: 8 }]}>
                    Document the verified on-ground reason for this milk supply discrepancy.
                  </Text>
                )}

                {/* Reason Selection */}
                <Text style={[Typography.caption1, { color: colors.text, fontWeight: '700', marginBottom: 6 }]}>
                  Select Discrepancy Reason:
                </Text>
                <View style={styles.reasonsList}>
                  {REVIEW_REASONS.map(r => (
                    <Pressable
                      key={r.id}
                      onPress={() => setSelectedReason(r.id)}
                      style={[
                        styles.reasonRadio,
                        {
                          borderColor: selectedReason === r.id ? colors.primary : colors.border,
                          backgroundColor: selectedReason === r.id ? colors.primaryLight : colors.background,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.radioDot,
                          { borderColor: colors.primary, backgroundColor: selectedReason === r.id ? colors.primary : 'transparent' },
                        ]}
                      />
                      <Text style={[Typography.caption2, { color: colors.text, flex: 1 }]}>{r.label}</Text>
                    </Pressable>
                  ))}
                </View>

                {/* Notes Input */}
                <Text style={[Typography.caption1, { color: colors.text, fontWeight: '700', marginTop: 10, marginBottom: 4 }]}>
                  Investigation Notes / Veterinary References:
                </Text>
                <TextInput
                  value={reviewNotes}
                  onChangeText={setReviewNotes}
                  placeholder="Enter specific facts (e.g. cow calved yesterday, evening delivery delayed, vet memo ref)..."
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={3}
                  style={[
                    styles.notesInput,
                    { color: colors.text, borderColor: colors.border, backgroundColor: colors.background },
                  ]}
                />

                {/* Action Buttons */}
                <View style={styles.actionRow}>
                  <Pressable
                    onPress={handleSubmitReview}
                    disabled={isSubmitting}
                    style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                  >
                    <Ionicons name="save-outline" size={16} color="#FFF" />
                    <Text style={styles.btnText}>Save Society Review</Text>
                  </Pressable>

                  {userRole !== 'farmer' && (
                    <Pressable
                      onPress={handleEscalateToUnion}
                      style={[styles.escalateBtn, { backgroundColor: '#7C3AED' }]}
                    >
                      <Ionicons name="arrow-up-circle-outline" size={16} color="#FFF" />
                      <Text style={styles.btnText}>Escalate to Union</Text>
                    </Pressable>
                  )}

                  <Pressable
                    onPress={handleResolveAlert}
                    style={[styles.resolveBtn, { backgroundColor: '#10B981' }]}
                  >
                    <Ionicons name="checkmark-done" size={16} color="#FFF" />
                    <Text style={styles.btnText}>Resolve</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    padding: 16,
  },
  container: {
    maxHeight: '90%',
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  closeBtn: {
    padding: 6,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  severityBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
  },
  scrollArea: {
    flexGrow: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  supplyCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  supplyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  supplyCol: {
    alignItems: 'center',
    flex: 1,
  },
  vDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E2E8F0',
  },
  issuesBox: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 4,
  },
  cowCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 4,
  },
  cowCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cowExpectedPill: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cowExpectedPillText: {
    color: '#0284C7',
    fontSize: 12,
    fontWeight: '800',
  },
  ineligibleNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    backgroundColor: '#FFFBEB',
    padding: 6,
    borderRadius: 6,
  },
  ineligibleNoticeText: {
    fontSize: 11,
    color: '#B45309',
    flex: 1,
    fontWeight: '600',
  },
  reviewSection: {
    borderTopWidth: 1,
    paddingTop: 14,
    marginTop: 8,
  },
  existingReviewBox: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  reasonsList: {
    gap: 6,
  },
  reasonRadio: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    gap: 8,
  },
  radioDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  escalateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 4,
  },
  resolveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 4,
  },
  btnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },
});
