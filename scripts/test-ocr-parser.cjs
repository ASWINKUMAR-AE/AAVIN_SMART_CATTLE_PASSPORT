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
  });
  return module.exports;
}

const ocr = load('services/ocrRegisterService.ts', {
  '../constants/Config': { Config: { DEFAULT_OCR_URL: 'http://test/ocr' } },
  axios: { post: async () => ({ data: { success: true } }) },
});

console.log('Testing OCR Parser, Multi-Cow Grouping & Format Support...');

// Test 1: Classify Tamil and English Column Headers
assert.equal(ocr.classifyColumn('S.No'), 'sno');
assert.equal(ocr.classifyColumn('வரிசை எண்'), 'sno');
assert.equal(ocr.classifyColumn('விவசாயி பெயர் (Farmer Name)'), 'name');
assert.equal(ocr.classifyColumn('Farmer Name'), 'name');
assert.equal(ocr.classifyColumn('அலைபேசி எண் (Mobile No)'), 'phone');
assert.equal(ocr.classifyColumn('Mobile'), 'phone');
assert.equal(ocr.classifyColumn('கிராமம் (Village)'), 'village');
assert.equal(ocr.classifyColumn('மாடுகள் எண்ணிக்கை (Cows)'), 'cows');
assert.equal(ocr.classifyColumn('Pashu Aadhaar Tag No'), 'tag');
assert.equal(ocr.classifyColumn('காது குறியீடு எண்'), 'tag');
assert.equal(ocr.classifyColumn('மாட்டின் இனம் (Breed)'), 'breed');
assert.equal(ocr.classifyColumn('பால் அளவு (Litres)'), 'quantity');
assert.equal(ocr.classifyColumn('தேதி (Date)'), 'date');
assert.equal(ocr.classifyColumn('காலை / மாலை (Shift)'), 'session');

// Test 2: Helper parsers & 12-digit tag extraction
assert.equal(ocr.cleanPhoneNumber('9842198421'), '9842198421');
assert.equal(ocr.cleanPhoneNumber('+91 98421 98421'), '9842198421');
assert.equal(ocr.cleanPhoneNumber('12345'), '');
assert.equal(ocr.cleanCattleTagId('001234567890'), '001234567890'); // Leading zeros preserved
assert.equal(ocr.cleanCattleTagId('12345'), '');

// Test 3: Multi-tag candidate extraction across separators (commas, spaces, newlines, semicolons)
const extractedTags = ocr.extractCattleTagCandidates(
  '001234567890, 002345678901; 003456789012\n004567890123 005678901234'
);
assert.equal(extractedTags.length, 5);
assert.equal(extractedTags[0], '001234567890');
assert.equal(extractedTags[1], '002345678901');
assert.equal(extractedTags[2], '003456789012');
assert.equal(extractedTags[3], '004567890123');
assert.equal(extractedTags[4], '005678901234');

// Test 4: Format A (Legacy 1-to-1) vs Format B (Multi-Cow) Detection
const legacyTable = {
  table_index: 0,
  table_id: 1,
  headers: ['Farmer Name', 'Phone', 'Pashu Aadhaar'],
  rows: [['M. Ramasamy', '9842198421', '001234567890']],
  row_count: 1,
  column_count: 3,
};
assert.equal(ocr.detectRegisterFormat(legacyTable), 'legacy');

const multiCowTable = {
  table_index: 0,
  table_id: 2,
  headers: ['Farmer Name', 'Phone', 'Declared Cows', 'Pashu Aadhaar Tags'],
  rows: [
    ['S. Lakshmi', '9789097890', '3', '001234567890, 002345678901, 003456789012'],
  ],
  row_count: 1,
  column_count: 4,
};
assert.equal(ocr.detectRegisterFormat(multiCowTable), 'multi_cow');

// Test 5: Format A (Legacy Format) with 1 farmer and 1 cow
const legacyParsed = ocr.parseLegacyRegisterFormat([legacyTable], []);
assert.equal(legacyParsed.length, 1);
assert.equal(legacyParsed[0].fullName, 'M. Ramasamy');
assert.equal(legacyParsed[0].cowTagId, '001234567890');
assert.equal(legacyParsed[0].cows.length, 1);
assert.equal(legacyParsed[0].cows[0].tagId, '001234567890');
assert.equal(legacyParsed[0].status, 'valid');

// Test 6: Format B with 1 farmer, declared count = 3, detected = 3 (Count Matched)
const multiCowParsed = ocr.parseMultiCowRegisterFormat([multiCowTable], []);
assert.equal(multiCowParsed.length, 1);
assert.equal(multiCowParsed[0].fullName, 'S. Lakshmi');
assert.equal(multiCowParsed[0].declaredCattleCount, 3);
assert.equal(multiCowParsed[0].detectedCattleCount, 3);
assert.equal(multiCowParsed[0].cows.length, 3);
assert.equal(multiCowParsed[0].countMatchStatus, 'matched');
assert.equal(multiCowParsed[0].status, 'valid');

