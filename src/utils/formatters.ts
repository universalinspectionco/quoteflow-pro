import { Quotation, LineItem } from '../types/quotation';

export function formatCurrency(value: number | string | undefined | null): string {
  const n = typeof value === 'string' ? parseFloat(value) : (value ?? 0);
  if (isNaN(n)) return '0.00';
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function parseNumber(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const cleaned = String(val).replace(/[,\s]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

export function calculateTotals(quote: Partial<Quotation>): {
  subtotal: number;
  vatAmount: number;
  netTotal: number;
  totalQty: number;
} {
  const items = quote.items || [];
  const subtotal = items.reduce((acc, item) => acc + parseNumber(item.q) * parseNumber(item.r), 0);
  const vatRate = parseNumber(quote.vat ?? 15) / 100;
  return {
    subtotal,
    vatAmount: subtotal * vatRate,
    netTotal: subtotal + subtotal * vatRate,
    totalQty: items.reduce((acc, item) => acc + parseNumber(item.q), 0),
  };
}

export function cleanKey(str?: string): string {
  return String(str || '').toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]+/g, ' ').trim();
}

export function parseSerialNumbers(rawSns?: string): string[] {
  if (!rawSns) return [];
  return String(rawSns).split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean);
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

const MONTH_MAP: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

function toIsoYMD(year: number, month: number, day: number): string {
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return '';
  if (year < 1970 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return '';
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() + 1 !== month || d.getUTCDate() !== day) return '';
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function expandYear(y: number): number {
  return y >= 100 ? y : y <= 69 ? 2000 + y : 1900 + y;
}

export function parseFlexibleDate(input: any): string {
  if (input === null || input === undefined || input === '') return '';
  if (input instanceof Date) {
    const buffered = new Date(input.getTime() + 60000);
    return toIsoYMD(buffered.getFullYear(), buffered.getMonth() + 1, buffered.getDate());
  }
  if (typeof input === 'number') {
    if (!Number.isFinite(input) || input < 20000 || input > 80000) return '';
    const d = new Date(Date.UTC(1899, 11, 30) + Math.round(input) * 86400000);
    return toIsoYMD(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  }
  let s = String(input).trim();
  if (!s || /^nan/i.test(s)) return '';
  if (/^\d{5}(?:\.\d+)?$/.test(s)) {
    const serial = parseFloat(s);
    if (serial >= 20000 && serial <= 80000) {
      const d = new Date(Date.UTC(1899, 11, 30) + Math.round(serial) * 86400000);
      return toIsoYMD(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
    }
  }
  s = s.replace(/(\d{1,2})(?:st|nd|rd|th)\b/gi, '$1').replace(/\s+/g, ' ').trim();
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T\s].*)?$/);
  if (m) return toIsoYMD(parseInt(m[1]), parseInt(m[2]), parseInt(m[3]));
  m = s.match(/^(\d{1,2})[\s\-/.]+([A-Za-z]+)[\s\-/.]+(\d{2,4})(?:\s.*)?$/);
  if (m) { const mn = MONTH_MAP[m[2].toLowerCase()]; if (mn) return toIsoYMD(expandYear(parseInt(m[3])), mn, parseInt(m[1])); }
  m = s.match(/^([A-Za-z]+)[\s\-/.]+(\d{1,2})[\s\-/.]+(\d{2,4})(?:\s.*)?$/);
  if (m) { const mn = MONTH_MAP[m[1].toLowerCase()]; if (mn) return toIsoYMD(expandYear(parseInt(m[3])), mn, parseInt(m[2])); }
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})(?:\s.*)?$/);
  if (m) {
    const a = parseInt(m[1]), b = parseInt(m[2]), y = expandYear(parseInt(m[3]));
    return toIsoYMD(y, b > 12 ? a : b, b > 12 ? b : a);
  }
  return '';
}

export function formatDateUK(dateStr: string): string {
  if (!dateStr) return '';
  const iso = parseFlexibleDate(dateStr) || dateStr;
  try {
    const d = new Date(iso + 'T00:00:00');
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, '-');
  } catch { return dateStr; }
}

export function formatDateLong(dateStr: string): string {
  if (!dateStr) return '';
  const iso = parseFlexibleDate(dateStr) || dateStr;
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const parts = iso.split('-');
  if (parts.length === 3) {
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    if (!isNaN(m) && months[m] && !isNaN(d)) return `${d} ${months[m]} ${parts[0]}`;
  }
  return dateStr;
}

export function sanitizeFilename(q: Partial<Quotation>): string {
  const ref = q.ref || 'Quote';
  const client = q.client || 'Client';
  return `${ref}-${client}`.replace(/[^a-zA-Z0-9_-]/g, '_');
}

export function generateId(): string {
  return `q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
