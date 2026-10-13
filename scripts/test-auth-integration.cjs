// Isolated frontend integration checks: no network or production account writes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
function load(relative, mocks = {}) {
  const filename = path.join(root, relative);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, require: name => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    throw new Error('Unexpected dependency '+name);
  }, console, Promise }, { filename });
  return module.exports;
}
const mapping = load('services/accountMapping.ts');
function account(role) {
  return { id: role+'-uuid', fullName: 'Account '+role, phone: '9842000001', role,
    parentId: role==='union' ? null : 'parent-uuid',
    parent: role==='farmer' ? {id:'parent-uuid',fullName:'Society',phone:'9842000002',role:'society',parentId:'bmc-uuid'} : null,
    personalDetails: role==='farmer' ? {farmerIdCode:'FARM-1',address:'Street',village:'Melur',numberOfCows:0,verificationStatus:'pending'} : null,
    createdAt:'2026-10-13T00:00:00Z' };
}
const keys={AUTH_TOKEN:'access',REFRESH_TOKEN:'refresh'};
function authHarness() {
  const saved = new Map();
  const effects = [];
  const states = [];
  const cache = { farmers: [], societies: [] };
  const calls=[];
  let post = async () => { throw new Error('No mock response'); };
  let get = async () => { throw new Error('No mock response'); };
  const react = {
    createContext: () => ({ Provider: 'Provider' }),
    createElement: (type, props) => ({ type, props }),
    useState: initial => { const i=states.length;states.push(initial);return [initial,v=>{states[i]=v;}]; },
    useCallback: callback => callback,
    useEffect: effect => { effects.push(effect); },
    useContext: () => {},
  };
  const api = {post: async (...args) => {calls.push(['POST',...args]);return post(...args);},get: async (...args)=>{calls.push(['GET',...args]);return get(...args);}};
  const secure = {
    api, initializeApiClient: async () => {},
    getSecureItem: async key => saved.get(key) ?? null,
    setSecureItem: async (key,value) => {saved.set(key,value);},
    deleteSecureItem: async key => {saved.delete(key);},
  };
  const {AuthProvider}=load('context/AuthContext.tsx', {
    react,
    '@react-native-async-storage/async-storage': {setItem: async (k,v)=>saved.set(k,v),removeItem:async k=>saved.delete(k)},
    '../data/seedData': {SEED_DEMO_USERS:[{id:'demo',username:'demo',phone:'9842000001'}]},
    '../services/api':secure,
    '../constants/Config':{Config:{STORAGE_KEYS:keys}},
    '../services/accountMapping':mapping,
    '../store/AavinStoreContext':{useAavinStore:()=>({isLoading:false,cacheFarmer:f=>cache.farmers.push(f),cacheSociety:s=>cache.societies.push(s)})},
  });
  const value=AuthProvider({children:null}).props.value;
  return {value,saved,effects,states,cache,calls,setPost:f=>{post=f;},setGet:f=>{get=f;}};
}
(async () => {
  for (const [role,expected] of [['farmer','farmer'],['society','booth'],['bmc','bmc'],['union','union']]) {
    const h=authHarness();
    h.setPost(async()=>({data:{data:{accessToken:'access-value',refreshToken:'refresh-value',user:account(role)}}}));
    const result=await h.value.login(' 9842000001 ', '  Exact password  ');
    assert.equal(result.success,true);
    assert.equal(result.role,expected);
    assert.equal(result.user.associatedId,role+'-uuid');
    assert.equal(h.calls[0][2].phone,'9842000001');
    assert.equal(h.calls[0][2].password,'  Exact password  ');
    assert.equal(h.saved.get('access'),'access-value');
    if(role==='farmer')assert.equal(h.cache.farmers[0].numberOfCows,0);
  }
  for(const error of [new Error('Network unavailable'),{response:{status:401,data:{message:'Invalid credentials'}}}]) {
    const h=authHarness();h.setPost(async()=>{throw error;});
    assert.equal((await h.value.login('9842000001','wrong')).success,false);
    assert.equal(h.states[0],null);
    assert.equal(h.saved.has('access'),false);
    await assert.rejects(h.value.loginAsDemoUser('demo'));
  }
  const empty=authHarness();
  assert.equal((await empty.value.login('9842000001','')).success,false);
  assert.equal(empty.calls.length,0);
  const restored=authHarness();restored.saved.set('access','saved-token');
  restored.saved.set('@aavin_auth_user_v2',JSON.stringify({id:'demo',role:'farmer'}));
  restored.setGet(async()=>({data:{data:{user:account('society')}}}));
  restored.effects[0]();
  for(let i=0;i<20;i++)await Promise.resolve();
  assert.equal(restored.states[0].id,'society-uuid');
  assert.equal(restored.states[1],'booth');
  const invalid=authHarness();invalid.saved.set('access','expired');invalid.saved.set('refresh','bad');
  invalid.setGet(async()=>{throw {response:{status:401}};});invalid.effects[0]();
  for(let i=0;i<20;i++)await Promise.resolve();
  assert.equal(invalid.saved.has('access'),false);
  const loggedOut=authHarness();loggedOut.saved.set('refresh','to-revoke');loggedOut.setPost(async()=>({}));
  await loggedOut.value.logout();assert.equal(loggedOut.calls[0][2].refreshToken,'to-revoke');assert.equal(loggedOut.saved.size,0);

  let sent;
  const {AccountsApi}=load('services/accountsApi.ts',{'./api':{api:{post:async(url,data)=>{sent={url,data};return {data:{data:{user:account('farmer')}}};},get:async()=>({data:{data:{farmers:[account('farmer')]}}})}}});
  await AccountsApi.registerFarmer({phone:'9842000001',fullName:'Farmer',parentId:'society-uuid',personalDetails:account('farmer').personalDetails});
  assert.equal(sent.url,'/auth/register');assert.equal(sent.data.role,'farmer');assert.equal('password' in sent.data,false);assert.equal(sent.data.personalDetails.numberOfCows,0);
  assert.equal((await AccountsApi.listFarmers())[0].id,'farmer-uuid');

  // Exercise the actual Axios refresh interceptor with isolated transport/storage.
  let interceptor, refreshCalls = 0, refreshedRequests = [];
  const secureItems = new Map([['refresh', 'refresh-value'], ['access', 'expired']]);
  const transport = async config => { refreshedRequests.push(config); return {data: {success: true}}; };
  transport.defaults = {};
  transport.interceptors = { request: {use: () => {}}, response: {use: (_ok, error) => {interceptor = error;} } };
  let refreshResponse = async () => ({data: {data: {accessToken: 'new-access'}}});
  load('services/api.ts', {
    axios: {create:()=>transport, post:async()=>{refreshCalls++;return refreshResponse();}},
    '@react-native-async-storage/async-storage': {getItem:async key=>secureItems.get(key)??null,setItem:async(k,v)=>secureItems.set(k,v),removeItem:async k=>secureItems.delete(k)},
    'expo-secure-store': {}, 'react-native': {Platform:{OS:'web'}},
    '../constants/Config': {Config:{DEFAULT_API_URL:'http://test/api/v1',STORAGE_KEYS:keys}},
  });
  const expired = url => ({response:{status:401},config:{url,headers:{}}});
  await Promise.all([interceptor(expired('/farmers')),interceptor(expired('/auth/me'))]);
  assert.equal(refreshCalls,1);
  assert.equal(refreshedRequests.length,2);
  assert.equal(refreshedRequests[0].headers.Authorization,'Bearer new-access');
  assert.equal(secureItems.get('access'),'new-access');
  await assert.rejects(interceptor(expired('/auth/login')));
  assert.equal(refreshCalls,1);
  refreshResponse=async()=>{throw new Error('network down');};
  await assert.rejects(interceptor(expired('/farmers')));
  assert.equal(secureItems.get('refresh'),'refresh-value');
  refreshResponse=async()=>{throw {response:{status:401}};};
  await assert.rejects(interceptor(expired('/farmers')));
  assert.equal(secureItems.has('refresh'),false);
  console.log('Frontend integration checks passed: four roles, exact passwords, no demo fallback, restored/invalid sessions, logout, profile mapping, registration and listing.');
})().catch(error=>{console.error(error);process.exitCode=1;});
