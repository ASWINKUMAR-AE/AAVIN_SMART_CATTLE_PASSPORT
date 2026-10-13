import React from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAavinStore } from '../../store/AavinStoreContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { DemoHeader } from '../../components/DemoHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Ionicons } from '@expo/vector-icons';

export default function FarmerProfileScreen() {
  const { user, logout } = useAuth();
  const { farmers, booths, cows } = useAavinStore();
  const { colors } = useTheme();
  const router = useRouter();

  const farmerId = user?.associatedId || 'FARMER001';
  const farmer = farmers.find(f => f.id === farmerId) || farmers[0];
  const assignedBooth = booths.find(b => b.id === farmer.assignedBoothId);
  const myCows = cows.filter(c => c.farmerId === farmerId);

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <DemoHeader 
        title="Farmer Profile & KYC"
        subtitle={`ID: ${farmer.farmerIdCode} • ${farmer.verificationStatus.toUpperCase()}`}
        showBack
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Card */}
        <Card style={styles.card}>
          <View style={styles.avatarRow}>
            <View style={[styles.avatarCircle, { backgroundColor: colors.primaryLight }]}>
              <Text style={{ fontSize: 36 }}>👨‍🌾</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={[Typography.title2, { color: colors.text, fontWeight: '900' }]}>
                {farmer.name}
              </Text>
              <Text style={[Typography.subhead, { color: colors.primary, fontWeight: '700' }]}>
                {farmer.farmerIdCode}
              </Text>
              <View style={[styles.badge, { backgroundColor: farmer.verificationStatus === 'verified' ? '#DCFCE7' : '#FEF3C7' }]}>
                <Ionicons 
                  name={farmer.verificationStatus === 'verified' ? 'checkmark-circle' : 'time'} 
                  size={14} 
                  color={farmer.verificationStatus === 'verified' ? '#15803D' : '#B45309'} 
                />
                <Text style={[styles.badgeText, { color: farmer.verificationStatus === 'verified' ? '#15803D' : '#B45309' }]}>
                  {farmer.verificationStatus === 'verified' ? 'Aavin Verified Member' : 'Pending Verification'}
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.detailsList, { borderTopColor: colors.border }]}>
            <View style={styles.row}>
              <Text style={[Typography.caption1, { color: colors.textSecondary }]}>Mobile Number:</Text>
              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700' }]}>+91 {farmer.mobileNumber}</Text>
            </View>
            <View style={styles.row}>
              <Text style={[Typography.caption1, { color: colors.textSecondary }]}>Village / Hamlet:</Text>
              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '600' }]}>{farmer.village}</Text>
            </View>
            <View style={styles.row}>
              <Text style={[Typography.caption1, { color: colors.textSecondary }]}>Residential Address:</Text>
              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '600', flex: 1, textAlign: 'right' }]}>{farmer.address}</Text>
            </View>
            <View style={styles.row}>
              <Text style={[Typography.caption1, { color: colors.textSecondary }]}>Taluk / Community:</Text>
              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '600' }]}>{farmer.community}</Text>
            </View>
            <View style={styles.row}>
              <Text style={[Typography.caption1, { color: colors.textSecondary }]}>Registered Cattle:</Text>
              <Text style={[Typography.subhead, { color: colors.primary, fontWeight: '800' }]}>{myCows.length} Cows</Text>
            </View>
          </View>
        </Card>

        {/* Assigned Society Card */}
        <Card style={styles.card}>
          <Text style={[Typography.headline, { color: colors.text, fontWeight: '800', marginBottom: 10 }]}>
            Assigned Collection Society
          </Text>

          <View style={styles.row}>
            <Text style={[Typography.caption1, { color: colors.textSecondary }]}>Society Name:</Text>
            <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700' }]}>{assignedBooth?.name || 'Melur Co-op Society'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={[Typography.caption1, { color: colors.textSecondary }]}>Society Code:</Text>
            <Text style={[Typography.subhead, { color: colors.text, fontWeight: '600' }]}>{assignedBooth?.code}</Text>
          </View>
          <View style={styles.row}>
            <Text style={[Typography.caption1, { color: colors.textSecondary }]}>Operator In-Charge:</Text>
            <Text style={[Typography.subhead, { color: colors.text, fontWeight: '600' }]}>{assignedBooth?.operatorName} ({assignedBooth?.phone})</Text>
          </View>
        </Card>

        {/* Banking / Direct Benefit Transfer */}
        <Card style={styles.card}>
          <Text style={[Typography.headline, { color: colors.text, fontWeight: '800', marginBottom: 10 }]}>
            Direct Benefit Transfer (DBT)
          </Text>

          <View style={styles.row}>
            <Text style={[Typography.caption1, { color: colors.textSecondary }]}>Bank Name:</Text>
            <Text style={[Typography.subhead, { color: colors.text, fontWeight: '600' }]}>{farmer.bankName || 'Canara Bank'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={[Typography.caption1, { color: colors.textSecondary }]}>Account Number:</Text>
            <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]}>{farmer.bankAccountNumber || '•••• •••• 6501'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={[Typography.caption1, { color: colors.textSecondary }]}>IFSC Code:</Text>
            <Text style={[Typography.subhead, { color: colors.text, fontWeight: '600' }]}>{farmer.bankIfsc || 'CNRB0001092'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={[Typography.caption1, { color: colors.textSecondary }]}>UPI ID:</Text>
            <Text style={[Typography.subhead, { color: colors.primary, fontWeight: '700' }]}>{farmer.upiId || 'Not linked'}</Text>
          </View>
        </Card>

        {/* Logout Button */}
        <Button
          title="Sign Out of Farmer Account"
          variant="destructive"
          onPress={handleLogout}
          style={{ marginTop: 8, marginBottom: 30 }}
        />
      </ScrollView>
    </View>
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
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 6,
    gap: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  detailsList: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
});
