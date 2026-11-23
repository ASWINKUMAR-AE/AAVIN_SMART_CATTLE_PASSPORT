// Exercise the real collection provider and service with isolated API/session hooks.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, mocks, timers = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true,
  }}).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require: name => {
    if (name in mocks) return mocks[name];
    throw Error('Unexpected dependency: ' + name);
  }, console, Promise, Date, Map, setInterval: timers.setInterval || (() => 1), clearInterval: () => {} });
  return module.exports;
}
const input = { farmerId: 'farmer-one', quantityLitres: '12.34', collectionDate: '2026-11-01', session: 'morning', notes: 'Measured' };
const serverRecord = { ...input, id: 'record-one', farmerName: 'Farmer One', boothId: 'society-one', boothName: 'Society One',
  createdBy: 'Society One', createdAt: '2026-11-01T01:00:00Z' };
const totals = { today: '2026-11-01', todaySupply: '12.34', monthSupply: '12.34', last7DaysSupply: '12.34',
  shifts: { morning: '12.34', evening: '0.00' }, dailyTrend: [] };
const service = load('services/milkCollectionsApi.ts', { './api': { api: {} } });
function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
const tick = () => new Promise(resolve => setImmediate(resolve));
function harness() {
  let user = { id: 'society-one', role: 'booth' }, slot = 0, value, foreground, poll;
  const hooks = [], effects = [], bridge = [], calls = [];
  let rows = [], notifs = [], summary = totals;
  const backend = {
    list: async () => rows, summary: async () => summary, notifications: async () => notifs,
    create: async payload => { calls.push(payload); rows = [serverRecord]; return serverRecord; },
    read: async () => {}, readAll: async () => {},
  };
  const react = {
    createContext: () => ({ Provider: 'Provider' }),
    createElement: (_type, props) => ({ props }),
    useState: initial => { const i = slot++; if (!hooks[i]) hooks[i] = { value: typeof initial === 'function' ? initial() : initial };
      return [hooks[i].value, next => { hooks[i].value = typeof next === 'function' ? next(hooks[i].value) : next; }]; },
    useRef: initial => { const i = slot++; if (!hooks[i]) hooks[i] = { current: initial }; return hooks[i]; },
    useCallback: (fn, deps) => { const i = slot++; const old = hooks[i]; if (!old || deps.some((dep, n) => dep !== old.deps[n])) hooks[i] = { fn, deps }; return hooks[i].fn; },
    useEffect: (fn, deps) => { const i = slot++; const old = hooks[i]; if (!old || deps.some((dep, n) => dep !== old.deps[n])) {
      effects.push(() => { old?.cleanup?.(); hooks[i] = { deps, cleanup: fn() }; });
    } },
  };
  const context = load('context/MilkCollectionsContext.tsx', {
    react, 'react-native': { AppState: { currentState: 'active', addEventListener: (_event, callback) => { foreground = callback; return { remove: () => {} }; } } },
    'expo-router': { useFocusEffect: () => {} }, './AuthContext': { useAuth: () => ({ user }) },
    '../store/AavinStoreContext': { useAavinStore: () => ({ setCollectionData: bridgeData }) },
    '../services/milkCollectionsApi': { MilkCollectionsApi: backend, mapCollection: service.mapCollection },
    '../services/accountMapping': { apiErrorMessage: error => error?.response?.data?.message || error.message || 'Server rejected' },
  }, { setInterval: callback => { poll = callback; return 1; } });
  function bridgeData(records, notifications) { bridge.push({ records, notifications }); }
  function render() { slot = 0; value = context.MilkCollectionsProvider({ children: null }).props.value; return value; }
  function commit() { while (effects.length) effects.shift()(); }
  async function settle() { render(); commit(); await tick(); render(); commit(); await tick(); render(); }
  return { backend, calls, bridge, settle, render, state: () => value, foreground: () => foreground('active'), poll: () => poll(),
    switchAccount: async account => { user = account; render(); commit(); await tick(); await settle(); },
    setRows: data => { rows = data; }, setNotifs: data => { notifs = data; } };
}
(async () => {
  assert.equal(service.indiaDate(new Date('2026-10-31T18:29:59Z')), '2026-10-31');
  assert.equal(service.indiaDate(new Date('2026-10-31T18:30:00Z')), '2026-11-01');
  assert.equal(service.daysBefore('2026-11-01', 6), '2026-10-26');
  assert.equal(service.mapCollection(serverRecord).quantityLitres, 12.34);
  assert.equal(service.mapCollection(serverRecord).backendSynced, true);
  {
    const h = harness(); await h.settle();
    const pending = deferred(); h.backend.create = payload => { h.calls.push(payload); return pending.promise; };
    const saving = h.state().save(input); h.render();
    assert.equal(h.state().records.length, 0, 'No optimistic insertion');
    await assert.rejects(h.state().save(input), /already being saved/);
    pending.resolve(serverRecord); h.setRows([serverRecord]);
    assert.equal((await saving).id, serverRecord.id); await h.settle();
    assert.equal(h.calls.length, 1); assert.equal(h.state().records.length, 1);
  }
  {
    const h = harness(); await h.settle();
    h.backend.create = async () => { throw { response: { status: 400, data: { message: 'Invalid date' } } }; };
    await assert.rejects(h.state().save(input), /Invalid date/); await h.settle();
    assert.equal(h.state().records.length, 0);
  }
  {
    const h = harness(); await h.settle();
    h.backend.create = async () => { h.setRows([serverRecord]); throw Error('timeout'); };
    assert.equal((await h.state().save(input)).id, serverRecord.id); await h.settle();
    assert.equal(h.state().records.length, 1, 'Timeout recovered from authoritative server record');
  }
  {
    const h = harness(); await h.settle(); let attempts = 0, lookups = 0;
    h.backend.create = async () => { attempts++; throw Error('timeout'); };
    h.backend.list = async () => { lookups++; throw Error('offline'); };
    await assert.rejects(h.state().save(input), /status is unknown/);
    await assert.rejects(h.state().save({ ...input, session: 'evening' }), /offline/);
    assert.equal(attempts, 1, 'Unresolved save must be checked before sending a new request');
    assert.equal(lookups, 2);
    h.backend.list = async () => [serverRecord];
    await assert.rejects(h.state().save(input), /previous collection was saved/);
    assert.equal(attempts, 1); await h.settle();
    assert.equal(h.state().records.length, 1);
  }
  {
    const h = harness(); await h.settle();
    h.backend.create = async () => { throw { response: { status: 409 } }; };
    h.backend.list = async () => [serverRecord];
    await assert.rejects(h.state().save(input), /already exists/); await h.settle();
    assert.equal(h.state().records.length, 1);
  }
  {
    const h = harness(); await h.settle(); const pending = deferred();
    h.backend.create = () => pending.promise;
    const saving = h.state().save(input);
    await h.switchAccount({ id: 'farmer-two', role: 'farmer' });
    pending.resolve(serverRecord);
    await assert.rejects(saving, /Account changed/); await h.settle();
    assert.equal(h.state().records.length, 0, 'Old save cannot populate another account');
    await assert.rejects(h.state().save(input), /Only Booth/);
  }
  {
    const h = harness(); await h.settle(); const pending = deferred();
    h.backend.list = () => pending.promise;
    const refreshing = h.state().refresh();
    h.backend.list = async () => [];
    await h.switchAccount({ id: 'farmer-two', role: 'farmer' });
    pending.resolve([serverRecord]); await refreshing; await h.settle();
    assert.equal(h.state().records.length, 0, 'Old refresh cannot populate another account');
    assert.equal(h.bridge.at(-1).records.length, 0);
  }
  {
    const h = harness(); h.setNotifs([{ id: 'n1', recipientId: 'farmer-one', isRead: false }, { id: 'n2', recipientId: 'farmer-two', isRead: false }]);
    await h.switchAccount({ id: 'farmer-one', role: 'farmer' });
    assert.equal(h.state().notifications.length, 1); assert.equal(h.state().notifications[0].id, 'n1');
    h.backend.read = async () => { throw Error('offline'); };
    await assert.rejects(h.state().markRead('n1'), /offline/); h.render();
    assert.equal(h.state().notifications[0].isRead, false);
    h.backend.read = async () => { h.setNotifs([{ id: 'n1', recipientId: 'farmer-one', isRead: true }]); };
    await h.state().markRead('n1'); await h.settle();
    assert.equal(h.state().notifications[0].isRead, true);
    await h.switchAccount(null); assert.equal(h.state().notifications.length, 0); assert.equal(h.state().records.length, 0);
  }
  {
    const h = harness(); await h.settle(); h.backend.summary = async () => { throw Error('offline'); };
    await h.state().refresh(); await h.settle(); assert.equal(h.state().error, 'offline');
    assert.equal(h.state().summary.todaySupply, '12.34', 'A failed refresh preserves last confirmed summary');
  }
  {
    const h = harness(); await h.switchAccount({ id: 'farmer-one', role: 'farmer' });
    h.setRows([serverRecord]);
    h.setNotifs([{ id: 'new-collection', recipientId: 'farmer-one', isRead: false }]);
    h.poll(); await h.settle();
    assert.equal(h.state().records.length, 1, 'An open farmer dashboard receives new collections during polling');
    assert.equal(h.state().notifications.length, 1, 'The same poll refreshes private notifications');
  }
  console.log('Milk collection checks passed: confirmed saves, duplicate taps, timeout recovery, blocked unresolved retries, conflicts, account isolation, private notifications, persisted reads, and India dates.');
})().catch(error => { console.error(error); process.exitCode = 1; });
