import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from '../../context/LanguageContext';

export function ReportsShortcut() {
  const { colors } = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={t('bmcProfile.openReports', 'Open reports and payments')}
      onPress={() => router.push('/(bmc)/operations')}
      style={({ pressed }) => [styles.card, { backgroundColor: pressed ? colors.primaryLight : colors.card, borderColor: colors.border }]}>
      <View style={[styles.icon, { backgroundColor: colors.primaryLight }]}>
        <Ionicons name="documents-outline" size={23} color={colors.primary} />
      </View>
      <View style={styles.text}>
        <Text style={[styles.title, { color: colors.text }]}>{t('bmcProfile.reportsTitle', 'Reports & payments')}</Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>{t('bmcProfile.reportsHelp', 'Daily reports, comparisons and payment records')}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 16, padding: 16, minHeight: 84 },
  icon: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, minWidth: 0, gap: 4 },
  title: { fontSize: 16, lineHeight: 23, fontWeight: '700' },
  description: { fontSize: 12, lineHeight: 18 },
});
