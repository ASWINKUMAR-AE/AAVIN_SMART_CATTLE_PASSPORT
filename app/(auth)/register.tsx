import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Alert, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useAavinStore } from '../../store/AavinStoreContext';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/TextField';
import { Card } from '../../components/ui/Card';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { AccountsApi } from '../../services/accountsApi';
import { apiErrorMessage, mapFarmer } from '../../services/accountMapping';

export default function RegisterFarmerScreen() {
  const { user } = useAuth();
  const { booths: storedBooths, cacheFarmer } = useAavinStore();
  const booths = user?.role === 'booth' ? storedBooths.filter(booth => booth.id === user.associatedId) : [];
  const { colors } = useTheme();
  const router = useRouter();

  const defaultBoothId = (user?.role === 'booth' && user.associatedId) 
    ? user.associatedId 
    : '';

  // Form State
  const [name, setName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [address, setAddress] = useState('');
  const [village, setVillage] = useState('');
  const [community, setCommunity] = useState('Melur Taluk');
  const [numberOfCows, setNumberOfCows] = useState('1');
  const [assignedBoothId, setAssignedBoothId] = useState(defaultBoothId);
  const [farmerIdCode, setFarmerIdCode] = useState(`FARM-MDU-${Math.floor(105 + Math.random() * 800)}`);
  const [bankAccountName, setBankAccountName] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');
  const [upiId, setUpiId] = useState('');

  // Field Errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!name.trim()) errs.name = 'Farmer name is required.';
    
    // Indian Mobile Number validation (10 digits starting with 6,7,8,9)
    const phoneClean = mobileNumber.trim().replace(/\D/g, '');
    if (!phoneClean) {
      errs.mobileNumber = 'Mobile number is required.';
    } else if (!/^[6-9]\d{9}$/.test(phoneClean)) {
      errs.mobileNumber = 'Enter a valid 10-digit Indian mobile number (e.g. 9842000002).';
    }

    if (!address.trim()) errs.address = 'Street/Door address is required.';
    if (!village.trim()) errs.village = 'Village name is required.';
    if (!farmerIdCode.trim()) errs.farmerIdCode = 'Farmer ID Code is required.';

    const cowsNum = Number(numberOfCows);
    if (!numberOfCows.trim() || !Number.isInteger(cowsNum) || cowsNum < 0) {
      errs.numberOfCows = 'Enter a valid number of cows.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleRegister = async () => {
    if (submitting) return;
    if (user?.role !== 'booth') {
      Alert.alert('Registration Failed', 'Sign in as a Society to register a Farmer.');
      return;
    }
    if (!validate()) {
      Alert.alert('Validation Error', 'Please correct the highlighted fields before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      const account = await AccountsApi.registerFarmer({
        phone: mobileNumber.trim().replace(/\D/g, ''),
        fullName: name.trim(), parentId: user.associatedId,
        personalDetails: {
          farmerIdCode: farmerIdCode.trim().toUpperCase(),
          address: address.trim(), village: village.trim(), community: community.trim(),
          numberOfCows: Number(numberOfCows),
          bankAccountName: bankAccountName.trim(), bankName: bankName.trim(),
          bankAccountNumber: bankAccountNumber.trim(), bankIfsc: bankIfsc.trim().toUpperCase(), upiId: upiId.trim(),
        },
      });
      const created = mapFarmer(account);
      cacheFarmer(created);

      Alert.alert(
        'Farmer Created Successfully',
        `Farmer ${created.name} (${created.farmerIdCode}) has been successfully enrolled under ${booths.find(b => b.id === assignedBoothId)?.name || 'Booth'}.`,
        [
          {
            text: 'Done',
            onPress: () => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(booth)/farmers');
              }
            },
          },
        ]
      );
    } catch (err: any) {
      const fieldErrors = err?.response?.data?.errors || {};
      const formErrors: Record<string, string> = {};
      const aliases: Record<string, string> = { phone: 'mobileNumber', fullName: 'name' };
      for (const [key, value] of Object.entries({ ...fieldErrors, ...fieldErrors.personalDetails })) {
        if (key === 'personalDetails') continue;
        formErrors[aliases[key] || key] = Array.isArray(value) ? value.join(' ') : String(value);
      }
      setErrors(formErrors);
      Alert.alert('Registration Failed', apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.headerInfo}>
          <Text style={[Typography.title2, { color: colors.text, fontWeight: '800' }]}>
            New Farmer Registration
          </Text>
          <Text style={[Typography.footnote, { color: colors.textSecondary, marginTop: 4 }]}>
            Booth Member Portal: Enroll and register a new farmer into Aavin Madurai Milk Safety Twin.
          </Text>
        </View>

        <Card style={styles.card}>
          <Text style={[Typography.headline, { color: colors.primary, marginBottom: 12, fontWeight: '700' }]}>
            1. Farmer Identity & Details
          </Text>

          <TextField
            label="Full Name *"
            placeholder="e.g. K. Murugesan"
            value={name}
            onChangeText={(t) => { setName(t); setErrors({ ...errors, name: '' }); }}
            error={errors.name}
            icon="person-outline"
          />

          <TextField
            label="10-Digit Mobile Number *"
            placeholder="e.g. 9842000002"
            value={mobileNumber}
            onChangeText={(t) => { setMobileNumber(t); setErrors({ ...errors, mobileNumber: '' }); }}
            keyboardType="phone-pad"
            maxLength={10}
            error={errors.mobileNumber}
            icon="call-outline"
          />

          <TextField
            label="Farmer ID Code *"
            placeholder="e.g. FARM-MDU-105"
            value={farmerIdCode}
            onChangeText={(t) => { setFarmerIdCode(t); setErrors({ ...errors, farmerIdCode: '' }); }}
            autoCapitalize="characters"
            error={errors.farmerIdCode}
            icon="card-outline"
          />

          <TextField
            label="Declared Number of Cows"
            placeholder="e.g. 2"
            value={numberOfCows}
            onChangeText={(t) => { setNumberOfCows(t); setErrors({ ...errors, numberOfCows: '' }); }}
            keyboardType="number-pad"
            error={errors.numberOfCows}
            icon="paw-outline"
          />
        </Card>

        <Card style={styles.card}>
          <Text style={[Typography.headline, { color: colors.primary, marginBottom: 12, fontWeight: '700' }]}>
            2. Location & Booth Assignment
          </Text>

          <TextField
            label="Residential Address *"
            placeholder="e.g. 14, South Street, Melur"
            value={address}
            onChangeText={(t) => { setAddress(t); setErrors({ ...errors, address: '' }); }}
            error={errors.address}
            icon="home-outline"
          />

          <TextField
            label="Village *"
            placeholder="e.g. Melur Rural"
            value={village}
            onChangeText={(t) => { setVillage(t); setErrors({ ...errors, village: '' }); }}
            error={errors.village}
            icon="location-outline"
          />

          <TextField
            label="Taluk / Community"
            placeholder="e.g. Melur Taluk"
            value={community}
            onChangeText={setCommunity}
            icon="map-outline"
          />

          <Text style={[Typography.subhead, { color: colors.text, fontWeight: '600', marginBottom: 8, marginTop: 4 }]}>
            Assigned Collection Booth *
          </Text>
          <View style={styles.boothPickerRow}>
            {booths.map((b) => {
              const isSelected = assignedBoothId === b.id;
              return (
                <Pressable
                  key={b.id}
                  onPress={() => setAssignedBoothId(b.id)}
                  style={[
                    styles.boothOption,
                    {
                      borderColor: isSelected ? colors.primary : colors.border,
                      backgroundColor: isSelected ? colors.primaryLight : colors.card,
                    },
                  ]}
                >
                  <Ionicons 
                    name={isSelected ? 'radio-button-on' : 'radio-button-off'} 
                    size={18} 
                    color={isSelected ? colors.primary : colors.textMuted} 
                  />
                  <View style={{ marginLeft: 8, flex: 1 }}>
                    <Text style={[Typography.subhead, { color: colors.text, fontWeight: isSelected ? '700' : '500' }]}>
                      {b.name}
                    </Text>
                    <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                      Code: {b.code} • {b.taluk}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={[Typography.headline, { color: colors.primary, marginBottom: 12, fontWeight: '700' }]}>
            3. Direct Benefit Transfer (Optional)
          </Text>

          <TextField
            label="Bank Account Name"
            placeholder="e.g. K Murugesan"
            value={bankAccountName}
            onChangeText={setBankAccountName}
            icon="person-circle-outline"
          />

          <TextField
            label="Bank Name"
            placeholder="e.g. Canara Bank - Melur"
            value={bankName}
            onChangeText={setBankName}
            icon="business-outline"
          />

          <TextField
            label="Account Number"
            placeholder="e.g. 109283746501"
            value={bankAccountNumber}
            onChangeText={setBankAccountNumber}
            keyboardType="number-pad"
            icon="wallet-outline"
          />

          <TextField
            label="IFSC Code"
            placeholder="e.g. CNRB0001092"
            value={bankIfsc}
            onChangeText={setBankIfsc}
            autoCapitalize="characters"
            icon="barcode-outline"
          />

          <TextField
            label="UPI ID"
            placeholder="e.g. murugan@okhdfcbank"
            value={upiId}
            onChangeText={setUpiId}
            autoCapitalize="none"
            icon="phone-portrait-outline"
          />
        </Card>

        <Button
          title="Submit Farmer Registration"
          onPress={handleRegister}
          loading={submitting}
          size="lg"
          style={{ marginTop: 8 }}
        />

        <Button
          title="Cancel & Return to Login"
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
  headerInfo: {
    marginBottom: 16,
  },
  card: {
    padding: 16,
    marginBottom: 16,
  },
  boothPickerRow: {
    gap: 8,
  },
  boothOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.5,
  },
});
