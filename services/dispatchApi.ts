import { api } from './api';
import { BoothReceipt, BMCDelivery, MilkRecord, Vendor } from '../types/aavin';

export interface WorkflowContext {
  society: { id: string; name: string; assignedBmcId: string } | null;
  bmc: { id: string; name: string };
  farmers: { id: string; name: string; assignedBoothId: string; farmerIdCode: string; village: string; numberOfCows: number }[];
}
export interface Attendance { id: string; farmerId: string; farmerName: string; collectionDate: string; session: 'morning' | 'evening' }
export interface VendorInput { code: string; name: string; phone?: string; vehicleNumber?: string; vehicleType?: string; routeName?: string }
export interface VendorMilkInput {
  vendorId: string; collectionDate: string; session: 'morning' | 'evening'; quantityLitres: string; notes?: string; submissionKey: string;
}
export interface ReceiptInput {
  collectionDate: string; session: 'morning' | 'evening' | 'full_day'; includedRecordIds: string[]; notes?: string; submissionKey: string;
}
// Submission IDs identify retries; authorization always comes from the authenticated account.
export function submissionKey(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.floor(Math.random() * 16);
    return (c === 'x' ? r : (r & 3) | 8).toString(16);
  });
}
async function pages<T>(path: string): Promise<T[]> {
  const rows: T[] = [];
  for (let page = 1; ; page++) {
    const { data } = await api.get(`/workflow/${path}`, { params: { page, pageSize: 100 } });
    rows.push(...data.data.results);
    if (!data.data.hasNext) return rows;
  }
}
function milk(row: MilkRecord): MilkRecord {
  return { ...row, quantityLitres: Number(row.quantityLitres), backendSynced: true,
    individualAllocation: row.measurementMethod === 'combined' ? 'not_available' : 'measured' };
}
function receipt(row: BoothReceipt): BoothReceipt { return { ...row, dispatchQuantity: Number(row.dispatchQuantity) }; }
function delivery(row: BMCDelivery): BMCDelivery { return { ...row, declaredDispatchQuantity: Number(row.declaredDispatchQuantity) }; }
export const DispatchApi = {
  async context(): Promise<WorkflowContext> { return (await api.get('/workflow/context')).data.data; },
  vendors: () => pages<Vendor & { isActive: boolean }>('vendors'),
  async createVendor(input: VendorInput): Promise<Vendor> { return (await api.post('/workflow/vendors', input)).data.data.vendor; },
  async collections() { return (await pages<MilkRecord>('milk-transactions')).map(milk); },
  attendance: () => pages<Attendance>('farmer-attendance'),
  async receipts() { return (await pages<BoothReceipt>('booth-receipts')).map(receipt); },
  async deliveries() { return (await pages<BMCDelivery>('bmc-deliveries')).map(delivery); },
  async createVendorMilk(input: VendorMilkInput): Promise<MilkRecord> {
    return milk((await api.post('/workflow/vendor-milk-collections', input)).data.data.record);
  },
  async createReceipt(input: ReceiptInput): Promise<BoothReceipt> {
    return receipt((await api.post('/workflow/booth-receipts', input)).data.data.receipt);
  },
  async send(id: string): Promise<{ receipt: BoothReceipt; delivery: BMCDelivery }> {
    const data = (await api.post(`/workflow/booth-receipts/${id}/send`)).data.data;
    return { receipt: receipt(data.receipt), delivery: delivery(data.delivery) };
  },
};
