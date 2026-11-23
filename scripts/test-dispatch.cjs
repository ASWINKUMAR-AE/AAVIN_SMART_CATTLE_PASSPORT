// Run real dispatch service/provider logic with isolated API and React hooks.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, mocks, timers = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true,
  } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require: name => {
    if (name in mocks) return mocks[name];
    throw Error('Unexpected dependency: ' + name);
  }, console, Promise, Date, Map, Math, setInterval: timers.setInterval || (() => 1), clearInterval: () => {} });
  return module.exports;
}
const tick = () => new Promise(resolve => setImmediate(resolve));
function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
const record = { id: 'milk-one', boothId: 'society-one', quantityLitres: '20.10', measurementMethod: 'combined', route: 'vendor' };
function harness() {
  let user = { id: 'society-one', role: 'booth' }, slot = 0, value, foreground, poll;
  const hooks = [], effects = [];
  const backend = {
    context: async () => ({ society: { id: user.id }, bmc: { id: 'bmc-one' }, farmers: [] }),
    receipts: async () => [{ id: 'receipt-one', boothId: user.id }],
    deliveries: async () => [{ id: 'delivery-one', bmcId: 'bmc-one' }],
    vendors: async () => [{ id: 'active-vendor', isActive: true }, { id: 'inactive-vendor', isActive: false }],
    collections: async () => [record], attendance: async () => [{ id: 'attendance-one', farmerId: 'farmer-one' }],
  };
  const react = {
    createContext: () => ({ Provider: 'Provider' }), createElement: (_type, props) => ({ props }),
    useState: initial => { const i = slot++; if (!hooks[i]) hooks[i] = { value: typeof initial === 'function' ? initial() : initial };
      return [hooks[i].value, next => { hooks[i].value = typeof next === 'function' ? next(hooks[i].value) : next; }]; },
    useRef: initial => { const i = slot++; if (!hooks[i]) hooks[i] = { current: initial }; return hooks[i]; },
    useCallback: (fn, deps) => { const i = slot++; const old = hooks[i]; if (!old || deps.some((dep, n) => dep !== old.deps[n])) hooks[i] = { fn, deps }; return hooks[i].fn; },
    useEffect: (fn, deps) => { const i = slot++; const old = hooks[i]; if (!old || deps.some((dep, n) => dep !== old.deps[n])) {
      effects.push(() => { old?.cleanup?.(); hooks[i] = { deps, cleanup: fn() }; });
    } },
  };
  const context = load('context/DispatchContext.tsx', {
    react, 'react-native': { AppState: { currentState: 'active', addEventListener: (_event, callback) => { foreground = callback; return { remove: () => {} }; } } },
    'expo-router': { useFocusEffect: () => {} }, './AuthContext': { useAuth: () => ({ user }) },
    '../services/dispatchApi': { DispatchApi: backend }, '../services/accountMapping': { apiErrorMessage: error => error.message },
  }, { setInterval: callback => { poll = callback; return 1; } });
  function render() { slot = 0; value = context.DispatchProvider({ children: null }).props.value; return value; }
  function commit() { while (effects.length) effects.shift()(); }
  async function settle() { render(); commit(); await tick(); render(); commit(); await tick(); render(); }
  return { backend, render, settle, state: () => value, foreground: () => foreground('active'), poll: () => poll(),
    setUser: next => { user = next; }, switchUser: async next => { user = next; await settle(); } };
}
(async () => {
  {
    const calls = [];
    const api = {
      get: async (url, { params }) => {
        calls.push([url, params.page]);
        return { data: { data: { results: [params.page === 1 ? record : { ...record, id: 'milk-two', measurementMethod: 'farmer_wise' }], hasNext: params.page === 1 } } };
      },
      post: async (url, input) => {
        calls.push([url, input]);
        if (url.endsWith('/send')) return { data: { data: { receipt: { id: 'receipt-one', dispatchQuantity: '20.10' }, delivery: { declaredDispatchQuantity: '20.10' } } } };
        return { data: { data: { record } } };
      },
    };
    const { DispatchApi, submissionKey } = load('services/dispatchApi.ts', { './api': { api } });
    const rows = await DispatchApi.collections();
    assert.equal(rows.length, 2); assert.equal(rows[0].quantityLitres, 20.1);
    assert.equal(rows[0].individualAllocation, 'not_available'); assert.equal(rows[1].individualAllocation, 'measured');
    assert.equal(rows[0].backendSynced, true);
    const input = { submissionKey: submissionKey(), vendorId: 'vendor-one', quantityLitres: '20.10' };
    assert.match(input.submissionKey, /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
    await DispatchApi.createVendorMilk(input);
    assert.equal(calls.at(-1)[1], input, 'Retry key must reach the server unchanged');
    const sent = await DispatchApi.send('receipt-one');
    assert.equal(sent.receipt.dispatchQuantity, 20.1); assert.equal(sent.delivery.declaredDispatchQuantity, 20.1);
    api.post = async () => { throw Error('offline'); };
    await assert.rejects(DispatchApi.send('receipt-one'), /offline/, 'Sending must never report local success');
  }
  {
    const h = harness(); await h.settle();
    assert.equal(h.state().vendors.length, 1, 'Only active vendors are selectable');
    assert.equal(h.state().milkRecords.length, 1); assert.equal(h.state().attendance.length, 1);
    const stale = deferred(); h.backend.context = () => stale.promise;
    const pending = h.state().refresh();
    h.setUser({ id: 'society-two', role: 'booth' }); h.render();
    assert.equal(h.state().boothReceipts.length, 0, 'Account data disappears before effects run');
    h.backend.context = async () => ({ society: { id: 'society-two' }, bmc: { id: 'bmc-two' }, farmers: [] });
    await h.settle(); stale.resolve({ society: { id: 'society-one' } }); await pending; h.render();
    assert.equal(h.state().context.society.id, 'society-two', 'Old account response cannot overwrite new account');
  }
  {
    const h = harness(); await h.settle();
    const old = deferred(); h.backend.context = () => old.promise;
    const first = h.state().refresh();
    h.backend.context = async () => ({ society: { id: 'latest' }, bmc: {}, farmers: [] });
    await h.state().refresh(); old.resolve({ society: { id: 'stale' } }); await first; h.render();
    assert.equal(h.state().context.society.id, 'latest', 'A stale refresh must not overwrite newer data');
    h.backend.context = async () => { throw Error('Connection unavailable'); };
    await h.state().refresh(); h.render();
    assert.equal(h.state().error, 'Connection unavailable'); assert.equal(h.state().loading, false);
    h.backend.context = async () => ({ society: { id: 'recovered' }, bmc: {}, farmers: [] });
    h.foreground(); await tick(); h.render();
    assert.equal(h.state().context.society.id, 'recovered'); assert.equal(h.state().error, null);
    await h.switchUser(null); assert.equal(h.state().milkRecords.length, 0); assert.equal(h.state().context, null);
  }
  {
    const h = harness(); await h.settle();
    h.backend.collections = async () => { throw Error('BMC must not request society intake'); };
    await h.switchUser({ id: 'bmc-one', role: 'bmc' });
    assert.equal(h.state().error, null); assert.equal(h.state().milkRecords.length, 0); assert.equal(h.state().bmcDeliveries.length, 1);
  }
  {
    const h = harness(); await h.settle();
    const pending = deferred(); h.backend.createReceipt = () => pending.promise;
    const saving = h.state().createReceipt({ includedRecordIds: ['milk-one'] });
    h.render(); assert.equal(h.state().boothReceipts.length, 1, 'No optimistic receipt');
    pending.resolve({ id: 'confirmed-receipt', includedRecordIds: ['milk-one'], dispatchQuantity: 20.1 });
    await saving; h.render();
    assert.equal(h.state().boothReceipts[0].id, 'confirmed-receipt');
    assert.equal(h.state().milkRecords[0].status, 'included_in_receipt');
    h.backend.context = async () => { throw Error('offline after save'); };
    await h.state().refresh(); h.render();
    assert.equal(h.state().boothReceipts[0].id, 'confirmed-receipt', 'Confirmed receipt survives refresh failure');
    h.backend.send = async () => { throw Error('offline'); };
    await assert.rejects(h.state().sendReceipt('confirmed-receipt'), /offline/); h.render();
    assert.equal(h.state().bmcDeliveries.length, 1, 'Failed send creates no delivery');
    h.backend.send = async () => ({ receipt: { id: 'confirmed-receipt', status: 'sent_to_bmc' }, delivery: { id: 'confirmed-delivery' } });
    await h.state().sendReceipt('confirmed-receipt'); h.render();
    assert.equal(h.state().boothReceipts[0].status, 'sent_to_bmc');
    assert.equal(h.state().bmcDeliveries[0].id, 'confirmed-delivery');
  }
  {
    const h = harness(); await h.settle();
    const pending = deferred(); h.backend.createVendorMilk = () => pending.promise;
    const saving = h.state().createVendorMilk({});
    await h.switchUser({ id: 'society-two', role: 'booth' });
    await h.switchUser({ id: 'society-one', role: 'booth' });
    pending.resolve({ ...record, id: 'old-session-result' });
    await assert.rejects(saving, /Account changed/); h.render();
    assert.equal(h.state().milkRecords.some(row => row.id === 'old-session-result'), false, 'Old login mutation cannot publish into a later login');
  }
  console.log('Dispatch checks passed: API pagination and mapping, retry keys, server-only sending, stale response guards, account isolation, refresh recovery, and BMC inbox loading.');
})().catch(error => { console.error(error); process.exitCode = 1; });
