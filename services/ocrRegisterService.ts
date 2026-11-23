import axios from 'axios';
import { Config } from '../constants/Config';
import { Farmer, Cow } from '../types/aavin';

// TypeScript interfaces for OCR response
export interface OCRHeaderDetail {
  original: string;
  display: string;
  original_header?: string;
  display_header?: string;
  semantic_type?: string;
  confidence?: number;
  inference_method?: string;
  classification_warnings?: string[];
}

export interface OCRColumn {
  key: string;
  label: string;
  original_header?: string;
  display_header?: string;
  semantic_type?: string;
  confidence?: number;
}

export interface OCRTable {
  table_index: number;
  table_id: number | string;
  headers: string[];
  headers_detail?: OCRHeaderDetail[];
  rows: string[][];
  row_count: number;
  column_count: number;
  columns?: OCRColumn[];
  data?: Array<Record<string, string>>;
  confidence?: number;
  detection_strategy?: string;
  is_uncertain?: boolean;
  warnings?: string[];
  html?: string;
  detected_languages?: string[];
  unassigned_text?: string;
}

export interface OCRResponse {
  success: boolean;
  request_id?: string;
  filename?: string;
  content_type?: string;
  tables?: OCRTable[];
  extracted_text?: string;
  metadata?: {
    ocr_engine?: string;
    preprocessing_applied?: boolean;
    processing_time_ms?: number;
    image_dimensions?: { width: number; height: number };
  };
  warnings?: string[];
  headers?: string[];
  rows?: string[][];
  data?: Array<Record<string, string>>;
  row_count?: number;
  columns?: OCRColumn[];
}

// Associated Cattle Candidate Record
export interface ParsedCattleCandidate {
  id: string; // temporary client UUID for tracking
  tagId: string; // 12-digit string Pashu Aadhaar, preserves leading zeros
  breed: string;
  age?: string;
  milkCapacity: string;
  name?: string;
  sourceRowIndex: number;
  sourceCellText: string;
  status: 'valid' | 'needs_review' | 'duplicate';
  errors: Record<string, string>;
  warnings: string[];
  isDuplicate: boolean;
  duplicateReason?: string;
}

// Extracted & Parsed Farmer Record (Supports 1-to-N Cattle Grouping)
export interface ParsedFarmerRecord {
  id: string; // temporary client UUID for tracking
  sourceTableId: number | string;
  sourceRowIndex: number;
  originalRow: Record<string, string>;
  rawRowText: string;

  // Form Fields
  fullName: string;
  phone: string;
  village: string;
  address: string;
  farmerIdCode: string;
  numberOfCows: number;

  // Multi-Cow Farmer Grouping Fields
  cows: ParsedCattleCandidate[];
  declaredCattleCount: number;
  hasDeclaredCattleCount: boolean;
  detectedCattleCount: number;
  validCattleCount: number;
  countMatchStatus: 'matched' | 'missing_ids' | 'extra_ids' | 'unspecified';
  countMatchMessage: string;
  formatDetected: 'legacy' | 'multi_cow' | 'ambiguous';

  // Backward-Compatible First Cow Fields
  cowTagId: string;
  cowBreed: string;
  cowMilkCapacity: string;
  cowName: string;

  // Validation & Review State
  status: 'valid' | 'needs_review' | 'duplicate';
  errors: Record<string, string>;
  warnings: string[];
  isDuplicate: boolean;
  duplicateReason?: string;
  selected: boolean;
  isExpanded: boolean;
  saveStatus?: 'idle' | 'saving' | 'success' | 'error';
  saveError?: string;
}

// Extracted & Parsed Milk Collection Record
export interface ParsedMilkRecord {
  id: string; // temporary client UUID
  sourceTableId: number | string;
  sourceRowIndex: number;
  originalRow: Record<string, string>;
  rawRowText: string;

  // Form Fields
  matchedFarmerId?: string;
  matchedFarmerName?: string;
  farmerSearchQuery: string; // extracted candidate name/phone/code
  extractedFarmerIdCode?: string;
  extractedPhone?: string;
  extractedName?: string;

  collectionDate: string; // YYYY-MM-DD
  session: 'morning' | 'evening';
  quantityLitres: string;
  notes: string;

  // Validation & Review State
  status: 'valid' | 'needs_review' | 'duplicate';
  errors: Record<string, string>;
  warnings: string[];
  isDuplicate: boolean;
  duplicateReason?: string;
  selected: boolean;
  isExpanded: boolean;
  saveStatus?: 'idle' | 'saving' | 'success' | 'error';
  saveError?: string;
}

// Canonical breed list supported by Aavin
export const KNOWN_BREEDS = [
  'Jersey Cross',
  'Holstein Friesian (HF)',
  'Murrah Buffalo',
  'Desi / Country',
  'Kangayam',
  'Umblachery',
  'Sindhi Cross',
  'Sahiwal',
  'Gir',
];

/**
 * Normalizes Tamil and English strings for fuzzy header & field matching
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^\u0B80-\u0BFFa-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Validates 10-digit Indian mobile number
 */
export function cleanPhoneNumber(raw: string): string {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10 && /^[6-9]/.test(digits)) {
    return digits;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    const sub = digits.slice(2);
    if (/^[6-9]/.test(sub)) return sub;
  }
  return '';
}

/**
 * Validates 12-digit Pashu Aadhaar / Cattle Tag ID (preserves leading zeros)
 */
export function cleanCattleTagId(raw: string): string {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 12) {
    return digits;
  }
  return '';
}

/**
 * Extracts multiple 12-digit cattle tag candidates from a single text block/cell.
 * Supports comma, semicolon, space, newline, or vertical continuations.
 * Preserves leading zeros and keeps them strictly as strings.
 */
export function extractCattleTagCandidates(raw: string): string[] {
  if (!raw) return [];
  // Split on newlines, commas, semicolons, slashes, or pipes
  const parts = raw.split(/[\n\r,;/|]+/);
  const found: string[] = [];

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    // Check if part contains space-separated 12-digit numbers
    const matches = trimmed.match(/\b\d{12}\b/g);
    if (matches && matches.length > 0) {
      for (const m of matches) {
        found.push(m);
      }
      continue;
    }

    // Direct clean 12 digits
    const cleaned = cleanCattleTagId(trimmed);
    if (cleaned) {
      found.push(cleaned);
    }
  }

  return found;
}

/**
 * Parses decimal milk quantity safely
 */
export function parseMilkQuantity(raw: string): string {
  if (!raw) return '';
  const clean = raw.trim().replace(/[^\d.]/g, '');
  const num = parseFloat(clean);
  if (!isNaN(num) && num > 0 && num < 100) {
    return num.toFixed(2);
  }
  return '';
}

/**
 * Normalizes date string into YYYY-MM-DD
 */
export function parseDateString(raw: string, fallbackDate: string): string {
  if (!raw) return fallbackDate;
  const trimmed = raw.trim();
  // Match DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }
  // Match YYYY-MM-DD
  const ymdMatch = trimmed.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return fallbackDate;
}

/**
 * Detects whether shift is morning or evening
 */
export function detectSession(raw: string): 'morning' | 'evening' | null {
  const norm = normalizeText(raw);
  if (norm.includes('morning') || norm.includes('காலை') || norm.includes('am') || norm.includes('mor')) {
    return 'morning';
  }
  if (norm.includes('evening') || norm.includes('மாலை') || norm.includes('pm') || norm.includes('eve')) {
    return 'evening';
  }
  return null;
}

