import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { goBackOrReplace } from '../../services/navigation';

const sections = [
  {
    title: 'Milk reports',
    items: [
      { title: 'Daily summary', description: 'Review milk received, differences and the daily receipt.', icon: 'document-text-outline', route: '/(bmc)/daily-summary' },
      { title: 'Union report', description: 'Prepare and review your report before sending it to the union.', icon: 'paper-plane-outline', route: '/(bmc)/submit-union-report' },
    ],
  },
  {
    title: 'Society records',
    items: [
      { title: 'Compare societies', description: 'Compare milk supply and performance across societies.', icon: 'bar-chart-outline', route: '/(bmc)/society-comparison' },
      { title: 'Society payments', description: 'Record and view payments, incentives and deductions.', icon: 'wallet-outline', route: '/(bmc)/society-income' },
    ],
  },
] as const;

export default function BMCOperationsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border, paddingTop: insets.top + 12 }]}>
        <View style={styles.headerInner}>
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => goBackOrReplace(router, '/(bmc)')}
            style={({ pressed }) => [styles.backButton, { backgroundColor: pressed ? colors.primaryLight : colors.background }]}>
            <Ionicons name="arrow-back" size={23} color={colors.text} />
          </Pressable>
          <Text accessibilityRole="header" style={[styles.pageTitle, { color: colors.text }]}>Reports & payments</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={[styles.intro, { color: colors.textSecondary }]}>Choose a task to view reports or manage society payment records.</Text>
          {sections.map(section => <View key={section.title} style={styles.section}>
            <Text accessibilityRole="header" style={[styles.sectionTitle, { color: colors.text }]}>{section.title}</Text>
            <View style={[styles.group, { borderColor: colors.border, backgroundColor: colors.card }]}>
              {section.items.map((item, index) => <Pressable key={item.route} accessibilityRole="button" accessibilityLabel={item.title + '. ' + item.description}
                onPress={() => router.push(item.route)} style={({ pressed }) => [styles.row, index > 0 && styles.divider,
                  { borderTopColor: colors.border, backgroundColor: pressed ? colors.primaryLight : colors.card }]}>
                <View style={[styles.icon, { backgroundColor: colors.primaryLight }]}><Ionicons name={item.icon} size={24} color={colors.primary} /></View>
                <View style={styles.rowText}>
                  <Text style={[styles.rowTitle, { color: colors.text }]}>{item.title}</Text>
                  <Text style={[styles.description, { color: colors.textSecondary }]}>{item.description}</Text>
                </View>
                <Ionicons name="chevron-forward" size={19} color={colors.textSecondary} />
              </Pressable>)}
            </View>
          </View>)}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  headerInner: { flexDirection: 'row', alignItems: 'center', gap: 12, width: '100%', maxWidth: 760, alignSelf: 'center' },
  backButton: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  pageTitle: { flex: 1, fontSize: 22, lineHeight: 30, fontWeight: '800' },
  scrollContent: { padding: 16, paddingBottom: 32 },
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', gap: 26 },
  intro: { fontSize: 14, lineHeight: 22 },
  section: { gap: 12 },
  sectionTitle: { fontSize: 17, lineHeight: 24, fontWeight: '700' },
  group: { borderWidth: 1, borderRadius: 20, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, minHeight: 104 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth },
  icon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, minWidth: 0, gap: 5 },
  rowTitle: { fontSize: 16, lineHeight: 23, fontWeight: '700' },
  description: { fontSize: 13, lineHeight: 20 },
});
