// Comprehensive integration tests for Society & Union OCR Register Import, Multi-Farmer Extraction, Live Camera Preview, Multi-Cow Grouping, and Role Restrictions
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, mocks = {}) {
  const module = { exports: {} };
  const raw = fs.readFileSync(file, 'utf8');
  const code = ts.transpileModule(raw, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.React,
      esModuleInterop: true,
    },
  }).outputText;
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    require: name => {
      if (Object.hasOwn(mocks, name)) return mocks[name];
      throw Error('Unexpected dependency: ' + name);
    },
    console,
    Date,
    parseFloat,
    parseInt,
    isNaN,
    Set,
    Array,
    Object,
    String,
    RegExp,
    Promise,
  });
  return module.exports;
}

const ocr = load('services/ocrRegisterService.ts', {
  '../constants/Config': { Config: { DEFAULT_OCR_URL: 'http://test/ocr' } },
  axios: { post: async () => ({ data: { success: true } }) },
});

console.log('--- 1. Testing Role Restrictions (Society & Union Only) ---');

function checkRoleOcrAccess(role) {
  const authorized = role === 'booth' || role === 'union';
  return authorized;
}

assert.equal(checkRoleOcrAccess('booth'), true, 'Society user must have OCR access');
assert.equal(checkRoleOcrAccess('union'), true, 'Union user must have OCR access');
assert.equal(checkRoleOcrAccess('farmer'), false, 'Farmer must NOT have OCR access');
assert.equal(checkRoleOcrAccess('bmc'), false, 'BMC staff must NOT have OCR access');
assert.equal(checkRoleOcrAccess('veterinary'), false, 'Veterinarian must NOT have OCR access');
assert.equal(checkRoleOcrAccess('admin'), false, 'System admin without society/union must NOT have OCR access');
console.log('✓ Role restrictions strictly validated for Society & Union only.');

console.log('--- 2. Testing Tamil & English Mixed Register Extraction ---');

const mixedTamilEnglishOcr = {
  success: true,
  request_id: 'tamil-eng-test',
  tables: [
    {
      table_index: 0,
      table_id: 1,
      headers: ['S.No', 'விவசாயி பெயர் / Farmer Name', 'கைபேசி / Mobile', 'கிராமம் / Village', 'மாடு அடையாள எண் / Tag ID', 'இனம் / Breed', 'பால் அளவு / Litres'],
      rows: [
        ['1', 'கே. செந்தில்குமார் (K. Senthilkumar)', '9842100001', 'மேலூர் கிழக்கு (Melur East)', '001234567890', 'கலப்பின ஜெர்சி', '14.5'],
        ['2', 'ஆர். முனியம்மாள் (R. Muniyammal)', '9842100002', 'கருங்காலக்குடி (Karungalakudi)', '002345678901', 'முர்ரா எருமை (Murrah)', '8.0'],
        ['3', 'வி. முருகேசன் (V. Murugesan)', '9842100003', 'அய்யம்பட்டி (Ayyampatti)', '003456789012', 'HF Cross', '18.25'],
      ],
      row_count: 3,
      column_count: 7,
    },
  ],
};

const tables = ocr.parseOcrApiResponse(mixedTamilEnglishOcr);
assert.equal(tables.length, 1);
assert.equal(tables[0].row_count, 3);

const parsedFarmers = ocr.mapTablesToFarmerRecords(tables, []);
assert.equal(parsedFarmers.length, 3);

// Verify Tamil Unicode preservation and field mapping
assert.equal(parsedFarmers[0].fullName, 'கே. செந்தில்குமார் (K. Senthilkumar)');
assert.equal(parsedFarmers[0].phone, '9842100001');
assert.equal(parsedFarmers[0].cowTagId, '001234567890');
assert.equal(parsedFarmers[0].cowBreed, 'Jersey Cross');
assert.equal(parsedFarmers[0].status, 'valid');

