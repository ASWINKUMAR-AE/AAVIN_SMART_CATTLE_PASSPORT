const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const mod = { exports: {} };
const code = ts.transpileModule(fs.readFileSync('services/bmcDashboard.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
vm.runInNewContext(code, { module: mod, exports: mod.exports });
const { buildBmcDashboard, bmcDeliveryStatus, bmcPeriodRange, buildBmcAnalysis, validCollectionDate } = mod.exports;
const today = '2026-10-16';
const delivery = (id, fields = {}) => ({
  id, bmcId: 'bmc-one', boothId: 'society-one', boothName: 'Melur Society',
  boothReceiptId: id, collectionDate: today, dispatchTime: today + 'T07:00:00+05:30',
  declaredDispatchQuantity: 20, status: 'pending_arrival', ...fields,
});

// Multiple receipts from one society must all contribute, with no cross-account data.
const summary = buildBmcDashboard([
  delivery('morning', { status: 'matched', measuredReceivedQuantity: 19 }),
  delivery('evening', { declaredDispatchQuantity: 30 }),
  delivery('zero', { boothId: 'society-two', boothName: 'Second Society', status: 'matched', measuredReceivedQuantity: 0 }),
  delivery('old', { collectionDate: '2026-10-15' }),
  delivery('mismatch', { collectionDate: '2026-10-14', status: 'mismatch_investigation', measuredReceivedQuantity: 10 }),
  delivery('escalated', { collectionDate: '2026-10-14', status: 'escalated_to_union' }),
  delivery('resolved', { collectionDate: '2026-10-14', status: 'resolved', measuredReceivedQuantity: 10 }),
  delivery('other-account', { bmcId: 'bmc-two', declaredDispatchQuantity: 999 }),
], 'bmc-one', today, 5);
assert.equal(summary.sentLitres, 70);
assert.equal(summary.receivedLitres, 19);
assert.equal(summary.todayDeliveries.length, 3);
assert.equal(summary.measuredCount, 2);
assert.equal(summary.societies.length, 2);
assert.equal(summary.societies[0].sent, 50);
assert.equal(summary.societies[0].received, 19);
assert.equal(summary.societies[0].deliveryCount, 2);
assert.equal(summary.societies[0].measuredCount, 1);
assert.equal(summary.pending.length, 2); // Includes yesterday's pending delivery.
assert.equal(summary.review.length, 2); // Resolved cases stay out of the review queue.

// Missing measurements are unknown; explicitly measured zero remains zero.
assert.equal(buildBmcDashboard([delivery('pending')], 'bmc-one', today, 5).receivedLitres, null);
assert.equal(buildBmcDashboard([delivery('zero', { status: 'matched', measuredReceivedQuantity: 0 })], 'bmc-one', today, 5).receivedLitres, 0);
const empty = buildBmcDashboard([], 'bmc-one', today, 5);
assert.equal(empty.sentLitres, 0);
assert.equal(empty.receivedLitres, null);
assert.equal(empty.pending.length, 0);
assert.equal(empty.societies.length, 0);

assert.equal(bmcDeliveryStatus(delivery('resolved', { status: 'resolved' }), 5), 'matched');
assert.equal(bmcDeliveryStatus(delivery('escalated', { status: 'escalated_to_union' }), 5), 'pending_reconciliation');
assert.equal(bmcDeliveryStatus(delivery('matched', { status: 'matched', measuredReceivedQuantity: 19 }), 5), 'matched');
assert.equal(bmcDeliveryStatus(delivery('pending'), 5), 'pending');

// Collection-date ranges cross month/year boundaries without local timezone drift.
assert.equal(bmcPeriodRange('yesterday', '2026-01-01').start, '2025-12-31');
assert.equal(bmcPeriodRange('last7', '2026-01-03').start, '2025-12-28');
assert.equal(bmcPeriodRange('month', '2026-03-01').previousStart, '2026-02-28');
assert.equal(bmcPeriodRange('month', '2024-03-01').previousStart, '2024-02-29');
assert.equal(bmcPeriodRange('month', today).dayCount, 16);
const analysisRows = [
  delivery('today-measured', { status: 'matched', measuredReceivedQuantity: 18 }),
  delivery('today-pending', { declaredDispatchQuantity: 100 }),
  delivery('yesterday-zero', { collectionDate: '2026-10-15', status: 'mismatch_investigation', measuredReceivedQuantity: 0 }),
  delivery('seven-day-boundary', { collectionDate: '2026-10-10' }),
  delivery('before-seven', { collectionDate: '2026-10-09' }),
  delivery('month-boundary', { collectionDate: '2026-10-01', boothId: 'second' }),
  delivery('previous-month', { collectionDate: '2026-09-30' }),
  delivery('future', { collectionDate: '2026-10-17', declaredDispatchQuantity: 9999 }),
  delivery('other-bmc', { bmcId: 'other', declaredDispatchQuantity: 9999 }),
];
const analysis = buildBmcAnalysis(analysisRows, 'bmc-one', today, 'today', 5);
assert.equal(analysis.sentLitres, 120);
assert.equal(analysis.receivedLitres, 18);
assert.equal(analysis.differenceLitres, 2); // Pending 100 litres is NOT a shortfall.
assert.equal(analysis.measuredCount, 1);
assert.equal(analysis.pendingCount, 1);
assert.equal(analysis.reviewCount, 0);
assert.equal(analysis.previousSentLitres, 20);
const yesterdayAnalysis = buildBmcAnalysis(analysisRows, 'bmc-one', today, 'yesterday', 5);
assert.equal(yesterdayAnalysis.receivedLitres, 0);
assert.equal(yesterdayAnalysis.reviewCount, 1);
const weekAnalysis = buildBmcAnalysis(analysisRows, 'bmc-one', today, 'last7', 5);
assert.equal(weekAnalysis.deliveries.length, 4);
assert.equal(weekAnalysis.daily.length, 7);
assert.equal(weekAnalysis.daily[0].date, '2026-10-10');
assert.equal(weekAnalysis.daily[1].count, 0);
assert.equal(weekAnalysis.daily[1].received, null);
assert.equal(weekAnalysis.daily.reduce((sum, day) => sum + day.sent, 0), weekAnalysis.sentLitres);
assert.equal(weekAnalysis.previousSentLitres, 20);
const monthAnalysis = buildBmcAnalysis(analysisRows, 'bmc-one', today, 'month', 5);
assert.equal(monthAnalysis.deliveries.length, 6);
assert.equal(monthAnalysis.societyCount, 2);
assert.equal(monthAnalysis.previousSentLitres, 20);
const noMeasurements = buildBmcAnalysis([delivery('pending')], 'bmc-one', today, 'today', 5);
assert.equal(noMeasurements.receivedLitres, null);
assert.equal(noMeasurements.differenceLitres, null);

const linked = [
  { id: 'society-one', name: 'Melur Society', phone: '', isActive: true },
  { id: 'no-receipts', name: 'No Receipts Yet', phone: '', isActive: false },
];
for (const period of ['today', 'yesterday', 'last7', 'month']) {
  const result = buildBmcAnalysis(analysisRows, 'bmc-one', today, period, 5, linked);
  for (const rows of [result.societies, result.daily]) {
    for (const field of ['sentLitres', 'receivedLitres', 'differenceLitres', 'deliveryCount', 'measuredCount', 'pendingCount', 'matchedCount', 'reviewCount']) {
      assert.equal(rows.reduce((sum, row) => sum + (row[field] ?? 0), 0), result[field] ?? 0, `Unbalanced ${field} for ${period}`);
    }
  }
  assert.equal(result.pendingCount + result.matchedCount + result.reviewCount, result.deliveryCount);
  assert.equal(result.societies.find(row => row.id === 'no-receipts').deliveryCount, 0);
  assert.equal(result.societies.find(row => row.id === 'no-receipts').receivedLitres, null);
  assert.equal(result.societies.find(row => row.id === 'no-receipts').linkStatus, 'linked');
}
const historical = buildBmcAnalysis(analysisRows, 'bmc-one', today, 'month', 5, linked);
assert.equal(historical.societies.find(row => row.id === 'second').linkStatus, 'historical');
assert.equal(historical.societies[0].id, 'society-one');
assert.equal(historical.societies.find(row => row.id === 'society-one').measuredCount, 2);
assert.equal(buildBmcAnalysis(analysisRows, 'bmc-one', today, 'month', 5).societies[0].linkStatus, 'unknown');
assert.equal(buildBmcAnalysis([], 'bmc-one', today, 'last7', 5, linked).daily.length, 7);
const tied = buildBmcAnalysis([delivery('b', { boothId: 'b', boothName: 'Beta' }), delivery('a', { boothId: 'a', boothName: 'Alpha' })], 'bmc-one', today, 'today', 5, []);
assert.equal(tied.societies.map(row => row.name).join(','), 'Alpha,Beta');
assert.equal(validCollectionDate('2024-02-29'), '2024-02-29');
for (const invalid of ['2026-02-29', '2026-02-31', '2026-13-01', '16-10-2026', '2026-1-1', '', undefined, ['2026-10-16']]) assert.equal(validCollectionDate(invalid), null);

// Exercise the actual delivery screen with dashboard route parameters.
function deliveryScreen(params, interact) {
  let slot = 0;
  const state = [], effects = [];
  const react = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useState: initial => {
      const index = slot++;
      if (!(index in state)) state[index] = initial;
      return [state[index], next => { state[index] = next; }];
    },
    useMemo: callback => callback(), useCallback: callback => callback,
  };
  const rows = [
    delivery('today'), delivery('yesterday', { collectionDate: '2026-10-15' }),
    delivery('mismatch', { status: 'mismatch_investigation', boothId: 'society-two' }),
    delivery('escalation', { status: 'escalated_to_union', boothId: 'society-three' }),
    delivery('matched', { status: 'matched', measuredReceivedQuantity: 20 }),
  ];
  const mocks = {
    react,
    'react-native': Object.fromEntries(['ActivityIndicator', 'ScrollView', 'KeyboardAvoidingView', 'View', 'Text', 'FlatList', 'Modal', 'TextInput', 'Pressable'].map(name => [name, name])),
    'expo-router': { useRouter: () => ({ setParams: next => Object.assign(params, next) }), useLocalSearchParams: () => params, useFocusEffect: callback => effects.push(callback) },
    '../../store/AavinStoreContext': { useAavinStore: () => ({ union: { mismatchThresholdLitres: 5 } }) },
    '../../context/DispatchContext': { useDispatchRefresh: () => {}, useDispatchWorkflow: () => ({ bmcDeliveries: rows, context: { bmc: { id: 'bmc-one' } }, refresh: () => {} }) },
    '../../services/milkCollectionsApi': { indiaDate: () => today, daysBefore: () => '2026-10-15' },
    '../../context/AuthContext': { useAuth: () => ({ user: { id: 'bmc-one' } }) },
    '../../context/ThemeContext': { useTheme: () => ({ colors: {} }) },
    '../../constants/Typography': { Typography: {} },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) },
    '../../services/navigation': {},
    '../../components/ui/Card': { Card: 'Card' },
    '../../components/ui/Button': { Button: 'Button' },
    '@expo/vector-icons': { Ionicons: 'Ionicons' },
    '../../components/ui/EmptyState': { EmptyState: 'EmptyState' },
    '../../services/bmcDashboard': { bmcDeliveryStatus, bmcPeriodRange, validCollectionDate },
  };
  Object.assign(mocks['react-native'], { StyleSheet: { create: value => value }, Platform: { OS: 'web' }, useWindowDimensions: () => ({ width: 390, fontScale: 1 }) });
  const screenModule = { exports: {} };
  const screenCode = ts.transpileModule(fs.readFileSync('app/(bmc)/receive-milk.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(screenCode, { module: screenModule, exports: screenModule.exports, require: name => {
    assert.ok(name in mocks, 'Unexpected dependency: ' + name);
    return mocks[name];
  } });
  screenModule.exports.default();
  effects.splice(0).forEach(callback => callback());
  const render = () => { slot = 0; return screenModule.exports.default(); };
  if (interact) interact(render);
  const tree = render();
  return tree.props.children.find(child => child?.type === 'FlatList').props.data.map(row => row.id).join(',');
}
assert.equal(deliveryScreen({ dateFilter: 'today', statusFilter: 'all' }), 'today,mismatch,escalation,matched');
assert.equal(deliveryScreen({ dateFilter: 'yesterday', statusFilter: 'all' }), 'yesterday');
assert.equal(deliveryScreen({ dateFilter: 'today', collectionDate: '2026-10-15' }), 'yesterday');
assert.equal(deliveryScreen({ dateFilter: 'month', collectionDate: '2026-02-31' }), 'today,yesterday,mismatch,escalation,matched');
assert.equal(deliveryScreen({ collectionDate: '2026-10-16', statusFilter: 'matched' }), 'matched');
const exactDateParams = { collectionDate: '2026-10-15', dateFilter: 'month', statusFilter: 'pending' };
assert.equal(deliveryScreen(exactDateParams, render => {
  nodes(render()).find(node => node.props?.accessibilityLabel?.startsWith('Collection date:')).props.onPress();
  const choices = nodes(render());
  const todayOption = choices.find(node => node.type === 'Pressable' && node.props.accessibilityRole === 'radio' && nodes(node).some(child => child.type === 'Text' && child.props.children.includes('Today')));
  todayOption.props.onPress();
}), 'today');
assert.equal(exactDateParams.collectionDate, '');
assert.equal(exactDateParams.statusFilter, 'pending');
assert.equal(deliveryScreen({ collectionDate: '2026-10-15', dateFilter: 'month' }, render => {
  nodes(render()).find(node => node.props?.accessibilityLabel === 'Reset delivery filters').props.onPress();
}), 'today,yesterday,mismatch,escalation,matched');
assert.equal(deliveryScreen({ dateFilter: 'last7', statusFilter: 'all' }), 'today,yesterday,mismatch,escalation,matched');
assert.equal(deliveryScreen({ dateFilter: 'month', statusFilter: 'all' }), 'today,yesterday,mismatch,escalation,matched');
assert.equal(deliveryScreen({ statusFilter: 'pending', dateFilter: 'all' }), 'today,yesterday');
assert.equal(deliveryScreen({ statusFilter: 'needs_review', dateFilter: 'all' }), 'mismatch,escalation');
assert.equal(deliveryScreen({ dateFilter: 'today', societyId: 'society-one' }), 'today,matched');
assert.equal(deliveryScreen({ statusFilter: 'pending', societyId: 'society-one' }), 'today,yesterday');
assert.equal(deliveryScreen({ statusFilter: 'all', dateFilter: 'all', societyId: '' }), 'today,yesterday,mismatch,escalation,matched');

