import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useDispatchWorkflow } from '../../context/DispatchContext';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from '../../context/LanguageContext';

export function MySocietiesCard() {
  const { context, loading } = useDispatchWorkflow();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const societies = context?.societies;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={t('bmcCentre.openSocieties', 'View my linked societies')}
      onPress={() => router.push('/(bmc)/my-societies')}
      style={({ pressed }) => [styles.card, { borderColor: colors.border, backgroundColor: pressed ? colors.primaryLight : colors.card }]}>
      <View style={styles.header}>
        <View style={[styles.icon, { backgroundColor: colors.primaryLight }]}><Ionicons name="business-outline" size={23} color={colors.primary} /></View>
        <View style={styles.text}>
          <Text style={[styles.title, { color: colors.text }]}>{t('bmcCentre.mySocieties', 'My societies')}</Text>
          <Text style={[styles.caption, { color: colors.textSecondary }]}>{societies ? societies.length + ' ' + t('bmcCentre.linkedCount', 'linked to this centre') :
            loading ? t('common.loading', 'Loading…') : t('bmcCentre.openSocieties', 'View my linked societies')}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.primary} />
      </View>
      {!!societies?.length && <View style={[styles.preview, { borderTopColor: colors.border }]}>
        {societies.slice(0, 2).map(society => <Text key={society.id} style={[styles.societyName, { color: colors.text }]}>{society.name}</Text>)}
        <Text style={[styles.link, { color: colors.primary }]}>{t('bmcCentre.viewSocieties', 'View society list')}</Text>
      </View>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, minWidth: 0, gap: 4 },
  title: { fontSize: 16, lineHeight: 23, fontWeight: '700' },
  caption: { fontSize: 12, lineHeight: 19 },
  preview: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, gap: 8 },
  societyName: { fontSize: 14, lineHeight: 21 },
  link: { fontSize: 13, lineHeight: 20, fontWeight: '700', marginTop: 2 },
});
