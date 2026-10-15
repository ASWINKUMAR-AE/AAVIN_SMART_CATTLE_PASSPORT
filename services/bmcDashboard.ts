import { BMCDelivery } from '../types/aavin';
import type { LinkedSociety } from './dispatchApi';

export function validCollectionDate(value: unknown): string | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value ? value : null;
}

export function aggregateBmcDeliveries(deliveries: BMCDelivery[], thresholdLitres: number) {
  const measured = deliveries.filter(item => item.measuredReceivedQuantity != null);
  const statuses = deliveries.map(item => bmcDeliveryStatus(item, thresholdLitres));
  return {
    sentLitres: deliveries.reduce((sum, item) => sum + item.declaredDispatchQuantity, 0),
    receivedLitres: measured.length ? measured.reduce((sum, item) => sum + item.measuredReceivedQuantity!, 0) : null,
    differenceLitres: measured.length ? measured.reduce((sum, item) => sum + item.declaredDispatchQuantity - item.measuredReceivedQuantity!, 0) : null,
    deliveryCount: deliveries.length, measuredCount: measured.length,
    societyCount: new Set(deliveries.map(item => item.boothId)).size,
    pendingCount: statuses.filter(status => status === 'pending').length,
    matchedCount: statuses.filter(status => status === 'matched').length,
    reviewCount: statuses.filter(status => status === 'mismatch' || status === 'pending_reconciliation').length,
  };
}

export type BmcAggregate = ReturnType<typeof aggregateBmcDeliveries>;

export type BmcPeriod = 'today' | 'yesterday' | 'last7' | 'month';
const shiftDate = (date: string, days: number) => new Date(Date.parse(`${date}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);

export function bmcPeriodRange(period: BmcPeriod, today: string) {
  const end = period === 'yesterday' ? shiftDate(today, -1) : today;
  const start = period === 'last7' ? shiftDate(today, -6) : period === 'month' ? `${today.slice(0, 7)}-01` : end;
  const dayCount = Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1;
  return { start, end, dayCount, previousStart: shiftDate(start, -dayCount), previousEnd: shiftDate(start, -1) };
}

export function buildBmcAnalysis(records: BMCDelivery[], bmcId: string, today: string, period: BmcPeriod, thresholdLitres: number, linkedSocieties?: LinkedSociety[]) {
  const range = bmcPeriodRange(period, today);
  const scoped = records.filter(item => item.bmcId === bmcId);
  const deliveries = scoped.filter(item => item.collectionDate >= range.start && item.collectionDate <= range.end);
  const previous = scoped.filter(item => item.collectionDate >= range.previousStart && item.collectionDate <= range.previousEnd);
  const previousSentLitres = previous.reduce((sum, item) => sum + item.declaredDispatchQuantity, 0);
  const groups = new Map<string, { id: string; name: string; linkStatus: 'linked' | 'historical' | 'unknown'; records: BMCDelivery[] }>();
  for (const society of linkedSocieties || []) {
    groups.set(society.id, { id: society.id, name: society.name, linkStatus: 'linked', records: [] });
  }
  for (const delivery of deliveries) {
    const group = groups.get(delivery.boothId) || { id: delivery.boothId, name: delivery.boothName, linkStatus: linkedSocieties === undefined ? 'unknown' as const : 'historical' as const, records: [] };
    group.records.push(delivery);
    groups.set(delivery.boothId, group);
  }
  const societies = [...groups.values()].map(({ records: rows, ...society }) => ({ ...society, ...aggregateBmcDeliveries(rows, thresholdLitres) }))
    .sort((a, b) => b.sentLitres - a.sentLitres || a.name.localeCompare(b.name));
  const daily = Array.from({ length: range.dayCount }, (_, index) => {
    const date = shiftDate(range.start, index);
    const summary = aggregateBmcDeliveries(deliveries.filter(item => item.collectionDate === date), thresholdLitres);
    return { ...summary, date, sent: summary.sentLitres, received: summary.receivedLitres, count: summary.deliveryCount };
  });
  return {
    ...aggregateBmcDeliveries(deliveries, thresholdLitres),
    range, deliveries, previousSentLitres, previousCount: previous.length, daily, societies,
  };
}

export function bmcDeliveryStatus(item: BMCDelivery, thresholdLitres: number) {
  if (item.status === 'escalated_to_union') return 'pending_reconciliation';
  if (item.status === 'mismatch_investigation') return 'mismatch';
  if (item.status === 'resolved' || item.status === 'matched') return 'matched';
  if (item.status === 'pending_arrival' || item.measuredReceivedQuantity == null) return 'pending';
  const difference = item.difference ?? item.declaredDispatchQuantity - item.measuredReceivedQuantity;
  return Math.abs(difference) > thresholdLitres ? 'mismatch' : 'matched';
}

export function buildBmcDashboard(records: BMCDelivery[], bmcId: string, today: string, thresholdLitres: number) {
  const deliveries = records.filter(item => item.bmcId === bmcId);
  const todayDeliveries = deliveries.filter(item => item.collectionDate === today);
  const pending = deliveries.filter(item => bmcDeliveryStatus(item, thresholdLitres) === 'pending');
  const review = deliveries.filter(item => ['mismatch', 'pending_reconciliation'].includes(bmcDeliveryStatus(item, thresholdLitres)));
  const measured = todayDeliveries.filter(item => item.measuredReceivedQuantity != null);
  const groups = new Map<string, { id: string; name: string; sent: number; received: number; measuredCount: number; deliveryCount: number }>();
  for (const item of todayDeliveries) {
    const group = groups.get(item.boothId) ?? { id: item.boothId, name: item.boothName, sent: 0, received: 0, measuredCount: 0, deliveryCount: 0 };
    group.sent += item.declaredDispatchQuantity;
    group.deliveryCount++;
    if (item.measuredReceivedQuantity != null) {
      group.received += item.measuredReceivedQuantity;
      group.measuredCount++;
    }
    groups.set(item.boothId, group);
  }
  return {
    todayDeliveries, pending, review,
    sentLitres: todayDeliveries.reduce((sum, item) => sum + item.declaredDispatchQuantity, 0),
    receivedLitres: measured.length ? measured.reduce((sum, item) => sum + item.measuredReceivedQuantity!, 0) : null,
    measuredCount: measured.length,
    societies: [...groups.values()].sort((a, b) => a.name.localeCompare(b.name)),
  };
}