function loadScreen(file, mocks, exportName = 'default') {
  const result = { exports: {} };
  const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(output, { module: result, exports: result.exports, require: name => {
    assert.ok(name in mocks, 'Unexpected dependency: ' + name);
    return mocks[name];
  } });
  return result.exports[exportName];
}
const createElement = (type, props, ...children) => ({ type, props: { ...props, children: children.flat(Infinity) } });
const translate = { useTranslation: () => ({ t: (_key, fallback) => fallback }) };
const theme = { useTheme: () => ({ colors: {} }) };
const safeArea = { useSafeAreaInsets: () => ({ top: 0, bottom: 30 }) };
const native = { StyleSheet: { create: value => value, hairlineWidth: 1 } };
for (const type of ['View', 'Text', 'FlatList', 'Pressable', 'TextInput', 'ActivityIndicator']) native[type] = type;

// Replacing Alerts must keep exactly five tabs and permanent navigation.
const Layout = loadScreen('app/(bmc)/_layout.tsx', {
  react: { createElement }, 'expo-router': { Tabs: { Screen: 'Screen' } },
  '../../context/ThemeContext': theme, 'react-native-safe-area-context': safeArea,
  '../../components/navigation/FloatingAavinTabBar': { FloatingAavinTabBar: 'TabBar' },
  '../../components/navigation/curvedNavPath': { TAB_BAR_HEIGHT: 68 },
});
const layout = Layout();
assert.equal(layout.props.children.filter(child => child?.props?.options?.href !== null).map(child => child.props.name).join(','),
  'index,receive-milk,daily-summary,dashboard,profile');
