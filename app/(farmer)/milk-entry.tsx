import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { DemoHeader } from '../../components/DemoHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

export default function MilkEntryScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  return <View style={{ flex: 1, backgroundColor: colors.background }}>
    <DemoHeader title="Milk Collections" subtitle="Your confirmed Society collections" showBack />
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 128 }}>
      <Card>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 12 }}>Recorded by your Society</Text>
        <Text style={{ color: colors.textSecondary, marginBottom: 16 }}>Society staff weigh and record your milk for each date and shift. Your confirmed litres and collection notifications appear in your app after the Society saves the entry.</Text>
        <Button title="View Milk History" onPress={() => router.replace('/(farmer)/milk-history')} />
      </Card>
    </ScrollView>
  </View>;
}
