import React from 'react';
import { Tabs } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { FloatingAavinTabBar } from '../../components/navigation/FloatingAavinTabBar';

export default function BMCLayout() {
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

      {/* 2. Deliveries */}
      <Tabs.Screen
        name="receive-milk"
        options={{
          title: 'Deliveries',
          headerShown: false,
        }}
      />

      {/* 3. Verify Milk */}
      <Tabs.Screen
        name="daily-summary"
        options={{
          title: 'Verify Milk',
          headerShown: false,
        }}
      />

      {/* 4. Alerts */}
      <Tabs.Screen
        name="investigations"
        options={{
          title: 'Alerts',
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
    </Tabs>
  );
}
