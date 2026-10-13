import React from 'react';
import { Tabs } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { FloatingAavinTabBar } from '../../components/navigation/FloatingAavinTabBar';

export default function FarmerLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      tabBar={(props) => <FloatingAavinTabBar {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.primary,
        headerTitleStyle: { color: colors.text, fontWeight: '700' },
        headerShown: false,
      }}
    >
      {/* 1. Home */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerShown: false,
        }}
      />

      {/* 2. Milk */}
      <Tabs.Screen
        name="milk-history"
        options={{
          title: 'Milk',
          headerShown: false,
        }}
      />

      {/* 3. My Cows */}
      <Tabs.Screen
        name="cows"
        options={{
          title: 'My Cows',
          headerShown: false,
        }}
      />

      {/* 4. Notifications */}
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          headerShown: false,
        }}
      />

      {/* 5. Profile */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerShown: false,
        }}
      />

      {/* Subroutes (Hidden from Bottom Bar) */}
      <Tabs.Screen
        name="receipts"
        options={{
          href: null,
          title: 'Receipts',
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="cow-details"
        options={{
          href: null,
          title: 'Cattle Passport',
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="register-cow"
        options={{
          href: null,
          title: 'Register Cow',
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="milk-entry"
        options={{
          href: null,
          title: 'Daily Milking Log',
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="payments"
        options={{
          href: null,
          title: 'Payments',
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="ai-assistant"
        options={{
          href: null,
          title: 'AI Assistant',
          headerShown: false,
        }}
      />
    </Tabs>
  );
}
