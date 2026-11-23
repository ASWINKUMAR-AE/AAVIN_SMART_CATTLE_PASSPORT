import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FloatingAavinTabBar } from '../navigation/FloatingAavinTabBar';

export function BoothTabBar(props: React.ComponentProps<typeof FloatingAavinTabBar>) {
  const insets = useSafeAreaInsets();
  // Expo converts href:null to display:none before passing descriptors to custom bars.
  const descriptors = Object.fromEntries(Object.entries(props.descriptors).map(([key, descriptor]: [string, any]) => [key, {
    ...descriptor,
    options: {
      ...descriptor.options,
      ...(StyleSheet.flatten(descriptor.options?.tabBarItemStyle)?.display === 'none' ? { href: null } : {}),
    },
  }]));
  return <View pointerEvents="box-none" style={{ position: 'absolute', left: insets.left, right: insets.right,
    bottom: 0, height: 56 + Math.max(insets.bottom, 12), zIndex: 999 }}>
    <FloatingAavinTabBar {...props} descriptors={descriptors} hideOnScroll={false} barHeight={56} />
  </View>;
}
