import React from 'react';
import { View, ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function BoothScreen({ style, ...props }: ViewProps) {
  const insets = useSafeAreaInsets();
  return <View {...props} style={[style, { paddingLeft: insets.left, paddingRight: insets.right }]} />;
}
