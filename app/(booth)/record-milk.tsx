import { BoothText as Text } from '../../components/booth/BoothText';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, View, ScrollView, Alert, KeyboardAvoidingView, Platform, Pressable, TextInput, useWindowDimensions } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useAavinStore } from '../../store/AavinStoreContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { BoothHeader as DemoHeader } from '../../components/booth/BoothHeader';
import { Card } from '../../components/ui/Card';
import { BoothButton as Button } from '../../components/booth/BoothButton';
import { TextField } from '../../components/ui/TextField';
import { Ionicons } from '@expo/vector-icons';
import { AccountsApi } from '../../services/accountsApi';
import { mapFarmer, apiErrorMessage } from '../../services/accountMapping';
import { Farmer } from '../../types/aavin';
import { useMilkCollections } from '../../context/MilkCollectionsContext';
import { submissionKey } from '../../services/dispatchApi';
import { useDispatchWorkflow, useDispatchRefresh } from '../../context/DispatchContext';
import { indiaDate } from '../../services/milkCollectionsApi';
import { CollectionRoute, MeasurementMethod } from '../../types/aavin';
import { OCRRegisterImportModal } from '../../components/scanner/OCRRegisterImportModal';

export default function RecordMilkScreen() {
  const { width, fontScale } = useWindowDimensions();
  const styles = createStyles(width, fontScale);
  const { user } = useAuth();
  const { booths, cows } = useAavinStore();
  const { vendors, createVendor, createVendorMilk, refresh: refreshWorkflow, error: workflowError, loading: workflowLoading } = useDispatchWorkflow();
  useDispatchRefresh();
  const vendorSubmission = useRef(submissionKey());
  const [isOcrMilkOpen, setIsOcrMilkOpen] = useState(false);
  const [vendorForm, setVendorForm] = useState(false);
  const [vendorDraft, setVendorDraft] = useState({ code: '', name: '', phone: '', routeName: '', vehicleNumber: '', vehicleType: '' });
  const [vendorSaving, setVendorSaving] = useState(false);
  const vendorSavingRef = useRef(false);
  const handleCreateVendor = async () => {
    if (vendorSavingRef.current) return;
    if (!vendorDraft.code.trim() || !vendorDraft.name.trim()) { setErrorMsg('Enter a vendor code and name.'); return; }
    const account = boothId;
    vendorSavingRef.current = true; setVendorSaving(true);
    try {
      const vendor = await createVendor(vendorDraft);
      if (accountRef.current !== account) return;
      setSelectedVendorId(vendor.id); setVendorForm(false);
      setVendorDraft({ code: '', name: '', phone: '', routeName: '', vehicleNumber: '', vehicleType: '' });
      await refreshWorkflow();
    } catch (err) { if (accountRef.current === account) setErrorMsg(apiErrorMessage(err)); }
    finally { vendorSavingRef.current = false; if (accountRef.current === account) setVendorSaving(false); }
  };
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ farmerId?: string }>();

  const boothId = user?.id || '';
  const booth = booths.find(b => b.id === boothId) || { id: boothId, name: user?.fullName || 'Society' };
  const { save } = useMilkCollections();
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [farmersLoading, setFarmersLoading] = useState(true);
  const [farmersError, setFarmersError] = useState<string | null>(null);
  const accountRef = useRef(boothId);
  accountRef.current = boothId;
  const submittingRef = useRef(false);
  const assignedFarmers = farmers.filter(f => f.assignedBoothId === boothId);
  useFocusEffect(useCallback(() => {
    let active = true;
    setFarmers([]); setFarmersLoading(true); setFarmersError(null);
    AccountsApi.listFarmers().then(accounts => {
      if (active && accountRef.current === boothId) setFarmers(accounts.filter(a => a.isActive !== false).map(mapFarmer));
    }).catch(err => { if (active) setFarmersError(apiErrorMessage(err)); })
      .finally(() => { if (active) setFarmersLoading(false); });
    return () => { active = false; };
  }, [boothId]));

  // Mode: 'farmer_wise' vs 'combined'
  const [measurementMethod, setMeasurementMethod] = useState<MeasurementMethod>('farmer_wise');
  const [selectedFarmerId, setSelectedFarmerId] = useState(params.farmerId || '');
  const [farmerSearch, setFarmerSearch] = useState('');
  const [showFarmerSelector, setShowFarmerSelector] = useState(true);

  // Delivery Route
  const [route, setRoute] = useState<CollectionRoute>('direct');
  const [selectedVendorId, setSelectedVendorId] = useState('');

  // Intake Data
  const [quantityLitres, setQuantityLitres] = useState('');
  const [session, setSession] = useState<'morning' | 'evening'>('morning');
  const [collectionDate, setCollectionDate] = useState(indiaDate);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Handle route param changes (e.g. navigation from Farmers Directory card)
  useEffect(() => {
    if (params.farmerId) {
      setSelectedFarmerId(params.farmerId);
      setShowFarmerSelector(false);
    }
  }, [params.farmerId]);

  // Selected entities
  const selectedFarmer = assignedFarmers.find(f => f.id === selectedFarmerId);
  const selectedVendor = vendors.find(v => v.id === selectedVendorId);

  // Active withdrawal check
  const farmerCows = cows.filter(c => c.farmerId === selectedFarmerId);
  const cowWithWithdrawal = farmerCows.find(c => c.activeWithdrawal?.hasActiveWithdrawal);

  // Filtered farmers list
  const filteredFarmers = assignedFarmers.filter(f => {
    if (!farmerSearch.trim()) return true;
    const q = farmerSearch.toLowerCase();
    return (
      f.name.toLowerCase().includes(q) ||
      f.farmerIdCode.toLowerCase().includes(q) ||
      f.village.toLowerCase().includes(q) ||
      f.mobileNumber.includes(q)
    );
  });

  // Quick preset quantity adjustment
  const handlePresetVolume = (litres: number) => {
    setQuantityLitres(litres.toFixed(2));
    setErrorMsg(null);
  };

  const handleStepVolume = (delta: number) => {
    const current = parseFloat(quantityLitres) || 0;
    const nextVal = Math.max(0, current + delta);
    setQuantityLitres(nextVal > 0 ? nextVal.toFixed(2) : '');
    setErrorMsg(null);
  };

  const handleSubmit = async () => {
    if (submittingRef.current) return;
    setErrorMsg(null);
    if (measurementMethod === 'farmer_wise' && (!selectedFarmer || farmersLoading || farmersError)) { setErrorMsg('Select a farmer from the current society list.'); return; }
    if ((measurementMethod === 'combined' || route === 'vendor') && !selectedVendor) { setErrorMsg('Select a saved route vendor.'); return; }
    const cleanQty = quantityLitres.trim();
    if (!/^\d{1,8}(?:\.\d{1,2})?$/.test(cleanQty) || Number(cleanQty) <= 0) {
      setErrorMsg('Enter collected litres greater than zero, with at most two decimal places.'); return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(collectionDate) || !Number.isFinite(Date.parse(collectionDate + 'T00:00:00Z')) ||
        new Date(collectionDate + 'T00:00:00Z').toISOString().slice(0, 10) !== collectionDate || collectionDate > indiaDate()) {
      setErrorMsg('Enter a valid collection date on or before today (India time).'); return;
    }
    if (notes.trim().length > 1000) { setErrorMsg('Notes must be 1,000 characters or fewer.'); return; }
    const account = boothId;
    submittingRef.current = true; setSubmitting(true);
    try {
      const record = measurementMethod === 'combined'
        ? await createVendorMilk({ vendorId: selectedVendor!.id, quantityLitres: cleanQty, collectionDate, session, notes: notes.trim(), submissionKey: vendorSubmission.current })
        : await save({ farmerId: selectedFarmer!.id, vendorId: route === 'vendor' ? selectedVendor!.id : undefined, quantityLitres: cleanQty, collectionDate, session, notes: notes.trim() });
      if (accountRef.current !== account) return;
      vendorSubmission.current = submissionKey();
      setQuantityLitres(''); setNotes('');
      void refreshWorkflow();
      Alert.alert('Milk Collection Saved', `${record.quantityLitres.toFixed(2)} litres recorded for ${record.farmerName || record.vendorName} on ${record.collectionDate} (${record.session}). ${measurementMethod === 'combined' ? 'Vendor batch saved without individual farmer allocation.' : 'The farmer can view this collection and notification in their app.'}`,
        [{ text: 'Record Another', onPress: () => { setQuantityLitres(''); setNotes(''); } },
         { text: 'View Collection', onPress: () => router.push({ pathname: '/(booth)/review-collection', params: { collectionDate: record.collectionDate } }) }]);
    } catch (err: any) { if (accountRef.current === account) setErrorMsg(apiErrorMessage(err)); }
    finally { submittingRef.current = false; if (accountRef.current === account) setSubmitting(false); }
  };

  // Live calculation preview
  const enteredQty = parseFloat(quantityLitres) || 0;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <DemoHeader 
        title="Record Milk Collection"
        subtitle={`Milk Intake Station • ${booth.name}`}
        showBack
      />

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {farmersLoading && <Text style={{ color: colors.textSecondary }}>Loading assigned farmers…</Text>}
        {farmersError && <Text style={{ color: colors.hold }}>{farmersError} Leave and reopen this screen to retry.</Text>}
        {!farmersLoading && !farmersError && assignedFarmers.length === 0 && <Text style={{ color: colors.textSecondary }}>No active farmers assigned. Register a farmer before recording milk.</Text>}
        {workflowError && <Text style={{ color: colors.hold }}>{workflowError}</Text>}
        <Card style={styles.sectionCard}>
          <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
            <Button
              title="Enter Milk from OCR"
              icon="scan-outline"
              size="sm"
              onPress={() => setIsOcrMilkOpen(true)}
            />
            <Button
              title={vendorForm ? 'Close Vendor Form' : '+ Add Route Vendor'}
              variant="outline"
              size="sm"
              onPress={() => setVendorForm(!vendorForm)}
            />
          </View>
          {vendorForm && <View style={{ gap: 10, marginTop: 12 }}>
            {(['code', 'name', 'phone', 'routeName', 'vehicleNumber', 'vehicleType'] as const).map(field => (
              <TextField key={field} label={{ code: 'Vendor Code', name: 'Vendor Name', phone: 'Phone', routeName: 'Route Name', vehicleNumber: 'Vehicle Number', vehicleType: 'Vehicle Type' }[field]}
                value={vendorDraft[field]} onChangeText={value => setVendorDraft(draft => ({ ...draft, [field]: value }))} />
            ))}
            <Button title="Save Vendor" onPress={handleCreateVendor} loading={vendorSaving} disabled={vendorSaving} />
          </View>}
          {!workflowLoading && vendors.length === 0 && <Text style={{ color: colors.textSecondary, marginTop: 8 }}>Add a route vendor before recording vendor milk.</Text>}
        </Card>
        {/* 1. Intake Mode Toggle Card */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="options-outline" size={18} color={colors.primary} />
            <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800', marginLeft: 8 }]}>
              Intake Measurement Mode
            </Text>
          </View>
          <Text style={[Typography.caption2, { color: colors.textSecondary, marginBottom: 12 }]}>
            Select direct individual producer weighing or consolidated route logistics batch
          </Text>

          <View style={styles.modeToggleRow}>
            {/* Mode 1: Farmer Direct */}
            <Pressable
              onPress={() => setMeasurementMethod('farmer_wise')}
              style={[
                styles.modeToggleCard,
                {
                  backgroundColor: measurementMethod === 'farmer_wise' ? (isDark ? '#1E293B' : '#EFF6FF') : (isDark ? '#0F172A' : '#F8FAFC'),
                  borderColor: measurementMethod === 'farmer_wise' ? colors.primary : colors.border,
                },
              ]}
            >
              <View style={styles.modeTextCol}>
                <Text style={[Typography.subhead, { color: measurementMethod === 'farmer_wise' ? colors.primary : colors.text, fontWeight: '800', textAlign: 'center' }]}>
                  Farmer-Wise
                </Text>
                <Text style={[Typography.caption2, { color: colors.textSecondary, fontSize: 11, textAlign: 'center', marginTop: 3 }]}>
                  Individual Weighing
                </Text>
              </View>
            </Pressable>

            {/* Mode 2: Combined Route */}
            <Pressable
              onPress={() => setMeasurementMethod('combined')}
              style={[
                styles.modeToggleCard,
                {
                  backgroundColor: measurementMethod === 'combined' ? (isDark ? '#1E293B' : '#EFF6FF') : (isDark ? '#0F172A' : '#F8FAFC'),
                  borderColor: measurementMethod === 'combined' ? colors.primary : colors.border,
                },
              ]}
            >
              <View style={styles.modeTextCol}>
                <Text style={[Typography.subhead, { color: measurementMethod === 'combined' ? colors.primary : colors.text, fontWeight: '800', textAlign: 'center' }]}>
                  Combined Route
                </Text>
                <Text style={[Typography.caption2, { color: colors.textSecondary, fontSize: 11, textAlign: 'center', marginTop: 3 }]}>
                  Bulk Can Batch
                </Text>
              </View>
            </Pressable>
          </View>
        </Card>

        {/* Error Notification */}
        {errorMsg && (
          <View style={[styles.errorBox, { backgroundColor: '#FEF2F2', borderColor: '#EF4444' }]}>
            <Ionicons name="alert-circle" size={18} color="#DC2626" style={{ marginRight: 8 }} />
            <Text style={[Typography.footnote, { color: '#B91C1C', flex: 1, fontWeight: '600' }]}>
              {errorMsg}
            </Text>
          </View>
        )}

        {/* 2. Producer / Vendor Selection Card */}
        {measurementMethod === 'farmer_wise' ? (
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="person-circle-outline" size={18} color={colors.primary} />
              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800', marginLeft: 8 }]}>
                Select Farmer
              </Text>
              <Pressable 
                onPress={() => setShowFarmerSelector(!showFarmerSelector)}
                style={styles.changeProducerLink}
              >
                <Text style={[Typography.caption1, { color: colors.primary, fontWeight: '800' }]}>
                  {showFarmerSelector ? 'Close List' : 'Select Farmer ▾'}
                </Text>
              </Pressable>
            </View>

            {/* Active Producer Spotlight Banner - Clickable Card to Change Producer */}
            {selectedFarmer && (
              <Pressable
                onPress={() => setShowFarmerSelector(!showFarmerSelector)}
                style={({ pressed }) => [
                  styles.farmerSpotlightBox,
                  {
                    backgroundColor: showFarmerSelector 
                      ? (isDark ? '#1E293B' : '#EFF6FF') 
                      : (isDark ? '#1E293B' : '#F8FAFC'),
                    borderColor: showFarmerSelector ? colors.primary : colors.border,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <View style={styles.farmerSpotlightAvatar}>
                  <Text style={styles.avatarInitials}>
                    {selectedFarmer.name.substring(0, 2).toUpperCase()}
                  </Text>
                </View>

                <View style={styles.farmerSpotlightDetails}>
                  <View style={styles.farmerNameCodeRow}>
                    <Text style={[Typography.subhead, { color: colors.text, fontWeight: '900' }]} numberOfLines={1}>
                      {selectedFarmer.name}
                    </Text>
                  </View>

                  <View style={styles.farmerMetaAlignedRow}>
                    <View style={styles.metaIconText}>
                      <Ionicons name="location-outline" size={12} color={colors.textSecondary} />
                      <Text style={[Typography.caption2, { color: colors.textSecondary, marginLeft: 3 }]}>
                        {selectedFarmer.village}
                      </Text>
                    </View>
                    <Text style={styles.metaDot}>•</Text>
                    <View style={styles.metaIconText}>
                      <Ionicons name="paw-outline" size={12} color={colors.textSecondary} />
                      <Text style={[Typography.caption2, { color: colors.textSecondary, marginLeft: 3 }]}>
                        {selectedFarmer.numberOfCows} Cattle
                      </Text>
                    </View>
                    <Text style={styles.metaDot}>•</Text>
                    <View style={styles.metaIconText}>
                      <Ionicons name="call-outline" size={12} color={colors.textSecondary} />
                      <Text style={[Typography.caption2, { color: colors.textSecondary, marginLeft: 3 }]}>
                        {selectedFarmer.mobileNumber.slice(-4)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Right Action Badge / Chevron Indicator */}
                <View style={[styles.changeFarmerActionPill, { backgroundColor: showFarmerSelector ? colors.primaryLight : (isDark ? '#334155' : '#E0F2FE') }]}>
                  <Text style={[styles.changeFarmerActionText, { color: colors.primary }]}>
                    {showFarmerSelector ? 'Close' : 'Change'}
                  </Text>
                  <Ionicons 
                    name={showFarmerSelector ? "chevron-up" : "chevron-forward"} 
                    size={14} 
                    color={colors.primary} 
                  />
                </View>
              </Pressable>
            )}

            {/* Expandable Searchable Farmer List */}
            {showFarmerSelector && (
              <View style={[styles.farmerDropdownContainer, { borderTopColor: colors.border }]}>
                {/* Search Input */}
                <View style={[styles.farmerSearchInputRow, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9', borderColor: colors.border }]}>
                  <Ionicons name="search" size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
                  <TextInput
                    placeholder="Search by name, ID code, or village..."
                    placeholderTextColor={colors.textMuted}
                    value={farmerSearch}
                    onChangeText={setFarmerSearch}
                    style={[styles.farmerSearchTextInput, { color: colors.text }]}
                  />
                  {farmerSearch.length > 0 && (
                    <Pressable onPress={() => setFarmerSearch('')} hitSlop={8}>
                      <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                    </Pressable>
                  )}
                </View>

                {/* Farmers Radio List */}
                <ScrollView style={styles.farmerListScroll} contentContainerStyle={{ gap: 8 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                  {filteredFarmers.map((f) => {
                    const isSelected = selectedFarmerId === f.id;
                    return (
                      <Pressable
                        key={f.id}
                        onPress={() => {
                          setSelectedFarmerId(f.id);
                          setShowFarmerSelector(false);
                        }}
                        style={[
                          styles.farmerOptionCard,
                          {
                            backgroundColor: isSelected ? (isDark ? '#1E293B' : '#EFF6FF') : (isDark ? '#0F172A' : '#FFFFFF'),
                            borderColor: isSelected ? colors.primary : colors.border,
                          },
                        ]}
                      >
                        <Ionicons 
                          name={isSelected ? 'radio-button-on' : 'radio-button-off'} 
                          size={18} 
                          color={isSelected ? colors.primary : colors.textMuted} 
                        />
                        <View style={{ marginLeft: 10, flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]}>
                              {f.name}
                            </Text>
                          </View>
                          <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                            {f.village} • {f.numberOfCows} Cows • +91 {f.mobileNumber}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Active Withdrawal Warning for this farmer */}
            {cowWithWithdrawal && (
              <View style={styles.withdrawalWarningCard}>
                <View style={styles.warningIconFrame}>
                  <Ionicons name="warning" size={20} color="#DC2626" />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[Typography.caption1, { color: '#B91C1C', fontWeight: '900' }]}>
                    SAFETY WITHDRAWAL HOLD: ACTIVE MEDICINE
                  </Text>
                  <Text style={[Typography.caption2, { color: '#991B1B', marginTop: 2, lineHeight: 16 }]}>
                    Cow "{cowWithWithdrawal.name}" (Tag #{cowWithWithdrawal.tagId}) is under antibiotic withdrawal hold. Ensure milk from this animal was segregated and NOT included in this batch!
                  </Text>
                </View>
              </View>
            )}

            {/* Delivery Route Selector */}
            <View style={[styles.routeSection, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.border }]}>
              <View style={styles.routeHeaderRow}>
                <Ionicons name="navigate-outline" size={16} color={colors.primary} />
                <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800', marginLeft: 6 }]}>
                  Delivery Handover Method
                </Text>
              </View>
              <Text style={[Typography.caption2, { color: colors.textSecondary, marginBottom: 12 }]}>
                Specify how the milk batch physically reached the booth
              </Text>

              <View style={styles.routeToggleRow}>
                <Pressable
                  onPress={() => setRoute('direct')}
                  style={[
                    styles.routeToggleBtn,
                    {
                      backgroundColor: route === 'direct' ? (isDark ? '#0F172A' : '#EFF6FF') : (isDark ? '#1E293B' : '#FFFFFF'),
                      borderColor: route === 'direct' ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <View style={styles.routeBtnTextCol}>
                    <Text style={[styles.routeToggleBtnText, { color: route === 'direct' ? colors.primary : colors.text }]}>
                      Direct Producer Supply
                    </Text>
                    <Text style={[Typography.caption2, { color: colors.textSecondary, fontSize: 10, textAlign: 'center', marginTop: 2 }]}>
                      Producer Handover
                    </Text>
                  </View>
                </Pressable>

                <Pressable
                  onPress={() => setRoute('vendor')}
                  style={[
                    styles.routeToggleBtn,
                    {
                      backgroundColor: route === 'vendor' ? (isDark ? '#0F172A' : '#EFF6FF') : (isDark ? '#1E293B' : '#FFFFFF'),
                      borderColor: route === 'vendor' ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <View style={styles.routeBtnTextCol}>
                    <Text style={[styles.routeToggleBtnText, { color: route === 'vendor' ? colors.primary : colors.text }]}>
                      Route Transport Vehicle
                    </Text>
                    <Text style={[Typography.caption2, { color: colors.textSecondary, fontSize: 10, textAlign: 'center', marginTop: 2 }]}>
                      Vendor Can Route
                    </Text>
                  </View>
                </Pressable>
              </View>

              {route === 'vendor' && (
                <View style={[styles.vendorSelectContainer, { borderColor: colors.border }]}>
                  <Text style={[Typography.caption2, { color: colors.textSecondary, marginBottom: 6 }]}>
                    Select Route Vendor:
                  </Text>
                  {vendors.map((v) => (
                    <Pressable
                      key={v.id}
                      onPress={() => setSelectedVendorId(v.id)}
                      style={[
                        styles.vendorSelectRow,
                        {
                          backgroundColor: selectedVendorId === v.id ? colors.primaryLight : 'transparent',
                          borderColor: selectedVendorId === v.id ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Ionicons 
                        name={selectedVendorId === v.id ? "radio-button-on" : "radio-button-off"} 
                        size={16} 
                        color={selectedVendorId === v.id ? colors.primary : colors.textMuted} 
                      />
                      <Text style={[Typography.caption1, { color: colors.text, fontWeight: '700', marginLeft: 8, flex: 1 }]}>
                        {v.name} ({v.vehicleNumber}) • Route: {v.routeName}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          </Card>
        ) : (
          /* Combined Route Batch Vendor Selection */
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="bus-outline" size={18} color={colors.primary} />
              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800', marginLeft: 8 }]}>
                Combined Route Logistics Batch
              </Text>
            </View>
            <Text style={[Typography.caption2, { color: colors.textSecondary, marginBottom: 12 }]}>
              Measured as a single combined bulk volume from route collection cans without individual weighing.
            </Text>

            <View style={styles.vendorCardsList}>
              {vendors.map((v) => {
                const isSelected = selectedVendorId === v.id;
                return (
                  <Pressable
                    key={v.id}
                    onPress={() => setSelectedVendorId(v.id)}
                    style={[
                      styles.vendorBatchOptionCard,
                      {
                        backgroundColor: isSelected ? (isDark ? '#1E293B' : '#EFF6FF') : (isDark ? '#0F172A' : '#F8FAFC'),
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Ionicons 
                      name={isSelected ? 'radio-button-on' : 'radio-button-off'} 
                      size={18} 
                      color={isSelected ? colors.primary : colors.textMuted} 
                    />
                    <View style={{ marginLeft: 10, flex: 1 }}>
                      <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]}>
                        {v.name}
                      </Text>
                      <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                        Route: {v.routeName} • Vehicle: {v.vehicleNumber}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </Card>
        )}

        {/* 3. Measured Volume Hero Input Card */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="water" size={18} color="#0072BC" />
            <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800', marginLeft: 8 }]}>
              Milk Intake Volume
            </Text>
          </View>
          <Text style={[Typography.caption2, { color: colors.textSecondary, marginBottom: 10 }]}>
            Enter calibrated volumetric measurement in Litres
          </Text>

          {/* Big Number Input Container */}
          <View style={[styles.volumeInputBox, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: colors.border }]}>
            <TextInput
              style={[styles.bigVolumeTextInput, { color: colors.primary }]}
              placeholder="0.00"
              placeholderTextColor={colors.textMuted}
              value={quantityLitres}
              onChangeText={(t) => { setQuantityLitres(t); setErrorMsg(null); }}
              keyboardType="decimal-pad"
              maxLength={11}
            />
            <View style={styles.volumeUnitTag}>
              <Ionicons name="water-outline" size={14} color="#0284C7" />
              <Text style={styles.volumeUnitTagText}>LITRES (L)</Text>
            </View>
          </View>

          {/* Quick Fine-Adjustment Stepper Buttons */}
          <View style={styles.stepperRow}>
            <Pressable 
              style={[styles.stepperBtn, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderColor: colors.border }]}
              onPress={() => handleStepVolume(-1.0)}
            >
              <Text style={[styles.stepperBtnText, { color: colors.text }]}>- 1.0 L</Text>
            </Pressable>

            <Pressable 
              style={[styles.stepperBtn, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderColor: colors.border }]}
              onPress={() => handleStepVolume(-0.5)}
            >
              <Text style={[styles.stepperBtnText, { color: colors.text }]}>- 0.5 L</Text>
            </Pressable>

            <Pressable 
              style={[styles.stepperBtn, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderColor: colors.border }]}
              onPress={() => handleStepVolume(0.5)}
            >
              <Text style={[styles.stepperBtnText, { color: colors.text }]}>+ 0.5 L</Text>
            </Pressable>

            <Pressable 
              style={[styles.stepperBtn, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderColor: colors.border }]}
              onPress={() => handleStepVolume(1.0)}
            >
              <Text style={[styles.stepperBtnText, { color: colors.text }]}>+ 1.0 L</Text>
            </Pressable>
          </View>

          {/* Quick Preset Buttons */}
          <View style={styles.presetsRow}>
            {[5, 10, 15, 20, 25].map((preset) => (
              <Pressable
                key={preset}
                style={[
                  styles.presetChip,
                  {
                    backgroundColor: enteredQty === preset ? colors.primary : (isDark ? '#1E293B' : '#F1F5F9'),
                    borderColor: enteredQty === preset ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => handlePresetVolume(preset)}
              >
                <Text
                  style={[
                    styles.presetChipText,
                    { color: enteredQty === preset ? '#FFFFFF' : colors.textSecondary },
                  ]}
                >
                  {preset} L
                </Text>
              </Pressable>
            ))}
          </View>
        </Card>

        {/* 4. Session & Shift Selection */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="time-outline" size={18} color={colors.primary} />
            <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800', marginLeft: 8 }]}>
              Intake Shift & Session
            </Text>
          </View>

          <View style={styles.sessionToggleRow}>
            {/* Morning Shift */}
            <Pressable
              onPress={() => setSession('morning')}
              style={[
                styles.sessionCard,
                {
                  backgroundColor: session === 'morning' ? '#FEF3C7' : (isDark ? '#0F172A' : '#F8FAFC'),
                  borderColor: session === 'morning' ? '#D97706' : colors.border,
                },
              ]}
            >
              <View style={[styles.sessionIconCircle, { backgroundColor: session === 'morning' ? '#F59E0B' : '#E2E8F0' }]}>
                <Ionicons name="sunny" size={16} color={session === 'morning' ? '#FFFFFF' : '#64748B'} />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[Typography.subhead, { color: session === 'morning' ? '#92400E' : colors.text, fontWeight: '800' }]}>
                  Morning Shift
                </Text>
                <Text style={[Typography.caption2, { color: session === 'morning' ? '#B45309' : colors.textSecondary }]}>
                  காலை • 06:00 - 09:30 AM
                </Text>
              </View>
              <Ionicons 
                name={session === 'morning' ? "checkmark-circle" : "ellipse-outline"} 
                size={18} 
                color={session === 'morning' ? "#D97706" : colors.textMuted} 
              />
            </Pressable>

            {/* Evening Shift */}
            <Pressable
              onPress={() => setSession('evening')}
              style={[
                styles.sessionCard,
                {
                  backgroundColor: session === 'evening' ? '#E0E7FF' : (isDark ? '#0F172A' : '#F8FAFC'),
                  borderColor: session === 'evening' ? '#4F46E5' : colors.border,
                },
              ]}
            >
              <View style={[styles.sessionIconCircle, { backgroundColor: session === 'evening' ? '#6366F1' : '#E2E8F0' }]}>
                <Ionicons name="moon" size={16} color={session === 'evening' ? '#FFFFFF' : '#64748B'} />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[Typography.subhead, { color: session === 'evening' ? '#3730A3' : colors.text, fontWeight: '800' }]}>
                  Evening Shift
                </Text>
                <Text style={[Typography.caption2, { color: session === 'evening' ? '#4338CA' : colors.textSecondary }]}>
                  மாலை • 04:30 - 07:30 PM
                </Text>
              </View>
              <Ionicons 
                name={session === 'evening' ? "checkmark-circle" : "ellipse-outline"} 
                size={18} 
                color={session === 'evening' ? "#4F46E5" : colors.textMuted} 
              />
            </Pressable>
          </View>
        </Card>

        {/* 5. Date & Operator Remarks Card */}
        <Card style={styles.sectionCard}>
          <TextField
            label="Collection Date (YYYY-MM-DD)"
            value={collectionDate}
            onChangeText={setCollectionDate}
            icon="calendar-outline"
          />

          <TextField
            label="Operator Notes (Optional)"
            placeholder="e.g. Can #4 inspected, lactometer 1.028, FAT/SNF passed"
            value={notes}
            onChangeText={setNotes}
            maxLength={1000}
            icon="create-outline"
            helperText="Quality remarks, can IDs, or lactometer test observations"
          />
        </Card>

        {enteredQty > 0 && <Card style={styles.sectionCard}>
          <Text style={{ color: colors.text, fontWeight: '700' }}>Collection preview</Text>
          <Text style={{ color: colors.textSecondary }}>{measurementMethod === 'combined' ? selectedVendor?.name || 'Select a vendor' : selectedFarmer?.name || 'Select a farmer'} • {enteredQty.toFixed(2)} litres</Text>
          <Text style={{ color: colors.textSecondary }}>{collectionDate} • {session === 'morning' ? 'Morning' : 'Evening'} shift</Text>
        </Card>}

        {/* 7. Action Buttons */}
        <View style={styles.actionsContainer}>
          <Button
            title={submitting ? "Saving Intake Entry..." : "Submit Milk Intake Record"}
            size="lg"
            loading={submitting}
            disabled={submitting || workflowLoading || !!workflowError || (measurementMethod === 'combined' ? !selectedVendor : !selectedFarmer || farmersLoading || !!farmersError || (route === 'vendor' && !selectedVendor))}
            onPress={handleSubmit}
            icon="checkmark-circle-outline"
            style={{ marginTop: 4 }}
          />

          <Button
            title="Review Daily Collection Ledger"
            variant="outline"
            onPress={() => router.push('/(booth)/review-collection')}
            style={{ marginTop: 10, marginBottom: 28 }}
          />
        </View>
      </ScrollView>

      {/* OCR Register Milk Import Modal */}
      <OCRRegisterImportModal
        visible={isOcrMilkOpen}
        onClose={() => setIsOcrMilkOpen(false)}
        mode="milk"
        onSuccess={() => {
          router.push('/(booth)/review-collection' as any);
        }}
      />
    </KeyboardAvoidingView>
  );
}

const createStyles = (width: number, fontScale: number) => {
  const compact = width < 600 || fontScale > 1.2;
  return StyleSheet.create({
    container: {
      flex: 1,
      minWidth: 0,
    },
    scrollContent: {
      width: '100%',
      maxWidth: 960,
      alignSelf: 'center',
      padding: 16,
      gap: 14,
      paddingBottom: 128,
    },
    sectionCard: {
      padding: 16,
      borderRadius: 16,
    },
    sectionHeaderRow: {
      gap: 6,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    modeToggleRow: {
      flexDirection: compact ? 'column' : 'row',
      gap: 10,
    },
    modeToggleCard: {
      flex: 1,
      minWidth: 0,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      paddingHorizontal: 12,
      borderRadius: 12,
      borderWidth: 1.5,
    },
    modeTextCol: {
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
    },
    errorBox: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 12,
      borderWidth: 1.5,
    },
    changeProducerLink: {
      marginLeft: 'auto',
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    farmerSpotlightBox: {
      gap: 8,
      flexWrap: 'wrap',
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      marginTop: 6,
    },
    farmerSpotlightAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: '#0072BC',
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarInitials: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '900',
    },
    farmerSpotlightDetails: {
      minWidth: 0,
      flex: 1,
      marginLeft: 12,
    },
    farmerNameCodeRow: {
      gap: 6,
      flexWrap: 'wrap',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 3,
    },
    farmerCodeBadge: {
      backgroundColor: '#E0F2FE',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
    },
    farmerCodeBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      color: '#0284C7',
    },
    farmerMetaAlignedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
    },
    metaIconText: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    metaDot: {
      color: '#94A3B8',
      marginHorizontal: 5,
      fontSize: 10,
    },
    changeFarmerActionPill: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 8,
      gap: 3,
      marginLeft: 8,
    },
    changeFarmerActionText: {
      fontSize: 10,
      fontWeight: '800',
    },
    farmerDropdownContainer: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    farmerSearchInputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1,
      marginBottom: 8,
    },
    farmerSearchTextInput: {
      flex: 1,
      minWidth: 0,
      fontSize: 13,
      padding: 0,
    },
    farmerListScroll: {
      maxHeight: 220,
      gap: 8,
    },
    farmerOptionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 10,
      borderRadius: 10,
      borderWidth: 1,
    },
    withdrawalWarningCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FEF2F2',
      borderWidth: 1.5,
      borderColor: '#FCA5A5',
      padding: 12,
      borderRadius: 12,
      marginTop: 12,
    },
    warningIconFrame: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: '#FEE2E2',
      alignItems: 'center',
      justifyContent: 'center',
    },
    routeSection: {
      marginTop: 16,
      padding: 14,
      borderRadius: 14,
      borderWidth: 1,
    },
    routeHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    routeToggleRow: {
      flexDirection: compact ? 'column' : 'row',
      gap: 10,
    },
    routeToggleBtn: {
      flex: 1,
      minWidth: 0,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      paddingHorizontal: 10,
      borderRadius: 12,
      borderWidth: 1.5,
    },
    routeBtnTextCol: {
      flex: 1,
      minWidth: 0,
      alignItems: 'center',
      justifyContent: 'center',
    },
    routeToggleBtnText: {
      fontSize: 12,
      fontWeight: '800',
      textAlign: 'center',
    },
    vendorSelectContainer: {
      marginTop: 10,
      padding: 10,
      borderRadius: 10,
      borderWidth: 1,
      backgroundColor: '#F8FAFC',
      gap: 6,
    },
    vendorSelectRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 8,
      borderRadius: 8,
      borderWidth: 1,
    },
    vendorCardsList: {
      gap: 8,
    },
    vendorBatchOptionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 12,
      borderWidth: 1.5,
    },
    volumeInputBox: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 14,
      borderWidth: 1.5,
      marginVertical: 4,
    },
    bigVolumeTextInput: {
      minWidth: 0,
      fontSize: width < 360 ? 28 : 36,
      fontWeight: '900',
      letterSpacing: -0.5,
      flex: 1,
      padding: 0,
    },
    volumeUnitTag: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#E0F2FE',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      gap: 4,
    },
    volumeUnitTagText: {
      fontSize: 11,
      fontWeight: '900',
      color: '#0284C7',
      letterSpacing: 0.5,
    },
    stepperRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 10,
    },
    stepperBtn: {
      minHeight: 44,
      flex: 1,
      minWidth: 0,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
    },
    stepperBtnText: {
      fontSize: 11,
      fontWeight: '800',
    },
    presetsRow: {
      flexWrap: 'wrap',
      flexDirection: 'row',
      gap: 8,
      marginTop: 8,
    },
    presetChip: {
      minHeight: 44,
      flexBasis: '28%',
      flex: 1,
      minWidth: 0,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
    },
    presetChipText: {
      fontSize: 12,
      fontWeight: '800',
    },
    sessionToggleRow: {
      gap: 10,
      marginTop: 4,
    },
    sessionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 12,
      borderWidth: 1.5,
    },
    sessionIconCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    livePreviewCard: {
      padding: 14,
      borderRadius: 14,
      borderWidth: 1.5,
    },
    livePreviewHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    livePreviewValuesRow: {
      gap: 12,
      flexDirection: compact ? 'column' : 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    livePreviewCol: {
      flex: 1,
      minWidth: 0,
      alignItems: 'center',
    },
    livePreviewDivider: {
      width: 1,
      height: 28,
      backgroundColor: '#86EFAC',
    },
    actionsContainer: {
      marginTop: 2,
      marginBottom: 16,
    },
  });
};
