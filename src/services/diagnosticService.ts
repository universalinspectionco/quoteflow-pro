import { AppDatabase, QuoteStatus } from '../types/quotation';

export type DiagnosticsResult = {
  version: string;
  timestamp: string;
  platform: string;
  browser: string;
  localStorageSize: number;
  databaseValid: boolean;
  quoteCount: number;
  priceBookCount: number;
  errors: string[];
  warnings: string[];
  suggestions: string[];
  memoryMB?: number;
};

export class DiagnosticService {
  static diagnose(db: AppDatabase): DiagnosticsResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Check localStorage size
    let totalSize = 0;
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        totalSize += (localStorage[key].length * 2); // UTF-16
      }
    }
    const localStorageSizeMB = Math.round(totalSize / 1024 / 1024 * 100) / 100;

    // Validate database
    let databaseValid = true;
    if (!db.quotes || !Array.isArray(db.quotes)) {
      errors.push('Database has no valid quotes array');
      databaseValid = false;
    }
    if (!db.set) {
      errors.push('Database missing settings');
      databaseValid = false;
    }

    // Check quotes integrity
    db.quotes.forEach((q, i) => {
      if (!q.id) { errors.push(`Quote at index ${i} missing ID`); databaseValid = false; }
      if (!q.ref) { warnings.push(`Quote ${i} missing reference number`); }
      if (!q.date) { warnings.push(`Quote ${i} missing date`); }
      if (!q.client) { warnings.push(`Quote ${i} missing client`); }
      if (!q.items || q.items.length === 0) { warnings.push(`Quote ${i} has no line items`); }
      if (q.type !== 'std' && q.type !== 'valve') { errors.push(`Quote ${i} has invalid type: ${q.type}`); }
      const validStatuses: QuoteStatus[] = ['Draft','Waiting For PO','Job Received','Under Process','Completed','Lost'];
      if (q.status && !validStatuses.includes(q.status)) { warnings.push(`Quote ${q.id} has non-standard status: ${q.status}`); }
    });

    // Price book checks
    const emptyPriceBooks = Object.entries(db.prices).filter(([_, pb]) => !pb.name || pb.name.trim() === '');
    if (emptyPriceBooks.length > 0) warnings.push(`${emptyPriceBooks.length} price book entries have empty names`);

    // Storage check
    if (localStorageSizeMB > 50) {
      suggestions.push(`LocalStorage is large (${localStorageSizeMB}MB). Consider exporting and cleaning old quotes.`);
    } else if (localStorageSizeMB < 1) {
      suggestions.push('LocalStorage is nearly empty. This may indicate data loss.');
    }

    // Suggestions based on usage
    if (db.quotes.length === 0) {
      suggestions.push('No quotations found. Start by creating your first quotation!');
    }
    if (db.quotes.filter(q => q.status === 'Draft').length > db.quotes.length * 0.5) {
      suggestions.push('Many drafts exist. Consider reviewing and finalizing pending quotes.');
    }

    // Browser info
    const ua = navigator.userAgent;
    let browser = 'Unknown';
    if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Edg')) browser = 'Edge';
    else if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Safari')) browser = 'Safari';

    return {
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      platform: (window as any).electronAPI?.getPlatform ? String((window as any).electronAPI.getPlatform()) : navigator.platform,
      browser,
      localStorageSize: localStorageSizeMB,
      databaseValid,
      quoteCount: db.quotes.length,
      priceBookCount: Object.keys(db.prices).length,
      errors,
      warnings,
      suggestions,
    };
  }

  static clearAppCache(): void {
    // Clear PWA cache
    if ('caches' in window) {
      caches.keys().then(names => names.forEach(n => caches.delete(n))).catch(() => {});
    }
  }

  static clearLocalStorage(keys?: string[]): void {
    const allKeys = keys || Object.keys(localStorage);
    allKeys.forEach(k => localStorage.removeItem(k));
  }
}
