import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  Alert, 
  KeyboardAvoidingView, 
  Platform, 
  Pressable 
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAavinStore } from '../../store/AavinStoreContext';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/TextField';
import { Card } from '../../components/ui/Card';
import { DemoHeader } from '../../components/DemoHeader';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';

export interface CowFormItem {
  id: string;
  pashuAadhaar: string; // 12-digit RFID tag (Mandatory *)
  breed: string; // Cow type/breed (Mandatory *)
  milkCapacity: string; // Daily milk yield in Litres (Mandatory *)
  name: string; // Cow name or nickname (Optional)
}

const POPULAR_BREEDS = [
  'Jersey Cross',
  'HF Cross',
  'Kangeyam',
  'Murrah Buffalo',
  'Umblachery',
  'Sindhi Cross',
];

const MILK_PRESETS = ['8', '12', '15', '20'];

export default function RegisterFarmerScreen() {
  const { user } = useAuth();
  const { booths, cows, addFarmer } = useAavinStore();
  const { colors, isDark } = useTheme();
  const router = useRouter();

  const defaultBoothId = (user?.role === 'booth' && user.associatedId) 
    ? user.associatedId 
    : (booths[0]?.id || 'BOOTH001');

  // Farmer Details State
  const [name, setName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [address, setAddress] = useState('');
  const [village, setVillage] = useState('');
  const [community, setCommunity] = useState('Melur Taluk');
  const [assignedBoothId, setAssignedBoothId] = useState(defaultBoothId);
  const [farmerIdCode, setFarmerIdCode] = useState(`FARM-MDU-${Math.floor(105 + Math.random() * 800)}`);
  
  // Banking / DBT State
  const [bankAccountName, setBankAccountName] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');
  const [upiId, setUpiId] = useState('');

  // N-Cattle Registration State
  const [cowEntries, setCowEntries] = useState<CowFormItem[]>([
    { id: 'cow_1', pashuAadhaar: '', breed: 'Jersey Cross', milkCapacity: '12.0', name: '' },
  ]);

  // Form Validation & Submitting State
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Helper to add a new cow card
  const handleAddCow = () => {
    const nextIdx = cowEntries.length + 1;
    const newCow: CowFormItem = {
      id: `cow_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      pashuAadhaar: '',
      breed: 'Jersey Cross',
      milkCapacity: '12.0',
      name: '',
    };
    setCowEntries(prev => [...prev, newCow]);
  };

  // Helper to remove a cow card
  const handleRemoveCow = (id: string) => {
    if (cowEntries.length <= 1) {
      Alert.alert('Cannot Remove', 'A farmer must have at least one cow registered.');
      return;
    }
    setCowEntries(prev => prev.filter(c => c.id !== id));
  };

  // Helper to update a field in a specific cow card
  const handleUpdateCow = (id: string, field: keyof CowFormItem, value: string) => {
    setCowEntries(prev => prev.map(c => {
      if (c.id === id) {
        return { ...c, [field]: value };
      }
      return c;
    }));

    // Clear specific field error if present
    const errKey = `cow_${id}_${field}`;
    if (errors[errKey]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[errKey];
        return next;
      });
    }
  };

  // Validation function
  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    // 1. Farmer Details Validation
    if (!name.trim()) errs.name = 'Farmer name is required.';
    
    const phoneClean = mobileNumber.trim().replace(/\D/g, '');
    if (!phoneClean) {
      errs.mobileNumber = 'Mobile phone number is required.';
    } else if (!/^[6-9]\d{9}$/.test(phoneClean)) {
      errs.mobileNumber = 'Enter a valid 10-digit Indian mobile number (starts with 6-9).';
    }

    if (!address.trim()) errs.address = 'Street/Door address is required.';
    if (!village.trim()) errs.village = 'Village name is required.';
    if (!farmerIdCode.trim()) errs.farmerIdCode = 'Farmer ID Code is required.';

    // 2. Cows Validation (N Cows)
    if (cowEntries.length === 0) {
      errs.cowsGeneral = 'At least 1 cow must be registered.';
    }

    const seenFormTags = new Set<string>();

    cowEntries.forEach((c, index) => {
      const cowNum = index + 1;
      const cleanTag = c.pashuAadhaar.trim().replace(/\D/g, '');

      // Mandatory 12-digit Pashu Aadhaar Validation
      if (!cleanTag) {
        errs[`cow_${c.id}_pashuAadhaar`] = `Cow #${cowNum}: 12-digit Pashu Aadhaar Number is mandatory.`;
      } else if (cleanTag.length !== 12) {
        errs[`cow_${c.id}_pashuAadhaar`] = `Cow #${cowNum}: Must be exactly 12 digits (currently ${cleanTag.length}).`;
      } else if (seenFormTags.has(cleanTag)) {
        errs[`cow_${c.id}_pashuAadhaar`] = `Cow #${cowNum}: Duplicate Pashu Aadhaar #${cleanTag} entered for multiple cows.`;
      } else if (cows.some(existing => existing.tagId === cleanTag)) {
        errs[`cow_${c.id}_pashuAadhaar`] = `Cow #${cowNum}: Pashu Aadhaar #${cleanTag} already exists in Aavin database.`;
      }
      seenFormTags.add(cleanTag);

      // Mandatory Breed/Type Validation
      if (!c.breed.trim()) {
        errs[`cow_${c.id}_breed`] = `Cow #${cowNum}: Cattle type / breed is required.`;
      }

      // Mandatory Milk Capacity Validation
      const milkNum = parseFloat(c.milkCapacity);
      if (isNaN(milkNum) || milkNum <= 0) {
        errs[`cow_${c.id}_milkCapacity`] = `Cow #${cowNum}: Enter a valid daily milk yield (e.g. 12.5 L).`;
      }
    });

    setErrors(errs);

    if (Object.keys(errs).length > 0) {
      const firstErrorMessage = Object.values(errs)[0];
      Alert.alert('Validation Error', firstErrorMessage);
      return false;
    }

    return true;
  };

  const handleRegister = async () => {
    if (!validate()) return;

    setSubmitting(true);
    try {
      const initialCows = cowEntries.map((c, idx) => ({
        pashuAadhaar: c.pashuAadhaar.trim().replace(/\D/g, ''),
        breed: c.breed.trim() || 'Jersey Cross',
        milkCapacity: parseFloat(c.milkCapacity) || 10,
        name: c.name.trim() || `Cow #${idx + 1} (${c.breed.trim() || 'Jersey Cross'})`,
      }));

      const created = addFarmer(
        {
          farmerIdCode: farmerIdCode.trim().toUpperCase(),
          name: name.trim(),
          mobileNumber: mobileNumber.trim().replace(/\D/g, ''),
          address: address.trim(),
          village: village.trim(),
          community: community.trim(),
          numberOfCows: cowEntries.length,
          assignedBoothId,
          verificationStatus: 'pending',
          bankAccountName: bankAccountName.trim() || undefined,
          bankName: bankName.trim() || undefined,
          bankAccountNumber: bankAccountNumber.trim() || undefined,
          bankIfsc: bankIfsc.trim().toUpperCase() || undefined,
          upiId: upiId.trim() || undefined,
        },
        initialCows
      );

      const boothName = booths.find(b => b.id === assignedBoothId)?.name || 'Booth Center';

      Alert.alert(
        'Farmer & Cattle Enrolled Successfully!',
        `Farmer ${created.name} (${created.farmerIdCode}) and ${cowEntries.length} cattle passports with 12-digit Pashu Aadhaar RFID tags have been registered under ${boothName}.`,
        [
          {
            text: 'View in Farmers Directory',
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
      Alert.alert('Registration Failed', err.message || 'Could not register farmer and cattle.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <DemoHeader 
        title="New Farmer Registration"
        subtitle={`Enroll Producer & Cattle Passports • ${booths.find(b => b.id === assignedBoothId)?.name || 'Booth'}`}
        showBack
      />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Intro Banner */}
        <View style={[styles.govBanner, { backgroundColor: isDark ? '#1E293B' : '#EFF6FF', borderColor: '#93C5FD' }]}>
          <Ionicons name="shield-checkmark" size={20} color="#1D4ED8" style={{ marginTop: 2 }} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={[Typography.subhead, { color: '#1E40AF', fontWeight: '800' }]}>
              Aavin Digital Cattle Twin & DBT Enrollment
            </Text>
            <Text style={[Typography.caption2, { color: '#1E3A8A', marginTop: 2, lineHeight: 16 }]}>
              Enroll dairy farmer credentials along with official 12-digit Pashu Aadhaar RFID tags for full dairy traceability and daily milk intake.
            </Text>
          </View>
        </View>

        {/* 1. Farmer Identity & Details Card */}
        <Card style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={[styles.sectionIconBadge, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="person" size={16} color="#15803D" />
            </View>
            <Text style={[Typography.headline, { color: colors.text, fontWeight: '800', marginLeft: 8 }]}>
              1. Producer Identity & Contact
            </Text>
          </View>

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
        </Card>

        {/* 2. Cattle (Cow) Passport Enrollment - N Cows Section */}
        <Card style={[styles.card, { borderColor: '#86EFAC', borderWidth: 1.5 }]}>
          <View style={styles.cardHeaderRow}>
            <View style={[styles.sectionIconBadge, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="paw" size={16} color="#15803D" />
            </View>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={[Typography.headline, { color: colors.text, fontWeight: '800' }]}>
                2. Cattle Passport Enrollment ({cowEntries.length} {cowEntries.length === 1 ? 'Cow' : 'Cows'})
              </Text>
              <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                Mandatory 12-digit Pashu Aadhaar RFID ear tag, type & milk yield
              </Text>
            </View>

            <Pressable 
              onPress={handleAddCow}
              style={[styles.addCowMiniBtn, { backgroundColor: colors.primary }]}
            >
              <Ionicons name="add" size={16} color="#FFFFFF" />
              <Text style={styles.addCowMiniBtnText}>Add Cow</Text>
            </Pressable>
          </View>

          {/* RFID Requirement Notice */}
          <View style={[styles.pashuNoticeBox, { backgroundColor: isDark ? '#0F172A' : '#F0FDF4', borderColor: '#BBF7D0' }]}>
            <Ionicons name="qr-code-outline" size={18} color="#16A34A" />
            <Text style={[Typography.caption2, { color: '#166534', flex: 1, marginLeft: 8, lineHeight: 16 }]}>
              Govt. Pashu Aadhaar (*): Every registered cow requires a unique 12-digit numeric tag number (e.g. 100100001055) for cattle health passports and direct procurement.
            </Text>
          </View>

          {/* List of Cow Cards */}
          <View style={styles.cowsListContainer}>
            {cowEntries.map((cow, index) => {
              const cowNum = index + 1;
              const tagError = errors[`cow_${cow.id}_pashuAadhaar`];
              const breedError = errors[`cow_${cow.id}_breed`];
              const milkError = errors[`cow_${cow.id}_milkCapacity`];
              const cleanTag = cow.pashuAadhaar.replace(/\D/g, '');
              const isTagComplete = cleanTag.length === 12;

              return (
                <View 
                  key={cow.id} 
                  style={[
                    styles.cowItemCard, 
                    { 
                      backgroundColor: isDark ? '#1E293B' : '#FFFFFF', 
                      borderColor: tagError ? '#EF4444' : (isDark ? '#334155' : '#E2E8F0') 
                    }
                  ]}
                >
                  {/* Cow Card Top Bar */}
                  <View style={styles.cowItemHeader}>
                    <View style={styles.cowBadgeRow}>
                      <View style={[styles.cowIndexPill, { backgroundColor: colors.primaryLight }]}>
                        <Ionicons name="paw" size={12} color={colors.primary} />
                        <Text style={[styles.cowIndexPillText, { color: colors.primary }]}>
                          Cattle #{cowNum}
                        </Text>
                      </View>

                      {isTagComplete ? (
                        <View style={styles.tagVerifiedPill}>
                          <Ionicons name="checkmark-circle" size={12} color="#15803D" />
                          <Text style={styles.tagVerifiedPillText}>12/12 DIGITS</Text>
                        </View>
                      ) : (
                        <View style={styles.tagPendingPill}>
                          <Text style={styles.tagPendingPillText}>
                            {cleanTag.length}/12 Digits
                          </Text>
                        </View>
                      )}
                    </View>

                    {cowEntries.length > 1 && (
                      <Pressable 
                        onPress={() => handleRemoveCow(cow.id)}
                        hitSlop={8}
                        style={styles.removeCowBtn}
                      >
                        <Ionicons name="trash-outline" size={16} color="#DC2626" />
                        <Text style={styles.removeCowBtnText}>Remove</Text>
                      </Pressable>
                    )}
                  </View>

                  {/* 1. Pashu Aadhaar Input (Mandatory *) */}
                  <View style={{ marginBottom: 10 }}>
                    <TextField
                      label={`Pashu Aadhaar Number (12 Digits) *`}
                      placeholder="e.g. 100100001055"
                      value={cow.pashuAadhaar}
                      onChangeText={(val) => {
                        const numericOnly = val.replace(/\D/g, '').slice(0, 12);
                        handleUpdateCow(cow.id, 'pashuAadhaar', numericOnly);
                      }}
                      keyboardType="number-pad"
                      maxLength={12}
                      error={tagError}
                      icon="barcode-outline"
                    />
                    <Text style={[Typography.caption2, { color: colors.textMuted, marginTop: -4, marginLeft: 2 }]}>
                      Official INAPH / Bharat Pashudhan 12-digit ear tag number
                    </Text>
                  </View>

                  {/* 2. Cattle Type / Breed Selection (Mandatory *) */}
                  <View style={{ marginBottom: 12 }}>
                    <Text style={[Typography.subhead, { color: breedError ? colors.hold : colors.text, fontWeight: '700', marginBottom: 6 }]}>
                      Cattle Type / Breed *
                    </Text>
                    <View style={styles.breedChipsWrap}>
                      {POPULAR_BREEDS.map((breedOption) => {
                        const isSelected = cow.breed === breedOption;
                        return (
                          <Pressable
                            key={breedOption}
                            onPress={() => handleUpdateCow(cow.id, 'breed', breedOption)}
                            style={[
                              styles.breedChip,
                              {
                                backgroundColor: isSelected ? colors.primary : (isDark ? '#0F172A' : '#F1F5F9'),
                                borderColor: isSelected ? colors.primary : colors.border,
                              }
                            ]}
                          >
                            <Text style={[
                              styles.breedChipText,
                              { color: isSelected ? '#FFFFFF' : colors.text }
                            ]}>
                              {breedOption}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    {breedError && (
                      <Text style={[Typography.caption2, { color: colors.hold, marginTop: 4 }]}>
                        {breedError}
                      </Text>
                    )}
                  </View>

                  {/* 3. Daily Milk Yield Capacity (Mandatory *) */}
                  <View style={{ marginBottom: 10 }}>
                    <TextField
                      label="Daily Milk Capacity (Litres/Day) *"
                      placeholder="e.g. 12.0"
                      value={cow.milkCapacity}
                      onChangeText={(val) => handleUpdateCow(cow.id, 'milkCapacity', val)}
                      keyboardType="decimal-pad"
                      error={milkError}
                      icon="water-outline"
                    />
                    {/* Quick Milk Presets */}
                    <View style={styles.presetRow}>
                      <Text style={[Typography.caption2, { color: colors.textSecondary, marginRight: 6 }]}>
                        Presets:
                      </Text>
                      {MILK_PRESETS.map((preset) => (
                        <Pressable
                          key={preset}
                          onPress={() => handleUpdateCow(cow.id, 'milkCapacity', preset)}
                          style={[
                            styles.presetPill,
                            {
                              backgroundColor: cow.milkCapacity === preset ? '#DCFCE7' : (isDark ? '#0F172A' : '#F8FAFC'),
                              borderColor: cow.milkCapacity === preset ? '#16A34A' : colors.border,
                            }
                          ]}
                        >
                          <Text style={[
                            styles.presetPillText,
                            { color: cow.milkCapacity === preset ? '#15803D' : colors.textSecondary }
                          ]}>
                            {preset} L
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  {/* 4. Optional Nickname */}
                  <TextField
                    label="Cattle Nickname / Call Name (Optional)"
                    placeholder="e.g. Lakshmi / Kamadhenu"
                    value={cow.name}
                    onChangeText={(val) => handleUpdateCow(cow.id, 'name', val)}
                    icon="happy-outline"
                  />
                </View>
              );
            })}
          </View>

          {/* Add Another Cow Button */}
          <Button
            title={`+ Add Another Cow (#${cowEntries.length + 1})`}
            variant="outline"
            onPress={handleAddCow}
            style={{ marginTop: 8 }}
          />
        </Card>

        {/* 3. Location & Booth Assignment Card */}
        <Card style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={[styles.sectionIconBadge, { backgroundColor: '#E0F2FE' }]}>
              <Ionicons name="business" size={16} color="#0284C7" />
            </View>
            <Text style={[Typography.headline, { color: colors.text, fontWeight: '800', marginLeft: 8 }]}>
              3. Location & Primary Society
            </Text>
          </View>

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

          <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700', marginBottom: 8, marginTop: 4 }]}>
            Assigned Collection Booth Center *
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
                    <Text style={[Typography.subhead, { color: colors.text, fontWeight: isSelected ? '800' : '500' }]}>
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

        {/* 4. Direct Benefit Transfer (Optional) Card */}
        <Card style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={[styles.sectionIconBadge, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="card" size={16} color="#D97706" />
            </View>
            <Text style={[Typography.headline, { color: colors.text, fontWeight: '800', marginLeft: 8 }]}>
              4. Direct Benefit Transfer (DBT / Bank)
            </Text>
          </View>

          <TextField
            label="Bank Account Holder Name"
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

        {/* Submit & Cancel Buttons */}
        <Button
          title={`Enroll Farmer with ${cowEntries.length} ${cowEntries.length === 1 ? 'Cow' : 'Cows'}`}
          onPress={handleRegister}
          loading={submitting}
          size="lg"
          style={{ marginTop: 8 }}
        />

        <Button
          title="Cancel & Return"
          variant="outline"
          onPress={() => router.back()}
          style={{ marginTop: 10, marginBottom: 36 }}
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
    paddingTop: 14,
  },
  govBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  card: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCowMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  addCowMiniBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  pashuNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 14,
  },
  cowsListContainer: {
    gap: 14,
    marginBottom: 10,
  },
  cowItemCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  cowItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cowBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cowIndexPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  cowIndexPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  tagVerifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  tagVerifiedPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#15803D',
  },
  tagPendingPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagPendingPillText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
  },
  removeCowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  removeCowBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  breedChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  breedChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  breedChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  presetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  presetPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  presetPillText: {
    fontSize: 10,
    fontWeight: '700',
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
