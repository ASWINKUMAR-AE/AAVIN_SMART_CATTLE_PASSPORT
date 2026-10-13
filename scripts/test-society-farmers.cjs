// Exercise the actual Society screen handlers with isolated UI and API mocks.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, mocks = {}) {
  const module = {exports:{}};
  const code = ts.transpileModule(fs.readFileSync(file,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,
    target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText;
  vm.runInNewContext(code,{module,exports:module.exports,require:name=>{
    if (Object.hasOwn(mocks,name)) return mocks[name];
    throw Error('Unexpected dependency: '+name);
  },console,Promise});
  return module.exports;
}
const mapping = load('services/accountMapping.ts');
const original = {id:'farmer-uuid',phone:'9842000004',fullName:'Farmer One',role:'farmer',parentId:'society-uuid',parent:null,
  createdAt:'2026-10-13T00:00:00Z',personalDetails:{farmerIdCode:'FARM-1',address:'Old Street',village:'Melur',numberOfCows:1,
  verificationStatus:'pending'},cows:[{id:'cow-uuid',farmerId:'farmer-uuid',pashuAadhaar:'123456789012',breed:'Jersey Cross',
  name:'Lakshmi',milkCapacity:'12.00',createdAt:'2026-10-13T00:00:00Z'}]};
function harness() {
  let current = JSON.parse(JSON.stringify(original));
  const states = [], calls = [], alerts = [];
  let slot = 0, tree, focus, fail = false;
  const store = {farmers:[],cows:[],booths:[{id:'society-uuid',name:'Own Society'}],
    replaceSocietyFarmers:(_id,farmers,cows)=>{store.farmers=farmers;store.cows=cows;},
    cacheFarmer:(farmer,cows)=>{store.farmers=[farmer];store.cows=cows;}};
  const api = {
    listFarmers:async()=>[current],
    updateFarmer:async(id,payload)=>{
      calls.push({id,payload});
      if(fail)throw {response:{data:{message:'Rejected by server'}}};
      current = {...current,phone:payload.phone ?? current.phone,fullName:payload.fullName ?? current.fullName,
        personalDetails:{...current.personalDetails,...payload.personalDetails},
        cows:current.cows.map(cow=>{const change=payload.cows?.find(item=>item.id===cow.id);return change ?
          {...cow,name:change.name,milkCapacity:String(change.milkCapacity)}:cow;})};
      return current;
    },
    registerFarmer:async payload=>{calls.push({registration:payload});return {...current,id:'new-farmer',
      phone:payload.phone,fullName:payload.fullName,personalDetails:payload.personalDetails,
      cows:payload.cows.map((cow,index)=>({...cow,id:'new-cow-'+index,farmerId:'new-farmer',createdAt:current.createdAt}))};},
  };
  const react = {useState:initial=>{
    const index=slot++;if(!(index in states))states[index]=initial;
    return [states[index],value=>{states[index]=typeof value==='function'?value(states[index]):value;}];
  },useCallback:fn=>fn,createElement:(type,props,...children)=>({type,props:{...props,children}})};
  const native = Object.fromEntries(['View','Text','FlatList','Pressable','TextInput','Modal','ScrollView',
    'KeyboardAvoidingView'].map(name=>[name,name]));
  native.StyleSheet={create:x=>x,hairlineWidth:1};native.Platform={OS:'android'};
  native.Alert={alert:(...args)=>alerts.push(args)};
  const screen=load('app/(booth)/farmers.tsx',{
    react,'react-native':native,'expo-router':{useRouter:()=>({push:()=>{}}),useFocusEffect:effect=>{focus=effect;}},
    '../../services/accountsApi':{AccountsApi:api},'../../services/accountMapping':mapping,
    '../../store/AavinStoreContext':{useAavinStore:()=>store},
    '../../context/AuthContext':{useAuth:()=>({user:{role:'booth',associatedId:'society-uuid'}})},
    '../../context/ThemeContext':{useTheme:()=>({colors:{},isDark:false})},
    '../../constants/Typography':{Typography:{}},'../../components/DemoHeader':{DemoHeader:'DemoHeader'},
    '../../components/ui/Card':{Card:'Card'},'../../components/ui/Button':{Button:'Button'},
    '../../components/ui/TextField':{TextField:'TextField'},'@expo/vector-icons':{Ionicons:'Ionicons'},
    '../../components/ui/EmptyState':{EmptyState:'EmptyState'},
  }).default;
  function render(){slot=0;tree=screen();return tree;}
  function* walk(node){
    if(Array.isArray(node)){for(const child of node)yield* walk(child);return;}
    if(!node || typeof node!=='object')return;
    if(node.type==='Modal' && !node.props.visible)return;
    yield node;
    if(node.type==='FlatList')for(const item of node.props.data)yield* walk(node.props.renderItem({item}));
    yield* walk(node.props.children);
  }
  function text(node){if(Array.isArray(node))return node.map(text).join('');
    if(!node || typeof node!=='object')return String(node??'');return text(node.props.children);}
  function find(type,predicate){const node=[...walk(render())].find(node=>node.type===type && predicate(node.props,node));
    assert.ok(node, 'Missing '+type);return node.props;}
  render();
  return {store,calls,alerts,find,text,render,setFail:value=>{fail=value;},
    focus:async()=>{focus();for(let i=0;i<10;i++)await Promise.resolve();render();}};
}
(async()=>{
  const h=harness();await h.focus();
  assert.equal(h.find('FlatList',()=>true).data[0].id,'farmer-uuid');
  h.find('Pressable',(_props,node)=>h.text(node)==='Edit Details').onPress();
  h.find('TextField',props=>props.label==='Full Name *').onChangeText('Edited Farmer');
  h.find('TextField',props=>props.label==='Cattle Call Name / Nickname (Editable)').onChangeText('New cow name');
  await h.find('Button',props=>props.title==='Save Changes').onPress();
  assert.equal(h.calls[0].id,'farmer-uuid');
  assert.equal(h.calls[0].payload.fullName,'Edited Farmer');
  assert.equal(h.calls[0].payload.cows[0].id,'cow-uuid');
  assert.equal(h.store.cows[0].name,'New cow name');
  await h.find('Pressable',(_props,node)=>h.text(node)==='Verify').onPress();
  assert.equal(h.calls[1].payload.personalDetails.verificationStatus,'verified');
  await h.focus();assert.equal(h.store.farmers[0].verificationStatus,'verified');
  h.setFail(true);
  await h.find('Pressable',(_props,node)=>h.text(node)==='Flag').onPress();
  assert.equal(h.store.farmers[0].verificationStatus,'verified');
  assert.equal(h.alerts.at(-1)[1],'Rejected by server');
  h.find('Pressable',(_props,node)=>h.text(node)==='Edit Details').onPress();
  h.find('TextField',props=>props.label==='Full Name *').onChangeText('Rejected edit');
  await h.find('Button',props=>props.title==='Save Changes').onPress();
  assert.equal(h.store.farmers[0].name,'Edited Farmer');
  assert.equal(h.find('TextField',props=>props.label==='Full Name *').value,'Rejected edit');
  const enrollment=harness();await enrollment.focus();
  enrollment.find('Button',props=>props.title==='+ Register Farmer').onPress();
  for(const [label,value] of [['Full Name *','New Farmer'],['10-Digit Mobile Number *','9842000088'],
      ['Street / Door Address *','New Street'],['Cow #1 Pashu Aadhaar (12 Digits) *','123456789099']]) {
    enrollment.find('TextField',props=>props.label===label).onChangeText(value);
  }
  await enrollment.find('Button',props=>props.title==='Enroll (1 Cows)').onPress();
  assert.equal(enrollment.calls[0].registration.parentId,'society-uuid');
  assert.equal(enrollment.calls[0].registration.cows[0].pashuAadhaar,'123456789099');
  assert.equal(enrollment.store.farmers[0].id,'new-farmer');
  assert.equal(enrollment.store.cows[0].farmerId,'new-farmer');
  console.log('Society screen checks passed: backend profile/cow saves, persistent KYC, reload, and rejected updates leave cache unchanged.');
})().catch(error=>{console.error(error);process.exitCode=1;});
