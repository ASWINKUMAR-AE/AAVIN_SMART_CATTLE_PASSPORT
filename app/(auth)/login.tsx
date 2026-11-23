import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, KeyboardAvoidingView, Platform, Pressable, ImageBackground } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { TextField } from '../../components/ui/TextField';
import { Ionicons } from '@expo/vector-icons';
import { UserRole } from '../../types/aavin';
import { AavinLogo } from '../../components/ui/AavinLogo';
import { useTranslation } from '../../context/LanguageContext';

export default function LoginScreen() {
  const { login } = useAuth();
  const { language, t } = useTranslation();
  const router = useRouter();

  const [usernameOrPhone, setUsernameOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const navigateByRole = (role: UserRole) => {
    switch (role) {
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

  const handleManualLogin = async () => {
    const input = usernameOrPhone.trim();
    const pwd = password;

    if (!input) {
      setErrorMessage(
        language === 'ta'
          ? 'தயவுசெய்து பயனர் பெயர் அல்லது அலைபேசி எண்ணை உள்ளிடவும்'
          : 'Please enter your username, phone number, or officer ID'
      );
      return;
    }

    if (!pwd) {
      setErrorMessage('Phone number and password are required.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const result = await login(input, pwd);
      if (result.success && result.role) {
        navigateByRole(result.role);
      } else {
        setErrorMessage(
          result.error ||
            (language === 'ta'
              ? 'உள்நுழைவு தோல்வியடைந்தது. நற்சான்றிதழ்களைச் சரிபார்க்கவும்.'
              : 'Invalid credentials. Please verify your username and password.')
        );
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Header Banner with Dark Overlay Layer */}
        <ImageBackground
          source={require('../../assets/login-banner.jpg')}
          style={styles.skyBlueHeader}
          imageStyle={styles.headerBannerImage}
        >
          {/* Dark Layer for Contrast and Legibility */}
          <View style={styles.darkOverlayLayer} />

          {/* Union badge */}
          <View style={styles.topUtilitiesRow}>
            <View style={styles.headerPill}>
              <Ionicons name="shield-checkmark" size={14} color="#FFFFFF" style={{ marginRight: 5 }} />
              <Text style={styles.headerPillText}>MADURAI MILK UNION</Text>
            </View>
          </View>

          {/* Logo & Headline */}
          <View style={styles.heroBrandingContainer}>
            <View style={styles.logoCircleWrapper}>
              <AavinLogo size="sm" showSubtitle={false} transparentBg={true} opacity={0.7} />
            </View>
            <Text style={styles.heroTitleText}>
              {t('app.title')}
            </Text>
          </View>
        </ImageBackground>

        {/* White Curved Sheet Content (Matching Reference UI Bottom Panel) */}
        <View style={styles.whiteContentSheet}>
          <Text style={styles.sheetTitle}>
            {language === 'ta' ? 'அதிகாரப்பூர்வ உள்நுழைவு' : 'Aavin Official Sign In'}
          </Text>
          <Text style={styles.sheetSubtitle}>
            {language === 'ta'
              ? 'உங்கள் பயனர் பெயர் / அலைபேசி மற்றும் கடவுச்சொல்லை உள்ளிடவும்:'
              : 'Enter your registered username / phone and password to continue:'}
          </Text>

          {errorMessage && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color="#DC2626" style={{ marginRight: 8 }} />
              <Text style={styles.errorBannerText}>{errorMessage}</Text>
            </View>
          )}

          {/* Form Input Fields */}
          <View style={styles.inputsGroup}>
            <TextField
              label={language === 'ta' ? 'பயனர் பெயர் / அலைபேசி எண்' : 'Username / Mobile Number'}
              placeholder={language === 'ta' ? 'பயனர் பெயர் அல்லது அலைபேசி எண்ணை உள்ளிடவும்' : 'Enter your username or mobile number'}
              value={usernameOrPhone}
              onChangeText={(t) => { setUsernameOrPhone(t); setErrorMessage(null); }}
              autoCapitalize="none"
              icon="person-outline"
              clearButton
            />

            <TextField
              label={language === 'ta' ? 'கடவுச்சொல்' : 'Password'}
              placeholder="••••••••"
              value={password}
              onChangeText={(t) => { setPassword(t); setErrorMessage(null); }}
              secureTextEntry
              icon="lock-closed-outline"
            />
          </View>

          {/* Large Deep-Navy Sign In Button */}
          <Pressable
            style={[styles.primaryNavyButton, loading && { opacity: 0.8 }]}
            onPress={handleManualLogin}
            disabled={loading}
          >
            <Text style={styles.primaryButtonText}>
              {loading ? (language === 'ta' ? 'சரிபார்க்கிறது...' : 'Authenticating...') : (language === 'ta' ? 'பாதுகாப்பாக நுழைக' : 'Sign In to Portal')}
            </Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
          </Pressable>


        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1E36', // Deep navy to match header banner seamlessly
  },
  scrollContent: {
    flexGrow: 1,
  },
  skyBlueHeader: {
    backgroundColor: '#0D1E36',
    paddingTop: Platform.OS === 'ios' ? 48 : 36,
    paddingHorizontal: 18,
    paddingBottom: 64, // Extra space so bottom banner content sits comfortably behind the top sheet
    position: 'relative',
    overflow: 'hidden',
    zIndex: 1, // Bottom layer
  },
  headerBannerImage: {
    resizeMode: 'cover',
  },
  darkOverlayLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10, 25, 45, 0.65)',
  },
  topUtilitiesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  headerPillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heroBrandingContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  logoCircleWrapper: {
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  heroTitleText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.3,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  whiteContentSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    marginTop: -36, // Top layer overlapping the bottom banner layer to completely hide the edges
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
    zIndex: 10, // Top layer
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F1D30',
    marginBottom: 4,
  },
  sheetSubtitle: {
    fontSize: 13,
    color: '#566A82',
    lineHeight: 18,
    marginBottom: 16,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
  },
  errorBannerText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  inputsGroup: {
    gap: 12,
    marginBottom: 18,
  },
  primaryNavyButton: {
    backgroundColor: '#0D1E36', // Deep navy primary action
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 28,
    shadowColor: '#0D1E36',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