assert.equal(layout.props.tabBar({}).props.hideOnScroll, false);
assert.equal(layout.props.tabBar({}).props.hideOnKeyboard, false);

// Linked societies without any receipt remain in the directory. Phone search
// and the delivery action must use server identities, never demo society IDs.
let searchValue = '';
const destinations = [];
const Directory = loadScreen('app/(bmc)/my-societies.tsx', {
  react: { createElement, useMemo: callback => callback(), useState: () => [searchValue, next => { searchValue = next; }] },
  'react-native': native,
  'expo-router': { useRouter: () => ({ push: route => destinations.push(route) }) },
  '@expo/vector-icons': { Ionicons: 'Ionicons' },
  'react-native-safe-area-context': safeArea,
  '../../context/ThemeContext': theme, '../../context/LanguageContext': translate,
  '../../context/DispatchContext': { useDispatchRefresh: () => {}, useDispatchWorkflow: () => ({
    context: { bmc: { id: 'bmc-one', name: 'Centre' }, societies: [
      { id: 'new-linked-society', name: 'No Receipts Yet', phone: '9800000190', isActive: true },
      { id: 'second-society', name: 'Second Society', phone: '9800000191', isActive: false },
    ] },
    bmcDeliveries: [delivery('wrong-bmc', { bmcId: 'bmc-two', boothId: 'new-linked-society' })],
    loading: false, error: null, refresh: () => {},
  }) },
  '../../components/ui/Card': { Card: 'Card' }, '../../components/ui/Button': { Button: 'Button' },
  '../../components/ui/EmptyState': { EmptyState: 'EmptyState' }, '../../services/navigation': {},
});
function findNode(node, type) {
  if (node?.type === type) return node;
  for (const child of node?.props?.children || []) { const result = findNode(child, type); if (result) return result; }
}
const directory = findNode(Directory(), 'FlatList');
assert.equal(directory.props.data.length, 2);
const row = directory.props.renderItem({ item: directory.props.data[0] });
findNode(row, 'Button').props.onPress();
assert.equal(destinations[0].pathname, '/(bmc)/receive-milk');
assert.equal(destinations[0].params.societyId, 'new-linked-society');
assert.equal(destinations[0].params.dateFilter, 'all');
findNode(directory.props.ListHeaderComponent, 'TextInput').props.onChangeText('0191');
const searched = findNode(Directory(), 'FlatList');
assert.equal(searched.props.data.length, 1);
assert.equal(searched.props.data[0].id, 'second-society');
// Exercise the dashboard's real period controls and drill-down, not just the helper.
const dashboardState = [];
let dashboardSlot = 0;
const dashboardRoutes = [];
const english = JSON.parse(fs.readFileSync('locales/en.json', 'utf8'));
const tamil = JSON.parse(fs.readFileSync('locales/ta.json', 'utf8'));
for (const key of Object.keys(english.bmcAnalysis)) assert.ok(tamil.bmcAnalysis[key], `Missing Tamil analysis label: ${key}`);
const DashboardScreen = loadScreen('app/(bmc)/dashboard.tsx', {
  react: { createElement, Fragment: 'Fragment', useMemo: callback => callback(), useState: initial => {
    const slot = dashboardSlot++;
    if (!(slot in dashboardState)) dashboardState[slot] = initial;
    return [dashboardState[slot], next => { dashboardState[slot] = next; }];
  } },
  'react-native': { ...native, SectionList: 'SectionList', useWindowDimensions: () => ({ width: 390, fontScale: 1 }) },
  'expo-router': { useRouter: () => ({ push: route => dashboardRoutes.push(route) }) },
  '@expo/vector-icons': { Ionicons: 'Ionicons' },
  '../../context/ThemeContext': theme,
  '../../context/LanguageContext': { useTranslation: () => ({ language: 'en', t: (key, fallback) => key.split('.').reduce((value, part) => value?.[part], english) || fallback || key }) },
  '../../context/DispatchContext': { useDispatchRefresh: () => {}, useDispatchWorkflow: () => ({ context: { bmc: { id: 'bmc-one', name: 'Centre' }, societies: linked }, bmcDeliveries: analysisRows, refresh: () => {} }) },
  '../../store/AavinStoreContext': { useAavinStore: () => ({ union: { mismatchThresholdLitres: 5 } }) },
  '../../components/DemoHeader': { DemoHeader: 'DemoHeader' },
  '../../components/ui/Card': { Card: 'Card' }, '../../components/ui/Button': { Button: 'Button' },
  '../../components/ui/EmptyState': { EmptyState: 'EmptyState' },
  '../../components/bmc/CollectionBarChart': { CollectionBarChart: 'CollectionBarChart' },
  '../../services/bmcDashboard': { buildBmcAnalysis },
  '../../services/milkCollectionsApi': { indiaDate: () => today },
});
function Dashboard() { dashboardSlot = 0; return DashboardScreen(); }
function nodes(node) {
  if (Array.isArray(node)) return node.flatMap(nodes);
  if (!node || typeof node !== 'object') return [];
  return [node, ...(node.props?.children || []).flatMap(nodes), ...nodes(node.props?.ListHeaderComponent)];
}
for (const period of ['today', 'yesterday', 'last7', 'month']) {
  const control = nodes(Dashboard()).find(node => node.type === 'Pressable' && node.props.children.some(child => child?.props?.children?.includes(english.bmcAnalysis[period])));
  assert.ok(control, `Missing period control: ${period}`);
  control.props.onPress();
  const rendered = Dashboard();
  const graph = nodes(rendered).find(node => node.type === 'CollectionBarChart');
  assert.ok(graph, 'Dashboard must show its bar graph');
  assert.equal(graph.props.days.length, period === 'last7' ? 7 : period === 'month' ? 16 : 2);
  assert.equal(graph.props.days.at(-1).date, period === 'yesterday' ? '2026-10-15' : today);
  const selected = nodes(rendered).filter(node => node.props?.accessibilityState?.selected);
  assert.equal(selected.length, 1);
  assert.ok(selected[0].props.children.some(child => child?.props?.children?.includes(english.bmcAnalysis[period])));
  const detailButton = nodes(rendered).find(node => node.type === 'Button' && node.props.title === english.bmcAnalysis.viewDeliveries);
  detailButton.props.onPress();
  assert.equal(dashboardRoutes.at(-1).params.dateFilter, period);
  assert.equal(dashboardRoutes.at(-1).pathname, '/(bmc)/receive-milk');
  const expected = buildBmcAnalysis(analysisRows, 'bmc-one', today, period, 5).sentLitres.toLocaleString('en-IN', { maximumFractionDigits: 1 }) + ' L';
  assert.ok(nodes(rendered).some(node => node.type === 'Text' && node.props.children.includes(expected)));
  const list = findNode(rendered, 'SectionList');
  const [societies, daily] = list.props.sections;
  assert.equal(daily.data[0].value.date, period === 'yesterday' ? '2026-10-15' : today);
  list.props.renderItem({ item: societies.data[0] }).props.onPress();
  assert.equal(dashboardRoutes.at(-1).params.societyId, societies.data[0].value.id);
  assert.equal(dashboardRoutes.at(-1).params.collectionDate, '');
  list.props.renderItem({ item: daily.data[0] }).props.onPress();
  assert.equal(dashboardRoutes.at(-1).params.collectionDate, daily.data[0].value.date);
  assert.equal(dashboardRoutes.at(-1).params.societyId, '');
  for (const status of ['pending', 'matched', 'needs_review']) {
    const countKey = status === 'needs_review' ? 'reviewCount' : status + 'Count';
    const label = status === 'matched' ? english.bmcAnalysis.matched : english.bmcCentre[status === 'pending' ? 'pending' : 'reviews'];
    const result = buildBmcAnalysis(analysisRows, 'bmc-one', today, period, 5);
    const statusButton = nodes(rendered).find(node => node.props?.accessibilityLabel === `${label}: ${result[countKey]}`);
    statusButton.props.onPress();
    assert.equal(dashboardRoutes.at(-1).params.statusFilter, status);
    assert.equal(dashboardRoutes.at(-1).params.collectionDate, '');
  }
}
const beforeSearch = findNode(Dashboard(), 'SectionList');
const societyHeader = beforeSearch.props.renderSectionHeader({ section: beforeSearch.props.sections[0] });
findNode(societyHeader, 'TextInput').props.onChangeText('no receipts');
const afterSearch = findNode(Dashboard(), 'SectionList');
assert.equal(afterSearch.props.sections[0].data.length, 1);
assert.equal(afterSearch.props.sections[0].data[0].value.id, 'no-receipts');
assert.equal(afterSearch.props.sections[1].data.length, 16);
assert.equal(nodes(afterSearch).find(node => node.type === 'CollectionBarChart').props.days.reduce((sum, day) => sum + day.sent, 0), monthAnalysis.sentLitres);
assert.ok(nodes(afterSearch).some(node => node.type === 'Text' && node.props.children.includes(english.bmcAnalysis.receivedPartial)));

