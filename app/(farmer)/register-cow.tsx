import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Alert, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useAavinStore } from '../../store/AavinStoreContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { DemoHeader } from '../../components/DemoHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/TextField';
import { Ionicons } from '@expo/vector-icons';

export default function RegisterCowScreen() {
  const { user } = useAuth();
  const { addCow, cows } = useAavinStore();
  const { colors } = useTheme();
  const router = useRouter();

  const farmerId = user?.associatedId || 'FARMER001';
  const farmerName = user?.fullName || 'K. Murugesan';

  // Form State
  const [name, setName] = useState('');
  const [tagId, setTagId] = useState('');
  const [breed, setBreed] = useState('Jersey Cross');
  const [approxAgeMonths, setApproxAgeMonths] = useState('36');
  const [dailyMilkYield, setDailyMilkYield] = useState('12.0');
  const [currentStatus, setCurrentStatus] = useState<'lactating' | 'dry' | 'pregnant'>('lactating');
  const [identificationMarks, setIdentificationMarks] = useState('');
  const [notes, setNotes] = useState('');

  // Scanning simulation state
  const [scanning, setScanning] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const breedsList = [
    'Jersey Cross',
    'Holstein Friesian Cross',
    'Kangayam Native',
    'Gir Cross',
    'Red Sindhi Cross',
    'Umblachery Native',
  ];

  // Barcode / Ear tag scanner simulation
  const handleSimulateTagScan = () => {
    setScanning(true);
    setTimeout(() => {
      // Generate a new 12-digit tag ID that doesn't collide
      const newTag = `1001${Math.floor(10000000 + Math.random() * 90000000)}`;
      setTagId(newTag);
      setScanning(false);
      Alert.alert('Barcode Scanned', `Cattle ear tag #${newTag} captured via optical scanner. Mark details and submit.`);
    }, 600);
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!name.trim()) errs.name = 'Cow name is required.';
    
    // Validate 12-digit tag ID
    const tagClean = tagId.trim();
    if (!tagClean) {
      errs.tagId = '12-digit Tag ID is required.';
    } else if (!/^\d{12}$/.test(tagClean)) {
      errs.tagId = 'Ear tag ID must be exactly 12 numeric digits (e.g. 100100001007).';
    } else if (cows.some(c => c.tagId === tagClean)) {
      errs.tagId = 'This 12-digit tag ID already exists in the Cattle Passport registry.';
    }

    const yieldNum = parseFloat(dailyMilkYield);
    if (isNaN(yieldNum) || yieldNum < 0) {
      errs.dailyMilkYield = 'Enter a valid daily milk yield in litres.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleRegisterCow = () => {
    if (!validate()) {
      Alert.alert('Validation Error', 'Please correct the highlighted fields.');
      return;
    }

    try {
      const created = addCow({
        cowId: `COW-MDU-${String(cows.length + 1).padStart(3, '0')}`,
        tagId: tagId.trim(),
        farmerId,
        farmerName,
        breed,
        name: name.trim(),
        dateOfBirth: '2023-01-15',
        approxAgeMonths: parseInt(approxAgeMonths, 10) || 36,
        sex: 'female',
        currentStatus,
        dailyMilkYield: parseFloat(dailyMilkYield) || 12.0,
        healthStatus: 'healthy',
        lactationStage: 'peak',
        identificationMarks: identificationMarks.trim() || 'Notched ear tag, clear forehead',
        photoUrl: 'https://images.unsplash.com/photo-1546445317-29f4545e9d53?w=500',
        verificationStatus: 'pending', // Marked unverified until authorized staff verify it!
        notes: notes.trim() || 'Registered via Smart Cattle Passport frontend prototype.',
      });

      Alert.alert(
        'Cow Registered!',
        `Passport created for ${created.name} (Tag #${created.tagId}). Marked as Pending Verification until authorized booth/admin inspection.`,
        [
          {
            text: 'View Passport',
            onPress: () => router.replace(`/(farmer)/cow-details?cowId=${created.id}` as any),
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Registration Failed', err.message || 'Error creating cattle record.');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <DemoHeader 
        title="Register New Cow"
        subtitle={`Linking to Farmer: ${farmerName} (${farmerId})`}
        showBack
      />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Notice on official government data */}
        <View style={[styles.disclaimerBox, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
          <Ionicons name="information-circle" size={18} color={colors.primary} style={{ marginRight: 8 }} />
          <Text style={[Typography.caption1, { color: colors.primary, flex: 1 }]}>
            Academic Prototype: Entered cattle records are initialized in local state with "Pending Verification" until authorized staff inspection.
          </Text>
        </View>

        <Card style={styles.card}>
          <Text style={[Typography.headline, { color: colors.primary, fontWeight: '800', marginBottom: 12 }]}>
            1. Ear Tag & Identity
          </Text>

          {/* Barcode scanner action */}
          <View style={styles.scanButtonRow}>
            <Button
              title={scanning ? "Scanning Camera..." : "📷 Scan 12-Digit Tag Barcode"}
              variant="secondary"
              loading={scanning}
              onPress={handleSimulateTagScan}
              style={{ flex: 1, marginBottom: 10 }}
            />
          </View>

          <TextField
            label="12-Digit Official Ear Tag ID *"
            placeholder="e.g. 100100001007"
            value={tagId}
            onChangeText={(t) => { setTagId(t); setErrors({ ...errors, tagId: '' }); }}
            keyboardType="number-pad"
            maxLength={12}
            error={errors.tagId}
            icon="pricetag-outline"
          />

          <TextField
            label="Cow Name / Call Name *"
            placeholder="e.g. Ganga, Lakshmi, Ponni"
            value={name}
            onChangeText={(t) => { setName(t); setErrors({ ...errors, name: '' }); }}
            error={errors.name}
            icon="paw-outline"
          />

          {/* Breed Picker */}
          <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700', marginBottom: 6, marginTop: 4 }]}>
            Breed *
          </Text>
          <View style={styles.breedsGrid}>
            {breedsList.map((b) => (
              <Pressable
                key={b}
                onPress={() => setBreed(b)}
                style={[
                  styles.breedChip,
                  {
                    backgroundColor: breed === b ? colors.primary : colors.background,
                    borderColor: breed === b ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text style={[styles.breedChipText, { color: breed === b ? '#FFFFFF' : colors.text }]}>
                  {b}
                </Text>
              </Pressable>
            ))}
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={[Typography.headline, { color: colors.primary, fontWeight: '800', marginBottom: 12 }]}>
            2. Production & Age
          </Text>

          <TextField
            label="Average Daily Milk Yield (Litres) *"
            placeholder="e.g. 14.5"
            value={dailyMilkYield}
            onChangeText={(t) => { setDailyMilkYield(t); setErrors({ ...errors, dailyMilkYield: '' }); }}
            keyboardType="decimal-pad"
            error={errors.dailyMilkYield}
            icon="water-outline"
          />

          <TextField
            label="Approximate Age in Months"
            placeholder="e.g. 36"
            value={approxAgeMonths}
            onChangeText={setApproxAgeMonths}
            keyboardType="number-pad"
            icon="calendar-outline"
          />

          {/* Status selector */}
          <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700', marginBottom: 6, marginTop: 4 }]}>
            Milking Status
          </Text>
          <View style={styles.statusRow}>
            {(['lactating', 'dry', 'pregnant'] as const).map((s) => (
              <Pressable
                key={s}
                onPress={() => setCurrentStatus(s)}
                style={[
                  styles.statusTab,
                  {
                    backgroundColor: currentStatus === s ? colors.primaryLight : colors.background,
                    borderColor: currentStatus === s ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text style={[styles.statusTabText, { color: currentStatus === s ? colors.primary : colors.textSecondary }]}>
                  {s.toUpperCase()}
                </Text>
              </Pressable>
            ))}
          </View>

          <TextField
            label="Physical Identification Marks"
            placeholder="e.g. White forehead patch, curved horns"
            value={identificationMarks}
            onChangeText={setIdentificationMarks}
            icon="eye-outline"
          />
        </Card>

        <Button
          title="Save & Issue Cattle Passport"
          size="lg"
          onPress={handleRegisterCow}
          style={{ marginTop: 8 }}
        />

        <Button
          title="Cancel"
          variant="outline"
          onPress={() => router.back()}
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
    paddingTop: 16,
  },
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  card: {
    padding: 16,
    marginBottom: 16,
  },
  scanButtonRow: {
    marginBottom: 6,
  },
  breedsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  breedChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  breedChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  statusTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1.5,
  },
  statusTabText: {
    fontSize: 11,
    fontWeight: '800',
  },
});
