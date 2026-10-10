import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/TextField';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { api } from '../../services/api';

export default function RegisterCowScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [tagNumber, setTagNumber] = useState('');
  const [name, setName] = useState('');
  const [breed, setBreed] = useState('Jersey Cross');
  const [lactationStageIndex, setLactationStageIndex] = useState(1); // 'peak'
  const stages = ['Early', 'Peak', 'Mid', 'Late', 'Dry'];
  const stageKeys = ['early', 'peak', 'mid', 'late', 'dry'];

  const [inseminationIndex, setInseminationIndex] = useState(0);
  const inseminationOptions = ['Not Bred', 'Inseminated', 'Pregnant', 'Dry'];
  const inseminationKeys = ['not_bred', 'inseminated', 'confirmed_pregnant', 'dry'];

  const [vaccinationIndex, setVaccinationIndex] = useState(0);
  const vaccinationOptions = ['Up to Date', 'Pending', 'Overdue'];
  const vaccinationKeys = ['up_to_date', 'pending', 'overdue'];

  const [averageDailyYield, setAverageDailyYield] = useState('12.5');
  const [lastCalvingDate, setLastCalvingDate] = useState('');
  const [lastDewormingDate, setLastDewormingDate] = useState(new Date().toISOString().split('T')[0]);
  const [dailyGreenFodderKg, setDailyGreenFodderKg] = useState('25.0');
  const [dailyConcentrateKg, setDailyConcentrateKg] = useState('4.0');
  const [mineralMixtureGrams, setMineralMixtureGrams] = useState('50');
  const [somaticCellCount, setSomaticCellCount] = useState('145000');
  const [identificationMarks, setIdentificationMarks] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!tagNumber.trim() || !name.trim()) {
      Alert.alert('Required Fields', 'Please provide cattle tag number and name');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/cows', {
        tagNumber: tagNumber.trim().toUpperCase(),
        name: name.trim(),
        breed: breed.trim(),
        lactationStage: stageKeys[lactationStageIndex],
        inseminationStatus: inseminationKeys[inseminationIndex],
        vaccinationStatus: vaccinationKeys[vaccinationIndex],
        averageDailyYield: parseFloat(averageDailyYield) || 10.0,
        lastCalvingDate: lastCalvingDate.trim() || undefined,
        lastDewormingDate: lastDewormingDate.trim() || undefined,
        dailyGreenFodderKg: parseFloat(dailyGreenFodderKg) || 25.0,
        dailyConcentrateKg: parseFloat(dailyConcentrateKg) || 4.0,
        mineralMixtureGrams: parseInt(mineralMixtureGrams, 10) || 50,
        somaticCellCount: parseInt(somaticCellCount, 10) || 145000,
        identificationMarks: identificationMarks.trim() || undefined,
      });

      Alert.alert('Success', `Digital Passport created for ${name}! Unique QR token generated.`, [
        {
          text: 'View Passport',
          onPress: () => {
            if (res.data?.data?.id) {
              router.replace({ pathname: '/(farmer)/cow-details', params: { id: res.data.data.id } });
            } else {
              router.replace('/(farmer)/cows');
            }
          },
        },
      ]);
    } catch (err: any) {
      Alert.alert('Registration Error', err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <Card>
        <Text style={[Typography.title2, { color: colors.text, marginBottom: 6 }]}>
          Register New Cattle
        </Text>
        <Text style={[Typography.footnote, { color: colors.textSecondary, marginBottom: 16 }]}>
          Generates permanent linked digital passport, veterinary scorecard, and Aavin QR lookup token.
        </Text>

        <Text style={[Typography.headline, { color: colors.primary, marginTop: 4, marginBottom: 8 }]}>
          🏷️ Basic Cattle Identification
        </Text>

        <TextField
          label="Ear Tag Number *"
          placeholder="e.g. TN-MDU-COW-1007"
          value={tagNumber}
          onChangeText={setTagNumber}
          autoCapitalize="characters"
        />

        <TextField
          label="Cow Name / Nickname *"
          placeholder="e.g. Kaveri"
          value={name}
          onChangeText={setName}
        />

        <TextField
          label="Breed"
          placeholder="e.g. Jersey Cross / Holstein / Kangayam / Murrah"
          value={breed}
          onChangeText={setBreed}
        />

        <Text style={[Typography.headline, { color: colors.primary, marginTop: 14, marginBottom: 8 }]}>
          🥛 Milk Yield & Lactation Cycle
        </Text>

        <Text style={[Typography.subhead, { color: colors.textSecondary, marginTop: 4, marginBottom: 4, fontWeight: '600' }]}>
          Lactation Stage
        </Text>
        <SegmentedControl
          values={stages}
          selectedIndex={lactationStageIndex}
          onChange={setLactationStageIndex}
        />

        <TextField
          label="Estimated Daily Milk Yield (Litres)"
          placeholder="12.5"
          value={averageDailyYield}
          onChangeText={setAverageDailyYield}
          keyboardType="decimal-pad"
        />

        <TextField
          label="Last Calving Date (YYYY-MM-DD)"
          placeholder="e.g. 2026-03-15"
          value={lastCalvingDate}
          onChangeText={setLastCalvingDate}
        />

        <Text style={[Typography.headline, { color: colors.primary, marginTop: 14, marginBottom: 8 }]}>
          🩺 Breeding & Veterinary Health
        </Text>

        <Text style={[Typography.subhead, { color: colors.textSecondary, marginTop: 4, marginBottom: 4, fontWeight: '600' }]}>
          Breeding / Insemination Status
        </Text>
        <SegmentedControl
          values={inseminationOptions}
          selectedIndex={inseminationIndex}
          onChange={setInseminationIndex}
        />

        <Text style={[Typography.subhead, { color: colors.textSecondary, marginTop: 10, marginBottom: 4, fontWeight: '600' }]}>
          Vaccination Compliance
        </Text>
        <SegmentedControl
          values={vaccinationOptions}
          selectedIndex={vaccinationIndex}
          onChange={setVaccinationIndex}
        />

        <TextField
          label="Last Deworming Date (YYYY-MM-DD)"
          placeholder="e.g. 2026-09-10"
          value={lastDewormingDate}
          onChangeText={setLastDewormingDate}
        />

        <TextField
          label="Somatic Cell Count (SCC cells/mL - Baseline)"
          placeholder="145000"
          value={somaticCellCount}
          onChangeText={setSomaticCellCount}
          keyboardType="numeric"
        />

        <Text style={[Typography.headline, { color: colors.primary, marginTop: 14, marginBottom: 8 }]}>
          🌾 Daily Feed & Nutrition Ration
        </Text>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <TextField
              label="Green Fodder (kg/day)"
              placeholder="25.0"
              value={dailyGreenFodderKg}
              onChangeText={setDailyGreenFodderKg}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={{ flex: 1 }}>
            <TextField
              label="Concentrate Feed (kg/day)"
              placeholder="4.0"
              value={dailyConcentrateKg}
              onChangeText={setDailyConcentrateKg}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        <TextField
          label="Mineral Mixture Supplement (Grams/day)"
          placeholder="50"
          value={mineralMixtureGrams}
          onChangeText={setMineralMixtureGrams}
          keyboardType="numeric"
        />

        <Text style={[Typography.headline, { color: colors.primary, marginTop: 14, marginBottom: 8 }]}>
          📝 Physical Identification
        </Text>

        <TextField
          label="Identification Marks / Horn Shape / Body Tags"
          placeholder="e.g. White patch on forehead, curved left horn"
          value={identificationMarks}
          onChangeText={setIdentificationMarks}
          multiline
          numberOfLines={2}
        />

        <Button
          title="Create Digital Passport & QR Token"
          onPress={handleRegister}
          loading={loading}
          style={{ marginTop: 20 }}
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
});