// Test 7: Multi-Cow Farmer with Continuation Rows (One farmer spanning multiple visual lines)
const continuationTable = {
  table_index: 0,
  table_id: 3,
  headers: ['விவசாயி பெயர்', 'அலைபேசி', 'மாடுகள்', 'குறியீடு எண்', 'இனம்'],
  rows: [
    ['மு. ராமசாமி', '9842198421', '3', '001111111111', 'ஜெர்சி'],
    ['"', '"', '', '002222222222', 'HF Cross'], // ditto mark continuation
    ['', '', '', '003333333333', 'முர்ரா'], // blank cell continuation
    ['கே. செந்தில்', '9842100099', '1', '004444444444', 'ஜெர்சி'], // New farmer
  ],
  row_count: 4,
  column_count: 5,
};

const groupedFarmers = ocr.parseMultiCowRegisterFormat([continuationTable], []);
assert.equal(groupedFarmers.length, 2, 'Continuation rows must not create separate farmers');

// Farmer 1 has 3 cows grouped under them
assert.equal(groupedFarmers[0].fullName, 'மு. ராமசாமி');
assert.equal(groupedFarmers[0].cows.length, 3);
assert.equal(groupedFarmers[0].cows[0].tagId, '001111111111');
assert.equal(groupedFarmers[0].cows[1].tagId, '002222222222');
assert.equal(groupedFarmers[0].cows[2].tagId, '003333333333');
assert.equal(groupedFarmers[0].detectedCattleCount, 3);
assert.equal(groupedFarmers[0].declaredCattleCount, 3);
assert.equal(groupedFarmers[0].countMatchStatus, 'matched');
assert.equal(groupedFarmers[0].status, 'valid');

// Farmer 2 has 1 cow
assert.equal(groupedFarmers[1].fullName, 'கே. செந்தில்');
assert.equal(groupedFarmers[1].cows.length, 1);
assert.equal(groupedFarmers[1].cows[0].tagId, '004444444444');

// Test 8: Cattle Count Signal: Missing IDs (Declared = 3, Detected = 2)
const missingIdsTable = {
  table_index: 0,
  table_id: 4,
  headers: ['Farmer', 'Phone', 'Cows', 'Tags'],
  rows: [['Farmer Missing', '9842111111', '3', '001122334455, 002233445566']],
  row_count: 1,
  column_count: 4,
};
const missingResult = ocr.parseMultiCowRegisterFormat([missingIdsTable], []);
assert.equal(missingResult[0].countMatchStatus, 'missing_ids');
assert.equal(missingResult[0].status, 'needs_review');
assert.ok(missingResult[0].countMatchMessage.includes('1 ID(s) may be missing'));

// Test 9: Cattle Count Signal: Extra IDs (Declared = 2, Detected = 3)
const extraIdsTable = {
  table_index: 0,
  table_id: 5,
  headers: ['Farmer', 'Phone', 'Cows', 'Tags'],
  rows: [['Farmer Extra', '9842222222', '2', '001122334455, 002233445566, 003344556677']],
  row_count: 1,
  column_count: 4,
};
const extraResult = ocr.parseMultiCowRegisterFormat([extraIdsTable], []);
assert.equal(extraResult[0].countMatchStatus, 'extra_ids');
assert.equal(extraResult[0].status, 'needs_review');
assert.ok(extraResult[0].countMatchMessage.includes('exceed declared count'));

// Test 10: Duplicate Cattle IDs inside the same farmer row
const duplicateTagTable = {
  table_index: 0,
  table_id: 6,
  headers: ['Farmer', 'Phone', 'Cows', 'Tags'],
  rows: [['Farmer Dup Tag', '9842333333', '2', '001122334455, 001122334455']],
  row_count: 1,
  column_count: 4,
};
const dupTagResult = ocr.parseMultiCowRegisterFormat([duplicateTagTable], []);
assert.equal(dupTagResult[0].cows[1].isDuplicate, true);
assert.equal(dupTagResult[0].cows[1].status, 'duplicate');
assert.equal(dupTagResult[0].status, 'needs_review');

// Test 11: Tag already in existing database registry
const existingCows = [{ id: 'c-1', tagId: '009988776655', cowId: 'COW-001', breed: 'HF', farmerId: 'f-1' }];
const registeredTagTable = {
  table_index: 0,
  table_id: 7,
  headers: ['Farmer', 'Phone', 'Tags'],
  rows: [['Farmer In Registry', '9842444444', '009988776655']],
  row_count: 1,
  column_count: 3,
};
const regTagResult = ocr.parseMultiCowRegisterFormat([registeredTagTable], [], existingCows);
assert.ok(regTagResult[0].cows[0].warnings.some(w => w.includes('already in registry')));

