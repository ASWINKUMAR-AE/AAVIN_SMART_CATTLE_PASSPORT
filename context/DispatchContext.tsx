import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from './AuthContext';
import { apiErrorMessage } from '../services/accountMapping';
import { Attendance, DispatchApi, WorkflowContext, VendorInput, VendorMilkInput, ReceiptInput } from '../services/dispatchApi';
import { BoothReceipt, BMCDelivery, MilkRecord, Vendor } from '../types/aavin';

interface Snapshot {
  owner: string; context: WorkflowContext | null; vendors: Vendor[]; milkRecords: MilkRecord[];
  attendance: Attendance[]; boothReceipts: BoothReceipt[]; bmcDeliveries: BMCDelivery[];
}
const empty = (owner = ''): Snapshot => ({ owner, context: null, vendors: [], milkRecords: [], attendance: [], boothReceipts: [], bmcDeliveries: [] });
interface Actions {
  createVendor: (input: VendorInput) => Promise<Vendor>;
  createVendorMilk: (input: VendorMilkInput) => Promise<MilkRecord>;
  createReceipt: (input: ReceiptInput) => Promise<BoothReceipt>;
  sendReceipt: (id: string) => Promise<void>;
}
const Context = createContext<(Snapshot & Actions & { loading: boolean; error: string | null; refresh: () => Promise<void> }) | null>(null);
export function DispatchProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const account = user?.id || '';
  const role = user?.role;
  const eligible = role === 'booth' || role === 'bmc';
  const identity = useRef(account);
  const epoch = useRef(0);
  if (identity.current !== account) epoch.current++;
  identity.current = account;
  const renderEpoch = epoch.current;
  const sequence = useRef(0);
  const [state, setState] = useState<Snapshot>(empty());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    const current = ++sequence.current;
    if (!account || !eligible) { setState(empty(account)); setLoading(false); setError(null); return; }
    setLoading(true);
    try {
      const [context, boothReceipts, bmcDeliveries, vendors, milkRecords, attendance] = await Promise.all([
        DispatchApi.context(), DispatchApi.receipts(), DispatchApi.deliveries(),
        role === 'booth' ? DispatchApi.vendors() : Promise.resolve([]),
        role === 'booth' ? DispatchApi.collections() : Promise.resolve([]),
        role === 'booth' ? DispatchApi.attendance() : Promise.resolve([]),
      ]);
      if (identity.current !== account || sequence.current !== current) return;
      setState({ owner: account, context, boothReceipts, bmcDeliveries, vendors: vendors.filter(v => v.isActive), milkRecords, attendance });
      setError(null);
    } catch (err) {
      if (identity.current === account && sequence.current === current) setError(apiErrorMessage(err));
    } finally {
      if (identity.current === account && sequence.current === current) setLoading(false);
    }
  }, [account, eligible, role]);
  useEffect(() => { setState(empty(account)); setError(null); void refresh(); }, [account, refresh]);
  useEffect(() => {
    if (!eligible) return;
    const foreground = () => { if (AppState.currentState === 'active') void refresh(); };
    const timer = setInterval(foreground, 30000);
    const subscription = AppState.addEventListener('change', foreground);
    return () => { clearInterval(timer); subscription.remove(); };
  }, [eligible, refresh]);
  // Publish only confirmed server results, even if the following refresh fails.
  const accept = (update: (previous: Snapshot) => Snapshot) => {
    if (identity.current !== account || epoch.current !== renderEpoch) throw new Error('Account changed. Please sign in again.');
    sequence.current++;
    setState(previous => update(previous.owner === account ? previous : empty(account)));
    setLoading(false); setError(null);
  };
  const createVendor = async (input: VendorInput) => {
    const vendor = await DispatchApi.createVendor(input);
    accept(previous => ({ ...previous, vendors: [vendor, ...previous.vendors.filter(v => v.id !== vendor.id)] }));
    return vendor;
  };
  const createVendorMilk = async (input: VendorMilkInput) => {
    const record = await DispatchApi.createVendorMilk(input);
    accept(previous => ({ ...previous, milkRecords: [record, ...previous.milkRecords.filter(r => r.id !== record.id)] }));
    return record;
  };
  const createReceipt = async (input: ReceiptInput) => {
    const receipt = await DispatchApi.createReceipt(input);
    accept(previous => ({ ...previous,
      boothReceipts: [receipt, ...previous.boothReceipts.filter(r => r.id !== receipt.id)],
      milkRecords: previous.milkRecords.map(record => receipt.includedRecordIds.includes(record.id)
        ? { ...record, status: 'included_in_receipt', receiptId: receipt.id } : record),
    }));
    return receipt;
  };
  const sendReceipt = async (id: string) => {
    const result = await DispatchApi.send(id);
    accept(previous => ({ ...previous,
      boothReceipts: [result.receipt, ...previous.boothReceipts.filter(r => r.id !== id)],
      bmcDeliveries: [result.delivery, ...previous.bmcDeliveries.filter(d => d.id !== result.delivery.id)],
    }));
  };
  const visible = state.owner === account ? state : empty(account);
  return <Context.Provider value={{ ...visible, loading, error, refresh, createVendor, createVendorMilk, createReceipt, sendReceipt }}>{children}</Context.Provider>;
}
export function useDispatchWorkflow() {
  const context = useContext(Context);
  if (!context) throw new Error('DispatchProvider is missing.');
  return context;
}
export function useDispatchRefresh() {
  const { refresh } = useDispatchWorkflow();
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));
}
