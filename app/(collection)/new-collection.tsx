import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Alert, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/TextField';
import { StatusChip } from '../../components/ui/StatusChip';
import { QRScannerModal } from '../../components/scanner/QRScannerModal';
import { SafetyDecisionReveal } from '../../components/ui/SafetyDecisionReveal';
import { api } from '../../services/api';
import { Ionicons } from '@expo/vector-icons';

export default function NewCollectionScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [cowIdentifier, setCowIdentifier] = useState('TN-MDU-COW-1001');
  const [selectedCow, setSelectedCow] = useState<any>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);

  // Milk & Analyzer Readings
  const [litres, setLitres] = useState('7.50');
  const [fat, setFat] = useState('4.30');
  const [snf, setSnf] = useState('8.70');
  const [temperature, setTemperature] = useState('7.2');
  const [density, setDensity] = useState('1.0285');
  const [adulterationDetected, setAdulterationDetected] = useState(false);
  const [equipmentId, setEquipmentId] = useState('ECO-MILK-ULTRA-MDU-01');

  const [evaluating, setEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<any>(null);
  const [reviewReason, setReviewReason] = useState('');
  const [requestingReview, setRequestingReview] = useState(false);

  useEffect(() => {
    handleLookupCow(cowIdentifier);
  }, []);

  const handleLookupCow = async (identifierToLookup: string) => {
    if (!identifierToLookup.trim()) return;
    setLookingUp(true);
    setEvaluationResult(null);
    try {
      const res = await api.get(`/cows/lookup/${encodeURIComponent(identifierToLookup.trim())}`);
      if (res.data?.data) {
        setSelectedCow(res.data.data);
      } else {
        setSelectedCow(null);
        Alert.alert('Cattle Not Found', 'No record matches this QR token or tag ID');
      }
    } catch (e: any) {
      setSelectedCow(null);
      Alert.alert('Lookup Error', e.response?.data?.message || e.message);
    } finally {
      setLookingUp(false);
    }
  };

  const handleFillDemoData = (type: 'CLEAR' | 'REVIEW' | 'HOLD') => {
    if (type === 'CLEAR') {
      setCowIdentifier('TN-MDU-COW-1001');
      handleLookupCow('TN-MDU-COW-1001');
      setLitres('7.50');
      setFat('4.30');
      setSnf('8.70');
      setTemperature('7.2');
      setAdulterationDetected(false);
    } else if (type === 'REVIEW') {
      setCowIdentifier('TN-MDU-COW-1003');
      handleLookupCow('TN-MDU-COW-1003');
      setLitres('5.00');
      setFat('3.30'); // In 3.0-3.49% review boundary
      setSnf('8.40'); // In 8.0-8.49% review boundary
      setTemperature('8.1');
      setAdulterationDetected(false);
    } else {
      // Cow 1002 has active veterinary withdrawal restriction in seed data
      setCowIdentifier('TN-MDU-COW-1002');
      handleLookupCow('TN-MDU-COW-1002');
      setLitres('7.00');
      setFat('4.10');
      setSnf('8.60');
      setTemperature('7.8');
      setAdulterationDetected(false);
    }
  };

  const handleEvaluateAndCollect = async () => {
    if (!selectedCow || !litres || !fat || !snf) {
      Alert.alert('Required Fields', 'Please ensure cattle is selected and all measurements are filled');
      return;
    }

    setEvaluating(true);
    try {
      const res = await api.post('/collections', {
        centreId: selectedCow.primary_centre_id || selectedCow.centre_id || 'cc-melur-01',
        farmerUserId: selectedCow.current_owner_user_id || selectedCow.owner_id,
        cowId: selectedCow.id,
        quantityLitres: parseFloat(litres),
        temperatureC: parseFloat(temperature) || 7.0,
        fatPercent: parseFloat(fat),
        snfPercent: parseFloat(snf),
        densityGcm3: parseFloat(density) || 1.028,
        adulterationDetected,
        equipmentDeviceId: equipmentId,
        isDemoData: true,
      });

      if (res.data?.data) {
        setEvaluationResult(res.data.data);
      }
    } catch (err: any) {
      Alert.alert('Intake Error', err.response?.data?.message || err.message);
    } finally {
      setEvaluating(false);
    }
  };

  const handleRequestReview = async () => {
    if (!reviewReason.trim()) {
      Alert.alert('Reason Required', 'Please specify justification for supervisory review');
      return;
    }
    setRequestingReview(true);
    try {
      await api.post(`/collections/${evaluationResult.collectionId}/request-review`, {
        reason: reviewReason.trim(),
      });
      Alert.alert('Review Requested', 'Supervisory review ticket submitted for Aavin Admin approval.');
      setReviewReason('');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || err.message);
    } finally {
      setRequestingReview(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      {/* 1. Cow Identification Card */}
      <Card>
        <View style={styles.cardHeaderRow}>
          <Text style={[Typography.title3, { color: colors.text }]}>
            1. Cattle Identification
          </Text>
          <Button
            title="Scan Ear-Tag QR"
            icon="camera"
            size="sm"
            onPress={() => setScannerVisible(true)}
          />
        </View>

        <View style={styles.searchRow}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <TextField
              value={cowIdentifier}
              onChangeText={setCowIdentifier}
              placeholder="Tag # (e.g. TN-MDU-COW-1001)"
              autoCapitalize="characters"
              clearButton
            />
          </View>
          <Button
            title="Lookup"
            variant="secondary"
            size="sm"
            loading={lookingUp}
            onPress={() => handleLookupCow(cowIdentifier)}
          />
        </View>

        {selectedCow && (
          <View style={[styles.cowPreviewBox, { backgroundColor: colors.primaryLight, borderColor: colors.border }]}>
            <View style={styles.cowPreviewHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[Typography.headline, { color: colors.text }]}>
                  {selectedCow.name} (Tag #{selectedCow.tag_number})
                </Text>
                <Text style={[Typography.footnote, { color: colors.textSecondary }]}>
                  Owner: {selectedCow.owner_name} • Village: {selectedCow.owner_village || 'Melur'}
                </Text>
              </View>
              <StatusChip
                status={selectedCow.active_withdrawal_status === 'active' ? 'HOLD' : selectedCow.health_status}
              />
            </View>

            {selectedCow.active_withdrawal_status === 'active' && (
              <View style={[styles.withdrawalAlert, { backgroundColor: colors.holdBg }]}>
                <Ionicons name="warning" size={16} color={colors.hold} style={{ marginRight: 6 }} />
                <Text style={[Typography.caption1, { color: colors.hold, fontWeight: '700', flex: 1 }]}>
                  VET WITHDRAWAL ACTIVE: Milk withholding in force until {new Date(selectedCow.withdrawal_end_time).toLocaleDateString('en-IN')}.
                </Text>
              </View>
            )}
          </View>
        )}
      </Card>

      {/* Quick Test Demo Scenarios */}
      <View style={styles.demoFillSection}>
        <Text style={[Typography.caption1, { color: colors.textSecondary, marginBottom: 6, fontWeight: '700' }]}>
          DEMO PRE-FILL SCENARIOS:
        </Text>
        <View style={styles.demoButtonsRow}>
          <Button
            title="Standard CLEAR (Cow 1001)"
            variant="secondary"
            size="sm"
            onPress={() => handleFillDemoData('CLEAR')}
            style={{ flex: 1, marginRight: 4 }}
          />
          <Button
            title="Review Range (Cow 1003)"
            variant="secondary"
            size="sm"
            onPress={() => handleFillDemoData('REVIEW')}
            style={{ flex: 1, marginHorizontal: 2 }}
          />
          <Button
            title="Active HOLD (Cow 1002)"
            variant="secondary"
            size="sm"
            onPress={() => handleFillDemoData('HOLD')}
            style={{ flex: 1, marginLeft: 4 }}
          />
        </View>
      </View>

      {/* 2. Milk Intake & Analyzer Readings */}
      <Card>
        <Text style={[Typography.title3, { color: colors.text, marginBottom: 12 }]}>
          2. Milk Intake & Analyzer Data
        </Text>

        <TextField
          label="Quantity Delivered (Litres) *"
          value={litres}
          onChangeText={setLitres}
          keyboardType="decimal-pad"
        />

        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 6 }}>
            <TextField
              label="FAT Percentage (%) *"
              value={fat}
              onChangeText={setFat}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={{ flex: 1, marginLeft: 6 }}>
            <TextField
              label="SNF Percentage (%) *"
              value={snf}
              onChangeText={setSnf}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 6 }}>
            <TextField
              label="Intake Temp (°C) *"
              value={temperature}
              onChangeText={setTemperature}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={{ flex: 1, marginLeft: 6 }}>
            <TextField
              label="Density (g/cm³)"
              value={density}
              onChangeText={setDensity}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        {/* Adulteration Screening Switch */}
        <View style={[styles.switchRow, { borderColor: colors.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[Typography.headline, { color: colors.text }]}>
              Adulteration Chemical Screen
            </Text>
            <Text style={[Typography.caption1, { color: colors.textSecondary }]}>
              Urea, starch, detergent, neutralizers
            </Text>
          </View>
          <Switch
            value={adulterationDetected}
            onValueChange={setAdulterationDetected}
            trackColor={{ false: colors.border, true: colors.hold }}
            thumbColor={adulterationDetected ? '#FFFFFF' : '#FFFFFF'}
          />
        </View>
        {adulterationDetected && (
          <Text style={[Typography.caption2, { color: colors.hold, fontWeight: '700', marginTop: 4 }]}>
            ⚠️ Adulteration flagged! Mandatory food safety HOLD will be enforced.
          </Text>
        )}

        <Button
          title="Run Milk Safety Twin & Issue Receipt"
          onPress={handleEvaluateAndCollect}
          loading={evaluating}
          style={{ marginTop: 18 }}
        />
      </Card>

      {/* 3. Safety Twin Decision Reveal & Payment Receipt */}
      {evaluationResult && (
        <Card style={styles.resultCard}>
          <SafetyDecisionReveal
            decision={evaluationResult.safetyResult.decision}
            primaryReason={evaluationResult.safetyResult.primaryReason}
            evaluatedAt={evaluationResult.safetyResult.evaluatedAt}
          />

          {/* Transparent Payment Breakdown */}
          <View style={[styles.paymentBox, { backgroundColor: colors.primaryLight }]}>
            <View style={styles.payRow}>
              <Text style={[Typography.subhead, { color: colors.textSecondary }]}>Receipt Reference:</Text>
              <Text style={[Typography.headline, { color: colors.primary }]}>{evaluationResult.receiptNumber}</Text>
            </View>
            <View style={styles.payRow}>
              <Text style={[Typography.subhead, { color: colors.textSecondary }]}>Applied Rate:</Text>
              <Text style={[Typography.headline, { color: colors.text }]}>₹{evaluationResult.paymentCalc.ratePerLitre} / Litre</Text>
            </View>
            <View style={styles.payRow}>
              <Text style={[Typography.headline, { color: colors.text }]}>Payable Amount:</Text>
              <Text style={[Typography.title2, { color: colors.text, fontWeight: '800' }]}>
                ₹{evaluationResult.paymentCalc.totalAmountInr}
              </Text>
            </View>
          </View>

          <Button
            title="View Full Digital Receipt"
            icon="receipt-outline"
            onPress={() => router.push({ pathname: '/(collection)/receipt', params: { id: evaluationResult.collectionId } })}
            style={{ marginTop: 12 }}
          />

          {/* If REVIEW or HOLD, show override request workflow */}
          {evaluationResult.safetyResult.decision !== 'CLEAR' && (
            <View style={[styles.overrideSection, { borderTopColor: colors.separator }]}>
              <Text style={[Typography.headline, { color: colors.text, marginBottom: 4 }]}>
                Supervisory Review Request
              </Text>
              <Text style={[Typography.caption1, { color: colors.textSecondary, marginBottom: 8 }]}>
                Operators cannot override a HOLD without an authorized, audited review. Submit justification for admin review:
              </Text>
              <TextField
                placeholder="Enter justification for supervisory review..."
                value={reviewReason}
                onChangeText={setReviewReason}
              />
              <Button
                title="Submit Review Request to Admin"
                variant="outline"
                size="sm"
                loading={requestingReview}
                onPress={handleRequestReview}
                style={{ marginTop: 8 }}
              />
            </View>
          )}
        </Card>
      )}

      <QRScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onScan={(scanned) => {
          setCowIdentifier(scanned);
          handleLookupCow(scanned);
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 50,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cowPreviewBox: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 10,
  },
  cowPreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  withdrawalAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  demoFillSection: {
    marginVertical: 10,
  },
  demoButtonsRow: {
    flexDirection: 'row',
  },
  row: {
    flexDirection: 'row',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginVertical: 8,
  },
  resultCard: {
    marginTop: 16,
    padding: 16,
  },
  paymentBox: {
    padding: 14,
    borderRadius: 14,
    marginVertical: 10,
  },
  payRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  overrideSection: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
});
