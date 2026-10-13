import React, { useEffect } from 'react';
import { Colors } from '../../constants/Colors';
import * as seed from '../../data/seedData';

const query = new URLSearchParams(location.search);
const ids = Object.fromEntries(['BOOTH001', 'BMC001', 'FARMER001', seed.SEED_BOOTH_RECEIPTS[0].id].map((id, index) =>
  [id, `${index + 1}d663122-c8e1-411e-b07d-03d7f74401f1`]));
function normalize(value) {
  if (typeof value === 'string') return ids[value] || value;
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, normalize(item)]));
  return value;
}
const societyName = 'Melur Society — District Cooperative Milk Collection Centre';
const bmcName = 'Alanganallur Regional Bulk Milk Chilling Centre';
const farmers = normalize(seed.SEED_FARMERS).map(farmer => ({ ...farmer,
  name: `${farmer.name} — Cooperative Dairy Producer`, address: '14 South Street, Villupuram District, Tamil Nadu' }));
const booths = normalize(seed.SEED_BOOTHS).map((booth, index) => index === 0 ? { ...booth, name: societyName, code: ids.BOOTH001 } : booth);
const bmcs = normalize(seed.SEED_BMCS).map((bmc, index) => index === 0 ? { ...bmc, name: bmcName } : bmc);
const cows = normalize(seed.SEED_COWS).map(cow => ({ ...cow, backendSynced: true }));
const receipts = normalize(seed.SEED_BOOTH_RECEIPTS).map(receipt => ({ ...receipt,
  boothName: societyName, bmcName, createdBy: 'Society intake operator' }));
export const user = { ...seed.SEED_DEMO_USERS.find(account => account.role === 'booth'),
  id: ids.BOOTH001, associatedId: ids.BOOTH001, fullName: societyName };
const store = {
  booths, bmcs, farmers, cows, milkRecords: normalize(seed.SEED_MILK_RECORDS), boothReceipts: receipts,
  bmcDeliveries: normalize(seed.SEED_BMC_DELIVERIES), discrepancyCases: normalize(seed.SEED_DISCREPANCY_CASES),
  vendors: normalize(seed.SEED_VENDORS), notifications: [],
  getBoothStats: () => ({ eligibleReceiptTotal: 12345.67, farmerWiseTotal: 7890.1, vendorCombinedTotal: 4455.57 }),
  replaceSocietyFarmers: () => {}, cacheFarmer: () => {}, updateFarmer: () => {}, verifyFarmer: () => {},
  recordMilk: () => {}, createBoothReceipt: () => receipts[0], sendBoothReceiptToBmc: () => {},
};
export const useAavinStore = () => store;
export const useAuth = () => ({ user, activeRole: 'booth', demoUsers: seed.SEED_DEMO_USERS,
  logout: async () => {}, switchRole: async () => {} });
export const useTheme = () => ({ colors: query.get('theme') === 'dark' ? Colors.dark : Colors.light,
  isDark: query.get('theme') === 'dark' });
export const useTranslation = () => ({ language: 'en', toggleLanguage: () => {}, t: (_key, fallback) => fallback });
export const useScroll = () => ({ isScrolled: false, barsVisible: true });
export const useRouter = () => ({ push: () => {}, replace: () => {}, back: () => {} });
export const useLocalSearchParams = () => ({ receiptId: receipts[0].id, farmerId: farmers[0].id });
export const useFocusEffect = callback => useEffect(callback, []);
export const useSafeAreaInsets = () => innerWidth > innerHeight
  ? { top: 0, bottom: 21, left: 44, right: 44 } : { top: 24, bottom: 34, left: 0, right: 0 };
export const AccountsApi = {
  listFarmers: async () => farmers.map(f => ({ id: f.id, fullName: f.name, phone: f.mobileNumber, role: 'farmer', parentId: f.assignedBoothId, parent: null,
    createdAt: f.createdAt, personalDetails: { farmerIdCode: f.farmerIdCode, address: f.address, village: f.village, numberOfCows: f.numberOfCows } })), registerFarmer: async () => {}, updateFarmer: async () => {},
};

export const indiaDate = () => '2026-10-12';
export const useCollectionRefresh = () => {};
export const useMilkCollections = () => ({ records: store.milkRecords, notifications: [], loading: false, error: null,
  summary: { today: '2026-10-12', todaySupply: '12345.67', monthSupply: '24000.00', last7DaysSupply: '24000.00',
    shifts: { morning: '7890.10', evening: '4455.57' }, dailyTrend: [] },
  save: async () => {}, refresh: async () => {}, refreshNotifications: async () => {}, markRead: async () => {} });
