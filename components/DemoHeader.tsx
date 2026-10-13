import React, { useState } from 'react';
import { StyleSheet, View, Text, Pressable, Modal, ScrollView, Platform, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useAavinStore } from '../store/AavinStoreContext';
import { Typography } from '../constants/Typography';
import { UserRole } from '../types/aavin';

import { useTranslation } from '../context/LanguageContext';
import { useScroll } from '../context/ScrollContext';

interface DemoHeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
}

export const DemoHeader: React.FC<DemoHeaderProps> = ({ title, subtitle, showBack = false, onBack }) => {
  const { user, activeRole, switchRole, demoUsers, logout } = useAuth();
  const { colors } = useTheme();
  const { language, toggleLanguage } = useTranslation();
  const { notifications } = useAavinStore();
  const { isScrolled } = useScroll();
  const router = useRouter();

  const [modalVisible, setModalVisible] = useState(false);

  // Unread notifications count for current active role
  const unreadCount = notifications.filter(
    n => !n.isRead && (n.recipientRole === activeRole || !n.recipientRole)
  ).length;

  const roleMeta: Record<UserRole, { label: string; icon: string; color: string; desc: string }> = {
    farmer: { label: 'Farmer', icon: '👨‍🌾', color: '#16A34A', desc: 'Own cows, view supply & receipts' },
    booth: { label: 'Booth Staff', icon: '🏢', color: '#0072BC', desc: 'Record milk, generate digital dispatch receipts' },
    bmc: { label: 'BMC Staff', icon: '❄️', color: '#0284C7', desc: 'Receive deliveries, record measurements, flag mismatches' },
    union: { label: 'Union Admin', icon: '🏛️', color: '#7C3AED', desc: 'District overview, audit discrepancies & receipts' },
    veterinary: { label: 'Veterinarian', icon: '🩺', color: '#EA580C', desc: 'Clinical records & medicine withdrawal alerts' },
    admin: { label: 'System Admin', icon: '🛡️', color: '#475569', desc: 'KYC verifications, thresholds & demo reset' },
  };

  const handleConfirmLogout = () => {
    const titleText = language === 'ta' ? 'வெளியேறு (Logout)' : 'Sign Out';
    const messageText = language === 'ta'
      ? 'ஆவின் கணக்கிலிருந்து பாதுகாப்பாக வெளியேற விரும்புகிறீர்களா?'
      : 'Are you sure you want to securely log out from the Aavin Dairy Portal?';

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(messageText)) {
        logout().then(() => {
          router.replace('/(auth)/login' as any);
        });
      }
    } else {
      Alert.alert(
        titleText,
        messageText,
        [
          { text: language === 'ta' ? 'ரத்து' : 'Cancel', style: 'cancel' },
          {
            text: language === 'ta' ? 'வெளியேறு' : 'Log Out',
            style: 'destructive',
            onPress: async () => {
              await logout();
              router.replace('/(auth)/login' as any);
            },
          },
        ]
      );
    }
  };

  const handleSelectRole = async (r: UserRole) => {
    setModalVisible(false);
    try {
      await switchRole(r);
    } catch (error: any) {
      Alert.alert('Sign in required', error.message);
      return;
    }
    // Navigate to role's dashboard
    switch (r) {
      case 'farmer':
        router.replace('/(farmer)' as any);
        break;
      case 'booth':
        router.replace('/(booth)' as any);
        break;
      case 'bmc':
        router.replace('/(bmc)' as any);
        break;
      case 'union':
        router.replace('/(union)' as any);
        break;
      case 'veterinary':
        router.replace('/(veterinary)' as any);
        break;
      case 'admin':
        router.replace('/(admin)' as any);
        break;
    }
  };

  const currentMeta = activeRole ? roleMeta[activeRole] : roleMeta.farmer;

  return (
    <>
      <View style={[styles.container, isScrolled && styles.containerScrolled]}>
        {/* Top Info Strip */}
        <View style={styles.topStrip}>
          <View style={styles.brandBadgeRow}>
            <Image
              source={require('../assets/aavin-logo.png')}
              style={styles.logoThumbnail}
              resizeMode="contain"
            />
          </View>

          <View style={styles.rightIconsRow}>
            {/* Quick Language Toggle */}
            <Pressable
              style={styles.langBtn}
              onPress={toggleLanguage}
              accessibilityLabel="Switch Language"
            >
              <Text style={styles.langBtnText}>{language === 'en' ? 'தமிழ்' : 'EN'}</Text>
            </Pressable>

            {/* Notification Bell */}
            <Pressable
              style={styles.iconBtn}
              onPress={() => router.push('/notifications' as any)}
            >
              <Ionicons name="notifications-outline" size={18} color="#FFFFFF" />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </Pressable>

            {/* Prominent Real Logout Button */}
            <Pressable
              style={[styles.iconBtn, styles.logoutIconBtn]}
              onPress={handleConfirmLogout}
              accessibilityLabel="Log Out"
            >
              <Ionicons name="log-out-outline" size={19} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>

        {/* User Info Bar */}
        <View style={styles.userBar}>
          {showBack && (
            <Pressable onPress={onBack || (() => router.back())} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
            </Pressable>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitleText} numberOfLines={1}>
              {title || user?.fullName || 'Aavin Milk Safety Twin'}
            </Text>
            <Text style={styles.headerSubtitleText} numberOfLines={1}>
              {subtitle || user?.description || 'Aavin Madurai District Milk Union'}
            </Text>
          </View>
        </View>
      </View>

      {/* Role Switcher Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[Typography.title2, { color: colors.text }]}>
                  {language === 'ta' ? 'ஆவின் பயனர் கணக்கு' : 'Aavin Account & Node'}
                </Text>
                <Text style={[Typography.footnote, { color: colors.textSecondary }]}>
                  {language === 'ta' ? 'செயலில் உள்ள பயனர்: ' : 'Active Officer: '}
                  <Text style={{ fontWeight: '700', color: colors.text }}>{user?.fullName || 'Authorized User'}</Text>
                </Text>
              </View>
              <Pressable onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.roleList}>
              {(['farmer', 'booth', 'bmc', 'union', 'veterinary', 'admin'] as UserRole[]).map((r) => {
                const meta = roleMeta[r];
                const matchedUser = demoUsers.find(u => u.role === r);
                const isSelected = activeRole === r;

                return (
                  <Pressable
                    key={r}
                    onPress={() => handleSelectRole(r)}
                    style={[
                      styles.roleCard,
                      {
                        backgroundColor: isSelected ? meta.color + '15' : colors.background,
                        borderColor: isSelected ? meta.color : colors.border,
                      },
                    ]}
                  >
                    <View style={styles.roleCardIcon}>
                      <Text style={{ fontSize: 28 }}>{meta.icon}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={[Typography.headline, { color: colors.text, fontWeight: '700' }]}>
                          {meta.label}
                        </Text>
                        {isSelected && (
                          <View style={[styles.activePill, { backgroundColor: meta.color }]}>
                            <Text style={styles.activePillText}>LOGGED IN</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[Typography.subhead, { color: colors.primary, fontWeight: '600', marginTop: 2 }]}>
                        {matchedUser?.fullName}
                      </Text>
                      <Text style={[Typography.caption2, { color: colors.textSecondary, marginTop: 2 }]}>
                        {meta.desc}
                      </Text>
                    </View>
                    <Ionicons
                      name={isSelected ? 'checkmark-circle' : 'chevron-forward'}
                      size={22}
                      color={isSelected ? meta.color : colors.textMuted}
                    />
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Prominent Red Logout Button inside Modal */}
            <Pressable
              style={styles.modalLogoutBtn}
              onPress={() => {
                setModalVisible(false);
                handleConfirmLogout();
              }}
            >
              <Ionicons name="log-out-outline" size={20} color="#DC2626" style={{ marginRight: 8 }} />
              <Text style={styles.modalLogoutBtnText}>
                {language === 'ta' ? 'கணக்கிலிருந்து வெளியேறு (Sign Out)' : 'Sign Out of Aavin Portal'}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#5EA8EE', // Sky-Blue surface matching reference UI
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 48 : 38,
    paddingBottom: 18,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    zIndex: 100,
    ...Platform.select({
      default: {
        transition: 'box-shadow 0.28s cubic-bezier(0.16, 1, 0.3, 1), border-bottom-color 0.28s ease',
      },
    }),
  },
  containerScrolled: {
    ...Platform.select({
      ios: {
        shadowColor: '#0A3871',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
      default: {
        boxShadow: '0px 6px 20px rgba(10, 56, 113, 0.24), 0px 2px 6px rgba(0, 0, 0, 0.08)',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.28)',
      },
    }),
  },
  topStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  brandBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoThumbnail: {
    width: 58,
    height: 34,
    backgroundColor: 'transparent',
  },
  rightIconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  langBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  langBtnText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  userBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  headerTitleText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerSubtitleText: {
    color: 'rgba(255, 255, 255, 0.88)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 1,
  },
  backBtn: {
    marginRight: 12,
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  closeBtn: {
    padding: 4,
  },
  roleList: {
    marginBottom: 16,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 10,
  },
  roleCardIcon: {
    marginRight: 14,
  },
  activePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  activePillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  demoNoteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
  },
  logoutIconBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.35)',
    borderColor: 'rgba(254, 202, 202, 0.5)',
  },
  modalLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FECACA',
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 8,
  },
  modalLogoutBtnText: {
    color: '#DC2626',
    fontSize: 15,
    fontWeight: '800',
  },
});
