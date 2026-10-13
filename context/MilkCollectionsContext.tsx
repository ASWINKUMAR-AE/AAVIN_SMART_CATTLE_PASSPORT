import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from './AuthContext';
import { useAavinStore } from '../store/AavinStoreContext';
import { CollectionInput, CollectionSummary, mapCollection, MilkCollectionsApi } from '../services/milkCollectionsApi';
import { apiErrorMessage } from '../services/accountMapping';
import { InAppNotification, MilkRecord } from '../types/aavin';

interface CollectionState {
  records: MilkRecord[];
  notifications: InAppNotification[];
  summary: CollectionSummary | null;
  loading: boolean;
  error: string | null;
  notificationError: string | null;
  notificationsLoaded: boolean;
  refresh: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  save: (input: CollectionInput) => Promise<MilkRecord>;
  markRead: (id?: string) => Promise<void>;
}
const Context = createContext<CollectionState | null>(null);

export function MilkCollectionsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { setCollectionData } = useAavinStore();
  const account = user?.id || '';
  const identity = useRef(account);
  const epoch = useRef(0);
  if (identity.current !== account) epoch.current++;
  identity.current = account; // Guards responses even before the account-change effect runs.
  const [owner, setOwner] = useState(account);
  const [records, setRecords] = useState<MilkRecord[]>([]);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [summary, setSummary] = useState<CollectionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notificationsLoaded, setNotificationsLoaded] = useState(false);
  const [notificationError, setNotificationError] = useState<string | null>(null);
  const revision = useRef(0);
  const notificationRevision = useRef(0);
  const saving = useRef(false);
  const unresolved = useRef<CollectionInput | null>(null);
  const eligible = user?.role === 'booth' || user?.role === 'farmer';

  const refresh = useCallback(async () => {
    if (!account || !eligible) return;
    const sequence = ++revision.current;
    setLoading(true);
    try {
      const [data, totals] = await Promise.all([MilkCollectionsApi.list(), MilkCollectionsApi.summary()]);
      if (identity.current !== account || sequence !== revision.current) return;
      setRecords(data.map(mapCollection)); setSummary(totals); setError(null);
    } catch (err) {
      if (identity.current === account && sequence === revision.current) setError(apiErrorMessage(err));
    } finally {
      if (identity.current === account && sequence === revision.current) setLoading(false);
    }
  }, [account, eligible]);
  const refreshNotifications = useCallback(async () => {
    if (!account) return;
    const sequence = ++notificationRevision.current;
    try {
      const data = await MilkCollectionsApi.notifications();
      if (identity.current === account && sequence === notificationRevision.current) {
        setNotifications(data.filter(n => n.recipientId === account)); setNotificationError(null); setNotificationsLoaded(true);
      }
    } catch (err) {
      if (identity.current === account && sequence === notificationRevision.current) setNotificationError(apiErrorMessage(err));
    }
  }, [account]);
  useEffect(() => {
    revision.current++; notificationRevision.current++;
    setOwner(account); setRecords([]); setNotifications([]); setSummary(null);
    setError(null); setNotificationError(null); setNotificationsLoaded(false); setLoading(!!account && eligible);
    unresolved.current = null;
    setCollectionData([], []);
    void refresh(); void refreshNotifications();
  }, [account, eligible, refresh, refreshNotifications, setCollectionData]);
  useEffect(() => {
    const foreground = () => { void refresh(); void refreshNotifications(); };
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') foreground(); });
    // A farmer may keep the dashboard open while the Booth records a new delivery.
    // Refresh quantities together with alerts so the two views stay in sync.
    const timer = setInterval(() => { if (AppState.currentState === 'active') foreground(); }, 30_000);
    return () => { subscription.remove(); clearInterval(timer); };
  }, [refresh, refreshNotifications]);
  useEffect(() => {
    if (owner === account) setCollectionData(records, notifications);
  }, [owner, account, records, notifications, setCollectionData]);

  const save = useCallback(async (input: CollectionInput) => {
    if (!account || user?.role !== 'booth') throw new Error('Only Booth staff can record milk.');
    if (saving.current) throw new Error('A collection is already being saved.');
    const saveEpoch = epoch.current;
    saving.current = true;
    const saveSequence = ++revision.current; // Do not let a pre-save fetch overwrite this save.
    const checkIdentity = () => { if (identity.current !== account || epoch.current !== saveEpoch) throw new Error('Account changed. Please sign in again.'); };
    try {
      // Resolve an earlier ambiguous request before allowing any new submission.
      if (unresolved.current) {
        const prior = unresolved.current;
        const found = await MilkCollectionsApi.list({ farmerId: prior.farmerId, collectionDate: prior.collectionDate, session: prior.session });
        checkIdentity(); unresolved.current = null;
        if (found.length) {
          const record = mapCollection(found[0]);
          setRecords(previous => [record, ...previous.filter(r => r.id !== record.id)]);
          void refresh();
          throw new Error('The previous collection was saved. Review it before recording another.');
        }
      }
      try {
        const record = mapCollection(await MilkCollectionsApi.create(input));
        checkIdentity();
        setRecords(previous => [record, ...previous.filter(r => r.id !== record.id)]);
        void refresh();
        return record;
      } catch (err: any) {
        checkIdentity();
        if (!err?.response || err.response.status >= 500 || err.response.status === 409) {
          unresolved.current = input;
          try {
            const found = await MilkCollectionsApi.list({ farmerId: input.farmerId, collectionDate: input.collectionDate, session: input.session });
            checkIdentity(); unresolved.current = null;
            if (found.length) {
              const record = mapCollection(found[0]);
              setRecords(previous => [record, ...previous.filter(r => r.id !== record.id)]);
              void refresh();
              // Only confirm this request if the saved values exactly match.
              if (err?.response?.status !== 409 && record.quantityLitres === Number(input.quantityLitres) && (record.notes || '') === (input.notes || '').trim()) return record;
              throw new Error('A collection already exists for this farmer, date, and shift. Review the saved entry.');
            }
          } catch (lookupError) {
            if (unresolved.current) throw new Error('Save status is unknown. Reconnect and retry to check the server before another submission.');
            throw lookupError;
          }
        }
        throw new Error(apiErrorMessage(err));
      }
    } finally {
      saving.current = false;
      if (identity.current === account && epoch.current === saveEpoch && revision.current === saveSequence) setLoading(false);
    }
  }, [account, user?.role, refresh]);
  const markRead = useCallback(async (id?: string) => {
    if (!account) return;
    const readEpoch = epoch.current;
    notificationRevision.current++;
    if (id) await MilkCollectionsApi.read(id); else await MilkCollectionsApi.readAll();
    if (identity.current !== account || epoch.current !== readEpoch) return;
    setNotifications(previous => previous.map(n => !id || n.id === id ? { ...n, isRead: true } : n));
    await refreshNotifications();
  }, [account, refreshNotifications]);
  return <Context.Provider value={{ records: owner === account ? records : [], notifications: owner === account ? notifications : [],
    summary: owner === account ? summary : null, loading: owner !== account || loading, error: owner === account ? error : null, notificationError: owner === account ? notificationError : null,
    notificationsLoaded: owner === account && notificationsLoaded, refresh, refreshNotifications, save, markRead }}>{children}</Context.Provider>;
}
export function useMilkCollections() {
  const context = useContext(Context);
  if (!context) throw new Error('MilkCollectionsProvider is required.');
  return context;
}
export function useCollectionRefresh() {
  const { refresh } = useMilkCollections();
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));
}