// Test 12: Missing farmer name or missing phone number
const incompleteTable = {
  table_index: 0,
  table_id: 8,
  headers: ['Farmer', 'Phone', 'Tags'],
  rows: [
    ['', '9842555555', '001122334455'],
    ['Farmer No Phone', '', '002233445566'],
  ],
  row_count: 2,
  column_count: 3,
};
const incompleteResult = ocr.parseMultiCowRegisterFormat([incompleteTable], []);
assert.equal(incompleteResult[0].errors.fullName, 'Farmer name is required.');
assert.equal(incompleteResult[0].status, 'needs_review');
assert.equal(incompleteResult[1].errors.phone, '10-digit mobile number required.');
assert.equal(incompleteResult[1].status, 'needs_review');

// Test 13: Milk Collection remains farmer-wise and not multiplied by cattle count
const milkTable = {
  table_index: 0,
  table_id: 9,
  headers: ['Farmer', 'Phone', 'Litres', 'Shift'],
  rows: [['M. Ramasamy', '9842198421', '14.50', 'Morning']],
  row_count: 1,
  column_count: 4,
};
const parsedMilk = ocr.mapTablesToMilkRecords(
  [milkTable],
  [{ id: 'f-1', name: 'M. Ramasamy', mobileNumber: '9842198421', farmerIdCode: 'FARM-001', assignedBoothId: 'b-1' }]
);
assert.equal(parsedMilk.length, 1);
assert.equal(parsedMilk[0].quantityLitres, '14.50', 'Milk quantity must remain farmer-wise total');
assert.equal(parsedMilk[0].matchedFarmerId, 'f-1');
assert.equal(parsedMilk[0].status, 'valid');

// Test 14: Actual Handwritten Register OCR Response from reference image
const actualOcrJson = JSON.parse(fs.readFileSync('scripts/actual_ocr_response.json', 'utf8'));
const actualTables = ocr.parseOcrApiResponse(actualOcrJson);
const actualFarmers = ocr.mapTablesToFarmerRecords(actualTables);

assert.equal(actualFarmers.length, 6, 'Must extract exactly 6 genuine farmer records');

// Verify Farmer 1 (Murugan)
assert.equal(actualFarmers[0].fullName, 'முயர்களையும்');
assert.equal(actualFarmers[0].phone, '9150870971');
assert.equal(actualFarmers[0].farmerIdCode, '743586924216');
assert.equal(actualFarmers[0].cows.length, 1);
assert.equal(actualFarmers[0].cows[0].tagId, '322687625891');

// Verify Farmer 2 (Mariyappan)
assert.equal(actualFarmers[1].fullName, 'கீட்டியியப்பன்');
assert.equal(actualFarmers[1].phone, '9787607530');
assert.equal(actualFarmers[1].farmerIdCode, '426857663224');
assert.equal(actualFarmers[1].cows.length, 3);
assert.equal(actualFarmers[1].cows[0].tagId, '400678541362');
assert.equal(actualFarmers[1].cows[1].tagId, '156792861041');
assert.equal(actualFarmers[1].cows[2].tagId, '296541050723');

// Verify Farmer 3 (Karuppayi)
assert.equal(actualFarmers[2].fullName, 'மர்களை கிடுப்பவல்');
assert.equal(actualFarmers[2].phone, '8682811882');

// Verify Farmer 4 (Durga)
assert.equal(actualFarmers[3].fullName, 'நுர்கா');
assert.equal(actualFarmers[3].phone, '7894564311');

// Verify Farmer 5 (Perumal)
assert.equal(actualFarmers[4].fullName, 'மியதினை');
assert.equal(actualFarmers[4].phone, '6343210805');
assert.equal(actualFarmers[4].cows.length, 3);
assert.equal(actualFarmers[4].cows[0].tagId, '144665433277');
assert.equal(actualFarmers[4].cows[1].tagId, '144783546469');
assert.equal(actualFarmers[4].cows[2].tagId, '150052895688');

// Verify Farmer 6 (Muthu)
assert.equal(actualFarmers[5].fullName, 'யூமொபி');
assert.equal(actualFarmers[5].phone, '9432165431');
assert.equal(actualFarmers[5].cows.length, 1);
assert.equal(actualFarmers[5].cows[0].tagId, '267846996543');

// Verify no address strings or villages became farmer names
const invalidNames = ['திட்டியப்பணி', 'உட்டப்பட்டி', 'காரியப்பட்டி', 'மேலூர்', 'விருதுநகர்', 'செல்லூர்', 'சேலிலிலையே மேவும்'];
actualFarmers.forEach((f, idx) => {
  invalidNames.forEach(bad => {
    assert.notEqual(f.fullName, bad, `Farmer #${idx + 1} name must not be address token "${bad}"`);
  });
});

// Test 15: Farmer Aadhaar vs Cattle Pashu Aadhaar column classification
assert.equal(ocr.classifyColumn('விவசாயியின் ஆதார்'), 'farmer_id');
assert.equal(ocr.classifyColumn('பசு ஆதார்'), 'tag');
assert.equal(ocr.classifyColumn('மாடு ஆதார்'), 'tag');

console.log('All OCR parser & multi-cow grouping tests passed successfully (100%)!');
