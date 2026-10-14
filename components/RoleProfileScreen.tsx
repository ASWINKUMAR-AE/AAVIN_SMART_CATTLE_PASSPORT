import React from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/aavin';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from '../context/LanguageContext';
import { Typography } from '../constants/Typography';
import { DemoHeader } from './DemoHeader';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Ionicons } from '@expo/vector-icons';
import { IndicTransLanguageSwitch } from './ui/IndicTransLanguageSwitch';

interface RoleProfileScreenProps {
  roleTitle: string;
  roleSubtitle: string;
  staffName: string;
  staffId: string;
  facilityTitle: string;
  facilityValue: string;
  jurisdictionTitle?: string;
  jurisdictionValue?: string;
  roleIcon: string;
  stats?: Array<{ label: string; value: string }>;
}

export const RoleProfileScreen: React.FC<RoleProfileScreenProps> = ({
  roleTitle,
  roleSubtitle,
  staffName,
  staffId,
  facilityTitle,
  facilityValue,
  jurisdictionTitle,
  jurisdictionValue,
  roleIcon,
  stats,
}) => {
  const { user, logout, switchRole } = useAuth();
  const { colors } = useTheme();
  const { language, toggleLanguage, setLanguage, t } = useTranslation();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const handleRoleSwitch = async (targetRole: UserRole) => {
    await switchRole(targetRole);
    if (targetRole === 'farmer' || targetRole === 'booth' || targetRole === 'bmc' || targetRole === 'union' || targetRole === 'veterinary') {
      await setLanguage('en');
    }
    switch (targetRole) {
      case 'farmer':
        router.replace('/(farmer)');
        break;
      case 'booth':
        router.replace('/(booth)');
        break;
      case 'bmc':
        router.replace('/(bmc)');
        break;
      case 'union':
        router.replace('/(union)');
        break;
      case 'veterinary':
        router.replace('/(veterinary)');
        break;
      case 'admin':
        router.replace('/(admin)');
        break;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <DemoHeader 
        title={roleTitle}
        subtitle={roleSubtitle}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Main Staff Card */}
        <Card style={styles.card}>
          <View style={styles.avatarRow}>
            <View style={[styles.avatarCircle, { backgroundColor: colors.primaryLight }]}>
              <Text style={{ fontSize: 32 }}>{roleIcon}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={[Typography.title2, { color: colors.text, fontWeight: '900' }]}>
                {staffName || user?.fullName || 'Aavin Officer'}
              </Text>
              <Text style={[Typography.subhead, { color: colors.primary, fontWeight: '700' }]}>
                {staffId || user?.username || 'STAFF-AUTH-01'}
              </Text>
              <View style={[styles.badge, { backgroundColor: '#DCFCE7' }]}>
                <Ionicons name="shield-checkmark" size={13} color="#15803D" />
                <Text style={[styles.badgeText, { color: '#15803D' }]}>
                  {t('profile.authorizedPersonnel', 'Aavin Authorized Personnel')}
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.detailsList, { borderTopColor: colors.border }]}>
            <View style={styles.row}>
              <Text style={[Typography.caption1, { color: colors.textSecondary }]}>{facilityTitle}:</Text>
              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700' }]}>{facilityValue}</Text>
            </View>
            {jurisdictionTitle && (
              <View style={styles.row}>
                <Text style={[Typography.caption1, { color: colors.textSecondary }]}>{jurisdictionTitle}:</Text>
                <Text style={[Typography.subhead, { color: colors.text, fontWeight: '600' }]}>{jurisdictionValue}</Text>
              </View>
            )}
            <View style={styles.row}>
              <Text style={[Typography.caption1, { color: colors.textSecondary }]}>{t('profile.securityAccess', 'Security Access:')}</Text>
              <Text style={[Typography.subhead, { color: colors.primary, fontWeight: '700' }]}>{t('profile.level3Twin', 'Level 3 (Operational Twin)')}</Text>
            </View>
          </View>
        </Card>

        {/* Live Performance Stats */}
        {stats && stats.length > 0 && (
          <Card style={styles.card}>
            <Text style={[Typography.headline, { color: colors.text, fontWeight: '800', marginBottom: 12 }]}>
              {t('profile.operationalSummary', 'Operational Summary')}
            </Text>
            <View style={styles.statsGrid}>
              {stats.map((stat, idx) => (
                <View key={idx} style={[styles.statBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Text style={[Typography.title3, { color: colors.primary, fontWeight: '900' }]}>{stat.value}</Text>
                  <Text style={[Typography.caption2, { color: colors.textSecondary, marginTop: 2, textAlign: 'center' }]}>{stat.label}</Text>
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* AI4Bharat IndicTrans2 Language Switcher */}
        <IndicTransLanguageSwitch variant="expanded" />

        {/* Quick Demo Role Switcher */}
        <Card style={styles.card}>
          <Text style={[Typography.headline, { color: colors.text, fontWeight: '800', marginBottom: 4 }]}>
            {t('profile.quickRoleSwitcher', 'Quick Role Switcher')}
          </Text>
          <Text style={[Typography.footnote, { color: colors.textSecondary, marginBottom: 12 }]}>
            {t('profile.quickRoleDesc', 'Instant one-tap switch to test role-specific workflows & navigation:')}
          </Text>

          <View style={styles.roleChips}>
            {[
              { role: 'farmer' as UserRole, label: 'Farmer', icon: '👨‍🌾' },
              { role: 'booth' as UserRole, label: 'Society Staff', icon: '🏪' },
              { role: 'bmc' as UserRole, label: 'BMC Center', icon: '🏭' },
              { role: 'union' as UserRole, label: 'Union Exec', icon: '🏛️' },
              { role: 'veterinary' as UserRole, label: 'Veterinarian', icon: '🩺' },
              { role: 'admin' as UserRole, label: 'SysAdmin', icon: '⚙️' },
            ].map(item => (
              <Pressable
                key={item.role}
                style={[
                  styles.roleChip,
                  { backgroundColor: user?.role === item.role ? colors.primary : colors.card, borderColor: colors.border },
                ]}
                onPress={() => handleRoleSwitch(item.role)}
              >
                <Text style={{ fontSize: 16 }}>{item.icon}</Text>
                <Text
                  style={[
                    Typography.caption1,
                    { color: user?.role === item.role ? '#FFFFFF' : colors.text, fontWeight: '700', marginLeft: 4 },
                  ]}
                >
                  {t(`roles.${item.role}`, item.label)}
                </Text>
              </Pressable>
            ))}
          </View>
        </Card>

        {/* Sign Out Button */}
        <Button
          title={t('common.logout', 'Sign Out')}
          variant="destructive"
          onPress={handleLogout}
          style={{ marginTop: 8, marginBottom: 20 }}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
    gap: 14,
  },
  card: {
    borderRadius: 16,
    padding: 16,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 6,
    gap: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  detailsList: {
    borderTopWidth: 1,
    paddingTop: 12,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  statBox: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  langBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  roleChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
});
