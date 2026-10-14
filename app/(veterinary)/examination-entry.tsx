import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Alert, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { goBackOrReplace } from '../../services/navigation';
import { useAavinStore } from '../../store/AavinStoreContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { DemoHeader } from '../../components/DemoHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/TextField';
import { Ionicons } from '@expo/vector-icons';

export default function ExaminationEntryScreen() {
  const { user } = useAuth();
  const { cows, addMedicalRecord } = useAavinStore();
  const { colors } = useTheme();
  const router = useRouter();

  const [selectedCowId, setSelectedCowId] = useState(cows[0]?.id || 'COW001');

  // Examination fields
  const [diagnosis, setDiagnosis] = useState('Routine Bovine Lactation Checkup');
  const [symptoms, setSymptoms] = useState('Normal appetite, bright eyes, healthy muzzle moisture, clear breath');
  const [temp, setTemp] = useState('38.6');
  const [heartRate, setHeartRate] = useState('68');
  const [rumenMotility, setRumenMotility] = useState('Normal (3/2min)');
  const [recommendations, setRecommendations] = useState('Continue Co-4 Hybrid Napier grass 20kg + 50g chelated mineral mix daily');
  const [followUpDate, setFollowUpDate] = useState('2026-11-12');
  const [submitting, setSubmitting] = useState(false);

  const selectedCow = cows.find(c => c.id === selectedCowId) || cows[0];

  const handleSaveExam = () => {
    if (!diagnosis.trim()) {
      Alert.alert('Required', 'Please enter a diagnosis or clinical assessment.');
      return;
    }

    setSubmitting(true);
    try {
      addMedicalRecord(selectedCow.id, {
        date: new Date().toISOString().split('T')[0],
        vetName: user?.fullName || 'Dr. R. Anand BVSc',
        diagnosis: diagnosis.trim(),
        symptoms: symptoms.trim(),
        bodyTemperatureC: parseFloat(temp) || 38.6,
        heartRateBpm: parseInt(heartRate, 10) || 68,
        rumenMotility: rumenMotility.trim(),
        recommendations: recommendations.trim(),
        followUpDate: followUpDate.trim(),
      });

      Alert.alert(
        'Examination Logged!',
        `Clinical examination saved to ${selectedCow.name}'s digital health passport.`,
        [
          {
            text: 'View Passport',
            onPress: () => router.push(`/(veterinary)/cow-details?cowId=${selectedCow.id}` as any),
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not save examination.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: colors.background }]}>
      <DemoHeader 
        title="Clinical Examination Entry"
        subtitle="Health Audit & Bovine Diagnostics"
        showBack
      />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Cow Selector */}
        <Card style={styles.card}>
          <Text style={[Typography.headline, { color: colors.primary, fontWeight: '800', marginBottom: 10 }]}>
            Patient Bovine
          </Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.cowsRow}>
              {cows.map((c) => {
                const isSelected = selectedCowId === c.id;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => setSelectedCowId(c.id)}
                    style={[
                      styles.cowPill,
                      {
                        backgroundColor: isSelected ? colors.primaryLight : colors.card,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Ionicons 
                      name={isSelected ? 'radio-button-on' : 'radio-button-off'} 
                      size={16} 
                      color={isSelected ? colors.primary : colors.textMuted} 
                    />
                    <View style={{ marginLeft: 6 }}>
                      <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700' }]}>
                        {c.name}
                      </Text>
                      <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                        Tag: #{c.tagId}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </Card>

        {/* Clinical Parameters */}
        <Card style={styles.card}>
          <Text style={[Typography.headline, { color: colors.primary, fontWeight: '800', marginBottom: 12 }]}>
            Vital Signs & Clinical Findings
          </Text>

          <TextField
            label="Diagnosis / Findings *"
            placeholder="e.g. Healthy Bovine - Prime Lactation"
            value={diagnosis}
            onChangeText={setDiagnosis}
            icon="pulse-outline"
          />

          <TextField
            label="Symptoms / Physical Exam Notes"
            placeholder="e.g. Active, clear mucosal membranes, good rumen fill"
            value={symptoms}
            onChangeText={setSymptoms}
            icon="eye-outline"
          />

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <TextField
                label="Body Temp (°C)"
                value={temp}
                onChangeText={setTemp}
                keyboardType="decimal-pad"
                icon="thermometer-outline"
              />
            </View>
            <View style={{ flex: 1 }}>
              <TextField
                label="Heart Rate (bpm)"
                value={heartRate}
                onChangeText={setHeartRate}
                keyboardType="number-pad"
                icon="heart-outline"
              />
            </View>
          </View>

          <TextField
            label="Rumen Motility"
            value={rumenMotility}
            onChangeText={setRumenMotility}
            icon="medical-outline"
          />

          <TextField
            label="Diet & Management Recommendations"
            value={recommendations}
            onChangeText={setRecommendations}
            icon="leaf-outline"
          />

          <TextField
            label="Next Scheduled Follow-up (YYYY-MM-DD)"
            value={followUpDate}
            onChangeText={setFollowUpDate}
            icon="calendar-outline"
          />
        </Card>

        <Button
          title={submitting ? "Saving..." : "Save Examination Record"}
          size="lg"
          loading={submitting}
          onPress={handleSaveExam}
          style={{ marginTop: 8 }}
        />

        <Button
          title="Cancel"
          variant="outline"
          onPress={() => goBackOrReplace(router, '/(veterinary)/cattle-registry')}
          style={{ marginTop: 10, marginBottom: 30 }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
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
  cowsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  cowPill: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  row: {
    flexDirection: 'row',
  },
});
