import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  Pressable, 
  TextInput, 
  Alert, 
  Modal, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform 
} from 'react-native';
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
import { EmptyState } from '../../components/ui/EmptyState';
import { Farmer } from '../../types/aavin';

export default function BoothFarmersScreen() {
  const { user } = useAuth();
  const { farmers, booths, cows, verifyFarmer, updateFarmer } = useAavinStore();
  const { colors, isDark } = useTheme();
  const router = useRouter();

  const boothId = user?.associatedId || 'BOOTH001';
  const booth = booths.find(b => b.id === boothId) || booths[0];

  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterScope, setFilterScope] = useState<'assigned' | 'all'>('assigned');
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'pending'>('all');

  // Edit Modal State
  const [editingFarmer, setEditingFarmer] = useState<Farmer | null>(null);
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formIdCode, setFormIdCode] = useState('');
  const [formVillage, setFormVillage] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formCommunity, setFormCommunity] = useState('');
  const [formBoothId, setFormBoothId] = useState('');
  const [formCowsCount, setFormCowsCount] = useState('1');
  const [formStatus, setFormStatus] = useState<'verified' | 'pending'>('verified');
  const [formBankAccName, setFormBankAccName] = useState('');
  const [formBankName, setFormBankName] = useState('');
  const [formBankAccNum, setFormBankAccNum] = useState('');
  const [formBankIfsc, setFormBankIfsc] = useState('');
  const [formUpiId, setFormUpiId] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // List of farmers matching current scope
  const baseFarmers = filterScope === 'assigned' 
    ? farmers.filter(f => f.assignedBoothId === booth.id)
    : farmers;

  const filtered = baseFarmers.filter(f => {
    // Status filter
    if (statusFilter !== 'all' && f.verificationStatus !== statusFilter) {
      return false;
    }
    // Search query
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      f.name.toLowerCase().includes(q) || 
      f.farmerIdCode.toLowerCase().includes(q) || 
      f.mobileNumber.includes(q) ||
      f.village.toLowerCase().includes(q) ||
      (f.community && f.community.toLowerCase().includes(q))
    );
  });

  const handleToggleVerification = (farmerId: string, currentStatus: 'verified' | 'pending') => {
    const nextStatus = currentStatus === 'verified' ? 'pending' : 'verified';
    verifyFarmer(farmerId, nextStatus);
    Alert.alert('KYC Updated', `Farmer status set to ${nextStatus.toUpperCase()}.`);
  };

  const handleOpenEditModal = (farmer: Farmer) => {
    setEditingFarmer(farmer);
    setFormName(farmer.name);
    setFormPhone(farmer.mobileNumber);
    setFormIdCode(farmer.farmerIdCode);
    setFormVillage(farmer.village);
    setFormAddress(farmer.address);
    setFormCommunity(farmer.community || 'Melur Taluk');
    setFormBoothId(farmer.assignedBoothId || booth.id);
    setFormCowsCount(String(farmer.numberOfCows || 1));
    setFormStatus(farmer.verificationStatus);
    setFormBankAccName(farmer.bankAccountName || farmer.name);
    setFormBankName(farmer.bankName || 'Canara Bank - Melur');
    setFormBankAccNum(farmer.bankAccountNumber || '');
    setFormBankIfsc(farmer.bankIfsc || 'CNRB0001092');
    setFormUpiId(farmer.upiId || '');
    setErrors({});
  };

  const handleCloseModal = () => {
    setEditingFarmer(null);
    setErrors({});
  };

  const handleSaveFarmer = async () => {
    const newErrors: Record<string, string> = {};

    if (!formName.trim()) {
      newErrors.name = 'Farmer name is required.';
    }

    const cleanPhone = formPhone.trim().replace(/\D/g, '');
    if (!cleanPhone) {
      newErrors.phone = 'Mobile phone number is required.';
    } else if (cleanPhone.length !== 10) {
      newErrors.phone = 'Enter a valid 10-digit Indian phone number.';
    }

    if (!formVillage.trim()) {
      newErrors.village = 'Village / Hamlet name is required.';
    }
    if (!formAddress.trim()) {
      newErrors.address = 'Street / Door address is required.';
    }

    const parsedCows = parseInt(formCowsCount, 10);
    if (isNaN(parsedCows) || parsedCows < 0) {
      newErrors.cows = 'Enter a valid number of cattle (0 or more).';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      Alert.alert('Validation Error', 'Please correct the highlighted fields before saving.');
      return;
    }

    if (!editingFarmer) return;

    setIsSaving(true);
    try {
      const updatedFarmerData: Farmer = {
        ...editingFarmer,
        name: formName.trim(),
        mobileNumber: cleanPhone,
        farmerIdCode: formIdCode.trim() || editingFarmer.farmerIdCode,
        village: formVillage.trim(),
        address: formAddress.trim(),
        community: formCommunity.trim() || 'Melur Taluk',
        assignedBoothId: formBoothId,
        numberOfCows: parsedCows,
        verificationStatus: formStatus,
        bankAccountName: formBankAccName.trim() || undefined,
        bankName: formBankName.trim() || undefined,
        bankAccountNumber: formBankAccNum.trim() || undefined,
        bankIfsc: formBankIfsc.trim() || undefined,
        upiId: formUpiId.trim() || undefined,
      };

      updateFarmer(updatedFarmerData);
      setIsSaving(false);
      handleCloseModal();

      Alert.alert(
        'Farmer Data Updated',
        `Successfully updated profile for ${updatedFarmerData.name} (${updatedFarmerData.farmerIdCode}). Changes have been saved to the society database and synced.`
      );
    } catch (err: any) {
      setIsSaving(false);
      Alert.alert('Error', err?.message || 'Failed to update farmer data. Please try again.');
    }
  };

  const assignedCount = farmers.filter(f => f.assignedBoothId === booth.id).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <DemoHeader 
        title="Farmers Directory"
        subtitle={`${assignedCount} Member Farmers • ${booth.name}`}
        showBack
      />

      {/* Top Search & Filter Bar */}
      <View style={[styles.topBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={[styles.searchBox, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderColor: colors.border }]}>
          <Ionicons name="search" size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
          <TextInput
            placeholder="Search Name, Farmer ID, Phone, Village..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { color: colors.text }]}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </Pressable>
          )}
        </View>

        <Button
          title="+ Register"
          size="sm"
          onPress={() => router.push('/(auth)/register')}
        />
      </View>

      {/* Filter Chips Bar */}
      <View style={[styles.filterBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.filterChipGroup}>
          <Pressable
            onPress={() => setFilterScope('assigned')}
            style={[
              styles.filterChip,
              filterScope === 'assigned'
                ? { backgroundColor: colors.primary, borderColor: colors.primary }
                : { backgroundColor: colors.background, borderColor: colors.border }
            ]}
          >
            <Text style={[
              styles.filterChipText,
              { color: filterScope === 'assigned' ? '#FFFFFF' : colors.textSecondary }
            ]}>
              This Society ({assignedCount})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setFilterScope('all')}
            style={[
              styles.filterChip,
              filterScope === 'all'
                ? { backgroundColor: colors.primary, borderColor: colors.primary }
                : { backgroundColor: colors.background, borderColor: colors.border }
            ]}
          >
            <Text style={[
              styles.filterChipText,
              { color: filterScope === 'all' ? '#FFFFFF' : colors.textSecondary }
            ]}>
              All Network ({farmers.length})
            </Text>
          </Pressable>
        </View>

        <View style={styles.filterChipGroup}>
          <Pressable
            onPress={() => setStatusFilter(statusFilter === 'all' ? 'verified' : statusFilter === 'verified' ? 'pending' : 'all')}
            style={[
              styles.statusChip,
              { borderColor: colors.border, backgroundColor: colors.background }
            ]}
          >
            <Ionicons 
              name={statusFilter === 'verified' ? 'checkmark-circle' : statusFilter === 'pending' ? 'time' : 'funnel-outline'} 
              size={12} 
              color={statusFilter === 'verified' ? '#16A34A' : statusFilter === 'pending' ? '#D97706' : colors.textSecondary} 
            />
            <Text style={[styles.statusChipText, { color: colors.textSecondary }]}>
              {statusFilter === 'all' ? 'All Status' : statusFilter === 'verified' ? 'Verified Only' : 'Pending Only'}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Farmers List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            title="No Farmers Found"
            message={searchQuery ? `No farmers match "${searchQuery}".` : 'No farmers available under selected filters.'}
            icon="people-outline"
          />
        }
        renderItem={({ item }) => {
          const farmerCows = cows.filter(c => c.farmerId === item.id);
          const isVerified = item.verificationStatus === 'verified';
          const assignedBoothObj = booths.find(b => b.id === item.assignedBoothId);

          return (
            <Card style={styles.farmerCard}>
              {/* Card Header */}
              <View style={styles.cardHeader}>
                <View style={styles.avatarBox}>
                  <Text style={{ fontSize: 24 }}>👨‍🌾</Text>
                </View>

                <View style={{ flex: 1, marginLeft: 10 }}>
                  <View style={styles.titleRow}>
                    <Text style={[Typography.headline, { color: colors.text, fontWeight: '800', flex: 1 }]}>
                      {item.name}
                    </Text>
                    <View
                      style={[
                        styles.verifBadge,
                        { backgroundColor: isVerified ? '#DCFCE7' : '#FEF3C7' },
                      ]}
                    >
                      <Ionicons 
                        name={isVerified ? 'checkmark-circle' : 'time'} 
                        size={12} 
                        color={isVerified ? '#15803D' : '#B45309'} 
                      />
                      <Text style={[styles.verifBadgeText, { color: isVerified ? '#15803D' : '#B45309' }]}>
                        {isVerified ? 'VERIFIED' : 'PENDING'}
                      </Text>
                    </View>
                  </View>

                  <Text style={[Typography.caption1, { color: colors.primary, fontWeight: '700', marginTop: 2 }]}>
                    {item.farmerIdCode} • +91 {item.mobileNumber}
                  </Text>
                </View>
              </View>

              {/* Card Details */}
              <View style={[styles.cardDetails, { borderTopColor: colors.border }]}>
                <View style={styles.detailRow}>
                  <View style={styles.detailLabelCol}>
                    <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                    <Text style={[Typography.caption2, { color: colors.textSecondary, marginLeft: 4 }]}>Location:</Text>
                  </View>
                  <Text style={[Typography.caption1, { color: colors.text, fontWeight: '600', flex: 1, textAlign: 'right' }]}>
                    {item.address}, {item.village} ({item.community || 'Melur Taluk'})
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <View style={styles.detailLabelCol}>
                    <Ionicons name="business-outline" size={14} color={colors.textSecondary} />
                    <Text style={[Typography.caption2, { color: colors.textSecondary, marginLeft: 4 }]}>Assigned Society:</Text>
                  </View>
                  <Text style={[Typography.caption1, { color: colors.text, fontWeight: '600', textAlign: 'right' }]}>
                    {assignedBoothObj?.name || item.assignedBoothId}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <View style={styles.detailLabelCol}>
                    <Ionicons name="git-branch-outline" size={14} color={colors.textSecondary} />
                    <Text style={[Typography.caption2, { color: colors.textSecondary, marginLeft: 4 }]}>Registered Cattle:</Text>
                  </View>
                  <Text style={[Typography.caption1, { color: colors.primary, fontWeight: '700' }]}>
                    {farmerCows.length} Cows ({farmerCows.map(c => c.name).join(', ') || `${item.numberOfCows || 0} registered`})
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <View style={styles.detailLabelCol}>
                    <Ionicons name="card-outline" size={14} color={colors.textSecondary} />
                    <Text style={[Typography.caption2, { color: colors.textSecondary, marginLeft: 4 }]}>DBT Bank Account:</Text>
                  </View>
                  <Text style={[Typography.caption1, { color: colors.text, fontWeight: '600' }]}>
                    {item.bankName || 'Canara Bank'} • {item.bankAccountNumber ? `•••• ${item.bankAccountNumber.slice(-4)}` : 'Linked'}
                  </Text>
                </View>
              </View>

              {/* Action Buttons: Edit Farmer & Toggle Verification */}
              <View style={[styles.cardActions, { borderTopColor: colors.border }]}>
                <Pressable
                  onPress={() => handleToggleVerification(item.id, item.verificationStatus)}
                  style={[styles.actionBtnSecondary, { borderColor: colors.border }]}
                >
                  <Ionicons 
                    name={isVerified ? 'alert-circle-outline' : 'checkmark-done'} 
                    size={14} 
                    color={isVerified ? '#B45309' : '#15803D'} 
                  />
                  <Text style={[styles.actionBtnText, { color: isVerified ? '#B45309' : '#15803D' }]}>
                    {isVerified ? 'Flag Pending' : 'Verify KYC'}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => handleOpenEditModal(item)}
                  style={[styles.actionBtnPrimary, { backgroundColor: colors.primaryLight }]}
                >
                  <Ionicons name="create-outline" size={15} color={colors.primary} />
                  <Text style={[styles.actionBtnPrimaryText, { color: colors.primary }]}>
                    Edit Farmer Data
                  </Text>
                </Pressable>
              </View>
            </Card>
          );
        }}
      />

      {/* Edit Farmer Modal */}
      <Modal
        visible={!!editingFarmer}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={[styles.modalSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[Typography.title3, { color: colors.text, fontWeight: '800' }]}>
                  Edit Farmer Data
                </Text>
                <Text style={[Typography.caption1, { color: colors.primary, fontWeight: '600' }]}>
                  {editingFarmer?.farmerIdCode} • ID: {editingFarmer?.id}
                </Text>
              </View>

              <Pressable
                onPress={handleCloseModal}
                style={[styles.closeBtn, { backgroundColor: colors.background }]}
                hitSlop={10}
              >
                <Ionicons name="close" size={20} color={colors.text} />
              </Pressable>
            </View>

            {/* Modal Body */}
            <ScrollView contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
              {/* Section 1: Personal & Contact */}
              <View style={styles.formSection}>
                <View style={styles.sectionHeaderRow}>
                  <Ionicons name="person-circle-outline" size={18} color={colors.primary} />
                  <Text style={[Typography.headline, { color: colors.text, fontWeight: '800', marginLeft: 6 }]}>
                    Farmer Profile & Contact
                  </Text>
                </View>

                <TextField
                  label="Full Name *"
                  value={formName}
                  onChangeText={(val) => {
                    setFormName(val);
                    if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
                  }}
                  placeholder="e.g. K. Murugesan"
                  error={errors.name}
                  icon="person-outline"
                />

                <TextField
                  label="Mobile Phone Number (10 digits) *"
                  value={formPhone}
                  onChangeText={(val) => {
                    setFormPhone(val);
                    if (errors.phone) setErrors(prev => ({ ...prev, phone: '' }));
                  }}
                  placeholder="e.g. 9842000002"
                  keyboardType="phone-pad"
                  maxLength={10}
                  error={errors.phone}
                  icon="call-outline"
                />

                <TextField
                  label="Farmer ID Code"
                  value={formIdCode}
                  onChangeText={setFormIdCode}
                  placeholder="e.g. FARM-MDU-101"
                  icon="barcode-outline"
                  helperText="Official Aavin member identification code"
                />
              </View>

              {/* Section 2: Location & Address */}
              <View style={styles.formSection}>
                <View style={styles.sectionHeaderRow}>
                  <Ionicons name="map-outline" size={18} color={colors.primary} />
                  <Text style={[Typography.headline, { color: colors.text, fontWeight: '800', marginLeft: 6 }]}>
                    Residential & Village Location
                  </Text>
                </View>

                <TextField
                  label="Village / Hamlet *"
                  value={formVillage}
                  onChangeText={(val) => {
                    setFormVillage(val);
                    if (errors.village) setErrors(prev => ({ ...prev, village: '' }));
                  }}
                  placeholder="e.g. Melur Rural"
                  error={errors.village}
                  icon="home-outline"
                />

                <TextField
                  label="Street / Door Address *"
                  value={formAddress}
                  onChangeText={(val) => {
                    setFormAddress(val);
                    if (errors.address) setErrors(prev => ({ ...prev, address: '' }));
                  }}
                  placeholder="e.g. 14, South Street"
                  error={errors.address}
                  icon="location-outline"
                />

                <TextField
                  label="Taluk / District"
                  value={formCommunity}
                  onChangeText={setFormCommunity}
                  placeholder="e.g. Melur Taluk"
                  icon="navigate-outline"
                />
              </View>

              {/* Section 3: Booth Assignment, KYC & Cattle */}
              <View style={styles.formSection}>
                <View style={styles.sectionHeaderRow}>
                  <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
                  <Text style={[Typography.headline, { color: colors.text, fontWeight: '800', marginLeft: 6 }]}>
                    Society Assignment & KYC Status
                  </Text>
                </View>

                {/* Booth Selector */}
                <Text style={[Typography.subhead, { color: colors.textSecondary, marginBottom: 8, fontWeight: '600' }]}>
                  Assigned Collection Society:
                </Text>
                <View style={styles.boothChipsRow}>
                  {booths.map(b => (
                    <Pressable
                      key={b.id}
                      onPress={() => setFormBoothId(b.id)}
                      style={[
                        styles.boothChoiceChip,
                        formBoothId === b.id
                          ? { backgroundColor: colors.primary, borderColor: colors.primary }
                          : { backgroundColor: colors.background, borderColor: colors.border }
                      ]}
                    >
                      <Text style={[
                        styles.boothChoiceText,
                        { color: formBoothId === b.id ? '#FFFFFF' : colors.text }
                      ]}>
                        {b.name} ({b.code})
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {/* KYC Verification Status Segment */}
                <Text style={[Typography.subhead, { color: colors.textSecondary, marginTop: 14, marginBottom: 8, fontWeight: '600' }]}>
                  KYC Verification Status:
                </Text>
                <View style={styles.statusSegmentRow}>
                  <Pressable
                    onPress={() => setFormStatus('verified')}
                    style={[
                      styles.statusSegmentBtn,
                      formStatus === 'verified'
                        ? { backgroundColor: '#DCFCE7', borderColor: '#16A34A' }
                        : { backgroundColor: colors.background, borderColor: colors.border }
                    ]}
                  >
                    <Ionicons 
                      name="checkmark-circle" 
                      size={16} 
                      color={formStatus === 'verified' ? '#15803D' : colors.textMuted} 
                    />
                    <Text style={[
                      styles.statusSegmentText,
                      { color: formStatus === 'verified' ? '#15803D' : colors.textMuted }
                    ]}>
                      Verified Member
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setFormStatus('pending')}
                    style={[
                      styles.statusSegmentBtn,
                      formStatus === 'pending'
                        ? { backgroundColor: '#FEF3C7', borderColor: '#D97706' }
                        : { backgroundColor: colors.background, borderColor: colors.border }
                    ]}
                  >
                    <Ionicons 
                      name="time" 
                      size={16} 
                      color={formStatus === 'pending' ? '#B45309' : colors.textMuted} 
                    />
                    <Text style={[
                      styles.statusSegmentText,
                      { color: formStatus === 'pending' ? '#B45309' : colors.textMuted }
                    ]}>
                      Pending Review
                    </Text>
                  </Pressable>
                </View>

                {/* Number of Cows */}
                <TextField
                  label="Number of Registered Cattle"
                  value={formCowsCount}
                  onChangeText={(val) => {
                    setFormCowsCount(val);
                    if (errors.cows) setErrors(prev => ({ ...prev, cows: '' }));
                  }}
                  keyboardType="numeric"
                  placeholder="e.g. 2"
                  error={errors.cows}
                  icon="fitness-outline"
                />
              </View>

              {/* Section 4: Direct Benefit Transfer (DBT) & Banking */}
              <View style={styles.formSection}>
                <View style={styles.sectionHeaderRow}>
                  <Ionicons name="card-outline" size={18} color={colors.primary} />
                  <Text style={[Typography.headline, { color: colors.text, fontWeight: '800', marginLeft: 6 }]}>
                    Direct Benefit Transfer (DBT) Account
                  </Text>
                </View>

                <TextField
                  label="Account Holder Name"
                  value={formBankAccName}
                  onChangeText={setFormBankAccName}
                  placeholder="e.g. K. Murugesan"
                  icon="person-outline"
                />

                <TextField
                  label="Bank Name & Branch"
                  value={formBankName}
                  onChangeText={setFormBankName}
                  placeholder="e.g. Canara Bank - Melur"
                  icon="business-outline"
                />

                <TextField
                  label="Bank Account Number"
                  value={formBankAccNum}
                  onChangeText={setFormBankAccNum}
                  placeholder="e.g. 109283746501"
                  keyboardType="numeric"
                  icon="card-outline"
                />

                <TextField
                  label="IFSC Code"
                  value={formBankIfsc}
                  onChangeText={setFormBankIfsc}
                  placeholder="e.g. CNRB0001092"
                  autoCapitalize="characters"
                  icon="key-outline"
                />

                <TextField
                  label="UPI ID (Optional)"
                  value={formUpiId}
                  onChangeText={setFormUpiId}
                  placeholder="e.g. murugan@okhdfcbank"
                  icon="qr-code-outline"
                  autoCapitalize="none"
                />
              </View>
            </ScrollView>

            {/* Modal Footer */}
            <View style={[styles.modalFooter, { borderTopColor: colors.border, backgroundColor: colors.card }]}>
              <Button
                title="Cancel"
                variant="outline"
                size="md"
                onPress={handleCloseModal}
                style={{ flex: 1 }}
              />
              <Button
                title={isSaving ? "Saving..." : "Save Changes"}
                size="md"
                onPress={handleSaveFarmer}
                loading={isSaving}
                style={{ flex: 1.4 }}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 10,
    borderBottomWidth: 1,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 4,
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  filterChipGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 40,
  },
  farmerCard: {
    padding: 16,
    borderRadius: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  avatarBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEF2F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  verifBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
    marginLeft: 6,
  },
  verifBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  cardDetails: {
    gap: 8,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  detailLabelCol: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  actionBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 5,
  },
  actionBtnPrimaryText: {
    fontSize: 12,
    fontWeight: '800',
  },

  // Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScrollContent: {
    padding: 20,
    gap: 20,
  },
  formSection: {
    gap: 6,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  boothChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  boothChoiceChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  boothChoiceText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusSegmentRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 6,
  },
  statusSegmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 6,
  },
  statusSegmentText: {
    fontSize: 12,
    fontWeight: '800',
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    gap: 12,
  },
});
