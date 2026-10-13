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
import { CollectionRoute, MeasurementMethod } from '../../types/aavin';

export default function RecordMilkScreen() {
  const { user } = useAuth();
  const { farmers, vendors, booths, recordMilk, cows } = useAavinStore();
  const { colors } = useTheme();
  const router = useRouter();

  const boothId = user?.associatedId || 'BOOTH001';
  const booth = booths.find(b => b.id === boothId) || booths[0];
  const assignedFarmers = farmers.filter(f => f.assignedBoothId === booth.id);

  // Mode: 'farmer_wise' vs 'combined_vendor'
  const [measurementMethod, setMeasurementMethod] = useState<MeasurementMethod>('farmer_wise');
  const [selectedFarmerId, setSelectedFarmerId] = useState(assignedFarmers[0]?.id || 'FARMER001');
  const [route, setRoute] = useState<CollectionRoute>('direct');
  const [selectedVendorId, setSelectedVendorId] = useState(vendors[0]?.id || 'VEND001');
  const [quantityLitres, setQuantityLitres] = useState('');
  const [session, setSession] = useState<'morning' | 'evening'>('morning');
  const [collectionDate, setCollectionDate] = useState('2026-10-12');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Check if selected farmer has cows with active withdrawal warnings
  const selectedFarmer = farmers.find(f => f.id === selectedFarmerId);
  const farmerCows = cows.filter(c => c.farmerId === selectedFarmerId);
  const cowWithWithdrawal = farmerCows.find(c => c.activeWithdrawal?.hasActiveWithdrawal);

  const handleSubmit = () => {
    setErrorMsg(null);
    const qty = parseFloat(quantityLitres);
    if (isNaN(qty) || qty <= 0) {
      setErrorMsg('Please enter a valid milk quantity greater than 0 Litres.');
      return;
    }

    setSubmitting(true);
    try {
      if (measurementMethod === 'farmer_wise') {
        const farmerObj = farmers.find(f => f.id === selectedFarmerId);
        recordMilk({
          farmerId: selectedFarmerId,
          farmerName: farmerObj?.name,
          boothId: booth.id,
          collectionDate,
          session,
          quantityLitres: qty,
          route,
          vendorId: route === 'vendor' ? selectedVendorId : undefined,
          vendorName: route === 'vendor' ? vendors.find(v => v.id === selectedVendorId)?.name : undefined,
          measurementMethod: 'farmer_wise',
          individualAllocation: 'measured',
          createdBy: user?.fullName || 'Booth Operator',
          notes: notes.trim() || undefined,
        });

        Alert.alert(
          'Milk Recorded Successfully!',
          `Recorded ${qty.toFixed(2)} Litres for ${farmerObj?.name}. Shared state updated and notification dispatched to farmer.`,
          [
            {
              text: 'Add Another Entry',
              onPress: () => {
                setQuantityLitres('');
                setNotes('');
              },
            },
            {
              text: 'Review Daily Collection',
              onPress: () => router.push('/(booth)/review-collection'),
            },
          ]
        );
      } else {
        // Combined-only vendor measurement
        const vendorObj = vendors.find(v => v.id === selectedVendorId);
        recordMilk({
          farmerId: undefined,
          farmerName: undefined,
          boothId: booth.id,
          collectionDate,
          session,
          quantityLitres: qty,
          route: 'vendor',
          vendorId: selectedVendorId,
          vendorName: vendorObj?.name,
          measurementMethod: 'combined',
          individualAllocation: 'not_available',
          createdBy: user?.fullName || 'Booth Operator',
          notes: notes.trim() || 'Bulk batch from vendor pickup cans.',
        });

        Alert.alert(
          'Combined Vendor Entry Saved!',
          `Recorded ${qty.toFixed(2)} Litres for Vendor ${vendorObj?.name} (Method: Combined Bulk, Individual: N/A). Total added to eligible booth receipt.`,
          [
            {
              text: 'Review Daily Collection',
              onPress: () => router.push('/(booth)/review-collection'),
            },
          ]
        );
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not record milk entry.');
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
        title="Record Milk Collection"
        subtitle={`Intake Station • ${booth.name}`}
        showBack
      />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Method Toggle */}
        <Card style={styles.card}>
          <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800', marginBottom: 10 }]}>
            Measurement Mode
          </Text>

          <View style={styles.toggleRow}>
            <Pressable
              onPress={() => setMeasurementMethod('farmer_wise')}
              style={[
                styles.toggleBtn,
                measurementMethod === 'farmer_wise' && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
            >
              <Ionicons 
                name="person" 
                size={16} 
                color={measurementMethod === 'farmer_wise' ? '#FFFFFF' : colors.textSecondary} 
              />
              <Text style={[styles.toggleText, { color: measurementMethod === 'farmer_wise' ? '#FFFFFF' : colors.text }]}>
                Farmer-Wise Measured
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setMeasurementMethod('combined')}
              style={[
                styles.toggleBtn,
                measurementMethod === 'combined' && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
            >
              <Ionicons 
                name="bus" 
                size={16} 
                color={measurementMethod === 'combined' ? '#FFFFFF' : colors.textSecondary} 
              />
              <Text style={[styles.toggleText, { color: measurementMethod === 'combined' ? '#FFFFFF' : colors.text }]}>
                Combined Vendor Batch
              </Text>
            </Pressable>
          </View>
        </Card>

        {errorMsg && (
          <View style={[styles.errorBox, { backgroundColor: colors.holdBg, borderColor: colors.hold }]}>
            <Ionicons name="alert-circle" size={18} color={colors.hold} style={{ marginRight: 6 }} />
            <Text style={[Typography.footnote, { color: colors.hold, flex: 1 }]}>
              {errorMsg}
            </Text>
          </View>
        )}

        {/* Farmer Selection (When Farmer-Wise) */}
        {measurementMethod === 'farmer_wise' && (
          <Card style={styles.card}>
            <Text style={[Typography.headline, { color: colors.primary, fontWeight: '800', marginBottom: 10 }]}>
              1. Select Assigned Farmer
            </Text>

            <View style={styles.farmerList}>
              {assignedFarmers.map((f) => {
                const isSelected = selectedFarmerId === f.id;
                return (
                  <Pressable
                    key={f.id}
                    onPress={() => setSelectedFarmerId(f.id)}
                    style={[
                      styles.farmerOption,
                      {
                        backgroundColor: isSelected ? colors.primaryLight : colors.card,
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
                        {f.name} ({f.farmerIdCode})
                      </Text>
                      <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                        {f.village} • {f.numberOfCows} Cows Registered
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {/* Active Withdrawal Warning for this farmer */}
            {cowWithWithdrawal && (
              <View style={styles.withdrawalNotice}>
                <Ionicons name="warning" size={18} color="#DC2626" />
                <View style={{ marginLeft: 8, flex: 1 }}>
                  <Text style={[Typography.caption1, { color: '#B91C1C', fontWeight: '800' }]}>
                    SAFETY AUDIT WARNING: Active Medicine Withdrawal
                  </Text>
                  <Text style={[Typography.caption2, { color: '#991B1B' }]}>
                    Cow {cowWithWithdrawal.name} (#{cowWithWithdrawal.tagId}) is on antibiotic hold. Ensure farmer has segregated this cow's milk!
                  </Text>
                </View>
              </View>
            )}

            {/* Delivery Route Selector */}
            <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700', marginTop: 14, marginBottom: 8 }]}>
              Delivery Route
            </Text>
            <View style={styles.routeRow}>
              <Pressable
                onPress={() => setRoute('direct')}
                style={[
                  styles.routeTab,
                  route === 'direct' && { backgroundColor: colors.primaryLight, borderColor: colors.primary },
                ]}
              >
                <Text style={[styles.routeTabText, { color: route === 'direct' ? colors.primary : colors.textSecondary }]}>
                  🚶 Direct Farmer Delivery
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setRoute('vendor')}
                style={[
                  styles.routeTab,
                  route === 'vendor' && { backgroundColor: colors.primaryLight, borderColor: colors.primary },
                ]}
              >
                <Text style={[styles.routeTabText, { color: route === 'vendor' ? colors.primary : colors.textSecondary }]}>
                  🚛 Vendor-Mediated
                </Text>
              </Pressable>
            </View>

            {route === 'vendor' && (
              <View style={{ marginTop: 10 }}>
                <Text style={[Typography.caption1, { color: colors.textSecondary, marginBottom: 4 }]}>
                  Collector / Logistics Vendor:
                </Text>
                {vendors.map((v) => (
                  <Pressable
                    key={v.id}
                    onPress={() => setSelectedVendorId(v.id)}
                    style={[
                      styles.vendorRow,
                      selectedVendorId === v.id && { backgroundColor: colors.primaryLight, borderColor: colors.primary },
                    ]}
                  >
                    <Text style={[Typography.caption1, { color: colors.text, fontWeight: '600' }]}>
                      {v.name} ({v.vehicleNumber})
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </Card>
        )}

        {/* Vendor Selection (When Combined Batch) */}
        {measurementMethod === 'combined' && (
          <Card style={styles.card}>
            <Text style={[Typography.headline, { color: colors.primary, fontWeight: '800', marginBottom: 6 }]}>
              Combined Vendor Logistics
            </Text>
            <Text style={[Typography.caption1, { color: colors.textSecondary, marginBottom: 12 }]}>
              Measured as a single combined bulk batch without measuring each farmer separately. Individual allocation: Not Available.
            </Text>

            {vendors.map((v) => (
              <Pressable
                key={v.id}
                onPress={() => setSelectedVendorId(v.id)}
                style={[
                  styles.farmerOption,
                  selectedVendorId === v.id && { backgroundColor: colors.primaryLight, borderColor: colors.primary },
                ]}
              >
                <Ionicons 
                  name={selectedVendorId === v.id ? 'radio-button-on' : 'radio-button-off'} 
                  size={18} 
                  color={selectedVendorId === v.id ? colors.primary : colors.textMuted} 
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
            ))}
          </Card>
        )}

        {/* Quantity & Session Input */}
        <Card style={styles.card}>
          <Text style={[Typography.headline, { color: colors.primary, fontWeight: '800', marginBottom: 12 }]}>
            Measured Volume & Session
          </Text>

          <TextField
            label="Measured Quantity (Litres) *"
            placeholder="e.g. 8.5"
            value={quantityLitres}
            onChangeText={(t) => { setQuantityLitres(t); setErrorMsg(null); }}
            keyboardType="decimal-pad"
            icon="water-outline"
          />

          {/* Session toggle */}
          <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700', marginBottom: 6, marginTop: 4 }]}>
            Milking Session *
          </Text>
          <View style={styles.sessionRow}>
            <Pressable
              onPress={() => setSession('morning')}
              style={[
                styles.sessionTab,
                session === 'morning' && { backgroundColor: '#FEF3C7', borderColor: '#D97706' },
              ]}
            >
              <Ionicons name="sunny" size={16} color={session === 'morning' ? '#D97706' : colors.textSecondary} />
              <Text style={[styles.sessionTabText, { color: session === 'morning' ? '#92400E' : colors.textSecondary }]}>
                MORNING INTAKE
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setSession('evening')}
              style={[
                styles.sessionTab,
                session === 'evening' && { backgroundColor: '#E0E7FF', borderColor: '#4F46E5' },
              ]}
            >
              <Ionicons name="moon" size={16} color={session === 'evening' ? '#4F46E5' : colors.textSecondary} />
              <Text style={[styles.sessionTabText, { color: session === 'evening' ? '#3730A3' : colors.textSecondary }]}>
                EVENING INTAKE
              </Text>
            </Pressable>
          </View>

          <TextField
            label="Collection Date"
            value={collectionDate}
            onChangeText={setCollectionDate}
            icon="calendar-outline"
          />

          <TextField
            label="Optional Operator Notes"
            placeholder="e.g. Can #4 clean, lactometer reading 1.028"
            value={notes}
            onChangeText={setNotes}
            icon="create-outline"
          />
        </Card>

        <Button
          title={submitting ? "Saving Entry..." : "Submit Milk Intake Record"}
          size="lg"
          loading={submitting}
          onPress={handleSubmit}
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
    gap: 14,
    paddingBottom: 40,
  },
  card: {
    padding: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '800',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  farmerList: {
    gap: 8,
  },
  farmerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  withdrawalNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
  },
  routeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  routeTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  routeTabText: {
    fontSize: 12,
    fontWeight: '700',
  },
  vendorRow: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 6,
  },
  sessionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  sessionTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  sessionTabText: {
    fontSize: 11,
    fontWeight: '800',
  },
});
