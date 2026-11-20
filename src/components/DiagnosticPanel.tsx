import React, { useState, useEffect } from 'react';
import { AppDatabase, UiTheme } from '../types/quotation';
import { DiagnosticService } from '../services/diagnosticService';
import { StorageService } from '../services/storage';

interface DiagnosticPanelProps {
  db: AppDatabase;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export function DiagnosticPanel({ db, showToast }: DiagnosticPanelProps) {
  const isDark = (db.set.uiTheme as UiTheme || 'dark') === 'dark';
  const [result, setResult] = useState<any>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => { runDiagnosis(); }, []);

  async function runDiagnosis() {
    setChecking(true);
    await new Promise(r => setTimeout(r, 300)); // Simulate async
    try {
      let memUsage = 0;
      if (typeof window !== 'undefined' && (window as any).electronAPI?.getProcessMemoryUsage) {
        memUsage = (window as any).electronAPI.getProcessMemoryUsage();
      }
      const diag = DiagnosticService.diagnose(db);
      if ((window as any).electronAPI) {
        diag.platform = await (window as any).electronAPI.getPlatform();
      }
      diag.memoryMB = memUsage;
      setResult(diag);
    } catch (e: any) {
      showToast('Diagnostics failed: ' + e.message, 'error');
    } finally { setChecking(false); }
  }

  async function handleClearCache() {
    DiagnosticService.clearAppCache();
    showToast('Cache cleared', 'success');
    await runDiagnosis();
  }

  async function handleClearLocalStorage() {
    if (!confirm('This will clear ALL local data including quotes and settings. Are you sure?')) return;
    DiagnosticService.clearLocalStorage();
    (StorageService as any).cachedDb = null;
    showToast('LocalStorage cleared — page will reload.', 'info');
    setTimeout(() => window.location.reload(), 1500);
  }

  async function handleOpenLogs() {
    if ((window as any).electronAPI?.openLogsFolder) {
      await (window as any).electronAPI.openLogsFolder();
    } else {
      showToast('Log folder opening not available in browser mode', 'info');
    }
  }

  if (!result) {
    return (
      <div className={`flex-1 flex items-center justify-center ${isDark ? 'text-white' : ''}`}>
        <div className="text-center">
          <div className="animate-spin text-4xl mb-3">🔍</div>
          <div>Running system diagnostics...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex-1 overflow-y-auto p-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
      <h1 className="text-xl font-bold mb-6">🛡️ Troubleshoot & Diagnostics</h1>

      {/* System Info */}
      <section className={`mb-6 rounded-xl p-4 border ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>
        <h2 className="font-semibold mb-3 flex items-center gap-2">📋 System Information</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          {[
            ['Version', result.version],
            ['Platform', result.platform || navigator.platform],
            ['Browser', result.browser],
            ['Date', new Date(result.timestamp).toLocaleString()],
            ['DB Size', `${result.localStorageSize.toFixed(2)} MB`],
            ['Quotes', String(result.quoteCount)],
            ['Price Books', String(result.priceBookCount)],
            ['Mem Usage', result.memoryMB ? `${result.memoryMB.toFixed(1)} MB` : 'N/A'],
          ].map(([label, val]) => (
            <div key={label}>
              <div className={`text-xs ${isDark ? 'opacity-60' : 'opacity-70'}`}>{label}</div>
              <div className="font-mono">{val}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Issues */}
      {(result.errors.length > 0 || result.warnings.length > 0) && (
        <section className={`mb-6 rounded-xl p-4 border ${isDark ? 'bg-red-900/20 border-red-500/30' : 'bg-red-50 border-red-200'}`}>
          <h2 className="font-semibold mb-3 text-red-400">⚠️ Issues Found</h2>
          {result.errors.map((err: string, i: number) => (
            <div key={i} className="text-red-400 text-sm py-1">❌ {err}</div>
          ))}
          {result.warnings.map((warn: string, i: number) => (
            <div key={i} className="text-yellow-400 text-sm py-1">⚠️ {warn}</div>
          ))}
          {!result.errors.length && !result.warnings.length && (
            <div className="text-emerald-400 text-sm">✅ No issues found — database looks healthy!</div>
          )}
        </section>
      )}

      {/* Suggestions */}
      {result.suggestions.length > 0 && (
        <section className={`mb-6 rounded-xl p-4 border ${isDark ? 'bg-blue-900/20 border-blue-500/30' : 'bg-blue-50 border-blue-200'}`}>
          <h2 className="font-semibold mb-3 text-blue-400">💡 Suggestions</h2>
          {result.suggestions.map((sug: string, i: number) => (
            <div key={i} className="text-blue-300 text-sm py-1">✨ {sug}</div>
          ))}
        </section>
      )}

      {/* Actions */}
      <section className={`mb-6 rounded-xl p-4 border ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>
        <h2 className="font-semibold mb-3 flex items-center gap-2">🔧 Quick Fixes</h2>
        <div className="flex flex-wrap gap-3">
          <button onClick={runDiagnosis} disabled={checking}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm transition-colors">
            🔄 Re-run Diagnostics
          </button>
          <button onClick={handleClearCache}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-gray-200 hover:bg-gray-300'}`}>
            🗑️ Clear Service Worker Cache
          </button>
          <button onClick={handleOpenLogs}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-gray-200 hover:bg-gray-300'}`}>
            📂 Open Logs Folder
          </button>
          <button onClick={handleClearLocalStorage}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors">
            ⚠️ Reset All Local Data
          </button>
        </div>
      </section>

      {/* Export DB */}
      <section className={`rounded-xl p-4 border ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>
        <h2 className="font-semibold mb-3 flex items-center gap-2">📤 Export Database</h2>
        <p className={`text-sm mb-3 ${isDark ? 'opacity-60' : 'opacity-70'}`}>Export all quotes, price books and settings to a JSON backup file.</p>
        <button onClick={() => { StorageService.exportDatabaseJson(db); showToast('Database exported!', 'success'); }}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm transition-colors">
          📥 Download Backup (JSON)
        </button>
      </section>
    </div>
  );
}