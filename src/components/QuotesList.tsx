import React, { useState, useMemo } from 'react';
import { AppDatabase, Quotation, QuoteStatus, UiTheme } from '../types/quotation';
import { formatCurrency, formatDateUK } from '../utils/formatters';
import { calculateTotals } from '../utils/formatters';
import { PdfGeneratorService } from '../services/pdfGenerator';

interface QuotesListProps {
  db: AppDatabase;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onCreateNew: () => void;
  onReport: () => void;
  onPriceBook: () => void;
  onSettings: () => void;
  onDiagnostics: () => void;
  onlineStatus: boolean;
  batchSelection: Set<string>;
  onToggleSelect: (id: string) => void;
  onBatchAction: (action: string | null) => void;
  onImportQuotes: () => void;
  onImportPb: () => void;
}

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  Draft: { bg: 'bg-gray-700/60', fg: 'text-gray-300' },
  'Waiting For PO': { bg: 'bg-yellow-600/30', fg: 'text-yellow-300' },
  'Job Received': { bg: 'bg-blue-600/30', fg: 'text-blue-300' },
  'Under Process': { bg: 'bg-purple-600/30', fg: 'text-purple-300' },
  Completed: { bg: 'bg-emerald-600/30', fg: 'text-emerald-300' },
  Lost: { bg: 'bg-red-600/30', fg: 'text-red-300' },
};

type SortField = 'date' | 'ref' | 'client' | 'total';

