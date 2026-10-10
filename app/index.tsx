import React, { useEffect } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Typography } from '../constants/Typography';

export default function IndexScreen() {
  const { user, activeRole, isLoading } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const timer = setTimeout(() => {
      if (!user) {
        router.replace('/(auth)/login');
        return;
      }

      // Role-based routing
      switch (activeRole) {
        case 'farmer':
          router.replace('/(farmer)');
          break;
        case 'veterinary':
          router.replace('/(veterinary)');
          break;
        case 'collection_operator':
          router.replace('/(collection)');
          break;
        case 'transport_vendor':
          router.replace('/(vendor)');
          break;
        case 'admin':
          router.replace('/(admin)');
          break;
        default:
          router.replace('/(farmer)');
          break;
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [user, activeRole, isLoading]);

  return (
    <View style={[styles.container, { backgroundColor: colors.primary }]}>
      <View style={styles.centerContent}>
        <Image
          source={require('../assets/icon.png')}
          style={styles.iconCircle}
          resizeMode="cover"
        />
        <Text style={[Typography.largeTitle, styles.title]}>
          AAVIN
        </Text>
        <Text style={[Typography.title2, styles.subTitle]}>
          Smart Cattle Passport
        </Text>
        <Text style={[Typography.footnote, styles.twinBadge]}>
          MILK SAFETY TWIN • MADURAI UNION
        </Text>
        <ActivityIndicator color="#FFFFFF" size="large" style={styles.loader} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContent: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  title: {
    color: '#FFFFFF',
    fontWeight: '900',
    letterSpacing: 2,
  },
  subTitle: {
    color: '#EAF5FC',
    marginTop: 4,
    fontWeight: '600',
  },
  twinBadge: {
    color: 'rgba(255,255,255,0.85)',
    marginTop: 8,
    letterSpacing: 1,
    fontWeight: '700',
  },
  loader: {
    marginTop: 36,
  },
});
