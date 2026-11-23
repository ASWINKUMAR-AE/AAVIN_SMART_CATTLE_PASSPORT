import React from 'react';
import { Text, TextProps } from 'react-native';

// Booth content wraps instead of hiding names, descriptions, or action labels.
export function BoothText({ style, numberOfLines: _numberOfLines, ...props }: TextProps) {
  return <Text {...props} style={[{ minWidth: 0, flexShrink: 1, maxWidth: '100%' }, style]} />;
}
