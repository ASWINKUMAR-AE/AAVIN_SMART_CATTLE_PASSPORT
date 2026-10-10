import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, RefreshControl, Alert } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/TextField';
import { StatusChip } from '../../components/ui/StatusChip';
import { api } from '../../services/api';
import { Ionicons } from '@expo/vector-icons';

export default function SafetyReviewsScreen() {
  const { colors } = useTheme();

  const [collections, setCollections] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const res = await api.get('/collections?limit=50');
      if (res.data?.data) {
        // Filter those with REVIEW, HOLD, or requested override
        const flagged = res.data.data.filter(
          (c: any) => c.safety_decision !== 'CLEAR' || c.override_status === 'requested'
        );
        setCollections(flagged);
        if (flagged.length > 0 && !selectedItem) {
          setSelectedItem(flagged[0]);
        }
      }
    } catch (e) {
      console.warn('Failed to load safety reviews:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, []);

  const handleDecision = async (action: 'approved' | 'rejected', overrideDecision?: 'CLEAR' | 'HOLD') => {
    if (!selectedItem) return;
    if (!overrideReason.trim()) {
      Alert.alert('Justification Required', 'Please enter supervisory audit justification reason.');
      return;
    }

    setProcessing(true);
    try {
      await api.post('/admin/review-decision', {
        collectionRecordId: selectedItem.id,
        action,
        overrideDecision,
        reason: overrideReason.trim(),
      });

      Alert.alert(
        'Review Decision Recorded',
        `Decision for receipt ${selectedItem.receipt_number} updated to ${overrideDecision || action.toUpperCase()}. Logged in audit trail.`
      );
      setOverrideReason('');
      loadReviews();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadReviews} tintColor={colors.primary} />}
    >
      <Text style={[Typography.title2, { color: colors.text, marginHorizontal: 16, marginTop: 8, marginBottom: 12 }]}>
        Milk Safety Exception Queue
      </Text>

      {/* Review Queue Items */}
      {collections.map((item) => {
        const isSelected = selectedItem?.id === item.id;
        return (
          <Card
            key={item.id}
            onPress={() => setSelectedItem(item)}
            style={[
              styles.reviewCard,
              isSelected && { borderColor: colors.primary, borderWidth: 2 },
            ]}
          >
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[Typography.headline, { color: colors.text }]}>
                  Receipt #{item.receipt_number}
                </Text>
                <Text style={[Typography.footnote, { color: colors.textSecondary }]}>
                  Farmer: {item.farmer_name} • Cow: {item.cow_name} (#{item.tag_number})
                </Text>
              </View>
              <StatusChip status={item.safety_decision} />
            </View>

            <View style={[styles.reasonBox, { backgroundColor: item.safety_decision === 'HOLD' ? colors.holdBg : colors.reviewBg }]}>
              <Text style={[Typography.caption1, { color: colors.text, fontWeight: '600' }]}>
                {item.safety_reason || 'Flagged for quality evaluation'}
              </Text>
            </View>

            <View style={styles.metricsRow}>
              <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                FAT: {item.fat_percentage}% • SNF: {item.snf_percentage}% • Qty: {item.quantity_litres} L
              </Text>
              <Text style={[Typography.caption2, { color: colors.primary, fontWeight: '700' }]}>
                {isSelected ? 'SELECTED FOR REVIEW' : 'TAP TO REVIEW →'}
              </Text>
            </View>
          </Card>
        );
      })}

      {/* Selected Item Review & Override Panel */}
      {selectedItem && (
        <Card style={styles.actionPanel}>
          <Text style={[Typography.title3, { color: colors.text, marginBottom: 8 }]}>
            Supervisor Adjudication: #{selectedItem.receipt_number}
          </Text>

          <TextField
            label="Supervisory Audit Justification Reason *"
            placeholder="Enter reason for approving CLEAR or upholding HOLD..."
            value={overrideReason}
            onChangeText={setOverrideReason}
            multiline
            numberOfLines={2}
          />

          <View style={styles.btnRow}>
            <Button
              title="Override & Authorize CLEAR"
              icon="checkmark-circle-outline"
              loading={processing}
              onPress={() => handleDecision('approved', 'CLEAR')}
              style={{ flex: 1, marginRight: 6 }}
            />
            <Button
              title="Uphold HOLD"
              variant="destructive"
              icon="close-circle-outline"
              loading={processing}
              onPress={() => handleDecision('rejected', 'HOLD')}
              style={{ flex: 1, marginLeft: 6 }}
            />
          </View>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 40,
  },
  reviewCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  reasonBox: {
    padding: 8,
    borderRadius: 8,
    marginVertical: 8,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  actionPanel: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
  },
  btnRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
});
