import React from 'react';
import { Tabs } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { FloatingAavinTabBar } from '../../components/navigation/FloatingAavinTabBar';
import { TAB_BAR_HEIGHT } from '../../components/navigation/curvedNavPath';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function BMCLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      tabBar={(props) => <FloatingAavinTabBar {...props} hideOnScroll={false} hideOnKeyboard={false} />}
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.primary,
        headerTitleStyle: { color: colors.text, fontWeight: '700' },
        headerShown: false,
        sceneStyle: { paddingBottom: TAB_BAR_HEIGHT + Math.max(insets.bottom, 12) + 12, backgroundColor: colors.background },
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

      {/* 4. Centre dashboard */}
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
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

      {/* Sub-routes (Hidden from floating tab bar) */}
      <Tabs.Screen name="my-societies" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="operations" options={{ href: null, headerShown: false }} />
      <Tabs.Screen
        name="society-details"
        options={{
          href: null,
          headerShown: false,
        }}
      />

      <Tabs.Screen
        name="societies/[societyId]"
        options={{
          href: null,
          headerShown: false,
        }}
      />

      <Tabs.Screen
        name="society-comparison"
        options={{
          href: null,
          headerShown: false,
        }}
      />

      <Tabs.Screen
        name="society-income"
        options={{
          href: null,
          headerShown: false,
        }}
      />

      <Tabs.Screen
        name="reports"
        options={{
          href: null,
          headerShown: false,
        }}
      />

      <Tabs.Screen
        name="submit-union-report"
        options={{
          href: null,
          headerShown: false,
        }}
      />
    </Tabs>
  );
}
