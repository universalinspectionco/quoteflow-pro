import React, { useState } from 'react';
import { AppDatabase, Quotation, QuoteType, Settings } from '../types/quotation';
import { StorageService } from '../services/storage';
import { parseFlexibleDate } from '../utils/formatters';
import * as XLSX from 'xlsx';
import { generateId } from '../utils/formatters';

interface ImportPastQuotesModalProps {
  db: AppDatabase;
  setDb: React.Dispatch<React.SetStateAction<AppDatabase>>;
  onClose: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export function ImportPastQuotesModal({ db, setDb, onClose, showToast }: ImportPastQuotesModalProps) {
  const [loading, setLoading] = useState(false);
  const [parsedCount, setParsedCount] = useState(0);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      let importedQuotes: Quotation[] = [];

      if (file.name.endsWith('.json')) {
        const text = await file.text();
        const data = JSON.parse(text);
        if (Array.isArray(data)) {
          importedQuotes = data.map((q: any) => ({
            ...q,
            id: q.id || generateId(),
            date: parseFlexibleDate(q.date) || q.date || '',
            type: q.type || 'std',
            items: Array.isArray(q.items) ? q.items.map((item: any) => ({
              d: item.d || item.description || '',
              q: Number(item.q) || Number(item.qty) || Number(item.quantity) || 0,
              r: Number(item.r) || Number(item.rate) || Number(item.unit_price) || 0,
              sns: item.sns || item.serialNumbers || '',
              sz: item.sz || item.size || '',
              cl: item.cl || item.classRating || '',
              rm: item.rm || item.remarks || '',
            })) : [],
          }));
        } else if (data.quotes && Array.isArray(data.quotes)) {
          importedQuotes = data.quotes.map((q: any) => ({
            ...q,
            id: q.id || generateId(),
            date: parseFlexibleDate(q.date) || q.date || '',
            type: q.type || 'std',
            items: Array.isArray(q.items) ? q.items.map((item: any) => ({
              d: item.d || item.description || '',
              q: Number(item.q) || 0,
              r: Number(item.r) || 0,
              sns: item.sns || '',
              sz: item.sz || '',
              cl: item.cl || '',
              rm: item.rm || '',
            })) : [],
          }));
        }
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<any>(sheet);
        importedQuotes = rows.map((row: any, idx: number) => ({
          id: `import-${Date.now()}-${idx}`,
          type: 'std' as QuoteType,
          ref: String(row.Ref || row.REF || row.Reference || ''),
          client: String(row.Client || row.client || ''),
          attn: String(row.Attn || row.attn || row['Attention'] || ''),
          location: String(row.Location || row.location || ''),
          title: String(row.Title || row.title || 'QUOTATION'),
          intro: String(row.Intro || row.intro || ''),
          closing: String(row.Closing || row.closing || ''),
          tc: String(row.Terms || row.tc || ''),
          vat: Number(row.VAT) || 15,
          status: (String(row.Status) || 'Draft') as any,
          notes: '',
          delivery: '',
          service: '',
          sign: false,
          isNew: false,
          date: parseFlexibleDate(row.Date || row.DATE || row.date) || '',
          items: Array.isArray(row.Items) ? row.Items.map((item: any) => ({
            d: String(item.d || item.Description || item.description || ''),
            q: Number(item.q || item.Qty || item.qty || item.Quantity || 0),
            r: Number(item.r || item.Rate || item.rate || item.Unit_Price || 0),
            sz: String(item.sz || item.Size || ''),
            cl: String(item.cl || item.Class || ''),
            rm: String(item.rm || item.Remarks || ''),
          })) : [{ d: String(row.Description || row.description || ''), q: 1, r: 0 }],
        }));
      }

      if (importedQuotes.length === 0) {
        showToast('No quotes found in file', 'error');
        setLoading(false);
        return;
      }

      setDb(prev => ({ ...prev, quotes: [...prev.quotes, ...importedQuotes] }));
      setParsedCount(importedQuotes.length);
      showToast(`Imported ${importedQuotes.length} quote(s)`, 'success');
      onClose();
    } catch (err: any) {
      showToast('Import failed: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-slate-800 border border-white/10 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        <h2 className="text-white text-lg font-bold mb-2">📥 Import Past Quotes</h2>
        <p className="text-slate-400 text-sm mb-5">Import quotes from JSON or Excel files (.json, .xlsx)</p>

        <label className="block w-full py-3 border-2 border-dashed border-white/20 rounded-xl text-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-500/10 transition-all">
          <input type="file" accept=".json,.xlsx,.xls" onChange={handleFile} className="hidden" />
          <span className="text-slate-300 text-sm">{loading ? '⏳ Processing...' : '📂 Choose File'}</span>
        </label>

        {parsedCount > 0 && (
          <div className="mt-3 text-emerald-400 text-sm text-center">✅ Imported {parsedCount} quote(s)</div>
        )}

        <button onClick={onClose} className="mt-4 w-full py-2 text-slate-400 hover:text-white text-sm border border-white/10 rounded-lg hover:bg-white/5 transition-colors">
          Close
        </button>
      </div>
    </div>
  );
}