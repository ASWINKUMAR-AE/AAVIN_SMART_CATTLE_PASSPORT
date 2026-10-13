import { api } from './api';
import { InAppNotification, MilkRecord } from '../types/aavin';

export function indiaDate(now = new Date()): string {
  return new Date(now.getTime() + 330 * 60_000).toISOString().slice(0, 10);
}
export function daysBefore(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) - days * 86400_000).toISOString().slice(0, 10);
}
export interface CollectionInput {
  farmerId: string;
  quantityLitres: string;
  collectionDate: string;
  session: 'morning' | 'evening';
  notes?: string;
}
export interface CollectionRecord extends Pick<MilkRecord, 'id' | 'farmerId' | 'farmerName' | 'boothId' | 'createdBy' | 'collectionDate' | 'session' | 'notes' | 'createdAt'> {
  boothName: string;
  quantityLitres: string;
}
export interface CollectionSummary {
  today: string;
  todaySupply: string;
  monthSupply: string;
  last7DaysSupply: string;
  shifts: { morning: string; evening: string };
  dailyTrend: Array<{ date: string; quantityLitres: string }>;
}
interface Page<T> { results: T[]; count: number; page: number; pageSize: number; hasNext: boolean; unreadCount?: number }
export function mapCollection(record: CollectionRecord): MilkRecord {
  return { ...record, quantityLitres: Number(record.quantityLitres), route: 'direct', measurementMethod: 'farmer_wise',
    individualAllocation: 'measured', status: 'recorded', backendSynced: true };
}
async function allPages<T extends { id: string }>(url: string, params = {}): Promise<T[]> {
  const records: T[] = [];
  for (let page = 1; ; page++) {
    const response = await api.get(url, { params: { ...params, page, pageSize: 100 } });
    const data: Page<T> = response.data.data;
    records.push(...data.results);
    if (!data.hasNext) return [...new Map(records.map(record => [record.id, record])).values()];
  }
}
export const MilkCollectionsApi = {
  async create(payload: CollectionInput): Promise<CollectionRecord> {
    return (await api.post('/milk-collections', payload)).data.data.record;
  },
  list: (params?: { farmerId?: string; collectionDate?: string; session?: string }) => allPages<CollectionRecord>('/milk-collections', params),
  async summary(): Promise<CollectionSummary> { return (await api.get('/milk-collections/summary')).data.data; },
  notifications: () => allPages<InAppNotification>('/notifications'),
  async read(id: string) { await api.post(`/notifications/${id}/read`); },
  async readAll() { await api.post('/notifications/read-all'); },
};
