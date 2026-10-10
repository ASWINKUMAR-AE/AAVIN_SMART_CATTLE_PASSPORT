import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { PressableScale } from './PressableScale';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  bordered?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, style, onPress, bordered = false }) => {
  const { colors, isDark } = useTheme();

  const cardStyle = [
    styles.card,
    {
      backgroundColor: colors.card,
      borderColor: bordered ? colors.border : isDark ? colors.border : 'transparent',
      borderWidth: bordered || isDark ? 1 : 0,
      shadowColor: '#000000',
    },
    style,
  ];

  if (onPress) {
    return (
      <PressableScale onPress={onPress} style={cardStyle}>
        {children}
      </PressableScale>
    );
  }

  return <View style={cardStyle}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginVertical: 6,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
});
