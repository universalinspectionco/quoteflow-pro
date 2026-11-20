import { AppDatabase, Quotation, Settings, CompanyPriceBook, LineItem, SessionStats } from '../types/quotation';
import { INITIAL_DATABASE } from '../data/initialData';
import { parseFlexibleDate } from '../utils/formatters';
import { FileStorageService } from './fileStorageService';

const STORAGE_KEY = 'quoteflow_v2_db';
const VERSION_KEY = 'quoteflow_v2_version';
const STATS_KEY = 'quoteflow_v2_stats';

export class StorageService {
  private static cachedDb: AppDatabase | null = null;
  private static saveTimeout: ReturnType<typeof setTimeout> | null = null;
  public static fileHandle: any = null;
  public static statusMessage: string = '';
  public static version: string = '2.0.0';

  public static loadDatabase(): AppDatabase {
    if (this.cachedDb) return this.cachedDb;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          // Migrate old schema
          const sanitizedPrices: Record<string, CompanyPriceBook> = {};
          Object.entries(INITIAL_DATABASE.prices).forEach(([k, v]) => {
            sanitizedPrices[k] = { name: v.name || k, items: { ...(v.items || {}) } };
          });
          const rawPrices = parsed.prices && typeof parsed.prices === 'object' ? parsed.prices : {};
          Object.entries(rawPrices).forEach(([k, v]: [string, any]) => {
            if (v && typeof v === 'object') {
              sanitizedPrices[k] = {
                name: String(v.name || sanitizedPrices[k]?.name || k),
                items: (v.items && typeof v.items === 'object') ? v.items : (sanitizedPrices[k]?.items || {}),
              };
            }
          });

          const sanitizedQuotes = Array.isArray(parsed.quotes)
            ? parsed.quotes.map((q: any) => ({ ...q, date: parseFlexibleDate(q?.date) || q?.date || '' }))
            : [];

          const rawSet = parsed.set || {};
          const currentVersion = localStorage.getItem(VERSION_KEY);
          if (currentVersion !== this.version) {
            console.log(`Migrating database from v${currentVersion} to v${this.version}`);
          }
          localStorage.setItem(VERSION_KEY, this.version);

          const sanitizedSet: Settings = {
            ...INITIAL_DATABASE.set,
            ...rawSet,
            bgType: (rawSet.bgType === 'video' && rawSet.bgVideoUrl) || (rawSet.bgType === 'image' && rawSet.bgImage)
              ? rawSet.bgType : 'canvas',
            bgAnimationPreset: rawSet.bgAnimationPreset || INITIAL_DATABASE.set.bgAnimationPreset || 'particles',
            bgOpacity: typeof rawSet.bgOpacity === 'number' && rawSet.bgOpacity >= 30 ? rawSet.bgOpacity : 80,
            bgPlayState: rawSet.bgPlayState || 'playing',
            bgOverlay: rawSet.bgOverlay || 'none',
            uiTheme: rawSet.uiTheme || 'dark',
            lang: rawSet.lang || 'en',
          };

          // Load session stats
          let stats: SessionStats | undefined;
          try {
            const rawStats = JSON.parse(localStorage.getItem(STATS_KEY) || '{}');
            if (rawStats.lastLogin) {
              stats = {
                lastLogin: rawStats.lastLogin,
                totalSessions: (rawStats.totalSessions || 0) + 1,
                totalQuotationsCreated: rawStats.totalQuotationsCreated || 0,
                startDate: rawStats.startDate || this.getStartDate(sanitizedQuotes),
              };
            }
          } catch {}
          if (!stats) {
            stats = {
              lastLogin: new Date().toISOString().slice(0, 10),
              totalSessions: 1,
              totalQuotationsCreated: sanitizedQuotes.length,
              startDate: this.getStartDate(sanitizedQuotes),
            };
          }
          localStorage.setItem(STATS_KEY, JSON.stringify(stats));

          this.cachedDb = { quotes: sanitizedQuotes, set: sanitizedSet, prices: sanitizedPrices, pb: 1, stats };
          return this.cachedDb;
        }
      }
    } catch (e) {
      console.warn('Failed to load database:', e);
    }

    const defaultDb: AppDatabase = JSON.parse(JSON.stringify(INITIAL_DATABASE));
    defaultDb.stats = {
      lastLogin: todayISO(),
      totalSessions: 1,
      totalQuotationsCreated: defaultDb.quotes.length,
      startDate: todayISO(),
    };
    this.cachedDb = defaultDb;
    this.saveDatabaseImmediate(defaultDb);
    return defaultDb;
  }

  private static getStartDate(quotes: Quotation[]): string {
    if (!quotes.length) return todayISO();
    return quotes.reduce((earliest, q) => q.date < earliest ? q.date : earliest, quotes[0].date);
  }

  public static saveDatabase(db: AppDatabase, onStatusUpdate?: (msg: string) => void): void {
    this.cachedDb = db;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); } catch (e) { console.error('LocalStorage write error:', e); }
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(async () => {
      await this.saveToFileHandle(db);
      if (onStatusUpdate) onStatusUpdate(this.statusMessage);
    }, 600);
  }

  public static saveDatabaseImmediate(db: AppDatabase): void {
    this.cachedDb = db;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); } catch (e) { console.error('LocalStorage immediate write error:', e); }
  }

  private static async saveToFileHandle(db: AppDatabase): Promise<void> {
    if (this.fileHandle) {
      try {
        const writable = await this.fileHandle.createWritable();
        await writable.write(JSON.stringify(db, null, 2));
        await writable.close();
        this.statusMessage = `Saved to ${this.fileHandle.name} at ${new Date().toLocaleTimeString()}`;
      } catch (e: any) {
        this.statusMessage = `File save error: ${e?.message || 'Permission denied'}`;
      }
    }
    if (db.set?.autoSyncDatabaseFile !== false) {
      try {
        const synced = await FileStorageService.syncDatabaseToDirectory(JSON.stringify(db, null, 2));
        if (synced && !this.fileHandle) this.statusMessage = `Synced to folder at ${new Date().toLocaleTimeString()}`;
      } catch {}
    }
  }

  public static recordPriceBook(db: AppDatabase, client: string, items: LineItem[], date: string, ref: string, src: string = 'quote'): number {
    const key = cleanKey(client);
    if (!key) return 0;
    if (!db.prices[key]) db.prices[key] = { name: client.trim(), items: {} };
    const company = db.prices[key];
    let count = 0;
    items.forEach((item) => {
      const desc = String(item.d || '').trim();
      const rate = parseNumber(item.r);
      if (!desc || !(rate > 0)) return;
      const fullDesc = [desc, item.sz, item.cl].filter(Boolean).join(' ');
      const itemKey = cleanKey(fullDesc);
      const historyEntry = { r: rate, date: date || todayISO(), ref, src };
      const existing = company.items[itemKey];
      if (!existing) {
        company.items[itemKey] = { d: fullDesc, bd: desc, sz: item.sz || '', cl: item.cl || '', r: rate, date: historyEntry.date, h: [historyEntry] };
      } else {
        const prevIndex = existing.h.findIndex((x) => x.date <= historyEntry.date);
        if (prevIndex >= 0 && existing.h[prevIndex].r === rate) {
          if (historyEntry.date > existing.h[prevIndex].date) existing.h[prevIndex].date = historyEntry.date;
        } else if (!existing.h.some((x) => x.r === rate && x.date === historyEntry.date)) {
          existing.h.push(historyEntry);
          existing.h.sort((a, b) => b.date.localeCompare(a.date));
          existing.h = existing.h.slice(0, 15);
        }
        existing.r = existing.h[0].r;
        existing.date = existing.h[0].date;
      }
      count++;
    });
    return count;
  }

  public static exportDatabaseJson(db: AppDatabase): void {
    const jsonStr = JSON.stringify(db, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `QuoteFlow-Pro-Backup-${todayISO()}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  public static importDatabaseJson(jsonStr: string): AppDatabase {
    const parsed = JSON.parse(jsonStr);
    if (!parsed.quotes && !parsed.prices) throw new Error('Invalid JSON format.');
    const validated: AppDatabase = {
      quotes: parsed.quotes || [],
      set: { ...INITIAL_DATABASE.set, ...(parsed.set || {}) },
      prices: parsed.prices || {},
      pb: 1,
      stats: parsed.stats || { lastLogin: todayISO(), totalSessions: 1, totalQuotationsCreated: 0, startDate: todayISO() },
    };
    this.saveDatabaseImmediate(validated);
    return validated;
  }
}

function cleanKey(str?: string): string {
  return String(str || '').toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]+/g, ' ').trim();
}
function parseNumber(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const n = parseFloat(String(val).replace(/[,\s]/g, ''));
  return isNaN(n) ? 0 : n;
}
function todayISO(): string { return new Date().toISOString().slice(0, 10); }