/**
 * Normalizes breed from text
 */
export function matchBreed(raw: string): string {
  if (!raw) return 'Jersey Cross';
  const norm = normalizeText(raw);
  if (norm.includes('hf') || norm.includes('holstein')) return 'Holstein Friesian (HF)';
  if (norm.includes('murrah') || norm.includes('முர்ரா') || norm.includes('எருமை')) return 'Murrah Buffalo';
  if (norm.includes('desi') || norm.includes('நாட்டு') || norm.includes('country')) return 'Desi / Country';
  if (norm.includes('kangayam') || norm.includes('காங்கேயம்')) return 'Kangayam';
  if (norm.includes('umblachery') || norm.includes('உம்பளச்சேரி')) return 'Umblachery';
  if (norm.includes('sindhi') || norm.includes('சிந்தி')) return 'Sindhi Cross';
  if (norm.includes('sahiwal') || norm.includes('சாஹிவால்')) return 'Sahiwal';
  if (norm.includes('gir') || norm.includes('கிர்')) return 'Gir';
  if (norm.includes('jersey') || norm.includes('ஜெர்சி')) return 'Jersey Cross';
  return 'Jersey Cross';
}

/**
 * Categorizes table column headers into field semantic keys
 */
/**
 * Categorizes table column headers into field semantic keys
 */
export function classifyColumn(headerText: string): 'sno' | 'name' | 'farmer_id' | 'phone' | 'village' | 'cows' | 'tag' | 'breed' | 'age' | 'quantity' | 'date' | 'session' | 'unknown' {
  const norm = normalizeText(headerText);
  if (!norm) return 'unknown';

  // S.No
  if (/^(s\s*no|sl\s*no|serial|வரிசை\s*எண்|வ\s*எண்|வரிசை|s\s*n)$/i.test(norm) || norm === 'sno') {
    return 'sno';
  }

  // Phone / Mobile / Contact
  if (norm.includes('phone') || norm.includes('mobile') || norm.includes('தொலைபேசி') || norm.includes('அலைபேசி') || norm.includes('contact') || norm.includes('cell') || norm.includes('கைபேசி')) {
    return 'phone';
  }

  // Farmer Aadhaar / ID vs Cattle Pashu Aadhaar Tag
  if ((norm.includes('விவசாயி') || norm.includes('உறுப்பினர்') || norm.includes('farmer') || norm.includes('member')) && (norm.includes('ஆதார்') || norm.includes('aadhaar') || norm.includes('id'))) {
    return 'farmer_id';
  }

  // Cattle Tag / UID / Aadhaar
  if (norm.includes('tag') || norm.includes('குறியீடு') || norm.includes('மாடு எண்') || norm.includes('rfid') || norm.includes('pashu') || norm.includes('பசு ஆதார்') || norm.includes('மாடு ஆதார்')) {
    return 'tag';
  }

  // Farmer Name
  if (norm.includes('farmer') || norm.includes('விவசாயியின் பெயர்') || norm.includes('விவசாயி பெயர்') || norm.includes('உறுப்பினர்') || norm.includes('producer') || norm.includes('member')) {
    return 'name';
  }

  if (norm.includes('பெயர்') || norm.includes('name')) {
    if (!norm.includes('மாடு') && !norm.includes('பசு') && !norm.includes('cattle')) {
      return 'name';
    }
  }

  // Village / Address
  if (norm.includes('village') || norm.includes('address') || norm.includes('கிராமம்') || norm.includes('ஊர்') || norm.includes('முகவரி') || norm.includes('தெரு') || norm.includes('வசிப்பிடம்')) {
    return 'village';
  }

  // Cows count
  if (norm.includes('cows') || norm.includes('cattle') || norm.includes('மாடுகள்') || norm.includes('எண்ணிக்கை') || norm.includes('animals') || norm.includes('count')) {
    return 'cows';
  }

  // Breed
  if (norm.includes('breed') || norm.includes('இனம்') || norm.includes('வகை') || norm.includes('வகைகள்')) {
    return 'breed';
  }

  // Age
  if (norm.includes('age') || norm.includes('வயது')) {
    return 'age';
  }

  // Milk Quantity / Litres
  if (norm.includes('quantity') || norm.includes('litres') || norm.includes('litre') || norm.includes('லிட்டர்') || norm.includes('பால்') || norm.includes('அளவு') || norm.includes('qty') || norm.includes('milk')) {
    return 'quantity';
  }

  // Date
  if (norm.includes('date') || norm.includes('தேதி') || norm.includes('நாள்')) {
    return 'date';
  }

  // Session / Shift
  if (norm.includes('session') || norm.includes('shift') || norm.includes('காலை') || norm.includes('மாலை') || norm.includes('நேரம்')) {
    return 'session';
  }

  // Default Aadhaar to tag for backward-compatibility with legacy tables
  if (norm.includes('aadhaar') || norm.includes('ஆதார்')) {
    return 'tag';
  }

  return 'unknown';
}

/**
 * Detects if the OCR engine mistakenly classified the first data row as the table headers.
 */
export function isHeaderDataRow(headers?: string[]): boolean {
  if (!headers || headers.length === 0) return false;
  let dataSignals = 0;
  for (const h of headers) {
    if (!h) continue;
    const digits = h.replace(/\D/g, '');
    if (digits.length >= 10) dataSignals++;
    if (/^\d{1,4}\s*,/.test(h.trim()) || /(தெரு|சாலை|நகர்|மேலூர்|விருதுநகர்|மதுரை|காரியப்பட்டி)/.test(h)) dataSignals++;
  }
  return dataSignals >= 2;
}

/**
 * Robust Column Role Inference:
 * Uses explicit header classifications when confident, or performs data profiling across rows
 * to accurately detect farmer identity, cattle tags, breeds, phone numbers, and addresses.
 */
