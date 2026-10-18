import React, { useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from '../../context/LanguageContext';
import { useDispatchRefresh, useDispatchWorkflow } from '../../context/DispatchContext';
import { DemoHeader } from '../../components/DemoHeader';
import { Card } from '../../components/ui/Card';
import { ReportsShortcut } from '../../components/bmc/ReportsShortcut';
import { MySocietiesCard } from '../../components/bmc/MySocietiesCard';

const appearanceOptions = [
  { value: 'system', label: 'Use device', icon: 'phone-portrait-outline' },
  { value: 'light', label: 'Light', icon: 'sunny-outline' },
  { value: 'dark', label: 'Dark', icon: 'moon-outline' },
] as const;
const languageOptions = [{ value: 'en', label: 'English' }, { value: 'ta', label: 'தமிழ்' }] as const;

export default function BmcProfileScreen() {
  const { user, logout } = useAuth();
  const { colors, mode, setMode } = useTheme();
  const { language, setLanguage, t } = useTranslation();
  const { context } = useDispatchWorkflow();
  useDispatchRefresh();
  const router = useRouter();
  const { width, fontScale } = useWindowDimensions();
  const stacked = width < 360 || fontScale > 1.2;
  const [saving, setSaving] = useState<'language' | 'appearance' | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const name = user?.fullName?.trim() || t('bmcProfile.accountName', 'BMC account');
  const initials = name.split(/\s+/).map(part => part[0]).slice(0, 2).join('').toUpperCase();
  const centreName = context?.bmc.name || user?.fullName || t('bmcProfile.unavailable', 'Not provided');
  const version = Constants.expoConfig?.version;

  const showError = (message: string) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') window.alert(message);
    else Alert.alert(t('common.error', 'Error'), message);
  };
  const savePreference = async (setting: 'language' | 'appearance', update: () => Promise<void>) => {
    if (saving) return;
    setSaving(setting);
    try { await update(); }
    catch { showError(t('bmcProfile.saveError', 'Could not save your preference. Please try again.')); }
    finally { setSaving(null); }
  };
  const signOut = async () => {
    setSigningOut(true);
    try {
      await logout();
      router.replace('/(auth)/login');
    } catch {
      showError(t('bmcProfile.signOutError', 'Could not sign out. Please try again.'));
    } finally { setSigningOut(false); }
  };
  const confirmSignOut = () => {
    const title = t('bmcProfile.signOut', 'Sign out');
    const message = t('bmcProfile.signOutMessage', 'Sign out of your BMC account?');
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm(message)) void signOut();
    } else {
      Alert.alert(title, message, [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        { text: title, style: 'destructive', onPress: () => { void signOut(); } },
      ]);
    }
  };
  const details = [
    { label: t('bmcProfile.centre', 'BMC centre'), value: centreName, icon: 'business-outline' as const },
    { label: t('bmcProfile.phone', 'Mobile number'), value: user?.phone || t('bmcProfile.unavailable', 'Not provided'), icon: 'call-outline' as const },
    ...(user?.email ? [{ label: t('bmcProfile.email', 'Email address'), value: user.email, icon: 'mail-outline' as const }] : []),
  ];
  const workLinks = [
    { title: t('bmcCentre.dashboard', 'Dashboard'), detail: t('bmcCentre.overview', 'Your centre at a glance'), icon: 'grid-outline' as const,
      action: () => router.push('/(bmc)/dashboard') },
    { title: t('bmcCentre.deliveryInbox', 'Delivery inbox'), detail: t('bmcCentre.inboxHelp', 'View milk dispatch receipts from your societies'), icon: 'cube-outline' as const,
      action: () => router.push({ pathname: '/(bmc)/receive-milk', params: { dateFilter: 'all', statusFilter: 'all', societyId: '', collectionDate: '' } }) },
    { title: t('bmcCentre.deliveryReviews', 'Delivery reviews'), detail: t('bmcCentre.reviewsHelp', 'Review mismatches and escalated deliveries'), icon: 'alert-circle-outline' as const,
      action: () => router.push({ pathname: '/(bmc)/receive-milk', params: { dateFilter: 'all', statusFilter: 'needs_review', societyId: '', collectionDate: '' } }) },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <DemoHeader title={t('bmcProfile.title', 'Profile')} subtitle={t('bmcProfile.subtitle', 'Your account and preferences')} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Card style={styles.identityCard}>
            <View style={[styles.identityRow, stacked && styles.stacked]}>
              <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.initials, { color: colors.primary }]}>{initials}</Text>
              </View>
              <View style={[styles.identityText, stacked && styles.identityTextStacked]}>
                <Text accessibilityRole="header" style={[styles.name, { color: colors.text }]}>{name}</Text>
                <Text style={[styles.body, { color: colors.textSecondary }]}>{t('bmcProfile.role', 'BMC staff')}</Text>
                <View style={[styles.accountBadge, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="person-circle-outline" size={15} color={colors.primary} />
                  <Text style={[styles.badgeText, { color: colors.text }]}>{t('bmcProfile.signedIn', 'Signed-in account')}</Text>
                </View>
              </View>
            </View>
          </Card>

          <View style={styles.section}>
            <Text accessibilityRole="header" style={[styles.sectionTitle, { color: colors.text }]}>{t('bmcProfile.details', 'Account details')}</Text>
            <Card style={styles.detailsCard}>
              {details.map((item, index) => <View key={item.icon} style={[styles.detailRow, index > 0 && styles.divider, { borderTopColor: colors.border }]}>
                <View style={[styles.detailIcon, { backgroundColor: colors.background }]}><Ionicons name={item.icon} size={20} color={colors.primary} /></View>
                <View style={styles.detailText}>
                  <Text style={[styles.caption, { color: colors.textSecondary }]}>{item.label}</Text>
                  <Text selectable style={[styles.detailValue, { color: colors.text }]}>{item.value}</Text>
                </View>
              </View>)}
            </Card>
          </View>

          <MySocietiesCard />
          <View style={styles.section}>
            <Text accessibilityRole="header" style={[styles.sectionTitle, { color: colors.text }]}>{t('bmcCentre.myWork', 'My workspace')}</Text>
            <Card style={styles.detailsCard}>
              {workLinks.map((link, index) => <Pressable key={link.icon} accessibilityRole="button" accessibilityLabel={link.title + '. ' + link.detail} onPress={link.action}
                style={({ pressed }) => [styles.detailRow, index > 0 && styles.divider, { borderTopColor: colors.border, backgroundColor: pressed ? colors.primaryLight : colors.card }]}>
                <View style={[styles.detailIcon, { backgroundColor: colors.background }]}><Ionicons name={link.icon} size={21} color={colors.primary} /></View>
                <View style={styles.detailText}>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{link.title}</Text>
                  <Text style={[styles.caption, { color: colors.textSecondary }]}>{link.detail}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </Pressable>)}
            </Card>
            <ReportsShortcut />
          </View>

          <View style={styles.section}>
            <Text accessibilityRole="header" style={[styles.sectionTitle, { color: colors.text }]}>{t('bmcProfile.preferences', 'Preferences')}</Text>
            <Card style={styles.preferencesCard}>
              <View style={styles.settingHeader}>
                <Ionicons name="language-outline" size={21} color={colors.primary} />
                <View style={styles.detailText}>
                  <Text style={[styles.settingTitle, { color: colors.text }]}>{t('bmcProfile.language', 'Language')}</Text>
                  <Text style={[styles.caption, { color: colors.textSecondary }]}>{t('bmcProfile.languageHelp', 'Choose your app language')}</Text>
                </View>
                {saving === 'language' && <ActivityIndicator color={colors.primary} size="small" />}
              </View>
              <View accessibilityRole="radiogroup" accessibilityLabel={t('bmcProfile.language', 'Language')} style={styles.options}>
                {languageOptions.map(option => <Pressable key={option.value} accessibilityRole="radio" accessibilityState={{ checked: language === option.value, disabled: !!saving }}
                  disabled={!!saving} onPress={() => { if (language !== option.value) void savePreference('language', () => setLanguage(option.value)); }}
                  style={({ pressed }) => [styles.option, { borderColor: language === option.value ? colors.primary : colors.border,
                    backgroundColor: language === option.value || pressed ? colors.primaryLight : colors.card }]}>
                  <Text style={[styles.optionText, { color: language === option.value ? colors.primary : colors.text }]}>{option.label}</Text>
                  {language === option.value && <Ionicons name="checkmark-circle" size={17} color={colors.primary} />}
                </Pressable>)}
              </View>
              <View style={[styles.settingHeader, styles.appearanceHeader, { borderTopColor: colors.border }]}>
                <Ionicons name="contrast-outline" size={21} color={colors.primary} />
                <View style={styles.detailText}>
                  <Text style={[styles.settingTitle, { color: colors.text }]}>{t('bmcProfile.appearance', 'Appearance')}</Text>
                  <Text style={[styles.caption, { color: colors.textSecondary }]}>{t('bmcProfile.appearanceHelp', 'Choose how the app looks')}</Text>
                </View>
                {saving === 'appearance' && <ActivityIndicator color={colors.primary} size="small" />}
              </View>
              <View accessibilityRole="radiogroup" accessibilityLabel={t('bmcProfile.appearance', 'Appearance')} style={[styles.options, stacked && styles.stacked]}>
                {appearanceOptions.map(option => <Pressable key={option.value} accessibilityRole="radio" accessibilityState={{ checked: mode === option.value, disabled: !!saving }}
                  disabled={!!saving} onPress={() => { if (mode !== option.value) void savePreference('appearance', () => setMode(option.value)); }}
                  style={({ pressed }) => [styles.option, styles.appearanceOption, stacked && styles.optionStacked, { borderColor: mode === option.value ? colors.primary : colors.border,
                    backgroundColor: mode === option.value || pressed ? colors.primaryLight : colors.card }]}>
                  <Ionicons name={option.icon} size={19} color={mode === option.value ? colors.primary : colors.textSecondary} />
                  <Text style={[styles.optionText, { color: mode === option.value ? colors.primary : colors.text }]}>{t('bmcProfile.' + option.value, option.label)}</Text>
                </Pressable>)}
              </View>
            </Card>
          </View>

          <Pressable accessibilityRole="button" accessibilityLabel={t('bmcProfile.signOut', 'Sign out')} accessibilityState={{ disabled: signingOut, busy: signingOut }}
            disabled={signingOut} onPress={confirmSignOut}
            style={({ pressed }) => [styles.signOutButton, { backgroundColor: pressed ? colors.holdBg : colors.card, borderColor: colors.border }]}>
            <Ionicons name="log-out-outline" size={22} color={colors.hold} />
            <Text style={[styles.signOutText, { color: colors.hold }]}>{t('bmcProfile.signOut', 'Sign out')}</Text>
            {signingOut && <ActivityIndicator size="small" color={colors.hold} />}
          </Pressable>
          <Text style={[styles.footer, { color: colors.textSecondary }]}>Aavin Smart Cattle Passport{version ? ' · v' + version : ''}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 24 },
  content: { width: '100%', maxWidth: 720, alignSelf: 'center', gap: 24 },
  identityCard: { padding: 20, marginVertical: 0, borderRadius: 22 },
  identityRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  avatar: { width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  initials: { fontSize: 23, lineHeight: 32, fontWeight: '800' },
  identityText: { flex: 1, minWidth: 0, gap: 5 },
  identityTextStacked: { flex: 0, width: '100%' },
  name: { fontSize: 22, lineHeight: 30, fontWeight: '800' },
  body: { fontSize: 14, lineHeight: 21 },
  accountBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8, maxWidth: '100%', marginTop: 4 },
  badgeText: { fontSize: 11, lineHeight: 17, fontWeight: '600', flexShrink: 1 },
  section: { gap: 12 },
  sectionTitle: { fontSize: 17, lineHeight: 25, fontWeight: '700' },
  detailsCard: { padding: 0, marginVertical: 0, overflow: 'hidden' },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, minHeight: 80 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth },
  detailIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  detailText: { flex: 1, minWidth: 0, gap: 4 },
  caption: { fontSize: 12, lineHeight: 18 },
  detailValue: { fontSize: 14, lineHeight: 22, fontWeight: '600' },
  preferencesCard: { padding: 16, marginVertical: 0 },
  settingHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  settingTitle: { fontSize: 14, lineHeight: 21, fontWeight: '700' },
  appearanceHeader: { marginTop: 18, paddingTop: 18, borderTopWidth: StyleSheet.hairlineWidth },
  options: { flexDirection: 'row', gap: 8 },
  option: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 48, paddingHorizontal: 8, paddingVertical: 10, borderWidth: 1, borderRadius: 12 },
  appearanceOption: { flexDirection: 'column', gap: 5 },
  optionStacked: { flex: 0, flexDirection: 'row' },
  optionText: { fontSize: 13, lineHeight: 20, fontWeight: '600', textAlign: 'center', flexShrink: 1 },
  stacked: { flexDirection: 'column' },
  signOutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 56, padding: 16, borderWidth: 1, borderRadius: 16 },
  signOutText: { fontSize: 15, lineHeight: 22, fontWeight: '700' },
  footer: { fontSize: 11, lineHeight: 18, textAlign: 'center' },
});
