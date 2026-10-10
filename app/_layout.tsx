import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { AuthProvider } from '../context/AuthContext';
import { NetworkProvider } from '../context/NetworkContext';
import { OfflineBanner } from '../components/ui/OfflineBanner';

function RootLayoutNav() {
  const { isDark, colors } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <OfflineBanner />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.primary,
          headerTitleStyle: { color: colors.text, fontWeight: '700' },
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/register" options={{ title: 'Farmer Registration' }} />
        <Stack.Screen name="(auth)/settings" options={{ title: 'App & Network Settings' }} />
        <Stack.Screen name="(farmer)" options={{ headerShown: false }} />
        <Stack.Screen name="(veterinary)" options={{ headerShown: false }} />
        <Stack.Screen name="(collection)" options={{ headerShown: false }} />
        <Stack.Screen name="(vendor)" options={{ headerShown: false }} />
        <Stack.Screen name="(admin)" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <NetworkProvider>
          <AuthProvider>
            <RootLayoutNav />
          </AuthProvider>
        </NetworkProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
