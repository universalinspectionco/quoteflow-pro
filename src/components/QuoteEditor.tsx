import React, { useState, useEffect, useRef } from 'react';
import { AppDatabase, Quotation, LineItem, QuoteType, UiTheme } from '../types/quotation';
import { generateId, todayISO, formatCurrency, calculateTotals } from '../utils/formatters';
import { PdfGeneratorService } from '../services/pdfGenerator';
import { ExcelGeneratorService } from '../services/excelGenerator';
import { WordGeneratorService } from '../services/wordGenerator';
import { AiQuoteStudio } from './AiQuoteStudio';
import { PdfPreviewModal } from './PdfPreviewModal';

interface QuoteEditorProps {
  db: AppDatabase;
  setDb: React.Dispatch<React.SetStateAction<AppDatabase>>;
  initialQuoteId: string | null;
  isNew: boolean;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onSave: (q: Quotation) => void;
  onBack: () => void;
  onDuplicate: (q: Quotation) => void;
}

export function QuoteEditor({ db, setDb, initialQuoteId, isNew, showToast, onSave, onBack, onDuplicate }: QuoteEditorProps) {
  const isDark = (db.set.uiTheme as UiTheme || 'dark') === 'dark';
  const settings = db.set;

  const createEmpty = (type: QuoteType): Quotation => ({
    id: '', type, ref: `${settings.prefix}${settings.next}`, date: todayISO(),
    client: '', attn: '', location: '',
    title: type === 'valve' ? settings.titleV : settings.title,
    sub: '', revised: false, rateNote: settings.rateNote, vatNote: settings.vatNote,
    showTot: true, showRm: false, via: '', clientCode: '', svc: '', dept: '', spDept: '',
    delivery: settings.delivery, service: settings.service, intro: settings.intro,
    items: [{ d: '', q: 1, r: 0 }], tc: settings.tcv, vat: settings.vat,
    status: 'Draft', notes: '', closing: settings.closing, sign: true, isNew: true,
  });

  const [quote, setQuote] = useState<Quotation>(() => {
    if (!isNew && initialQuoteId) {
      return db.quotes.find(q => q.id === initialQuoteId) ?? createEmpty('std');
    }
    return createEmpty('std');
  });
  const [dirty, setDirty] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!dirty) return;
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      setDb(prev => {
        const idx = prev.quotes.findIndex(q => q.id === quote.id);
        if (idx >= 0) { const qs = [...prev.quotes]; qs[idx] = quote; return { ...prev, quotes: qs }; }
        return { ...prev, quotes: [...prev.quotes, quote] };
      });
    }, 400);
  }, [quote, dirty, setDb]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onSave(quote); onBack(); }
      if (e.ctrlKey && e.key === 's') { e.preventDefault(); handleSaveAndClose(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [quote]);

  const updateField = <K extends keyof Quotation>(field: K, value: Quotation[K]) => {
    setQuote(prev => ({ ...prev, [field]: value }));
    setDirty(true);
  };

  const addItem = () => updateField('items', [...quote.items, { d: '', q: 1, r: 0 }]);

  const updateItem = (idx: number, field: keyof LineItem, value: any) => {
    const updated = quote.items.map((item, i) => i === idx ? { ...item, [field]: value } : item);
    updateField('items', updated);
  };

  const removeItem = (idx: number) => {
    if (quote.items.length <= 1) return;
    updateField('items', quote.items.filter((_, i) => i !== idx));
  };

  const totals = calculateTotals(quote);

  const handleSaveAndClose = () => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    if (isNew && !quote.id) {
      updateField('id', generateId());
    }
    setDirty(false);
    onSave(quote);
    setDb(prev => ({ ...prev, set: { ...prev.set, next: prev.set.next + 1 } }));
    showToast('Quote saved!', 'success');
  };

  const handleExportPdf = () => {
    PdfGeneratorService.downloadQuotePdf(quote, settings);
    showToast('PDF exported!', 'success');
  };

  const handleExportExcel = () => {
    ExcelGeneratorService.downloadQuoteExcel(quote, settings);
    showToast('Excel exported!', 'success');
  };

  const handleExportWord = async () => {
    await WordGeneratorService.downloadQuoteWord(quote, settings);
    showToast('Word exported!', 'success');
  };

  const handleDuplicate = () => {
    onDuplicate(quote);
    showToast('Duplicated!', 'success');
  };

  const inputClass = `w-full px-3 py-1.5 rounded-lg border text-sm ${isDark ? 'bg-white/5 border-white/10 focus:border-indigo-500' : 'bg-white border-gray-300'}`;
  const labelClass = `block text-xs mb-1 ${isDark ? 'opacity-60' : 'opacity-70'}`;
  const btnClass = 'px-3 py-1.5 rounded-lg text-sm transition-colors';

  return (
    <div className={`flex h-full ${isDark ? 'text-white' : 'text-gray-900'}`}>
      {/* Main Editor */}
      <div className={`flex-1 overflow-y-auto p-6 ${isDark ? 'bg-black/20' : 'bg-white/50'}`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <button onClick={onBack} className={`${btnClass} ${isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-gray-200 hover:bg-gray-300'}`}>← Back</button>
          <h2 className="text-lg font-bold">{isNew ? '📝 New Quotation' : '✏️ Edit Quotation'}</h2>
          <div className="flex gap-2">
            <button onClick={() => setShowPdfPreview(true)} className={`${btnClass} bg-blue-600 hover:bg-blue-700 text-white`}>👁 Preview PDF</button>
          </div>
        </div>

        {/* Meta Fields */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {[
            ['ref', 'Reference', quote.ref],
            ['date', 'Date', quote.date],
            ['client', 'Client', quote.client],
            ['attn', 'Attention', quote.attn],
            ['location', 'Location', quote.location],
          ].map(([key, label, val]) => (
            <div key={key}>
              <label className={labelClass}>{label}</label>
              <input value={String(val)} onChange={e => updateField(key as any, e.target.value)} className={inputClass} />
            </div>
          ))}
          <div>
            <label className={labelClass}>Status</label>
            <select value={quote.status} onChange={e => updateField('status', e.target.value as any)} className={inputClass}>
              {(['Draft','Waiting For PO','Job Received','Under Process','Completed','Lost'] as const).map(s => (<option key={s} value={s}>{s}</option>))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Title</label>
            <input value={quote.title} onChange={e => updateField('title', e.target.value)} className={inputClass} />
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm font-semibold ${isDark ? 'opacity-80' : ''}`}>Line Items</span>
            <button onClick={addItem} className="text-xs px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors">+ Add Item</button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className={isDark ? 'bg-white/5' : 'bg-gray-100'}>
                  <th className="px-2 py-1.5 text-left w-8">#</th>
                  <th className="px-2 py-1.5 text-left">Description</th>
                  <th className="px-2 py-1.5 text-right w-16">Qty</th>
                  <th className="px-2 py-1.5 text-right w-24">Rate (SAR)</th>
                  <th className="px-2 py-1.5 text-right w-24">Amount</th>
                  <th className="px-2 py-1.5 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {quote.items.map((item, idx) => (
                  <tr key={idx} className={`border-t ${isDark ? 'border-white/5' : 'border-gray-200'}`}>
                    <td className="px-2 py-1 text-center opacity-50">{idx + 1}</td>
                    <td className="px-2 py-1"><input value={item.d} onChange={e => updateItem(idx, 'd', e.target.value)} placeholder="Service description" className={`w-full px-2 py-1 rounded text-sm ${isDark ? 'bg-white/5' : 'bg-gray-50'}`} /></td>
                    <td className="px-2 py-1"><input type="number" min="0" step="1" value={item.q} onChange={e => updateItem(idx, 'q', parseFloat(e.target.value) || 0)} className={`w-full px-2 py-1 rounded text-sm text-right ${isDark ? 'bg-white/5' : 'bg-gray-50'}`} /></td>
                    <td className="px-2 py-1"><input type="number" min="0" step="0.01" value={item.r} onChange={e => updateItem(idx, 'r', parseFloat(e.target.value) || 0)} className={`w-full px-2 py-1 rounded text-sm text-right ${isDark ? 'bg-white/5' : 'bg-gray-50'}`} /></td>
                    <td className="px-2 py-1 text-right font-mono text-xs">{formatCurrency(item.q * item.r)}</td>
                    <td className="px-2 py-1 text-center">
                      <button onClick={() => removeItem(idx)} disabled={quote.items.length <= 1} className="text-red-400 hover:text-red-300 disabled:opacity-30">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className={`border-t font-semibold ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
                  <td colSpan={4} className="px-2 py-1 text-right">Subtotal:</td>
                  <td className="px-2 py-1 text-right font-mono">{formatCurrency(totals.subtotal)}</td>
                  <td></td>
                </tr>
                <tr>
                  <td colSpan={4} className={`px-2 py-1 text-right ${isDark ? 'opacity-70' : 'opacity-60'}`}>VAT ({quote.vat}%):</td>
                  <td className="px-2 py-1 text-right font-mono">{formatCurrency(totals.vatAmount)}</td>
                  <td></td>
                </tr>
                <tr className={`border-t font-bold ${isDark ? 'bg-indigo-600/20' : 'bg-indigo-50'}`}>
                  <td colSpan={4} className="px-2 py-1 text-right">Net Total:</td>
                  <td className="px-2 py-1 text-right font-mono text-base">{formatCurrency(totals.netTotal)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Intro / Closing / TC */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className={labelClass}>Introduction</label>
            <textarea value={quote.intro} onChange={e => updateField('intro', e.target.value)} rows={3} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Closing</label>
            <textarea value={quote.closing} onChange={e => updateField('closing', e.target.value)} rows={3} className={inputClass} />
          </div>
        </div>
        <div className="mb-4">
          <label className={labelClass}>Terms & Conditions</label>
          <textarea value={quote.tc} onChange={e => updateField('tc', e.target.value)} rows={4} className={inputClass} />
        </div>

        {/* Export Buttons */}
        <div className="flex gap-2 flex-wrap">
          <button onClick={handleSaveAndClose} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition-colors">💾 Save & Close</button>
          <button onClick={handleExportPdf} className={`px-4 py-2 rounded-lg text-sm ${isDark ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-red-500 hover:bg-red-600 text-white'}`}>📄 Export PDF</button>
          <button onClick={handleExportExcel} className={`px-4 py-2 rounded-lg text-sm ${isDark ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-green-500 hover:bg-green-600 text-white'}`}>📊 Export Excel</button>
          <button onClick={handleExportWord} className={`px-4 py-2 rounded-lg text-sm ${isDark ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}>📝 Export Word</button>
          <button onClick={handleDuplicate} className={`px-4 py-2 rounded-lg text-sm ${isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-gray-200 hover:bg-gray-300'}`}>📋 Duplicate</button>
        </div>
      </div>

      {/* Right Sidebar */}
      <div className={`w-64 flex-shrink-0 overflow-y-auto border-l p-4 space-y-4 ${isDark ? 'border-white/10 bg-black/20' : 'border-gray-200 bg-gray-50'}`}>
        <div>
          <label className={labelClass}>VAT (%)</label>
          <input type="number" min="0" max="100" value={quote.vat} onChange={e => updateField('vat', parseFloat(e.target.value) || 0)} className={inputClass} />
        </div>
        <AiQuoteStudio quote={quote} setQuote={updateField} showToast={showToast} />
        <div className={`text-xs p-3 rounded-lg ${isDark ? 'bg-white/5 opacity-70' : 'bg-gray-200'}`}>
          <div className="font-semibold mb-1">Shortcuts</div>
          <div>Ctrl+S — Save & close</div>
          <div>Esc — Go back</div>
          <div>Ctrl+Shift+N — New std</div>
          <div>Ctrl+Shift+V — New valve</div>
        </div>
      </div>

      {showPdfPreview && (
        <PdfPreviewModal
          pdfFile={null}
          settings={settings}
          onClose={() => setShowPdfPreview(false)}
          quote={quote}
        />
      )}
    </div>
  );
}