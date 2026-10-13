import React from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { ScrollProvider } from '../context/ScrollContext';
import { AuthProvider } from '../context/AuthContext';
import { NetworkProvider } from '../context/NetworkContext';
import { LanguageProvider } from '../context/LanguageContext';
import { AavinStoreProvider } from '../store/AavinStoreContext';
import { useScroll } from '../context/ScrollContext';

function RootLayoutNav() {
  const { isDark, colors } = useTheme();
  const { onTouchStart, onTouchMove } = useScroll();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View
        style={{ flex: 1 }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
      >
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
          <Stack.Screen name="(auth)/register" options={{ title: 'Farmer Registration', headerBackTitle: 'Back' }} />
          <Stack.Screen name="(farmer)" options={{ headerShown: false }} />
          <Stack.Screen name="(booth)" options={{ headerShown: false }} />
          <Stack.Screen name="(bmc)" options={{ headerShown: false }} />
          <Stack.Screen name="(union)" options={{ headerShown: false }} />
          <Stack.Screen name="(veterinary)" options={{ headerShown: false }} />
          <Stack.Screen name="(admin)" options={{ headerShown: false }} />
          <Stack.Screen name="(collection)" options={{ headerShown: false }} />
          <Stack.Screen
            name="notifications"
            options={{
              title: 'Notifications Center',
              presentation: 'modal',
            }}
          />
        </Stack>
      </View>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ScrollProvider>
          <LanguageProvider>
            <NetworkProvider>
              <AavinStoreProvider>
                <AuthProvider>
                  <RootLayoutNav />
                </AuthProvider>
              </AavinStoreProvider>
            </NetworkProvider>
          </LanguageProvider>
        </ScrollProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
