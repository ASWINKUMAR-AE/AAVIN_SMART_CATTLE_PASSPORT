import React from 'react';
import { View, Pressable } from 'react-native';
export const PressableScale = Pressable;
export const impactAsync = async () => {};
export const ImpactFeedbackStyle = { Light: 1 };
// The preview checks icon dimensions; production still uses the actual Ionicons font.
export const Ionicons = ({ size = 20, color = '#64748b', style }) => <View
  style={[{ width: size, height: size, flexShrink: 0, alignItems: 'center', justifyContent: 'center' }, style]}>
  <svg width={size} height={size}><circle cx={size / 2} cy={size / 2} r={size / 3} stroke={color} fill="none" strokeWidth="2" /></svg>
</View>;
export default props => React.createElement('svg', props);
export const Rect = props => React.createElement('rect', props);
export const Line = props => React.createElement('line', props);
export const Text = props => React.createElement('text', props);