export function inferColumnRoles(
  table: OCRTable,
  normalizedRows: string[][]
): Array<'sno' | 'name' | 'farmer_id' | 'phone' | 'village' | 'cows' | 'tag' | 'breed' | 'age' | 'quantity' | 'date' | 'session' | 'unknown'> {
  const headers = table.headers || [];
  const classified = headers.map(h => classifyColumn(h));
  const knownCount = classified.filter(c => c !== 'unknown').length;
  const isHeaderData = isHeaderDataRow(headers);

  // If explicit headers are already clearly classified and headers are not actual data, use them
  if (!isHeaderData && knownCount >= 3) {
    return classified;
  }

  // Profile data across rows
  const numCols = Math.max(headers.length, ...normalizedRows.map(r => r.length));
  if (numCols === 0) return [];

  const scores = Array.from({ length: numCols }, () => ({
    sno: 0,
    name: 0,
    farmer_id: 0,
    cows: 0,
    tag: 0,
    breed: 0,
    village: 0,
    phone: 0,
    quantity: 0,
  }));

  for (const r of normalizedRows) {
    r.forEach((cell, cIdx) => {
      if (cIdx >= numCols) return;
      const text = (cell || '').trim();
      if (!text) return;
      const digits = text.replace(/\D/g, '');

      // Phone signal: 10 digits starting with 6-9, or 5-digit phone fragment in last columns
      if (/^[6-9]\d{9}$/.test(digits) || /^[6-9]\d{4}\s*\d{5}$/.test(text)) {
        scores[cIdx].phone += 10;
      } else if (cIdx >= numCols - 2 && digits.length >= 5 && digits.length <= 10) {
        scores[cIdx].phone += 5;
      }

      // 12-digit ID signal (farmer Aadhaar vs cattle tag)
      if (digits.length === 12 || /\b\d{12}\b/.test(text) || /\b\d{4}\s*\d{4}\s*\d{4}\b/.test(text)) {
        if (cIdx <= 2) {
          scores[cIdx].farmer_id += 8;
        } else {
          scores[cIdx].tag += 8;
        }
      }

      // Cattle tag fragments (e.g. comma-separated IDs, or 8-12 digits)
      if (/,/.test(text) && /\d{5,}/.test(text)) {
        scores[cIdx].tag += 8;
      }

      // Address / Village signal
      if (
        /(தெரு|சாலை|நகர்|பட்டி|மேலூர்|மதுரை|விருதுநகர்|செல்லூர்|காமராஜர்|அண்ணா|மாரியம்மன்)/.test(text) ||
        /^\d{1,4}\s*,/.test(text)
      ) {
        scores[cIdx].village += 8;
      }

      // Breed signal
      if (/(கறவை|மாடு|கிர்|சிந்தி|ஜெர்சி|முர்ரா|பசு|Expecced|கறவைமாடு|சிவப்பு)/.test(text)) {
        scores[cIdx].breed += 8;
      }

      // S.No signal: small integer 1-9 in col 0
      if (/^\d{1,2}\.?$/.test(text) && cIdx === 0) {
        scores[cIdx].sno += 5;
      }

      // Name signal: Tamil text in left section without address or breed keywords
      if (
        /[\u0B80-\u0BFF]{3,}/.test(text) &&
        !/(தெரு|சாலை|நகர்|பட்டி|மேலூர்|மதுரை|கறவை|மாடு|கிர்|சிந்தி)/.test(text)
      ) {
        if (cIdx <= 1) {
          scores[cIdx].name += 6;
        }
      }
    });
  }

  // Resolve dominant roles
  const roles = scores.map(s => {
    let best: any = 'unknown';
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

/**
 * Extracts 12-digit Farmer Aadhaar and any residual digits in the cell (such as declared cow count)
 */
export function extractFarmerAadhaarAndResidual(text: string): { aadhaar: string; residual: string } {
  if (!text) return { aadhaar: '', residual: '' };
  const norm = text.replace(/b\b/gi, '4').replace(/l\b/gi, '1');
  const digits = norm.replace(/\D/g, '');
  const match = norm.match(/\b\d{4}\s*\d{4}\s*\d{4}\b/) || digits.match(/\b\d{12}\b/);
  if (match) {
    const aadhaar = match[0].replace(/\s+/g, '');
    let residual = '';
    if (digits.length > 12) {
      residual = digits.replace(aadhaar, '');
    }
    return { aadhaar, residual };
  }
  return { aadhaar: '', residual: digits };
}

/**
 * Extracts 10-digit Indian phone number, handling numbers split across address and phone columns
 */
export function extractPhoneFromCells(phoneCell?: string, addressCell?: string): string {
  const pRaw = phoneCell || '';
  const aRaw = addressCell || '';
  const pDigits = pRaw.replace(/\D/g, '');

  // Exact 10-digit mobile
  if (pDigits.length === 10 && /^[6-9]/.test(pDigits)) {
    return pDigits;
  }
  // Mobile with 91 prefix
  if (pDigits.length === 12 && pDigits.startsWith('91') && /^[6-9]/.test(pDigits.slice(2))) {
    return pDigits.slice(2);
  }

  // Handle number split between address and phone column (e.g. 7894 in address, 564311 in phone)
  if (pDigits.length >= 4 && pDigits.length <= 7) {
    const aDigits = aRaw.replace(/\D/g, '');
    const combined = aDigits + pDigits;
    const m = combined.match(/[6-9]\d{9}/);
    if (m) return m[0];
  }

  // Check if address cell contains a 10-digit mobile
  const aMatch = aRaw.match(/\b([6-9]\d{4}\s*\d{5})\b/) || aRaw.match(/\b([6-9]\d{9})\b/);
  if (aMatch) {
    return aMatch[1].replace(/\s+/g, '');
  }

  return '';
}

/**
 * Extracts cattle tag candidates from the tag column, supporting multi-tag cells and cross-column splits
 */
export function extractCattleTagsFromRow(
  tagCell?: string,
  col2Residual?: string,
  col4Cell?: string
): string[] {
  const tags: string[] = [];
  const rawTag = (tagCell || '').replace(/AL\b/gi, '41').replace(/b\b/gi, '4').replace(/l\b/gi, '1');

  // Direct 12-digit matches in tag cell (comma, space, or newline separated)
  const cellCandidates = extractCattleTagCandidates(rawTag);
  if (cellCandidates.length > 0) {
    tags.push(...cellCandidates);
  }

  // Cross-column stitch with col2Residual (e.g. 1446654 in Col 2 + 33277 in Col 3 -> 144665433277)
  if (col2Residual && tags.length === 0) {
    const tagDigits = rawTag.replace(/\D/g, '');
    const combined = col2Residual + tagDigits;
    if (combined.length === 12) {
      tags.push(combined);
    } else {
      const matches = combined.match(/\d{12}/g);
      if (matches) tags.push(...matches);
    }
  }

  // Cross-column stitch with Col 4 (e.g. "3226 8762" in Col 3 + "5891" in Col 4 -> 322687625891)
  if (tags.length === 0 && col4Cell) {
    const tagDigits = rawTag.replace(/\D/g, '');
    const col4Digits = col4Cell.replace(/\D/g, '');
    const combined34 = tagDigits + col4Digits;
    if (combined34.length === 12) {
      tags.push(combined34);
    }
  }

  return tags;
}

/**
 * Detects whether a table uses Format A (Legacy single-row farmer)
 * or Format B (New multi-cow register format with declared counts, multi-ID cells or continuation rows).
 */
export function detectRegisterFormat(table: OCRTable): 'legacy' | 'multi_cow' | 'ambiguous' {
  if (!table || !table.headers || table.headers.length === 0) return 'ambiguous';

  const colTypes = table.headers.map(h => classifyColumn(h));
  const hasCowsCol = colTypes.includes('cows');
  const hasTagCol = colTypes.includes('tag');
  const nameColIdx = colTypes.indexOf('name');
  const phoneColIdx = colTypes.indexOf('phone');
  const tagColIdx = colTypes.indexOf('tag');

  let hasMultiTagCell = false;
  let hasContinuationRow = false;

  for (let r = 0; r < table.rows.length; r++) {
    const row = table.rows[r];
    if (!row) continue;

    // Check cells for multi-ID representation
    for (let c = 0; c < row.length; c++) {
      const candidates = extractCattleTagCandidates(row[c] || '');
      if (candidates.length > 1) {
        hasMultiTagCell = true;
      }
    }

    // Check for continuation rows (blank farmer cell or ditto marks, but with tag data)
    if (r > 0) {
      const nameVal = (nameColIdx !== -1 ? row[nameColIdx] : '').trim();
      const phoneVal = (phoneColIdx !== -1 ? row[phoneColIdx] : '').trim();
      const tagVal = (tagColIdx !== -1 ? row[tagColIdx] : '').trim();

      const isNameBlankOrDitto = !nameVal || /^["'\-–—]+$/.test(nameVal) || /^do$/i.test(nameVal) || /^ditto$/i.test(nameVal);
      const isPhoneBlankOrDitto = !phoneVal || /^["'\-–—]+$/.test(phoneVal);
      const hasCattleContent = Boolean(tagVal) || extractCattleTagCandidates(row.join(' ')).length > 0;

      if (isNameBlankOrDitto && isPhoneBlankOrDitto && hasCattleContent) {
        hasContinuationRow = true;
      }
    }
  }

  if (hasMultiTagCell || hasContinuationRow || (hasCowsCol && hasTagCol)) {
    return 'multi_cow';
  }

  return 'legacy';
}

/**
 * Defensive OCR Response Parser
 * Accepts standard OCR API response and extracts structured tables and rows
 */
export function parseOcrApiResponse(responseJson: any): OCRTable[] {
  if (!responseJson) {
    throw new Error('OCR response is empty or invalid.');
  }

  if (responseJson.success === false) {
    const errorMsg = responseJson.warnings?.join(', ') || responseJson.error || 'OCR processing failed on server.';
    throw new Error(errorMsg);
  }

  // Case 1: Structured 'tables' array is returned
  if (Array.isArray(responseJson.tables) && responseJson.tables.length > 0) {
    return responseJson.tables.map((tbl: any, idx: number) => ({
      table_index: tbl.table_index ?? idx,
      table_id: tbl.table_id ?? idx + 1,
      headers: Array.isArray(tbl.headers) ? tbl.headers.map((h: any) => String(h || '').trim()) : [],
      headers_detail: tbl.headers_detail || [],
      rows: Array.isArray(tbl.rows) ? tbl.rows.map((r: any) => (Array.isArray(r) ? r.map((c: any) => String(c || '').trim()) : [])) : [],
      row_count: tbl.row_count ?? (Array.isArray(tbl.rows) ? tbl.rows.length : 0),
      column_count: tbl.column_count ?? (Array.isArray(tbl.headers) ? tbl.headers.length : 0),
      columns: tbl.columns || [],
      data: Array.isArray(tbl.data) ? tbl.data : [],
      confidence: tbl.confidence ?? 0.9,
      detection_strategy: tbl.detection_strategy || 'table',
      is_uncertain: !!tbl.is_uncertain,
      warnings: tbl.warnings || [],
      html: tbl.html || '',
      detected_languages: tbl.detected_languages || ['en', 'ta'],
      unassigned_text: tbl.unassigned_text || '',
    }));
  }

  // Case 2: Flat response containing direct headers and rows
  if (Array.isArray(responseJson.rows) && responseJson.rows.length > 0) {
    const headers = Array.isArray(responseJson.headers)
      ? responseJson.headers.map((h: any) => String(h || '').trim())
      : responseJson.rows[0]?.map((_: any, i: number) => `Col ${i + 1}`) || [];

    return [{
      table_index: 0,
      table_id: 1,
      headers,
      rows: responseJson.rows.map((r: any) => (Array.isArray(r) ? r.map((c: any) => String(c || '').trim()) : [])),
      row_count: responseJson.rows.length,
      column_count: headers.length,
      columns: responseJson.columns || [],
      data: responseJson.data || [],
      confidence: responseJson.confidence ?? 0.9,
      is_uncertain: !!responseJson.is_uncertain,
      warnings: responseJson.warnings || [],
    }];
  }

  // Case 3: Empty table response
  return [];
}

/**
 * Creates cattle candidates for a farmer with duplicate detection & validation
 */
function buildCattleCandidates(
  detectedTagIds: string[],
  rIdx: number,
  sourceCellText: string,
  detectedBreed: string,
  detectedCapacity: string,
  farmerName: string,
  existingTagIds: Set<string>
): ParsedCattleCandidate[] {
  const candidates: ParsedCattleCandidate[] = [];
  const seenInFarmer = new Set<string>();

  for (let cIdx = 0; cIdx < detectedTagIds.length; cIdx++) {
    const tag = detectedTagIds[cIdx];
    const errors: Record<string, string> = {};
    const warnings: string[] = [];
    let isDuplicate = false;
    let duplicateReason = '';

    if (!tag) {
      continue;
    }

    if (!/^\d{12}$/.test(tag)) {
      errors.tagId = 'Cattle tag must be exactly 12 digits.';
    }

    // Intra-farmer duplicate detection
    if (seenInFarmer.has(tag)) {
      isDuplicate = true;
      duplicateReason = `Duplicate Tag #${tag} repeated in this farmer's register entry.`;
      warnings.push(duplicateReason);
    } else {
      seenInFarmer.add(tag);
    }

    // Existing database registry check
    if (existingTagIds.has(tag)) {
      warnings.push(`Pashu Aadhaar #${tag} is already in registry.`);
    }

    const isValid = Object.keys(errors).length === 0 && !isDuplicate;
    const status: ParsedCattleCandidate['status'] = isDuplicate ? 'duplicate' : isValid ? 'valid' : 'needs_review';

    candidates.push({
      id: `cattle-${rIdx}-${cIdx}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      tagId: tag,
      breed: detectedBreed || 'Jersey Cross',
      milkCapacity: detectedCapacity || '10.00',
      name: farmerName ? `${farmerName.split(' ')[0]}'s Cow #${candidates.length + 1}` : `Registered Cow #${candidates.length + 1}`,
      sourceRowIndex: rIdx + 1,
      sourceCellText,
      status,
      errors,
      warnings,
      isDuplicate,
      duplicateReason,
    });
  }

  return candidates;
}

/**
 * Evaluates cattle count validation signals (Declared Count vs Detected Count)
 */
function evaluateCountMatching(
  hasDeclaredCount: boolean,
  declaredCount: number,
  distinctDetectedCount: number
): { status: ParsedFarmerRecord['countMatchStatus']; message: string; warning?: string } {
  if (!hasDeclaredCount) {
    return {
      status: 'unspecified',
      message: `${distinctDetectedCount} ID(s) detected`,
    };
  }

  if (declaredCount === distinctDetectedCount) {
    return {
      status: 'matched',
      message: `Count Matched: ${declaredCount} of ${declaredCount} cattle IDs detected`,
    };
  }

  if (declaredCount > distinctDetectedCount) {
    const missing = declaredCount - distinctDetectedCount;
    return {
      status: 'missing_ids',
      message: `Review Required: ${missing} ID(s) may be missing (${distinctDetectedCount} detected of ${declaredCount} declared)`,
      warning: `${missing} cattle ID(s) missing compared to declared count of ${declaredCount}.`,
    };
  }

  const extra = distinctDetectedCount - declaredCount;
  return {
    status: 'extra_ids',
    message: `Review Required: Detected IDs (${distinctDetectedCount}) exceed declared count (${declaredCount})`,
    warning: `Detected ${distinctDetectedCount} cattle IDs exceed declared count of ${declaredCount}.`,
  };
}

/**
 * Format A: Existing / Legacy Register Format Parser
 * Maps one farmer per row, preserving existing behavior, mapping, and fields.
 */
export function parseLegacyRegisterFormat(
  tables: OCRTable[],
  existingFarmers: Farmer[] = [],
  existingCows: Cow[] = [],
  defaultVillage: string = 'Melur Rural'
): ParsedFarmerRecord[] {
  const records: ParsedFarmerRecord[] = [];
  const existingPhones = new Set(existingFarmers.map(f => f.mobileNumber));
  const existingTagIds = new Set(existingCows.map(c => c.tagId));

  for (const table of tables) {
    const headers = table.headers || [];
    const colClassifications = headers.map(h => classifyColumn(h));

    for (let rIdx = 0; rIdx < table.rows.length; rIdx++) {
      const row = table.rows[rIdx];
      if (!row || row.length === 0) continue;

      const isHeaderRepeat = row.some((cell, i) => headers[i] && cell && normalizeText(cell) === normalizeText(headers[i]));
      if (isHeaderRepeat && rIdx === 0) continue;

      const rowDict: Record<string, string> = {};
      row.forEach((cell, cIdx) => {
        rowDict[headers[cIdx] || `Col_${cIdx + 1}`] = cell;
      });

      let detectedName = '';
      let detectedPhone = '';
      let detectedVillage = '';
      let detectedAddress = '';
      let detectedCows = 1;
      let hasDeclaredCows = false;
      let detectedTagId = '';
      let rawTagCell = '';
      let detectedBreed = 'Jersey Cross';
      let detectedCapacity = '10.00';

      // 1. Column-based mapping
      colClassifications.forEach((classification, cIdx) => {
        const cellVal = (row[cIdx] || '').trim();
        if (!cellVal) return;

        if (classification === 'name' && !detectedName) {
          detectedName = cellVal;
        } else if (classification === 'phone' && !detectedPhone) {
          detectedPhone = cleanPhoneNumber(cellVal) || cellVal;
        } else if (classification === 'village' && !detectedVillage) {
          detectedVillage = cellVal;
        } else if (classification === 'cows') {
          const parsed = parseInt(cellVal.replace(/\D/g, ''), 10);
          if (!isNaN(parsed) && parsed > 0 && parsed <= 50) {
            detectedCows = parsed;
            hasDeclaredCows = true;
          }
        } else if (classification === 'tag') {
          rawTagCell = cellVal;
          detectedTagId = cleanCattleTagId(cellVal) || cellVal;
        } else if (classification === 'breed') {
          detectedBreed = matchBreed(cellVal);
        } else if (classification === 'quantity') {
          const qty = parseMilkQuantity(cellVal);
          if (qty) detectedCapacity = qty;
        }
      });

      // 2. Pattern-based fallback inspection across all cells
      row.forEach((cell, cIdx) => {
        const val = cell.trim();
        if (!val) return;
        const colType = colClassifications[cIdx];

        if (!detectedPhone && colType !== 'tag' && colType !== 'sno') {
          const ph = cleanPhoneNumber(val);
          if (ph) detectedPhone = ph;
        }

        if (!detectedTagId && colType !== 'phone' && colType !== 'sno') {
          const tags = extractCattleTagCandidates(val);
          if (tags.length > 0) {
            detectedTagId = tags[0];
            rawTagCell = val;
          }
        }

        if (!detectedName && colType !== 'sno' && colType !== 'phone' && colType !== 'tag' && colType !== 'quantity' && colType !== 'village' && colType !== 'breed') {
          if (/[\u0B80-\u0BFFa-zA-Z]{3,}/.test(val) && !/^\d+$/.test(val)) {
            detectedName = val.replace(/^[0-9.\- ]+/, '').trim();
          }
        }
      });

      if (!detectedName && !detectedPhone && !detectedTagId) {
        continue;
      }

      // Extract all tag candidates from the tag cell or entire row if comma separated
      const tagCandidates = rawTagCell ? extractCattleTagCandidates(rawTagCell) : (detectedTagId ? [detectedTagId] : []);
      const cattleList = buildCattleCandidates(tagCandidates, rIdx, rawTagCell, detectedBreed, detectedCapacity, detectedName, existingTagIds);

      const distinctDetectedCount = new Set(cattleList.map(c => c.tagId).filter(Boolean)).size;
      const validCattleCount = cattleList.filter(c => c.status === 'valid').length;
      const effectiveDeclaredCount = hasDeclaredCows ? detectedCows : (distinctDetectedCount || 1);

      const countEval = evaluateCountMatching(hasDeclaredCows, detectedCows, distinctDetectedCount);

      const randSuffix = Math.floor(100 + Math.random() * 900);
      const suggestedCode = `FARM-MDU-${randSuffix}`;

      const errors: Record<string, string> = {};
      const warnings: string[] = [];
      let isDuplicate = false;
      let duplicateReason = '';

      if (!detectedName.trim()) {
        errors.fullName = 'Farmer name is required.';
      }

      if (!detectedPhone) {
        errors.phone = '10-digit mobile number required.';
      } else if (!/^[6-9]\d{9}$/.test(detectedPhone)) {
        errors.phone = 'Enter valid 10-digit Indian phone starting with 6-9.';
      } else if (existingPhones.has(detectedPhone)) {
        isDuplicate = true;
        duplicateReason = `Phone ${detectedPhone} is already registered to an existing farmer.`;
        warnings.push(duplicateReason);
      }

      // Validate single cow tag if present (for backward compatibility)
      const primaryTag = cattleList[0]?.tagId || detectedTagId;
      if (primaryTag) {
        if (!/^\d{12}$/.test(primaryTag)) {
          errors.cowTagId = 'Cattle tag must be exactly 12 digits.';
        } else if (existingTagIds.has(primaryTag)) {
          warnings.push(`Pashu Aadhaar #${primaryTag} is already in registry.`);
        }
      }

      if (countEval.warning) {
        warnings.push(countEval.warning);
      }

      // Check if count match status requires review
      const countNeedsReview = countEval.status === 'missing_ids' || countEval.status === 'extra_ids';
      const hasCattleErrors = cattleList.some(c => c.status === 'needs_review');

      const isValid = Object.keys(errors).length === 0 && !isDuplicate && !countNeedsReview && !hasCattleErrors;
      const status: ParsedFarmerRecord['status'] = isDuplicate ? 'duplicate' : isValid ? 'valid' : 'needs_review';

      records.push({
        id: `farmer-row-${table.table_id}-${rIdx}-${Date.now()}`,
        sourceTableId: table.table_id,
        sourceRowIndex: rIdx + 1,
        originalRow: rowDict,
        rawRowText: row.filter(Boolean).join(' | '),
        fullName: detectedName,
        phone: detectedPhone,
        village: detectedVillage || defaultVillage,
        address: detectedAddress,
        farmerIdCode: suggestedCode,
        numberOfCows: effectiveDeclaredCount,
        cows: cattleList,
        declaredCattleCount: effectiveDeclaredCount,
        hasDeclaredCattleCount: hasDeclaredCows,
        detectedCattleCount: distinctDetectedCount,
        validCattleCount,
        countMatchStatus: countEval.status,
        countMatchMessage: countEval.message,
        formatDetected: 'legacy',
        cowTagId: primaryTag,
        cowBreed: cattleList[0]?.breed || detectedBreed,
        cowMilkCapacity: cattleList[0]?.milkCapacity || detectedCapacity,
        cowName: cattleList[0]?.name || (detectedName ? `${detectedName.split(' ')[0]}'s Cow` : 'Registered Cattle'),
        status,
        errors,
        warnings,
        isDuplicate,
        duplicateReason,
        selected: isValid,
        isExpanded: !isValid,
      });
    }
  }

  return records;
}

/**
 * Format B: New Multi-Cow Register Format Parser
 * Handles left-side farmer details, declared cattle count, multi-ID cells,
 * vertical line wraps, and continuation rows where subsequent lines belong to the preceding farmer.
 * Strictly guarantees: One Farmer -> One Farmer Record -> N Cattle Candidates!
 */
export function parseMultiCowRegisterFormat(
  tables: OCRTable[],
  existingFarmers: Farmer[] = [],
  existingCows: Cow[] = [],
  defaultVillage: string = 'Melur Rural'
): ParsedFarmerRecord[] {
  const records: ParsedFarmerRecord[] = [];
  const existingPhones = new Set(existingFarmers.map(f => f.mobileNumber));
  const existingTagIds = new Set(existingCows.map(c => c.tagId));

  for (const table of tables) {
    const isHeaderData = isHeaderDataRow(table.headers);
    const normalizedRows = isHeaderData ? [table.headers, ...table.rows] : table.rows;
    if (!normalizedRows || normalizedRows.length === 0) continue;

    const colClassifications = inferColumnRoles(table, normalizedRows);

    const nameColIdx = colClassifications.indexOf('name');
    const farmerIdColIdx = colClassifications.indexOf('farmer_id');
    const tagColIdx = colClassifications.indexOf('tag');
    const cowsColIdx = colClassifications.indexOf('cows');
    const breedColIdx = colClassifications.indexOf('breed');
    const villageColIdx = colClassifications.indexOf('village');
    const phoneColIdx = colClassifications.indexOf('phone');
    const snoColIdx = colClassifications.indexOf('sno');

    interface FarmerAccumulator {
      sourceTableId: number | string;
      startRowIndex: number;
      originalRow: Record<string, string>;
      rawRowLines: string[];
      fullName: string;
      phone: string;
      village: string;
      address: string;
      farmerIdCode: string;
      declaredCows: number;
      hasDeclaredCows: boolean;
      accumulatedTagIds: string[];
      accumulatedBreeds: string[];
      accumulatedCapacities: string[];
      sourceCells: string[];
    }

    let currentFarmer: FarmerAccumulator | null = null;

    const finalizeFarmer = (f: FarmerAccumulator) => {
      const distinctDetectedCount = new Set(f.accumulatedTagIds).size;
      const effectiveDeclaredCount = f.hasDeclaredCows ? f.declaredCows : (distinctDetectedCount || 1);

      const cattleList: ParsedCattleCandidate[] = [];
      const seenInFarmer = new Set<string>();

      for (let i = 0; i < f.accumulatedTagIds.length; i++) {
        const tag = f.accumulatedTagIds[i];
        const breed = f.accumulatedBreeds[i] || 'Jersey Cross';
        const capacity = f.accumulatedCapacities[i] || '10.00';
        const cellText = f.sourceCells[i] || '';

        const errors: Record<string, string> = {};
        const warnings: string[] = [];
        let isDuplicate = false;
        let duplicateReason = '';

        if (!/^\d{12}$/.test(tag)) {
          errors.tagId = 'Cattle tag must be exactly 12 digits.';
        }

        if (seenInFarmer.has(tag)) {
          isDuplicate = true;
          duplicateReason = `Duplicate Tag #${tag} repeated in this farmer's register entry.`;
          warnings.push(duplicateReason);
        } else {
          seenInFarmer.add(tag);
        }

        if (existingTagIds.has(tag)) {
          warnings.push(`Pashu Aadhaar #${tag} is already in registry.`);
        }

        const isValid = Object.keys(errors).length === 0 && !isDuplicate;
        const status: ParsedCattleCandidate['status'] = isDuplicate ? 'duplicate' : isValid ? 'valid' : 'needs_review';

        cattleList.push({
          id: `cattle-${f.startRowIndex}-${i}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          tagId: tag,
          breed,
          milkCapacity: capacity,
          name: f.fullName ? `${f.fullName.split(' ')[0]}'s Cow #${cattleList.length + 1}` : `Registered Cow #${cattleList.length + 1}`,
          sourceRowIndex: f.startRowIndex,
          sourceCellText: cellText,
          status,
          errors,
          warnings,
          isDuplicate,
          duplicateReason,
        });
      }

      const validCattleCount = cattleList.filter(c => c.status === 'valid').length;
      const countEval = evaluateCountMatching(f.hasDeclaredCows, f.declaredCows, distinctDetectedCount);

      const randSuffix = Math.floor(100 + Math.random() * 900);
      const suggestedCode = f.farmerIdCode ? `FARM-${f.farmerIdCode.slice(-4)}` : `FARM-MDU-${randSuffix}`;

      const errors: Record<string, string> = {};
      const warnings: string[] = [];
      let isDuplicate = false;
      let duplicateReason = '';

      if (!f.fullName.trim()) {
        errors.fullName = 'Farmer name is required.';
      }

      if (!f.phone) {
        errors.phone = '10-digit mobile number required.';
      } else if (!/^[6-9]\d{9}$/.test(f.phone)) {
        errors.phone = 'Enter valid 10-digit Indian phone starting with 6-9.';
      } else if (existingPhones.has(f.phone)) {
        isDuplicate = true;
        duplicateReason = `Phone ${f.phone} is already registered to an existing farmer.`;
        warnings.push(duplicateReason);
      }

      if (countEval.warning) {
        warnings.push(countEval.warning);
      }

      const countNeedsReview = countEval.status === 'missing_ids' || countEval.status === 'extra_ids';
      const hasCattleErrors = cattleList.some(c => c.status === 'needs_review');

      const primaryTag = cattleList[0]?.tagId || '';
      if (primaryTag && !/^\d{12}$/.test(primaryTag)) {
        errors.cowTagId = 'Cattle tag must be exactly 12 digits.';
      }

      const isValid = Object.keys(errors).length === 0 && !isDuplicate && !countNeedsReview && !hasCattleErrors;
      const status: ParsedFarmerRecord['status'] = isDuplicate ? 'duplicate' : isValid ? 'valid' : 'needs_review';

      records.push({
        id: `farmer-multi-${f.sourceTableId}-${f.startRowIndex}-${Date.now()}`,
        sourceTableId: f.sourceTableId,
        sourceRowIndex: f.startRowIndex,
        originalRow: f.originalRow,
        rawRowText: f.rawRowLines.join(' // '),
        fullName: f.fullName,
        phone: f.phone,
        village: f.village || defaultVillage,
        address: f.address,
        farmerIdCode: f.farmerIdCode || suggestedCode,
        numberOfCows: effectiveDeclaredCount,
        cows: cattleList,
        declaredCattleCount: effectiveDeclaredCount,
        hasDeclaredCattleCount: f.hasDeclaredCows,
        detectedCattleCount: distinctDetectedCount,
        validCattleCount,
        countMatchStatus: countEval.status,
        countMatchMessage: countEval.message,
        formatDetected: 'multi_cow',
        cowTagId: primaryTag,
        cowBreed: cattleList[0]?.breed || 'Jersey Cross',
        cowMilkCapacity: cattleList[0]?.milkCapacity || '10.00',
        cowName: cattleList[0]?.name || (f.fullName ? `${f.fullName.split(' ')[0]}'s Cow` : 'Registered Cattle'),
        status,
        errors,
        warnings,
        isDuplicate,
        duplicateReason,
        selected: isValid,
        isExpanded: !isValid,
      });
    };

    for (let rIdx = 0; rIdx < normalizedRows.length; rIdx++) {
      const row = normalizedRows[rIdx];
      if (!row || row.length === 0) continue;

      const rowDict: Record<string, string> = {};
      row.forEach((cell, cIdx) => {
        rowDict[`Col_${cIdx + 1}`] = cell;
      });

      const col0 = (snoColIdx !== -1 ? row[snoColIdx] : row[0] || '').trim();
      const nameCellVal = (nameColIdx !== -1 ? row[nameColIdx] : '').trim();
      const farmerIdCellVal = (farmerIdColIdx !== -1 ? row[farmerIdColIdx] : '').trim();
      const tagCellVal = (tagColIdx !== -1 ? row[tagColIdx] : '').trim();
      const cowsCellVal = (cowsColIdx !== -1 ? row[cowsColIdx] : '').trim();
      const breedCellVal = (breedColIdx !== -1 ? row[breedColIdx] : '').trim();
      const villageCellVal = (villageColIdx !== -1 ? row[villageColIdx] : '').trim();
      const phoneCellVal = (phoneColIdx !== -1 ? row[phoneColIdx] : '').trim();

      // Extract candidate name strictly from name column, col 1, or col 0 (when col 0 has name instead of s.no)
      let candidateName = '';
      if (nameCellVal && /[\u0B80-\u0BFFa-zA-Z]{2,}/.test(nameCellVal) && !/^(பொருப்பு|வரிசை|sl|sno)/i.test(nameCellVal)) {
        candidateName = nameCellVal.replace(/^[0-9.\- ]+/, '').trim();
      }
      if (!candidateName && row[1] && /[\u0B80-\u0BFFa-zA-Z]{2,}/.test(row[1]) && !/^(பொருப்பு|வரிசை|sl|sno)/i.test(row[1])) {
        candidateName = row[1].replace(/^[0-9.\- ]+/, '').trim();
      }
      if (!candidateName && col0 && /[\u0B80-\u0BFFa-zA-Z]{2,}/.test(col0) && !/^(பொருப்பு|வரிசை|sl|sno)/i.test(col0) && !/^\d+$/.test(col0)) {
        candidateName = col0.replace(/^[0-9.\- ]+/, '').trim();
      }

      // Extract farmer Aadhaar
      const { aadhaar: farmerAadhaar, residual: farmerIdResidual } = extractFarmerAadhaarAndResidual(farmerIdCellVal);

      // Extract phone
      const phone = extractPhoneFromCells(phoneCellVal, villageCellVal);

      // Extract initial cattle tags
      const initialTags = extractCattleTagsFromRow(tagCellVal, farmerIdResidual, breedCellVal);

      // Check if this row is a genuine new farmer:
      // 1) A new 12-digit farmer Aadhaar
      // 2) Both candidate name AND phone present
      // 3) Candidate name present with its own cattle tags when previous farmer already has data
      // 4) First row of table
      const isNewFarmerAadhaar = Boolean(farmerAadhaar) && (!currentFarmer || currentFarmer.farmerIdCode !== farmerAadhaar);
      const isNewFarmerWithNameAndPhone = Boolean(candidateName) && Boolean(phone);
      const isNewFarmerWithNameAndTags = Boolean(candidateName) && initialTags.length > 0 && currentFarmer !== null && (currentFarmer.accumulatedTagIds.length > 0 || Boolean(currentFarmer.phone));
      const isFirstRowOfTable = currentFarmer === null && (Boolean(candidateName) || Boolean(farmerAadhaar) || Boolean(phone) || initialTags.length > 0);

      const isNewFarmer = isNewFarmerAadhaar || isNewFarmerWithNameAndPhone || isNewFarmerWithNameAndTags || isFirstRowOfTable;

      if (!isNewFarmer && currentFarmer) {
        // Continuation row belonging to currentFarmer
        const contTags = extractCattleTagsFromRow(tagCellVal, farmerIdResidual, breedCellVal);
        contTags.forEach(t => {
          currentFarmer.accumulatedTagIds.push(t);
          currentFarmer.accumulatedBreeds.push(matchBreed(breedCellVal || currentFarmer.accumulatedBreeds[0]));
          currentFarmer.accumulatedCapacities.push('10.00');
          currentFarmer.sourceCells.push(tagCellVal || row.join(' '));
        });

        if (villageCellVal) {
          currentFarmer.address = currentFarmer.address ? `${currentFarmer.address}, ${villageCellVal}` : villageCellVal;
        }

        if (candidateName && (!currentFarmer.fullName || currentFarmer.fullName === 'Name needs review')) {
          currentFarmer.fullName = candidateName;
        }

        currentFarmer.rawRowLines.push(row.filter(Boolean).join(' | '));
        continue;
      }

      // If genuine new farmer, finalize previous
      if (currentFarmer) {
        finalizeFarmer(currentFarmer);
        currentFarmer = null;
      }

      // Extract declared cow count
      let declaredCount = 1;
      let hasDeclaredCows = false;
      if (cowsCellVal) {
        const parsed = parseInt(cowsCellVal.replace(/\D/g, ''), 10);
        if (!isNaN(parsed) && parsed > 0 && parsed <= 50) {
          declaredCount = parsed;
          hasDeclaredCows = true;
        }
      } else if (farmerIdResidual) {
        const parsed = parseInt(farmerIdResidual, 10);
        if (!isNaN(parsed) && parsed > 0 && parsed <= 20) {
          declaredCount = parsed;
          hasDeclaredCows = true;
        }
      }

      // Detect village
      let detectedVillage = defaultVillage;
      const allAddressText = `${villageCellVal} ${candidateName}`;
      if (/மேலூர்/i.test(allAddressText)) detectedVillage = 'Melur';
      else if (/காரியப்பட்டி/i.test(allAddressText)) detectedVillage = 'Kariapatti';
      else if (/மதுரை/i.test(allAddressText) || /செல்லூர்/i.test(allAddressText)) detectedVillage = 'Madurai';
      else if (/விருதுநகர்/i.test(allAddressText)) detectedVillage = 'Virudhunagar';
      else if (/சத்திரப்பட்டி/i.test(allAddressText)) detectedVillage = 'Sathirapatti';

      currentFarmer = {
        sourceTableId: table.table_id,
        startRowIndex: rIdx + 1,
        originalRow: rowDict,
        rawRowLines: [row.filter(Boolean).join(' | ')],
        fullName: candidateName || '',
        phone,
        village: detectedVillage,
        address: villageCellVal || '',
        farmerIdCode: farmerAadhaar || '',
        declaredCows: declaredCount,
        hasDeclaredCows,
        accumulatedTagIds: [...initialTags],
        accumulatedBreeds: initialTags.map(() => matchBreed(breedCellVal)),
        accumulatedCapacities: initialTags.map(() => '10.00'),
        sourceCells: initialTags.map(() => tagCellVal || row.join(' ')),
      };
    }

    if (currentFarmer) {
      finalizeFarmer(currentFarmer);
      currentFarmer = null;
    }
  }

  return records;
}

/**
 * Universal Table to Farmer Records Mapper
 * Automatically detects register format (Legacy vs Multi-Cow) and dispatches accordingly,
 * ensuring 100% backward compatibility for existing tests and workflows.
 */
export function mapTablesToFarmerRecords(
  tables: OCRTable[],
  existingFarmers: Farmer[] = [],
  existingCows: Cow[] = [],
  defaultVillage: string = 'Melur Rural'
): ParsedFarmerRecord[] {
  if (!tables || tables.length === 0) return [];

  // Determine overall format: If any table exhibits multi-cow format, use multi-cow parser
  const formats = tables.map(t => detectRegisterFormat(t));
  const isMultiCow = formats.some(f => f === 'multi_cow');

  if (isMultiCow) {
    return parseMultiCowRegisterFormat(tables, existingFarmers, existingCows, defaultVillage);
  }

  return parseLegacyRegisterFormat(tables, existingFarmers, existingCows, defaultVillage);
}

/**
 * Maps raw OCR tables to Milk Collection records
 * Strictly farmer-wise: quantities are never multiplied by cattle counts.
 */
export function mapTablesToMilkRecords(
  tables: OCRTable[],
  existingFarmers: Farmer[] = [],
  defaultDate: string = new Date().toISOString().slice(0, 10),
  defaultSession: 'morning' | 'evening' = 'morning'
): ParsedMilkRecord[] {
  const records: ParsedMilkRecord[] = [];

  for (const table of tables) {
    const headers = table.headers || [];
    const colClassifications = headers.map(h => classifyColumn(h));

    let tableSession = defaultSession;
    for (const h of headers) {
      const sess = detectSession(h);
      if (sess) tableSession = sess;
    }

    for (let rIdx = 0; rIdx < table.rows.length; rIdx++) {
      const row = table.rows[rIdx];
      if (!row || row.length === 0) continue;

      const isHeaderRepeat = row.some((cell, i) => headers[i] && cell && normalizeText(cell) === normalizeText(headers[i]));
      if (isHeaderRepeat && rIdx === 0) continue;

      const rowDict: Record<string, string> = {};
      row.forEach((cell, cIdx) => {
        rowDict[headers[cIdx] || `Col_${cIdx + 1}`] = cell;
      });

      let detectedFarmerSearch = '';
      let detectedPhone = '';
      let detectedIdCode = '';
      let detectedQty = '';
      let detectedDate = defaultDate;
      let detectedSession = tableSession;

      // 1. Column-based mapping
      colClassifications.forEach((classification, cIdx) => {
        const val = (row[cIdx] || '').trim();
        if (!val) return;

        if (classification === 'name' && !detectedFarmerSearch) {
          detectedFarmerSearch = val;
        } else if (classification === 'phone' && !detectedPhone) {
          detectedPhone = cleanPhoneNumber(val) || val;
        } else if (classification === 'quantity' && !detectedQty) {
          detectedQty = parseMilkQuantity(val);
        } else if (classification === 'date') {
          detectedDate = parseDateString(val, defaultDate);
        } else if (classification === 'session') {
          const sess = detectSession(val);
          if (sess) detectedSession = sess;
        }
      });

      // 2. Pattern-based fallback across row cells
      row.forEach((cell, cIdx) => {
        const val = cell.trim();
        if (!val) return;
        const colType = colClassifications[cIdx];

        if (!detectedQty && /^\d+(\.\d{1,2})?$/.test(val)) {
          const n = parseFloat(val);
          if (n > 0 && n <= 60 && colType !== 'sno' && colType !== 'phone' && colType !== 'tag') {
            detectedQty = n.toFixed(2);
          }
        }

        if (!detectedPhone && colType !== 'sno') {
          const ph = cleanPhoneNumber(val);
          if (ph) detectedPhone = ph;
        }

        if (!detectedIdCode && /^(farm|f)?[- ]?\d{2,5}$/i.test(val)) {
          detectedIdCode = val;
        }

        if (!detectedFarmerSearch && colType !== 'sno' && /[\u0B80-\u0BFFa-zA-Z]{3,}/.test(val)) {
          detectedFarmerSearch = val;
        }
      });

      if (!detectedFarmerSearch && !detectedPhone && !detectedQty) {
        continue;
      }

      let matchedFarmer: Farmer | undefined = undefined;

      if (detectedPhone) {
        matchedFarmer = existingFarmers.find(f => f.mobileNumber === detectedPhone);
      }

      if (!matchedFarmer && detectedIdCode) {
        const normCode = normalizeText(detectedIdCode);
        matchedFarmer = existingFarmers.find(f => normalizeText(f.farmerIdCode).includes(normCode) || normCode.includes(normalizeText(f.farmerIdCode)));
      }

      if (!matchedFarmer && detectedFarmerSearch) {
        const normSearch = normalizeText(detectedFarmerSearch);
        const nameMatches = existingFarmers.filter(f => {
          const fn = normalizeText(f.name);
          return fn.includes(normSearch) || normSearch.includes(fn);
        });
        if (nameMatches.length === 1) {
          matchedFarmer = nameMatches[0];
        }
      }

      const errors: Record<string, string> = {};
      const warnings: string[] = [];

      if (!matchedFarmer) {
        errors.matchedFarmerId = 'Farmer match required. Select authorized farmer from list.';
      }

      if (!detectedQty) {
        errors.quantityLitres = 'Valid milk quantity in litres required.';
      } else {
        const q = parseFloat(detectedQty);
        if (isNaN(q) || q <= 0) {
          errors.quantityLitres = 'Milk quantity must be greater than 0.';
        }
      }

      const isValid = Object.keys(errors).length === 0;
      const status: ParsedMilkRecord['status'] = isValid ? 'valid' : 'needs_review';

      records.push({
        id: `milk-row-${table.table_id}-${rIdx}-${Date.now()}`,
        sourceTableId: table.table_id,
        sourceRowIndex: rIdx + 1,
        originalRow: rowDict,
        rawRowText: row.filter(Boolean).join(' | '),
        matchedFarmerId: matchedFarmer?.id,
        matchedFarmerName: matchedFarmer?.name,
        farmerSearchQuery: detectedFarmerSearch || detectedPhone || detectedIdCode,
        extractedFarmerIdCode: detectedIdCode,
        extractedPhone: detectedPhone,
        extractedName: detectedFarmerSearch,
        collectionDate: detectedDate,
        session: detectedSession,
        quantityLitres: detectedQty,
        notes: `Imported from Register Image (Row #${rIdx + 1})`,
        status,
        errors,
        warnings,
        isDuplicate: false,
        selected: isValid,
        isExpanded: !isValid,
      });
    }
  }

  return records;
}

/**
 * Service to execute OCR API call
 */
export async function uploadImageToOcr(fileUriOrBlob: any, filename = 'register.jpg'): Promise<OCRResponse> {
  const ocrEndpoint = (Config as any).DEFAULT_OCR_URL || process.env.EXPO_PUBLIC_OCR_API_URL || 'http://106.51.21.4/api/v1/ocr/table';

  const formData = new FormData();

  if (typeof fileUriOrBlob === 'string') {
    const fileObj: any = {
      uri: fileUriOrBlob,
      name: filename,
      type: 'image/jpeg',
    };
    formData.append('file', fileObj);
  } else if (fileUriOrBlob instanceof Blob || (typeof File !== 'undefined' && fileUriOrBlob instanceof File)) {
    formData.append('file', fileUriOrBlob, filename);
  } else if (fileUriOrBlob && fileUriOrBlob.uri) {
    formData.append('file', {
      uri: fileUriOrBlob.uri,
      name: fileUriOrBlob.name || filename,
      type: fileUriOrBlob.type || 'image/jpeg',
    } as any);
  } else {
    throw new Error('Unsupported image input format.');
  }

  const response = await axios.post(ocrEndpoint, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      Accept: 'application/json',
    },
    timeout: 60000,
  });

  return response.data;
}
