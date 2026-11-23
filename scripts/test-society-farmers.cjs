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
function harness(initial = original) {
  let current = JSON.parse(JSON.stringify(initial));
  const states = [], calls = [], alerts = [];
  let slot = 0, tree, focus, fail = false, listResponse;
  const store = {farmers:[],cows:[],booths:[{id:'society-uuid',name:'Own Society'}],
    replaceSocietyFarmers:(_id,farmers,cows)=>{store.farmers=farmers;store.cows=cows;},
    cacheFarmer:(farmer,cows)=>{store.farmers=[farmer];store.cows=cows;}};
  const api = {
    listFarmers:async()=>{
      if (listResponse instanceof Error) throw listResponse;
      return listResponse ?? [current];
    },
    updateFarmer:async(id,payload)=>{
      calls.push({id,payload});
      if(fail)throw {response:{data:{message:'Rejected by server'}}};
      current = {...current,phone:payload.phone ?? current.phone,fullName:payload.fullName ?? current.fullName,
        personalDetails:{...current.personalDetails,...payload.personalDetails},
        cows:current.cows.map(cow=>{const change=payload.cows?.find(item=>item.id===cow.id);return change ?
          {...cow,name:change.name,milkCapacity:String(change.milkCapacity)}:cow;})};
            current.cows.push(...(payload.newCows || []).map((cow,index)=>({...cow,id:'added-cow-'+index,
        farmerId:current.id,createdAt:current.createdAt})));
      current.personalDetails.numberOfCows=current.cows.length;
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
  native.useWindowDimensions=()=>({width:390,height:844,fontScale:1,scale:1});
  native.StyleSheet={create:x=>x,hairlineWidth:1};native.Platform={OS:'android'};
  native.Alert={alert:(...args)=>alerts.push(args)};
  const screen=load('app/(booth)/farmers.tsx',{
    '../../components/booth/BoothScreen':{BoothScreen:'View'},'react-native-safe-area-context':{useSafeAreaInsets:()=>({top:0,bottom:0,left:0,right:0})},'../../components/booth/BoothText':{BoothText:'Text'},react,'react-native':native,'expo-router':{useRouter:()=>({push:()=>{}}),useFocusEffect:effect=>{focus=effect;}},
    '../../services/accountsApi':{AccountsApi:api},'../../services/accountMapping':mapping,
    '../../store/AavinStoreContext':{useAavinStore:()=>store},
    '../../context/AuthContext':{useAuth:()=>({user:{role:'booth',associatedId:'society-uuid'}})},
    '../../context/ThemeContext':{useTheme:()=>({colors:{},isDark:false})},
    '../../constants/Typography':{Typography:{}},'../../components/booth/BoothHeader':{BoothHeader:'DemoHeader'},
    '../../components/ui/Card':{Card:'Card'},'../../components/booth/BoothButton':{BoothButton:'Button'},
    '../../components/ui/TextField':{TextField:'TextField'},'@expo/vector-icons':{Ionicons:'Ionicons'},
    '../../components/ui/EmptyState':{EmptyState:'EmptyState'},
    '../../components/scanner/OCRRegisterImportModal':{OCRRegisterImportModal:()=>null},
  }).default;
  function render(){slot=0;tree=screen();return tree;}
  function* walk(node){
    if(Array.isArray(node)){for(const child of node)yield* walk(child);return;}
    if(!node || typeof node!=='object')return;
    if(node.type==='Modal' && !node.props.visible)return;
    yield node;
    if(node.type==='FlatList'){yield* walk(node.props.ListHeaderComponent);for(const item of node.props.data)yield* walk(node.props.renderItem({item}));}
    yield* walk(node.props.children);
  }
  function text(node){if(Array.isArray(node))return node.map(text).join('');
    if(!node || typeof node!=='object')return String(node??'');return text(node.props.children);}
  function find(type,predicate){const node=[...walk(render())].find(node=>node.type===type && predicate(node.props,node));
    assert.ok(node, 'Missing '+type);return node.props;}
  render();
  return {store,calls,alerts,find,text,render,setFail:value=>{fail=value;},setListResponse:value=>{listResponse=value;},
    focus:async()=>{focus();for(let i=0;i<10;i++)await Promise.resolve();render();}};
}
(async()=>{
  const loading = harness();
  assert.match(loading.text(loading.find('FlatList',()=>true).ListEmptyComponent), /Loading farmers/);
  loading.setListResponse(new Error('Offline'));
  await loading.focus();
  assert.equal(loading.find('FlatList',()=>true).ListEmptyComponent.props.children[0].props.title, 'Unable to load farmers');
  const retry = loading.find('FlatList',()=>true).ListEmptyComponent.props.children[1];
  assert.equal(retry.props.title, 'Try Again');
  retry.props.onPress();
  assert.match(loading.text(loading.find('FlatList',()=>true).ListEmptyComponent), /Loading farmers/);
  loading.setListResponse([]);
  await loading.focus();
  assert.equal(loading.find('FlatList',()=>true).ListEmptyComponent.props.title, 'No Farmers Found');
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
  const adding=harness();await adding.focus();
  adding.find('Pressable',(_props,node)=>adding.text(node)==='Edit Details').onPress();
  assert.equal(adding.find('TextField',props=>props.label==='Cattle Call Name / Nickname (Editable)').value,'Lakshmi');
  assert.ok(!adding.text(adding.render()).includes('farmer-uuid'));
  assert.ok(!adding.text(adding.render()).includes('society-uuid'));
  adding.find('Button',props=>props.title==='+ Add Cow').onPress();
  for(const [label,value] of [['Pashu Aadhaar (12 Digits) *','123456789013'],['Cattle Breed *','HF Cross'],
    ['Cattle Call Name / Nickname (Editable)','New Cow'],['Daily Milk Capacity (Litres) *','15.50']]) {
    adding.find('TextField',props=>props.label===label).onChangeText(value);
  }
  await adding.find('Button',props=>props.title==='Save Changes').onPress();
  assert.equal(adding.calls[0].payload.newCows[0].pashuAadhaar,'123456789013');
  assert.equal(adding.calls[0].payload.cows[0].id,'cow-uuid');
  assert.equal(adding.store.cows.length,2);
  assert.equal(adding.store.farmers[0].numberOfCows,2);
  const empty=harness({...original,cows:[],personalDetails:{...original.personalDetails,numberOfCows:0}});
  await empty.focus();empty.find('Pressable',(_props,node)=>empty.text(node)==='Edit Details').onPress();
  empty.find('Button',props=>props.title==='+ Add Cow').onPress();
  assert.equal(empty.find('TextField',props=>props.label==='Pashu Aadhaar (12 Digits) *').value,'');
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
  console.log('Society screen checks passed: backend profile/cow saves, persistent KYC, adding cattle, existing cattle display, hidden UUIDs, reload, and rejected updates leave cache unchanged.');
})().catch(error=>{console.error(error);process.exitCode=1;});
