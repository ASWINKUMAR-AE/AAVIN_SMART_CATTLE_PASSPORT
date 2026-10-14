import React, { useState } from 'react';
import { StyleSheet, View, Text, FlatList, TextInput, Alert, Modal, Pressable } from 'react-native';
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

export default function BMCInvestigationsScreen() {
  const { user } = useAuth();
  const { 
    discrepancyCases, 
    bmcs, 
    addInvestigationNote, 
    resolveDiscrepancyCase, 
    escalateDiscrepancyCase 
  } = useAavinStore();
  const { colors } = useTheme();
  const { t } = useTranslation();

  const bmcId = user?.associatedId || 'BMC001';
  const bmc = bmcs.find(b => b.id === bmcId) || bmcs[0];

  const myCases = discrepancyCases.filter(c => c.bmcId === bmc.id);

  const [selectedCase, setSelectedCase] = useState<DiscrepancyCase | null>(null);
  const [activeModal, setActiveModal] = useState<'note' | 'resolve' | 'escalate' | null>(null);

  // Form inputs
  const [newNote, setNewNote] = useState('');
  const [evidenceRef, setEvidenceRef] = useState('');
  const [resolutionReason, setResolutionReason] = useState('');
  const [escalationReason, setEscalationReason] = useState('');

  const handleAddNote = () => {
    if (!selectedCase || !newNote.trim()) return;
    addInvestigationNote(
      selectedCase.id,
      newNote.trim(),
      user?.fullName || 'R. Sundar (BMC In-Charge)',
      evidenceRef.trim() || undefined
    );
    setNewNote('');
    setEvidenceRef('');
    setActiveModal(null);
    Alert.alert(t('bmc.noteAppendedTitle'), t('bmc.noteAppendedMsg'));
  };

  const handleResolveCase = () => {
    if (!selectedCase || !resolutionReason.trim()) {
      Alert.alert(t('bmc.reasonRequired'), t('bmc.justificationRequired'));
      return;
    }
    resolveDiscrepancyCase(
      selectedCase.id,
      resolutionReason.trim(),
      user?.fullName || 'R. Sundar (BMC In-Charge)'
    );
    setResolutionReason('');
    setActiveModal(null);
    Alert.alert(t('bmc.caseResolvedTitle'), t('bmc.caseResolvedMsg', { id: selectedCase.id }));
  };

  const handleEscalateCase = () => {
    if (!selectedCase || !escalationReason.trim()) {
      Alert.alert(t('bmc.reasonRequired'), t('bmc.escalationReasonRequired'));
      return;
    }
    escalateDiscrepancyCase(selectedCase.id, escalationReason.trim());
    setEscalationReason('');
    setActiveModal(null);
    Alert.alert(t('bmc.caseEscalatedTitle'), t('bmc.caseEscalatedMsg', { id: selectedCase.id }));
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <DemoHeader 
        title={t('bmc.investigationsTitle')}
        subtitle={t('bmc.investigationsSubtitle', { name: bmc.name })}
        showBack
      />

      <FlatList
        data={myCases}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            title={t('bmc.noDiscrepanciesTitle')}
            message={t('bmc.noDiscrepanciesMsg')}
            icon="checkmark-done-circle-outline"
          />
        }
        renderItem={({ item }) => {
          const isOpen = item.status === 'open' || item.status === 'under_investigation';
          const isEscalated = item.status === 'escalated_to_union';

          const getStatusBadge = () => {
            if (isOpen) return { label: t('bmc.openInvestigationCaps'), bg: '#FEF2F2', color: '#DC2626' };
            if (isEscalated) return { label: t('bmc.escalatedToUnionCaps'), bg: '#FAF5FF', color: '#9333EA' };
            return { label: t('bmc.resolvedClosedCaps'), bg: '#DCFCE7', color: '#15803D' };
          };

          const badge = getStatusBadge();

          return (
            <Card style={[styles.card, isOpen && { borderColor: '#EF4444', borderWidth: 1.5 }]}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                  <Text style={[Typography.headline, { color: colors.text, fontWeight: '900' }]}>
                    {t('bmc.caseNumber', { id: item.id })}
                  </Text>
                  <Text style={[Typography.caption2, { color: colors.textSecondary, marginTop: 2 }]} numberOfLines={2}>
                    {t('bmc.feederDate', {
                      booth: item.boothName?.replace(/cooling booth/gi, 'Society').replace(/booth/gi, 'Society'),
                      date: item.collectionDate
                    })}
                  </Text>
                </View>

                <View style={[styles.statusBadge, { backgroundColor: badge.bg, flexShrink: 0 }]}>
                  <Text style={[styles.statusText, { color: badge.color }]}>{badge.label}</Text>
                </View>
              </View>

              {/* Quantities & Difference Alert */}
              <View style={[styles.varianceBox, { backgroundColor: colors.background }]}>
                <View style={styles.varianceRow}>
                  <Text style={[Typography.caption1, { color: colors.textSecondary, flex: 1, minWidth: 0 }]}>{t('bmc.declaredBySociety')}</Text>
                  <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700', flexShrink: 0 }]}>{item.declaredQuantity.toFixed(1)} L</Text>
                </View>
                <View style={styles.varianceRow}>
                  <Text style={[Typography.caption1, { color: colors.textSecondary, flex: 1, minWidth: 0 }]}>{t('bmc.measuredByBmc')}</Text>
                  <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700', flexShrink: 0 }]}>{item.measuredQuantity.toFixed(1)} L</Text>
                </View>
                <View style={[styles.varianceRow, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: 6, marginTop: 4 }]}>
                  <Text style={[Typography.subhead, { color: '#DC2626', fontWeight: '800', flex: 1, minWidth: 0 }]}>{t('bmc.discrepancyVariance')}</Text>
                  <Text style={[Typography.headline, { color: '#DC2626', fontWeight: '900', flexShrink: 0 }]}>
                    -{item.differenceLitres.toFixed(1)} L ({item.differencePercent}%)
                  </Text>
                </View>
              </View>

              {/* Investigation Notes & Evidence Log */}
              <View style={styles.notesSection}>
                <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800', marginBottom: 6 }]}>
                  {t('bmc.investigationLog', { count: item.investigationNotes.length })}
                </Text>

                {item.investigationNotes.map((note) => (
                  <View key={note.id} style={styles.noteItem}>
                    <View style={styles.noteAuthorRow}>
                      <Text style={[Typography.caption1, { color: colors.primary, fontWeight: '700' }]}>
                        {note.author?.replace(/booth staff/gi, 'Society Staff').replace(/booth/gi, 'Society')}
                      </Text>
                      <Text style={[Typography.caption2, { color: colors.textMuted }]}>{note.timestamp}</Text>
                    </View>
                    <Text style={[Typography.caption1, { color: colors.text, marginTop: 2 }]}>
                      {note.note?.replace(/booth weigh-scale/gi, 'Society weigh-scale').replace(/booth weigh scale/gi, 'Society weigh-scale').replace(/booth/gi, 'society')}
                    </Text>
                    {note.evidenceReference && (
                      <Text style={[Typography.caption2, { color: '#047857', fontWeight: '600', marginTop: 2 }]}>
                        {t('bmc.evidenceTag', { tag: note.evidenceReference })}
                      </Text>
                    )}
                  </View>
                ))}

                {item.resolutionReason && (
                  <View style={[styles.resolutionBox, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
                    <Text style={[Typography.caption1, { color: '#166534', fontWeight: '800' }]}>
                      {t('bmc.resolutionPrefix', { reason: item.resolutionReason })}
                    </Text>
                    <Text style={[Typography.caption2, { color: '#15803D', marginTop: 2 }]}>
                      {t('bmc.resolvedByOn', { by: item.resolvedBy || '', date: item.resolvedAt?.split('T')[0] || '' })}
                    </Text>
                  </View>
                )}
              </View>

              {/* Action Buttons */}
              <View style={styles.actionRow}>
                <Button
                  title={t('bmc.addNote')}
                  variant="secondary"
                  size="sm"
                  onPress={() => {
                    setSelectedCase(item);
                    setActiveModal('note');
                  }}
                  style={{ flex: 1 }}
                />

                {isOpen && (
                  <>
                    <Button
                      title={t('bmc.resolveCase')}
                      size="sm"
                      onPress={() => {
                        setSelectedCase(item);
                        setActiveModal('resolve');
                      }}
                      style={{ flex: 1 }}
                    />

                    <Button
                      title={t('bmc.escalate')}
                      variant="destructive"
                      size="sm"
                      onPress={() => {
                        setSelectedCase(item);
                        setActiveModal('escalate');
                      }}
                      style={{ flex: 1 }}
                    />
                  </>
                )}
              </View>
            </Card>
          );
        }}
      />

      {/* Add Note Modal */}
      {activeModal === 'note' && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setActiveModal(null)}>
          <Pressable style={styles.modalOverlay} onPress={() => setActiveModal(null)}>
            <View style={[styles.modalSheet, { backgroundColor: colors.card }]} onStartShouldSetResponder={() => true}>
              <View style={styles.modalHeader}>
                <Text style={[Typography.title2, { color: colors.text, fontWeight: '800' }]}>{t('bmc.addNoteModalTitle')}</Text>
                <Pressable onPress={() => setActiveModal(null)}><Ionicons name="close" size={24} color={colors.text} /></Pressable>
              </View>
              <Text style={[Typography.caption1, { color: colors.textSecondary, marginBottom: 4 }]}>{t('bmc.findingLabel')}</Text>
              <TextInput
                placeholder={t('bmc.findingPlaceholder')}
                placeholderTextColor={colors.textMuted}
                value={newNote}
                onChangeText={setNewNote}
                multiline
                numberOfLines={3}
                style={[styles.inputField, { color: colors.text, borderColor: colors.border }]}
              />
              <Text style={[Typography.caption1, { color: colors.textSecondary, marginBottom: 4, marginTop: 10 }]}>{t('bmc.evidenceRefLabel')}</Text>
              <TextInput
                placeholder={t('bmc.evidenceRefPlaceholder')}
                placeholderTextColor={colors.textMuted}
                value={evidenceRef}
                onChangeText={setEvidenceRef}
                style={[styles.inputField, { color: colors.text, borderColor: colors.border }]}
              />
              <Button title={t('bmc.saveNoteBtn')} onPress={handleAddNote} style={{ marginTop: 14 }} />
            </View>
          </Pressable>
        </Modal>
      )}

      {/* Resolve Case Modal */}
      {activeModal === 'resolve' && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setActiveModal(null)}>
          <Pressable style={styles.modalOverlay} onPress={() => setActiveModal(null)}>
            <View style={[styles.modalSheet, { backgroundColor: colors.card }]} onStartShouldSetResponder={() => true}>
              <View style={styles.modalHeader}>
                <Text style={[Typography.title2, { color: colors.text, fontWeight: '800' }]}>{t('bmc.resolveModalTitle')}</Text>
                <Pressable onPress={() => setActiveModal(null)}><Ionicons name="close" size={24} color={colors.text} /></Pressable>
              </View>
              <Text style={[Typography.caption1, { color: colors.textSecondary, marginBottom: 4 }]}>{t('bmc.justificationLabel')}</Text>
              <TextInput
                placeholder={t('bmc.justificationPlaceholder')}
                placeholderTextColor={colors.textMuted}
                value={resolutionReason}
                onChangeText={setResolutionReason}
                multiline
                numberOfLines={3}
                style={[styles.inputField, { color: colors.text, borderColor: colors.border }]}
              />
              <Button title={t('bmc.closeCaseBtn')} onPress={handleResolveCase} style={{ marginTop: 14 }} />
            </View>
          </Pressable>
        </Modal>
      )}

      {/* Escalate Modal */}
      {activeModal === 'escalate' && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setActiveModal(null)}>
          <Pressable style={styles.modalOverlay} onPress={() => setActiveModal(null)}>
            <View style={[styles.modalSheet, { backgroundColor: colors.card }]} onStartShouldSetResponder={() => true}>
              <View style={styles.modalHeader}>
                <Text style={[Typography.title2, { color: colors.text, fontWeight: '800' }]}>{t('bmc.escalateModalTitle')}</Text>
                <Pressable onPress={() => setActiveModal(null)}><Ionicons name="close" size={24} color={colors.text} /></Pressable>
              </View>
              <Text style={[Typography.caption1, { color: colors.textSecondary, marginBottom: 4 }]}>{t('bmc.escalationConcernLabel')}</Text>
              <TextInput
                placeholder={t('bmc.escalationConcernPlaceholder')}
                placeholderTextColor={colors.textMuted}
                value={escalationReason}
                onChangeText={setEscalationReason}
                multiline
                numberOfLines={3}
                style={[styles.inputField, { color: colors.text, borderColor: colors.border }]}
              />
              <Button title={t('bmc.escalateToExecutiveBtn')} variant="destructive" onPress={handleEscalateCase} style={{ marginTop: 14 }} />
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
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flexShrink: 0,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  varianceBox: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    gap: 6,
  },
  varianceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  notesSection: {
    gap: 8,
    marginBottom: 12,
  },
  noteItem: {
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#0072BC',
  },
  noteAuthorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    marginTop: 4,
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
