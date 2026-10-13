import React from 'react';
import { Tabs } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { FloatingAavinTabBar } from '../../components/navigation/FloatingAavinTabBar';

export default function BoothLayout() {
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

      {/* 2. Farmers */}
      <Tabs.Screen
        name="farmers"
        options={{
          title: 'Farmers',
          headerShown: false,
        }}
      />

      {/* 3. Record Milk */}
      <Tabs.Screen
        name="record-milk"
        options={{
          title: 'Record Milk',
          headerShown: false,
        }}
      />

      {/* 4. Receipts */}
      <Tabs.Screen
        name="review-collection"
        options={{
          title: 'Receipts',
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
        name="sent-receipts"
        options={{
          href: null,
          title: 'Dispatches',
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="receipt-preview"
        options={{
          href: null,
          title: 'Digital Booth Receipt',
          headerShown: false,
        }}
      />
    </Tabs>
  );
}
