import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Alert } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/TextField';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { GroupedList } from '../../components/ui/GroupedList';
import { ListRow } from '../../components/ui/ListRow';
import { api } from '../../services/api';

export default function MilkEntryScreen() {
  const { colors } = useTheme();

  const [cows, setCows] = useState<any[]>([]);
  const [selectedCowId, setSelectedCowId] = useState<string>('');
  const [sessionIndex, setSessionIndex] = useState(0); // 0: morning, 1: evening
  const [quantity, setQuantity] = useState('');
  const [fatPercentage, setFatPercentage] = useState('4.3');
  const [snfPercentage, setSnfPercentage] = useState('8.5');
  const [milkingTemp, setMilkingTemp] = useState('37.2');
  const [teatDipIndex, setTeatDipIndex] = useState(0); // 0: Yes, 1: No
  const [feedGiven, setFeedGiven] = useState('Co-4 Green Grass (20kg) + Aavin Pellet (4kg)');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [recentEntries, setRecentEntries] = useState<any[]>([]);

  useEffect(() => {
    loadCowsAndEntries();
  }, []);

  const loadCowsAndEntries = async () => {
    try {
      const [cowsRes, prodRes] = await Promise.all([
        api.get('/cows'),
        api.get('/production?days=7'),
      ]);
      if (cowsRes.data?.data?.length > 0) {
        setCows(cowsRes.data.data);
        setSelectedCowId(cowsRes.data.data[0].id);
      }
      if (prodRes.data?.data) {
        setRecentEntries(prodRes.data.data);
      }
    } catch (e) {
      console.warn('Failed to load cows/entries:', e);
    }
  };

  const handleSave = async () => {
    if (!selectedCowId || !quantity) {
      Alert.alert('Required', 'Please select a cow and enter milk quantity in litres');
      return;
    }

    setLoading(true);
    try {
      await api.post('/production', {
        cowId: selectedCowId,
        session: sessionIndex === 0 ? 'morning' : 'evening',
        quantityLitres: parseFloat(quantity),
        fatPercentage: parseFloat(fatPercentage) || 4.2,
        snfPercentage: parseFloat(snfPercentage) || 8.5,
        milkingTemperatureC: parseFloat(milkingTemp) || 37.2,
        teatDipApplied: teatDipIndex === 0,
        cowConditionNotes: notes || undefined,
      });

      Alert.alert('Saved', 'Milk production & hygiene log recorded successfully.');
      setQuantity('');
      setNotes('');
      loadCowsAndEntries();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedCow = cows.find((c) => c.id === selectedCowId);

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <Card>
        <Text style={[Typography.title2, { color: colors.text, marginBottom: 4 }]}>
          Daily Milk Production & Hygiene Log
        </Text>
        <Text style={[Typography.footnote, { color: colors.textSecondary, marginBottom: 12 }]}>
          Records yield, company hygiene metrics, and chilling standards.
        </Text>

        <Text style={[Typography.subhead, { color: colors.textSecondary, marginBottom: 6, fontWeight: '600' }]}>
          Select Cattle:
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cowChips}>
          {cows.map((c) => {
            const isSelected = c.id === selectedCowId;
            return (
              <Button
                key={c.id}
                title={`${c.name} (${c.tag_number})`}
                variant={isSelected ? 'primary' : 'secondary'}
                size="sm"
                onPress={() => setSelectedCowId(c.id)}
                style={{ marginRight: 8, marginBottom: 8 }}
              />
            );
          })}
        </ScrollView>

        <Text style={[Typography.subhead, { color: colors.textSecondary, marginTop: 10, marginBottom: 4, fontWeight: '600' }]}>
          Milking Session
        </Text>
        <SegmentedControl
          values={['🌅 Morning Session', '🌇 Evening Session']}
          selectedIndex={sessionIndex}
          onChange={setSessionIndex}
        />

        <TextField
          label="Quantity Milked (Litres) *"
          placeholder="e.g. 7.5"
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="decimal-pad"
        />

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <TextField
              label="Estimated Fat %"
              placeholder="4.3"
              value={fatPercentage}
              onChangeText={setFatPercentage}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={{ flex: 1 }}>
            <TextField
              label="Estimated SNF %"
              placeholder="8.5"
              value={snfPercentage}
              onChangeText={setSnfPercentage}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <TextField
              label="Milking Temp (°C)"
              placeholder="37.2"
              value={milkingTemp}
              onChangeText={setMilkingTemp}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <Text style={[Typography.subhead, { color: colors.textSecondary, marginBottom: 4, fontWeight: '600' }]}>
              Teat Dip Sanitizer
            </Text>
            <SegmentedControl
              values={['✅ Done', '❌ No']}
              selectedIndex={teatDipIndex}
              onChange={setTeatDipIndex}
            />
          </View>
        </View>

        <TextField
          label="Feed & Supplements Given"
          value={feedGiven}
          onChangeText={setFeedGiven}
        />

        <TextField
          label="Observation Notes (Optional)"
          placeholder="e.g. Udder clean, appetite high, good letdown"
          value={notes}
          onChangeText={setNotes}
        />

        <Button
          title="Save Milk Production Entry"
          onPress={handleSave}
          loading={loading}
          style={{ marginTop: 18 }}
        />
      </Card>

      {/* Recent Entries */}
      <GroupedList title="Recent Farm Milk Logs">
        {recentEntries.slice(0, 5).map((entry, idx) => (
          <ListRow
            key={entry.id || idx}
            title={`${entry.cow_name || 'Cow'} • ${entry.quantity_litres} Litres`}
            subtitle={`${entry.session.toUpperCase()} • ${new Date(entry.production_date).toLocaleDateString('en-IN')}`}
            icon="water"
            isLast={idx === Math.min(recentEntries.length, 5) - 1}
          />
        ))}
      </GroupedList>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  cowChips: {
    flexDirection: 'row',
    marginBottom: 8,
  },
});
