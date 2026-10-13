import React from 'react';
import { Tabs } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';

export default function VeterinaryLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.primary,
        headerTitleStyle: { color: colors.text, fontWeight: '700' },
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabIconDefault,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Vet Desk',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Ionicons name="medkit-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="treatment-entry"
        options={{
          title: 'Prescribe',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Ionicons name="bandage-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="examination-entry"
        options={{
          title: 'Clinical Exam',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Ionicons name="pulse-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="cattle-registry"
        options={{
          title: 'Cattle',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Ionicons name="paw-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="cow-details"
        options={{
          href: null,
          title: 'Veterinary Passport',
          headerShown: false,
        }}
      />
    </Tabs>
  );
}