// The actual graph keeps zero and missing values distinct and supports selecting dates.
let chartSlot = 0;
const chartState = [];
const chartColours = { primary: '#38BAF8', clear: '#22C55E', text: '#F0F6FC', textSecondary: '#94A7BE', border: '#1A304C', background: '#09121E', primaryLight: '#132840' };
const Chart = loadScreen('components/bmc/CollectionBarChart.tsx', {
  react: { createElement, useRef: () => ({ current: null }), useState: initial => {
    const slot = chartSlot++;
    if (!(slot in chartState)) chartState[slot] = initial;
    return [chartState[slot], next => { chartState[slot] = next; }];
  } },
  'react-native': { ...native, ScrollView: 'ScrollView', useWindowDimensions: () => ({ width: 320, fontScale: 1.6 }) },
  '../../context/ThemeContext': { useTheme: () => ({ colors: chartColours }) },
  '../../context/LanguageContext': { useTranslation: () => ({ language: 'ta', t: key => key.split('.').reduce((value, part) => value?.[part], tamil) }) },
}, 'CollectionBarChart');
const chartDays = [
  { date: '2026-10-14', sent: 10, received: null, measuredCount: 0, count: 1 },
  { date: '2026-10-15', sent: 20, received: 0, measuredCount: 1, count: 1 },
  { date: today, sent: 120, received: 18, measuredCount: 1, count: 2 },
];
const renderChart = () => { chartSlot = 0; return Chart({ days: chartDays, dateLabel: value => value, litres: value => value === null ? 'Not measured' : `${value} L` }); };
const partialChart = renderChart();
assert.ok(nodes(partialChart).some(node => node.type === 'Text' && node.props.children.includes(tamil.bmcAnalysis.receivedPartial)));
nodes(partialChart).find(node => node.type === 'Pressable' && node.props.accessibilityLabel.startsWith('2026-10-15')).props.onPress();
assert.ok(nodes(renderChart()).some(node => node.type === 'Text' && node.props.children.includes('0 L')));
nodes(renderChart()).find(node => node.type === 'Pressable' && node.props.accessibilityLabel.startsWith('2026-10-14')).props.onPress();
assert.ok(nodes(renderChart()).some(node => node.type === 'Text' && node.props.children.includes('Not measured')));
const barStyles = nodes(renderChart()).filter(node => node.type === 'View' && Array.isArray(node.props.style)).map(node => Object.assign({}, ...node.props.style)).filter(style => [chartColours.primary, chartColours.clear].includes(style.backgroundColor) && style.height !== undefined);
assert.ok(barStyles.length > 0);
assert.ok(barStyles.every(style => Number.isFinite(style.height) && style.height >= 0 && style.height <= 200));
console.log('BMC checks passed: date-range analytics, period controls and drill-down, account scope, delivery filters, five permanent tabs, and linked society navigation.');
