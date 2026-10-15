import React, { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from '../../context/LanguageContext';

type CollectionDay = { date: string; sent: number; received: number | null; measuredCount: number; count: number };
type Props = { days: CollectionDay[]; dateLabel: (date: string) => string; litres: (value: number | null) => string };
const PLOT_HEIGHT = 200;

export function CollectionBarChart({ days, dateLabel, litres }: Props) {
  const { colors } = useTheme();
  const { t, language } = useTranslation();
  const { width, fontScale } = useWindowDimensions();
  const [selectedDate, setSelectedDate] = useState(days[days.length - 1]?.date);
  const [availableWidth, setAvailableWidth] = useState(Math.min(width - 66, 866));
  const scrollRef = useRef<ScrollView>(null);
  const selected = days.find(day => day.date === selectedDate) || days[days.length - 1];
  const max = Math.max(1, ...days.flatMap(day => [day.sent, day.received ?? 0]));
  const magnitude = 10 ** Math.floor(Math.log10(max / 4));
  const step = Math.max(0.25, ([1, 2, 2.5, 5, 10].find(value => value * magnitude >= max / 4) ?? 10) * magnitude);
  const ceiling = step * 4;
  const ticks = [4, 3, 2, 1, 0].map(index => index * step);
  const axisWidth = 58 * Math.min(fontScale, 2);
  const groupWidth = Math.max(94 * Math.min(fontScale, 2), (availableWidth - axisWidth) / Math.max(days.length, 1));
  const chartWidth = groupWidth * days.length;
  const number = (value: number) => value.toLocaleString(language === 'ta' ? 'ta-IN' : 'en-IN', { maximumFractionDigits: 1 });
  const tr = (key: string) => t(`bmcAnalysis.${key}`);
  const receivedLabel = (day: CollectionDay) => tr(day.measuredCount > 0 && day.measuredCount < day.count ? 'receivedPartial' : 'received');

  return <View style={styles.container} onLayout={event => setAvailableWidth(event.nativeEvent.layout.width)}>
    <View style={styles.legend}>
      <View style={styles.legendItem}><View style={[styles.swatch, { backgroundColor: colors.primary }]} /><Text style={[styles.caption, { color: colors.textSecondary }]}>{tr('sent')}</Text></View>
      <View style={styles.legendItem}><View style={[styles.swatch, { backgroundColor: colors.clear }]} /><Text style={[styles.caption, { color: colors.textSecondary }]}>{tr('received')}</Text></View>
    </View>
    <Text style={[styles.caption, { color: colors.textSecondary }]}>{tr('barHelp')}</Text>
    <View style={styles.plotRow}>
      <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={{ width: axisWidth, height: PLOT_HEIGHT, marginTop: 24 }}>
        {ticks.map(tick => <Text key={tick} style={[styles.tick, { color: colors.textSecondary, top: PLOT_HEIGHT - tick / ceiling * PLOT_HEIGHT - 9 }]}>{number(tick)}</Text>)}
      </View>
      <ScrollView ref={scrollRef} horizontal showsHorizontalScrollIndicator style={styles.scroll} onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}>
        <View style={{ width: chartWidth, paddingTop: 24, paddingBottom: 8 }}>
          <View pointerEvents="none" style={[styles.grid, { top: 24, width: chartWidth }]}>
            {ticks.map(tick => <View key={tick} style={[styles.gridLine, { top: PLOT_HEIGHT - tick / ceiling * PLOT_HEIGHT, borderColor: colors.border, borderStyle: tick ? 'dashed' : 'solid' }]} />)}
          </View>
          <View style={styles.groups}>
            {days.map(day => <Pressable key={day.date} accessibilityRole="button" accessibilityState={{ selected: selected?.date === day.date }}
              accessibilityLabel={`${dateLabel(day.date)}. ${tr('sent')}: ${litres(day.sent)}. ${receivedLabel(day)}: ${litres(day.received)}`}
              onPress={() => setSelectedDate(day.date)} style={{ width: groupWidth, alignItems: 'center' }}>
              <View style={[styles.bars, { height: PLOT_HEIGHT }]}>
                {[{ value: day.sent, color: colors.primary }, { value: day.received, color: colors.clear }].map((bar, index) =>
                  <View key={index} style={[styles.barSlot, { width: Math.min(40, groupWidth * 0.26) }]}>
                    {bar.value == null ? <Text style={[styles.missing, { color: colors.textSecondary }]}>—</Text> :
                      <View style={[styles.bar, { height: bar.value / ceiling * PLOT_HEIGHT, backgroundColor: bar.color, opacity: selected?.date === day.date ? 1 : 0.65 }]} />}
                  </View>)}
              </View>
              <View style={[styles.date, { backgroundColor: selected?.date === day.date ? colors.primaryLight : 'transparent' }]}>
                <Text style={[styles.dateText, { color: selected?.date === day.date ? colors.text : colors.textSecondary }]}>{day.date.slice(8)} / {day.date.slice(5, 7)}</Text>
                <View style={[styles.selectionDot, { backgroundColor: selected?.date === day.date ? colors.primary : 'transparent' }]} />
              </View>
            </Pressable>)}
          </View>
        </View>
      </ScrollView>
    </View>
    {selected && <View accessibilityLiveRegion="polite" style={[styles.details, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <Text style={[styles.selectedDate, { color: colors.text }]}>{dateLabel(selected.date)}</Text>
      <View style={styles.detailValues}>
        {[{ label: tr('sent'), value: selected.sent, color: colors.primary }, { label: receivedLabel(selected), value: selected.received, color: colors.clear }].map(item =>
          <View key={item.label} style={styles.detailValue}><Text style={[styles.caption, { color: colors.textSecondary }]}>{item.label}</Text><Text style={[styles.value, { color: item.color }]}>{litres(item.value)}</Text></View>)}
      </View>
      <Text style={[styles.caption, { color: colors.textSecondary }]}>{selected.measuredCount} / {selected.count} {tr('measured')}</Text>
    </View>}
  </View>;
}

const styles = StyleSheet.create({
  container: { gap: 12 }, legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 }, swatch: { width: 10, height: 10, borderRadius: 3 },
  caption: { fontSize: 12, lineHeight: 19 }, plotRow: { flexDirection: 'row' }, scroll: { flex: 1 },
  tick: { position: 'absolute', right: 8, fontSize: 11, fontVariant: ['tabular-nums'] },
  grid: { position: 'absolute', height: PLOT_HEIGHT }, gridLine: { position: 'absolute', width: '100%', borderTopWidth: 1 },
  groups: { flexDirection: 'row' }, bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  barSlot: { justifyContent: 'flex-end', alignItems: 'center' }, bar: { width: '100%', borderTopLeftRadius: 6, borderTopRightRadius: 6 }, missing: { fontSize: 18 },
  date: { minHeight: 44, marginTop: 8, paddingHorizontal: 10, paddingTop: 8, paddingBottom: 5, borderRadius: 10, alignItems: 'center', gap: 4 },
  dateText: { fontSize: 12, fontWeight: '600' }, selectionDot: { width: 4, height: 4, borderRadius: 2 },
  details: { padding: 14, borderWidth: 1, borderRadius: 14, gap: 10 }, selectedDate: { fontSize: 13, lineHeight: 20, fontWeight: '700' },
  detailValues: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 }, detailValue: { flexGrow: 1, flexBasis: 120, gap: 4 },
  value: { fontSize: 19, lineHeight: 27, fontWeight: '800', fontVariant: ['tabular-nums'] },
});
