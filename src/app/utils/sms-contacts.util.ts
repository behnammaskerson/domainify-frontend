import * as XLSX from 'xlsx';

export interface MobileAnalysis {
  total: number;
  invalid: number;
  duplicates: number;
  sendable: string[];
}

const MOBILE_PATTERN = /^9\d{9}$/;
const SUPPORTED_EXTENSIONS = new Set(['txt', 'xls', 'xlsx']);

export function isSupportedContactsFile(file: File): boolean {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return SUPPORTED_EXTENSIONS.has(ext);
}

export function normalizeMobile(value: string): string {
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('98') && digits.length === 12) {
    digits = digits.slice(2);
  }
  if (digits.startsWith('0') && digits.length === 11) {
    digits = digits.slice(1);
  }
  return digits;
}

export function parseTxtContacts(content: string): string[] {
  return content.split(/[\n,;]+/).map((entry) => entry.trim()).filter(Boolean);
}

export async function parseContactsFile(file: File): Promise<string[]> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'txt') {
    return stripHeaderRow(parseTxtContacts(await file.text()));
  }
  if (ext === 'xls' || ext === 'xlsx') {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return [];
    }
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
    const entries: string[] = [];
    for (const row of rows) {
      if (!Array.isArray(row) || !row.length) {
        continue;
      }
      const cell = row[0];
      if (cell == null) {
        continue;
      }
      const text = String(cell).trim();
      if (text) {
        entries.push(text);
      }
    }
    return stripHeaderRow(entries);
  }
  throw new Error('UNSUPPORTED_FORMAT');
}

export function analyzeMobileEntries(entries: string[]): MobileAnalysis {
  const seen = new Set<string>();
  let invalid = 0;
  let duplicates = 0;
  const sendable: string[] = [];

  for (const entry of entries) {
    const trimmed = entry.trim();
    if (!trimmed) {
      continue;
    }
    const normalized = normalizeMobile(trimmed);
    if (!MOBILE_PATTERN.test(normalized)) {
      invalid++;
      continue;
    }
    if (seen.has(normalized)) {
      duplicates++;
      continue;
    }
    seen.add(normalized);
    sendable.push(normalized);
  }

  return { total: entries.filter((entry) => entry.trim()).length, invalid, duplicates, sendable };
}

function stripHeaderRow(entries: string[]): string[] {
  if (!entries.length) {
    return entries;
  }
  const first = entries[0].trim();
  if (/^mobile$/i.test(first) || first.toLowerCase() === 'شماره' || first.toLowerCase() === 'موبایل') {
    return entries.slice(1);
  }
  return entries;
}