export function QuotesList({ db, onSelect, onDelete, onCreateNew, onReport, onPriceBook, onSettings, onDiagnostics, onlineStatus, batchSelection, onToggleSelect, onBatchAction, onImportQuotes, onImportPb }: QuotesListProps) {
  const [search, setSearch] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 12;
  const isDark = (db.set.uiTheme as UiTheme || 'dark') === 'dark';
  const selected = batchSelection.size > 0;

  const uniqueClients = useMemo(() => [...new Set(db.quotes.map(q => q.client).filter(Boolean))].sort(), [db.quotes]);

  const filtered = useMemo(() => {
    let list = [...db.quotes];
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(q => q.ref.toLowerCase().includes(s) || q.client.toLowerCase().includes(s) || q.id.includes(s));
    }
    if (filterClient) list = list.filter(q => q.client === filterClient);
    if (filterStatus) list = list.filter(q => q.status === filterStatus);
    list.sort((a, b) => {
      let va: any, vb: any;
      if (sortField === 'date') { va = a.date; vb = b.date; }
      else if (sortField === 'ref') { va = a.ref; vb = b.ref; }
      else if (sortField === 'client') { va = a.client; vb = b.client; }
      else { va = calculateTotals(a).netTotal; vb = calculateTotals(b).netTotal; }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [db.quotes, search, filterClient, filterStatus, sortField, sortDir]);

  const paginated = useMemo(() => filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [filtered, page]);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const handleDeleteSelected = () => {
    if (!confirm(`Delete ${batchSelection.size} selected quote(s)?`)) return;
    [...batchSelection].forEach(id => onDelete(id));
    onBatchAction(null);
  };

  const handleExportPdf = () => {
    db.quotes.filter(q => batchSelection.has(q.id)).forEach(q => PdfGeneratorService.downloadQuotePdf(q, db.set));
    onBatchAction(null);
  };

  const getSortIndicator = (field: SortField) => sortField === field ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

  return (
    <div className={`flex h-full ${isDark ? 'text-white' : 'text-gray-900'}`}>
      {/* Sidebar */}
      <aside className={`w-52 flex-shrink-0 border-r overflow-y-auto p-3 space-y-1 ${isDark ? 'border-white/10 bg-black/30' : 'border-gray-200 bg-gray-50'}`}>
        <div className="mb-4">
          <button onClick={onCreateNew} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-colors">
            ➕ New Quotation
          </button>
        </div>
        {[
          { label: '📋 All Quotes', action: () => {} },
          { label: '🔍 Report & Analysis', action: onReport },
          { label: '📒 Price Book', action: onPriceBook },
          { label: '⚙️ Settings', action: onSettings },
          { label: '🛡️ Troubleshoot', action: onDiagnostics },
        ].map(item => (
          <button key={item.label} onClick={item.action}
            className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-200'}`}>
            {item.label}
          </button>
        ))}

        <div className={`mt-6 pt-4 border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
          <div className="text-xs font-semibold opacity-60 mb-2 uppercase tracking-wider">Filters</div>
          <input placeholder="Search ref/client..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
            className={`w-full text-sm px-3 py-2 rounded-lg mb-2 border ${isDark ? 'bg-white/5 border-white/10 text-white placeholder:text-gray-500' : 'bg-white border-gray-300'}`} />
          <select value={filterClient} onChange={e => { setFilterClient(e.target.value); setPage(0); }}
            className={`w-full text-sm px-2 py-1.5 rounded mb-2 border ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-300'}`}>
            <option value="">All Clients</option>
            {uniqueClients.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(0); }}
            className={`w-full text-sm px-2 py-1.5 rounded mb-2 border ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-300'}`}>
            <option value="">All Statuses</option>
            {(['Draft','Waiting For PO','Job Received','Under Process','Completed','Lost'] as QuoteStatus[]).map(s => (<option key={s} value={s}>{s}</option>))}
          </select>
        </div>

        <div className={`mt-6 pt-4 border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
          <div className="text-xs font-semibold opacity-60 mb-2 uppercase tracking-wider">Actions</div>
          <button onClick={onImportQuotes} className={`w-full text-left text-sm px-3 py-2 rounded-lg mb-1 ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-200'}`}>📥 Import Quotes</button>
          <button onClick={onImportPb} className={`w-full text-left text-sm px-3 py-2 rounded-lg ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-200'}`}>📊 Import Price Book</button>
        </div>

        <div className={`mt-6 pt-4 border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
          <div className="text-xs font-semibold opacity-60 mb-1">Quotes</div>
          <div className="text-lg font-bold">{db.quotes.length}</div>
          <div className="text-xs opacity-60">{Object.keys(STATUS_COLORS).length} statuses</div>
          {!onlineStatus && <div className="mt-2 text-xs text-red-400">⚠ Offline mode</div>}
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto p-5">
        {selected ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{batchSelection.size} Selected</h2>
              <div className="flex gap-2">
                <button onClick={handleExportPdf} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg">📄 Export PDF</button>
                <button onClick={handleDeleteSelected} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg">🗑 Delete</button>
                <button onClick={() => onBatchAction(null)} className={`px-3 py-1.5 text-sm rounded-lg ${isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-gray-200'}`}>Cancel</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">All Quotations</h2>
            <div className={`text-sm ${isDark ? 'opacity-60' : 'opacity-70'}`}>{filtered.length} of {db.quotes.length} quotes</div>
          </div>
        )}

        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead className={`sticky top-0 z-10 ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
              <tr>
                {selected && <th className="px-3 py-2.5 text-left"><input type="checkbox" /></th>}
                {(['Ref','Date','Client','Type','Status','Total'] as const).map(h => (
                  <th key={h} onClick={() => toggleSort(h.toLowerCase() as SortField)}
                    className={`px-3 py-2.5 text-left cursor-pointer select-none hover:bg-white/5 ${h === 'Total' ? 'text-right' : ''}`}>
                    {h}{getSortIndicator(h.toLowerCase() as SortField)}
                  </th>
                ))}
                <th className="px-3 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 && (
                <tr><td colSpan={7} className="p-8 text-center opacity-50">No quotations found.</td></tr>
              )}
              {paginated.map(q => {
                const totals = calculateTotals(q);
                const sc = STATUS_COLORS[q.status as string] || STATUS_COLORS['Draft'];
                return (
                  <tr key={q.id} onClick={() => !selected && onSelect(q.id)}
                    className={`cursor-pointer border-t transition-colors ${batchSelection.has(q.id) ? 'bg-indigo-600/30' : isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}>
                    {selected && <td className="px-3 py-2.5"><input type="checkbox" checked={batchSelection.has(q.id)} onChange={() => onToggleSelect(q.id)} /></td>}
                    <td className="px-3 py-2.5 font-mono text-xs">{q.ref}</td>
                    <td className="px-3 py-2.5">{formatDateUK(q.date)}</td>
                    <td className="px-3 py-2.5">{q.client}</td>
                    <td className="px-3 py-2.5">{q.type === 'valve' ? '🔧 Valve' : '📋 Std'}</td>
                    <td className="px-3 py-2.5"><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${sc.bg} ${sc.fg}`}>{q.status}</span></td>
                    <td className="px-3 py-2.5 text-right font-mono">{formatCurrency(totals.netTotal)}</td>
                    <td className="px-3 py-2.5 text-right text-xs" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => onSelect(q.id)} title="Edit" className={`p-1.5 rounded ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-200'}`}>✏️</button>
                        <button onClick={() => { PdfGeneratorService.downloadQuotePdf(q, db.set); }} title="PDF" className={`p-1.5 rounded ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-200'}`}>📄</button>
                        <button onClick={() => onDelete(q.id)} title="Delete" className="p-1.5 rounded hover:bg-red-600/30 text-red-400">🗑</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 text-sm">
            <div>{(page * PAGE_SIZE) + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}</div>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className={`px-3 py-1.5 rounded-lg ${isDark ? 'bg-white/10 hover:bg-white/20 disabled:opacity-30' : 'bg-gray-200 hover:bg-gray-300 disabled:opacity-30'}`}>← Prev</button>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                className={`px-3 py-1.5 rounded-lg ${isDark ? 'bg-white/10 hover:bg-white/20 disabled:opacity-30' : 'bg-gray-200 hover:bg-gray-300 disabled:opacity-30'}`}>Next →</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}