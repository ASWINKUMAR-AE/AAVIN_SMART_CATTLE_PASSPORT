import React, { useState } from 'react';
import { StyleSheet, View, Text, FlatList, Pressable, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAavinStore } from '../../store/AavinStoreContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { DemoHeader } from '../../components/DemoHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState } from '../../components/ui/EmptyState';

export default function BoothFarmersScreen() {
  const { user } = useAuth();
  const { farmers, booths, cows, verifyFarmer } = useAavinStore();
  const { colors } = useTheme();
  const router = useRouter();

  const boothId = user?.associatedId || 'BOOTH001';
  const booth = booths.find(b => b.id === boothId) || booths[0];

  const assignedFarmers = farmers.filter(f => f.assignedBoothId === booth.id);
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = assignedFarmers.filter(f => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return f.name.toLowerCase().includes(q) || 
           f.farmerIdCode.toLowerCase().includes(q) || 
           f.mobileNumber.includes(q) ||
           f.village.toLowerCase().includes(q);
  });

  const handleToggleVerification = (farmerId: string, currentStatus: 'verified' | 'pending') => {
    const nextStatus = currentStatus === 'verified' ? 'pending' : 'verified';
    verifyFarmer(farmerId, nextStatus);
    Alert.alert('Status Updated', `Farmer KYC status changed to ${nextStatus.toUpperCase()}.`);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <DemoHeader 
        title="Assigned Farmers"
        subtitle={`${assignedFarmers.length} Member Farmers • ${booth.name}`}
        showBack
      />

      {/* Top Search & Register Farmer Bar */}
      <View style={[styles.topBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Ionicons name="search" size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
          <TextInput
            placeholder="Search by Name, Farmer ID, Village..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { color: colors.text }]}
          />
        </View>

        <Button
          title="+ Add Farmer"
          size="sm"
          onPress={() => router.push('/(auth)/register')}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            title="No Farmers Found"
            message="No registered farmers match your search."
            icon="people-outline"
          />
        }
        renderItem={({ item }) => {
          const farmerCows = cows.filter(c => c.farmerId === item.id);
          const isVerified = item.verificationStatus === 'verified';
          return (
            <Card style={styles.farmerCard}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[Typography.headline, { color: colors.text, fontWeight: '800' }]}>
                    {item.name}
                  </Text>
                  <Text style={[Typography.caption1, { color: colors.primary, fontWeight: '700' }]}>
                    {item.farmerIdCode} • +91 {item.mobileNumber}
                  </Text>
                </View>

                <Pressable
                  onPress={() => handleToggleVerification(item.id, item.verificationStatus)}
                  style={[
                    styles.verifBadge,
                    { backgroundColor: isVerified ? '#DCFCE7' : '#FEF3C7' },
                  ]}
                >
                  <Ionicons 
                    name={isVerified ? 'checkmark-circle' : 'time'} 
                    size={14} 
                    color={isVerified ? '#15803D' : '#B45309'} 
                  />
                  <Text style={[styles.verifBadgeText, { color: isVerified ? '#15803D' : '#B45309' }]}>
                    {item.verificationStatus.toUpperCase()}
                  </Text>
                </Pressable>
              </View>

              <View style={[styles.cardDetails, { borderTopColor: colors.border }]}>
                <View style={styles.detailRow}>
                  <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Address:</Text>
                  <Text style={[Typography.caption1, { color: colors.text, fontWeight: '600', flex: 1, textAlign: 'right' }]}>
                    {item.address}, {item.village}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Registered Cattle:</Text>
                  <Text style={[Typography.caption1, { color: colors.primary, fontWeight: '700' }]}>
                    {farmerCows.length} Cows ({farmerCows.map(c => c.name).join(', ') || 'None'})
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={[Typography.caption2, { color: colors.textSecondary }]}>DBT Bank Account:</Text>
                  <Text style={[Typography.caption1, { color: colors.text, fontWeight: '600' }]}>
                    {item.bankName || 'Canara Bank'} ({item.bankAccountNumber || 'Linked'})
                  </Text>
                </View>
              </View>

              <View style={styles.cardActions}>
                <Pressable
                  onPress={() => handleToggleVerification(item.id, item.verificationStatus)}
                  style={styles.actionLink}
                >
                  <Text style={[Typography.caption1, { color: colors.primary, fontWeight: '700' }]}>
                    {isVerified ? 'Flag as Pending Verification' : '✓ Mark as Verified Member'}
                  </Text>
                </Pressable>
              </View>
            </Card>
          );
        }}
      />
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
    paddingHorizontal: 10,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  farmerCard: {
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  verifBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  verifBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  cardDetails: {
    gap: 6,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardActions: {
    marginTop: 8,
    paddingTop: 6,
    alignItems: 'flex-end',
  },
  actionLink: {
    paddingVertical: 4,
  },
});
