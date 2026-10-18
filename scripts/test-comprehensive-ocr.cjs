const fs = require('fs');
const assert = require('assert');

// Test actual OCR response with updated logic
const actual = JSON.parse(fs.readFileSync('scripts/actual_ocr_response.json', 'utf8'));
const table = actual.tables[0];

console.log('--- Testing Comprehensive Register OCR Logic ---');

// 1. cleanPhoneNumber
function cleanPhoneNumber(raw) {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10 && /^[6-9]/.test(digits)) return digits;
  if (digits.length === 12 && digits.startsWith('91')) {
    const sub = digits.slice(2);
    if (/^[6-9]/.test(sub)) return sub;
  }
  return '';
}

// 2. cleanCattleTagId
function cleanCattleTagId(raw) {
  if (!raw) return '';
  const norm = raw.replace(/AL\b/gi, '41').replace(/b\b/gi, '4').replace(/l\b/gi, '1');
  const digits = norm.replace(/\D/g, '');
  if (digits.length === 12) return digits;
  return '';
}

// 3. extractCattleTagCandidates
function extractCattleTagCandidates(raw) {
  if (!raw) return [];
  const norm = raw.replace(/AL\b/gi, '41').replace(/b\b/gi, '4').replace(/l\b/gi, '1');
  const parts = norm.split(/[\n\r,;/|]+/);
  const found = [];
  for (const p of parts) {
    const trimmed = p.trim();
    if (!trimmed) continue;
    const matches = trimmed.match(/\b\d{12}\b/g);
    if (matches) {
      found.push(...matches);
      continue;
    }
    const clean = cleanCattleTagId(trimmed);
    if (clean) found.push(clean);
  }
  return found;
}

