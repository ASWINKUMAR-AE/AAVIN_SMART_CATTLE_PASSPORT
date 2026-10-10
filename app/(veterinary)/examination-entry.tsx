import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/TextField';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { api } from '../../services/api';

export default function ExaminationEntryScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [cows, setCows] = useState<any[]>([]);
  const [selectedCowId, setSelectedCowId] = useState('');
  const [temp, setTemp] = useState('38.6');
  const [heartRate, setHeartRate] = useState('68');
  const [respirationRate, setRespirationRate] = useState('26');
  const [rumenMotility, setRumenMotility] = useState('Normal (3/2min)');
  const [bcs, setBcs] = useState('3.5');
  const [sccReading, setSccReading] = useState('145000');
  const [udderRF, setUdderRF] = useState('Clear');
  const [udderRR, setUdderRR] = useState('Clear');
  const [udderLF, setUdderLF] = useState('Clear');
  const [udderLR, setUdderLR] = useState('Clear');
  const [clinicalSigns, setClinicalSigns] = useState('Active, alert, clear mucosal membrane, normal appetite, healthy teat sphincter');
  const [diagnosis, setDiagnosis] = useState('Healthy Bovine - Routine Dairy Wellness Check');
  const [statusIndex, setStatusIndex] = useState(0); // 0: healthy, 1: under_treatment, 2: quarantine, 3: critical
  const statuses = ['Healthy', 'Treatment', 'Quarantine', 'Critical'];
  const statusKeys = ['healthy', 'under_treatment', 'quarantine', 'critical'];

  const [recommendations, setRecommendations] = useState('Maintain regular mineral mix 50g/day + clean milking protocol');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/veterinary/assignments').then((res) => {
      if (res.data?.data?.length > 0) {
        setCows(res.data.data);
        setSelectedCowId(res.data.data[0].id);
      }
    }).catch(() => {});
  }, []);

  const handleSubmit = async () => {
    if (!selectedCowId || !clinicalSigns || !diagnosis) {
      Alert.alert('Required Fields', 'Please select cow and provide clinical observations');
      return;
    }

    setLoading(true);
    try {
      await api.post('/veterinary/health-records', {
        cowId: selectedCowId,
        bodyTemperatureC: parseFloat(temp) || undefined,
        heartRateBpm: parseInt(heartRate, 10) || undefined,
        respirationRateBpm: parseInt(respirationRate, 10) || undefined,
        rumenMotility,
        bodyConditionScore: parseFloat(bcs) || undefined,
        sccReading: parseInt(sccReading, 10) || undefined,
        udderQuarterStatus: {
          rf: udderRF,
          rr: udderRR,
          lf: udderLF,
          lr: udderLR,
        },
        clinicalSigns,
        diagnosis,
        healthStatusAssigned: statusKeys[statusIndex],
        recommendations: recommendations || undefined,
      });

      Alert.alert('Success', 'Clinical examination record saved successfully', [
        { text: 'OK', onPress: () => router.replace('/(veterinary)') },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <Card>
        <Text style={[Typography.title2, { color: colors.text, marginBottom: 4 }]}>
          Clinical Health & Dairy Exam
        </Text>
        <Text style={[Typography.footnote, { color: colors.textSecondary, marginBottom: 12 }]}>
          Record vital signs, subclinical mastitis checks, and Aavin milk safety scorecards.
        </Text>

        <Text style={[Typography.subhead, { color: colors.textSecondary, marginBottom: 6, fontWeight: '600' }]}>
          Select Patient Cattle:
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
          {cows.map((c) => {
            const isSelected = c.id === selectedCowId;
            return (
              <Button
                key={c.id}
                title={`${c.name} (#${c.tag_number})`}
                variant={isSelected ? 'primary' : 'secondary'}
                size="sm"
                onPress={() => setSelectedCowId(c.id)}
                style={{ marginRight: 8, marginBottom: 8 }}
              />
            );
          })}
        </ScrollView>

        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 6 }}>
            <TextField
              label="Body Temp (°C)"
              value={temp}
              onChangeText={setTemp}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={{ flex: 1, marginLeft: 6 }}>
            <TextField
              label="Heart Rate (BPM)"
              value={heartRate}
              onChangeText={setHeartRate}
              keyboardType="number-pad"
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 6 }}>
            <TextField
              label="Respiration (BPM)"
              value={respirationRate}
              onChangeText={setRespirationRate}
              keyboardType="number-pad"
            />
          </View>
          <View style={{ flex: 1, marginLeft: 6 }}>
            <TextField
              label="BCS (1.0 - 5.0)"
              value={bcs}
              onChangeText={setBcs}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        <TextField
          label="Somatic Cell Count (SCC cells/mL)"
          placeholder="145000"
          value={sccReading}
          onChangeText={setSccReading}
          keyboardType="number-pad"
        />

        <Text style={[Typography.subhead, { color: colors.textSecondary, marginTop: 10, marginBottom: 6, fontWeight: '600' }]}>
          Udder Quarters Check (Mastitis / Swelling)
        </Text>
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
          <View style={{ flex: 1 }}>
            <TextField label="Right Front (RF)" value={udderRF} onChangeText={setUdderRF} />
          </View>
          <View style={{ flex: 1 }}>
            <TextField label="Right Rear (RR)" value={udderRR} onChangeText={setUdderRR} />
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
          <View style={{ flex: 1 }}>
            <TextField label="Left Front (LF)" value={udderLF} onChangeText={setUdderLF} />
          </View>
          <View style={{ flex: 1 }}>
            <TextField label="Left Rear (LR)" value={udderLR} onChangeText={setUdderLR} />
          </View>
        </View>

        <TextField
          label="Rumen Motility"
          value={rumenMotility}
          onChangeText={setRumenMotility}
        />

        <TextField
          label="Clinical Observations & Signs *"
          value={clinicalSigns}
          onChangeText={setClinicalSigns}
          multiline
          numberOfLines={2}
        />

        <TextField
          label="Veterinary Diagnosis *"
          value={diagnosis}
          onChangeText={setDiagnosis}
        />

        <Text style={[Typography.subhead, { color: colors.textSecondary, marginTop: 10, marginBottom: 4, fontWeight: '600' }]}>
          Assigned Health Status
        </Text>
        <SegmentedControl
          values={statuses}
          selectedIndex={statusIndex}
          onChange={setStatusIndex}
        />

        <TextField
          label="Veterinary Recommendations"
          value={recommendations}
          onChangeText={setRecommendations}
          multiline
          numberOfLines={2}
        />

        <Button
          title="Save Clinical Record & Update Scorecard"
          onPress={handleSubmit}
          loading={loading}
          style={{ marginTop: 18 }}
        />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  chipsScroll: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
  },
});