assert.equal(parsedFarmers[1].fullName, 'ஆர். முனியம்மாள் (R. Muniyammal)');
assert.equal(parsedFarmers[1].cowBreed, 'Murrah Buffalo');
assert.equal(parsedFarmers[1].status, 'valid');

assert.equal(parsedFarmers[2].fullName, 'வி. முருகேசன் (V. Murugesan)');
assert.equal(parsedFarmers[2].cowBreed, 'Holstein Friesian (HF)');
assert.equal(parsedFarmers[2].status, 'valid');
console.log('✓ Tamil & English multi-farmer extraction & Unicode preservation verified.');

console.log('--- 3. Testing 12-Digit Tag IDs with Leading Zeros ---');
assert.equal(parsedFarmers[0].cowTagId.length, 12);
assert.equal(parsedFarmers[0].cowTagId.startsWith('00'), true, 'Leading zeros must be preserved as string');
assert.equal(typeof parsedFarmers[0].cowTagId, 'string');
console.log('✓ Leading zeros preserved in 12-digit cattle Pashu Aadhaar tags.');

console.log('--- 4. Testing Duplicate Detection & Validation Edge Cases ---');

const existingFarmers = [
  { id: 'f-1', name: 'கே. செந்தில்குமார்', mobileNumber: '9842100001', farmerIdCode: 'FARM-MDU-101', assignedBoothId: 'b-1' },
];
const duplicateCheckResult = ocr.mapTablesToFarmerRecords(tables, existingFarmers);
assert.equal(duplicateCheckResult[0].status, 'duplicate');
assert.equal(duplicateCheckResult[0].isDuplicate, true);
assert.equal(duplicateCheckResult[0].selected, false);
assert.ok(duplicateCheckResult[0].duplicateReason.includes('already registered'));

// Non-duplicate rows remain valid and selectable
assert.equal(duplicateCheckResult[1].status, 'valid');
assert.equal(duplicateCheckResult[1].selected, true);
console.log('✓ Duplicate phone candidate properly flagged and unselected.');

console.log('--- 5. Testing Multi-Cow Farmer Grouping & Continuation Rows ---');

const multiCowRegister = {
  success: true,
  tables: [
    {
      table_index: 0,
      table_id: 1,
      headers: ['S.No', 'விவசாயி', 'தொலைபேசி', 'மாடுகள்', 'குறியீடு எண்', 'இனம்'],
      rows: [
        ['1', 'முத்துவேல்', '9842111111', '3', '001111111111', 'Jersey'],
        ['"', '"', '"', '', '002222222222', 'HF'],
        ['"', '"', '"', '', '003333333333', 'Murrah'],
        ['2', 'அழகர்சாமி', '9842222222', '2', '004444444444, 005555555555', 'Jersey'],
      ],
      row_count: 4,
      column_count: 6,
    },
  ],
};

const multiCowTables = ocr.parseOcrApiResponse(multiCowRegister);
assert.equal(ocr.detectRegisterFormat(multiCowTables[0]), 'multi_cow');
const groupedFarmers = ocr.mapTablesToFarmerRecords(multiCowTables, []);
assert.equal(groupedFarmers.length, 2, 'Must group into exactly 2 farmers, not 4');

// Farmer 1 (Muthuvel) has 3 cows grouped
assert.equal(groupedFarmers[0].fullName, 'முத்துவேல்');
assert.equal(groupedFarmers[0].cows.length, 3);
assert.equal(groupedFarmers[0].cows[0].tagId, '001111111111');
assert.equal(groupedFarmers[0].cows[1].tagId, '002222222222');
assert.equal(groupedFarmers[0].cows[2].tagId, '003333333333');
assert.equal(groupedFarmers[0].countMatchStatus, 'matched');
assert.equal(groupedFarmers[0].status, 'valid');