// 4. normalizeText
function normalizeText(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^\u0B80-\u0BFFa-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// 5. classifyColumn
function classifyColumn(headerText) {
  const norm = normalizeText(headerText);
  if (!norm) return 'unknown';

  if (/^(s\s*no|sl\s*no|serial|வரிசை\s*எண்|வ\s*எண்|வரிசை|s\s*n)$/i.test(norm) || norm === 'sno') {
    return 'sno';
  }

  if (norm.includes('phone') || norm.includes('mobile') || norm.includes('தொலைபேசி') || norm.includes('அலைபேசி') || norm.includes('contact') || norm.includes('cell') || norm.includes('கைபேசி')) {
    return 'phone';
  }

  // Farmer Aadhaar vs Cattle Tag Aadhaar
  if ((norm.includes('விவசாயி') || norm.includes('உறுப்பினர்') || norm.includes('farmer') || norm.includes('member')) && (norm.includes('ஆதார்') || norm.includes('aadhaar') || norm.includes('id'))) {
    return 'farmer_id';
  }

  if (norm.includes('tag') || norm.includes('குறியீடு') || norm.includes('மாடு எண்') || norm.includes('rfid') || norm.includes('pashu') || norm.includes('பசு ஆதார்') || norm.includes('மாடு ஆதார்')) {
    return 'tag';
  }

  if (norm.includes('farmer') || norm.includes('விவசாயியின் பெயர்') || norm.includes('விவசாயி பெயர்') || norm.includes('உறுப்பினர்') || norm.includes('producer') || norm.includes('member')) {
    return 'name';
  }

  if (norm.includes('பெயர்') || norm.includes('name')) {
    if (!norm.includes('மாடு') && !norm.includes('பசு') && !norm.includes('cattle')) {
      return 'name';
    }
  }

  if (norm.includes('village') || norm.includes('address') || norm.includes('கிராமம்') || norm.includes('ஊர்') || norm.includes('முகவரி') || norm.includes('தெரு') || norm.includes('வசிப்பிடம்')) {
    return 'village';
  }

  if (norm.includes('cows') || norm.includes('cattle') || norm.includes('மாடுகள்') || norm.includes('எண்ணிக்கை') || norm.includes('animals') || norm.includes('count')) {
    return 'cows';
  }

  if (norm.includes('breed') || norm.includes('இனம்') || norm.includes('வகை') || norm.includes('வகைகள்')) {
    return 'breed';
  }

  if (norm.includes('age') || norm.includes('வயது')) {
    return 'age';
  }

  if (norm.includes('quantity') || norm.includes('litres') || norm.includes('litre') || norm.includes('லிட்டர்') || norm.includes('பால்') || norm.includes('அளவு') || norm.includes('qty') || norm.includes('milk')) {
    return 'quantity';
  }

  if (norm.includes('date') || norm.includes('தேதி') || norm.includes('நாள்')) {
    return 'date';
  }

  if (norm.includes('session') || norm.includes('shift') || norm.includes('காலை') || norm.includes('மாலை') || norm.includes('நேரம்')) {
    return 'session';
  }

  if (norm.includes('aadhaar') || norm.includes('ஆதார்')) {
    return 'tag';
  }

  return 'unknown';
}

// 6. isHeaderDataRow
function isHeaderDataRow(headers) {
  if (!headers || headers.length === 0) return false;
  let dataSignals = 0;
  for (const h of headers) {
    const digits = (h || '').replace(/\D/g, '');
    if (digits.length >= 10) dataSignals++;
    if (/^\d{1,4}\s*,/.test((h || '').trim()) || /(தெரு|சாலை|நகர்|மேலூர்|விருதுநகர்)/.test(h || '')) dataSignals++;
  }
  return dataSignals >= 2;
}

// 7. inferColumnRoles
function inferColumnRoles(table, normalizedRows) {
  const headers = table.headers || [];
  const classified = headers.map(h => classifyColumn(h));
  const knownCount = classified.filter(c => c !== 'unknown').length;
  const isHeaderData = isHeaderDataRow(headers);

  // If explicit headers are already clearly classified and not a data row, use them
  if (!isHeaderData && knownCount >= 3) {
    return classified;
  }

  // Profile data across rows
  const numCols = Math.max(headers.length, ...normalizedRows.map(r => r.length));
  const scores = Array.from({ length: numCols }, () => ({
    sno: 0,
    name: 0,
    farmer_id: 0,
    cows: 0,
    tag: 0,
    breed: 0,
    village: 0,
    phone: 0,
  }));

  for (const r of normalizedRows) {
    r.forEach((cell, cIdx) => {
      if (cIdx >= numCols) return;
      const text = (cell || '').trim();
      if (!text) return;
      const digits = text.replace(/\D/g, '');

      if (/^[6-9]\d{9}$/.test(digits) || /^[6-9]\d{4}\s*\d{5}$/.test(text)) {
        scores[cIdx].phone += 10;
      } else if (cIdx >= numCols - 2 && digits.length >= 5 && digits.length <= 10) {
        scores[cIdx].phone += 5;
      }

      if (digits.length === 12 || /\b\d{12}\b/.test(text) || /\b\d{4}\s*\d{4}\s*\d{4}\b/.test(text)) {
        if (cIdx <= 2) {
          scores[cIdx].farmer_id += 8;
        } else {
          scores[cIdx].tag += 8;
        }
      }

      if (/,/.test(text) && /\d{5,}/.test(text)) {
        scores[cIdx].tag += 8;
      }

      if (/(தெரு|சாலை|நகர்|பட்டி|மேலூர்|மதுரை|விருதுநகர்|செல்லூர்|காமராஜர்|அண்ணா|மாரியம்மன்)/.test(text) || /^\d{1,4}\s*,/.test(text)) {
        scores[cIdx].village += 8;
      }

      if (/(கறவை|மாடு|கிர்|சிந்தி|ஜெர்சி|முர்ரா|பசு|Expecced|கறவைமாடு|சிவப்பு)/.test(text)) {
        scores[cIdx].breed += 8;
      }

      if (/^\d{1,2}\.?$/.test(text) && cIdx === 0) {
        scores[cIdx].sno += 5;
      }

      if (/[\u0B80-\u0BFF]{3,}/.test(text) && !/(தெரு|சாலை|நகர்|பட்டி|மேலூர்|மதுரை|கறவை|மாடு|கிர்|சிந்தி)/.test(text)) {
        if (cIdx <= 1) {
          scores[cIdx].name += 6;
        }
      }
    });
  }

  // Resolve dominant roles
  const roles = scores.map(s => {
    let best = 'unknown';
    let max = 0;
    for (const [k, v] of Object.entries(s)) {
      if (v > max) {
        max = v;
        best = k;
      }
    }
    return best;
  });

  return roles;
}

const isHeaderData = isHeaderDataRow(table.headers);
assert.equal(isHeaderData, true, 'Header is correctly identified as a data row');

const normalizedRows = isHeaderData ? [table.headers, ...table.rows] : [...table.rows];
assert.equal(normalizedRows.length, 14, 'Normalized rows count is 14');

const roles = inferColumnRoles(table, normalizedRows);
console.log('Inferred roles:', roles);
assert.equal(roles[2], 'farmer_id');
assert.equal(roles[3], 'tag');
assert.equal(roles[4], 'breed');
assert.equal(roles[5], 'village');
assert.equal(roles[6], 'phone');

console.log('All tests in comprehensive test script passed successfully!');
