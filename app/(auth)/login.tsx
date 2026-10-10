import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Alert, KeyboardAvoidingView, Platform, Pressable, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/TextField';
import { Card } from '../../components/ui/Card';
import { Ionicons } from '@expo/vector-icons';
import { getCurrentApiUrl } from '../../services/api';

export default function LoginScreen() {
  const { login } = useAuth();
  const { colors, isDark } = useTheme();
  const router = useRouter();

  const isMountedRef = React.useRef(true);

  const [usernameOrPhone, setUsernameOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  React.useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleLogin = async (userValue = usernameOrPhone, passValue = password) => {
    if (!userValue || !passValue) {
      setErrorMessage('Please enter your username/phone and password');
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      await login(userValue, passValue);
      router.replace('/');
    } catch (err: any) {
      if (isMountedRef.current) {
        if (err.message?.includes('Network Error') || !err.response) {
          setErrorMessage(`Network Error: Cannot connect to backend server at ${getCurrentApiUrl()}. Make sure your phone and PC are on the same Wi-Fi.`);
        } else {
          setErrorMessage(err.response?.data?.message || err.message || 'Login failed.');
        }
        setLoading(false);
      }
    }
  };

  const fillDemoAccount = (username: string) => {
    setUsernameOrPhone(username);
    setPassword('Password@123');
    handleLogin(username, 'Password@123');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Header Branding */}
        <View style={styles.brandingHeader}>
          <Image
            source={require('../../assets/icon.png')}
            style={styles.logoBadge}
            resizeMode="cover"
          />
          <Text style={[Typography.largeTitle, { color: colors.text, textAlign: 'center', marginTop: 10 }]}>
            Aavin Dairy
          </Text>
          <Text style={[Typography.subhead, { color: colors.textSecondary, textAlign: 'center', marginTop: 4 }]}>
            Smart Cattle Passport • Milk Safety Twin (Madurai Union)
          </Text>
        </View>

        {/* Login Card */}
        <Card style={styles.formCard}>
          <Text style={[Typography.title2, { color: colors.text, marginBottom: 16 }]}>
            Sign In
          </Text>

          {errorMessage && (
            <View style={[styles.errorBox, { backgroundColor: colors.holdBg, borderColor: colors.hold }]}>
              <Ionicons name="alert-circle" size={18} color={colors.hold} style={{ marginRight: 6 }} />
              <Text style={[Typography.footnote, { color: colors.hold, flex: 1 }]}>
                {errorMessage}
              </Text>
            </View>
          )}

          <TextField
            label="Mobile Number or Username"
            placeholder="e.g. 9842000002 or farmer_murugan"
            value={usernameOrPhone}
            onChangeText={(t) => { setUsernameOrPhone(t); setErrorMessage(null); }}
            autoCapitalize="none"
            icon="person-outline"
            clearButton
          />

          <TextField
            label="Password"
            placeholder="••••••••"
            value={password}
            onChangeText={(t) => { setPassword(t); setErrorMessage(null); }}
            secureTextEntry
            icon="lock-closed-outline"
          />

          <Button
            title="Sign In"
            onPress={() => handleLogin()}
            loading={loading}
            style={{ marginTop: 16 }}
          />

          <View style={styles.actionRow}>
            <Pressable onPress={() => router.push('/(auth)/register')}>
              <Text style={[Typography.subhead, { color: colors.primary, fontWeight: '600' }]}>
                New Farmer? Register
              </Text>
            </Pressable>
            <Pressable onPress={() => router.push('/(auth)/settings')}>
              <Text style={[Typography.subhead, { color: colors.textSecondary }]}>
                ⚙️ Server Settings
              </Text>
            </Pressable>
          </View>
        </Card>

        {/* Demo Accounts Quick Selector */}
        <View style={styles.demoSection}>
          <Text style={[Typography.footnote, { color: colors.textSecondary, marginBottom: 10, fontWeight: '700' }]}>
            ⚡ QUICK DEMO LOGINS (1-TAP AUTO LOGIN):
          </Text>

          <View style={styles.demoGrid}>
            <Button
              title="👨‍🌾 Farmer 1 (Murugan)"
              variant="secondary"
              size="sm"
              onPress={() => fillDemoAccount('farmer_murugan')}
              style={styles.demoBtn}
            />
            <Button
              title="👩‍🌾 Farmer 2 (Selvi)"
              variant="secondary"
              size="sm"
              onPress={() => fillDemoAccount('farmer_selvi')}
              style={styles.demoBtn}
            />
            <Button
              title="🩺 Vet Doctor (Dr. Anand)"
              variant="secondary"
              size="sm"
              onPress={() => fillDemoAccount('vet_anand')}
              style={styles.demoBtn}
            />
            <Button
              title="🏢 Collection Operator"
              variant="secondary"
              size="sm"
              onPress={() => fillDemoAccount('operator_kannan')}
              style={styles.demoBtn}
            />
            <Button
              title="🚛 Tanker Vendor (Kumar)"
              variant="secondary"
              size="sm"
              onPress={() => fillDemoAccount('vendor_kumar')}
              style={styles.demoBtn}
            />
            <Button
              title="🛡️ Aavin Admin (Sundaram)"
              variant="secondary"
              size="sm"
              onPress={() => fillDemoAccount('admin_aavin')}
              style={styles.demoBtn}
            />
          </View>
        </View>

        <Text style={[Typography.caption2, styles.footerText, { color: colors.textMuted }]}>
          API Server: {getCurrentApiUrl()}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  brandingHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#0072BC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  formCard: {
    padding: 20,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 14,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
  },
  demoSection: {
    marginTop: 24,
  },
  demoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  demoBtn: {
    width: '48%',
    marginBottom: 8,
  },
  footerText: {
    textAlign: 'center',
    marginTop: 24,
  },
});
