import React, { useState } from 'react';
import { AppDatabase, CompanyPriceBook } from '../types/quotation';

interface ImportPriceBookModalProps {
  db: AppDatabase;
  setDb: React.Dispatch<React.SetStateAction<AppDatabase>>;
  onClose: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export function ImportPriceBookModal({ db, setDb, onClose, showToast }: ImportPriceBookModalProps) {
  const [jsonInput, setJsonInput] = useState('');
  const [error, setError] = useState('');

  function handleImport() {
    setError('');
    try {
      const parsed = JSON.parse(jsonInput);
      if (!parsed.items && !parsed.prices) throw new Error('Invalid format');

      const prices: Record<string, CompanyPriceBook> = {};
      if (parsed.prices) {
        Object.entries(parsed.prices).forEach(([k, v]: [string, any]) => {
          prices[k.toLowerCase()] = { name: String(v.name || k), items: v.items || {} };
        });
      } else if (parsed.items) {
        // Flat structure
        Object.entries(parsed.items).forEach(([k, v]: [string, any]) => {
          if (!prices[v.clientKey || 'default']) {
            prices[v.clientKey || 'default'] = { name: v.clientName || 'Default Client', items: {} };
          }
          prices[v.clientKey || 'default'].items[(v.desc || '').toLowerCase()] = {
            d: v.desc || '', bd: v.desc || '', sz: v.size || '', cl: v.class || '',
            c: v.code || '', r: Number(v.rate) || 0, date: v.date || '',
            h: v.history ? v.history.map((h: any) => ({ r: h.rate || 0, date: h.date || '', ref: '', src: '' })) : [],
          };
        });
      }

      setDb(prev => ({ ...prev, prices: { ...prev.prices, ...prices } }));
      showToast(`Imported price book: ${Object.keys(prices).length} companies`, 'success');
      onClose();
    } catch (err: any) {
      setError(err.message);
      showToast('Import failed: ' + err.message, 'error');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-slate-800 border border-white/10 rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        <h2 className="text-white text-lg font-bold mb-2">📊 Import Price Book</h2>
        <p className="text-slate-400 text-sm mb-4">Paste JSON price book data below.</p>

        <textarea
          value={jsonInput}
          onChange={e => setJsonInput(e.target.value)}
          placeholder={'{"Majan": {"name":"Majan","items":{"electric hoist":{"d":"Electric Hoist","r":26.0,"date":"2026-01-01","h":[{"r":26.0,"date":"2026-01-01","ref":"","src":""}]}}}}'}
          rows={8}
          className="w-full px-3 py-2 rounded-lg border border-white/10 text-sm text-white bg-white/5 font-mono resize-none"
        />
        {error && <div className="text-red-400 text-xs mt-1">{error}</div>}

        <div className="mt-4 flex gap-3">
          <button onClick={handleImport} disabled={!jsonInput.trim()}
            className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors">
            ✅ Import
          </button>
          <button onClick={onClose}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}