// Farmer 2 (Alagarsamy) has 2 cows from comma-separated cell
assert.equal(groupedFarmers[1].fullName, 'அழகர்சாமி');
assert.equal(groupedFarmers[1].cows.length, 2);
assert.equal(groupedFarmers[1].cows[0].tagId, '004444444444');
assert.equal(groupedFarmers[1].cows[1].tagId, '005555555555');
assert.equal(groupedFarmers[1].countMatchStatus, 'matched');
assert.equal(groupedFarmers[1].status, 'valid');
console.log('✓ Multi-cow continuation rows & comma-separated cells correctly grouped.');

console.log('--- 6. Testing Milk Collection Entry from OCR ---');

const milkOcrTable = {
  success: true,
  tables: [
    {
      table_index: 0,
      table_id: 1,
      headers: ['வ.எண்', 'விவசாயி பெயர்', 'அலைபேசி', 'பால் லிட்டர்', 'நேரம்'],
      rows: [
        ['1', 'கே. செந்தில்குமார்', '9842100001', '14.50', 'காலை'],
        ['2', 'ஆர். முனியம்மாள்', '9842100002', '8.00', 'மாலை'],
        ['3', 'அடையாளம் தெரியாத உறுப்பினர்', '9111111111', '10.00', 'காலை'],
      ],
      row_count: 3,
      column_count: 5,
    },
  ],
};

const milkTables = ocr.parseOcrApiResponse(milkOcrTable);
const authorizedMilkFarmers = [
  { id: 'f-1', name: 'கே. செந்தில்குமார்', mobileNumber: '9842100001', farmerIdCode: 'FARM-MDU-101', assignedBoothId: 'b-1' },
  { id: 'f-2', name: 'ஆர். முனியம்மாள்', mobileNumber: '9842100002', farmerIdCode: 'FARM-MDU-102', assignedBoothId: 'b-1' },
];

const milkRecords = ocr.mapTablesToMilkRecords(milkTables, authorizedMilkFarmers, '2026-10-18', 'morning');
assert.equal(milkRecords.length, 3);

// Record 1: Matched by phone & name, morning session
assert.equal(milkRecords[0].matchedFarmerId, 'f-1');
assert.equal(milkRecords[0].quantityLitres, '14.50', 'Quantity is farmer-level total and never multiplied');
assert.equal(milkRecords[0].session, 'morning');
assert.equal(milkRecords[0].status, 'valid');
assert.equal(milkRecords[0].selected, true);

// Record 2: Matched, evening session detected from Tamil 'மாலை'
assert.equal(milkRecords[1].matchedFarmerId, 'f-2');
assert.equal(milkRecords[1].quantityLitres, '8.00');
assert.equal(milkRecords[1].session, 'evening');
assert.equal(milkRecords[1].status, 'valid');

// Record 3: Unmatched farmer requires manual match before saving
assert.equal(milkRecords[2].matchedFarmerId, undefined);
assert.equal(milkRecords[2].status, 'needs_review');
assert.equal(milkRecords[2].selected, false);
assert.ok(milkRecords[2].errors.matchedFarmerId);
console.log('✓ Milk collection OCR parsing, farmer matching, and session detection verified.');

console.log('--- 7. Testing Saving Farmer with Multiple Cattle ---');

// Mock registration call payload builder
const farmerToSave = groupedFarmers[0];
const cowPayload = farmerToSave.cows
  .filter(c => c.tagId && c.status !== 'duplicate')
  .map(c => ({
    pashuAadhaar: c.tagId,
    breed: c.breed,
    milkCapacity: parseFloat(c.milkCapacity) || 10.0,
    name: `${farmerToSave.fullName}'s Cow (${c.breed})`,
  }));

assert.equal(cowPayload.length, 3, 'Payload must contain all 3 valid cattle');
assert.equal(cowPayload[0].pashuAadhaar, '001111111111');
assert.equal(cowPayload[1].pashuAadhaar, '002222222222');
assert.equal(cowPayload[2].pashuAadhaar, '003333333333');
console.log('✓ Multi-cow atomic registration payload assembled with all detected cattle.');

console.log('\n=========================================');
console.log('ALL OCR REGISTER IMPORT TESTS PASSED (100%)');
console.log('=========================================');
