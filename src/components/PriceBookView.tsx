import React, { useState, useMemo } from 'react';
import { AppDatabase, CompanyPriceBook, UiTheme } from '../types/quotation';
import { formatCurrency } from '../utils/formatters';

interface PriceBookViewProps {
  db: AppDatabase;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export function PriceBookView({ db }: PriceBookViewProps) {
  const isDark = (db.set.uiTheme as UiTheme || 'dark') === 'dark';
  const [search, setSearch] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);

  const companies = useMemo(() => Object.values(db.prices), [db.prices]);

  const filteredItems = useMemo(() => {
    if (!selectedCompany) return [];
    const pb = db.prices[selectedCompany];
    if (!pb) return [];
    const items = Object.values(pb.items);
    if (!search.trim()) return items;
    const s = search.toLowerCase();
    return items.filter(item => item.d.toLowerCase().includes(s) || item.c?.toLowerCase().includes(s));
  }, [selectedCompany, db.prices, search]);

  return (
    <div className={`flex h-full ${isDark ? 'text-white' : 'text-gray-900'}`}>
      {/* Companies List */}
      <aside className={`w-56 flex-shrink-0 border-r overflow-y-auto p-3 space-y-1 ${isDark ? 'border-white/10 bg-black/30' : 'border-gray-200 bg-gray-50'}`}>
        <h3 className="text-sm font-semibold px-2 py-1 opacity-60 uppercase tracking-wider">Companies</h3>
        <button onClick={() => setSelectedCompany(null)}
          className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${!selectedCompany ? (isDark ? 'bg-indigo-600/30 text-indigo-300' : 'bg-indigo-100 text-indigo-700') : (isDark ? 'hover:bg-white/10' : 'hover:bg-gray-200')}`}>
          📒 All ({companies.length})
        </button>
        {companies.map(company => (
          <button key={company.name} onClick={() => setSelectedCompany(company.name)}
            className={`w-full text-left text-sm px-3 py-2 rounded-lg truncate transition-colors ${selectedCompany === company.name ? (isDark ? 'bg-indigo-600/30 text-indigo-300' : 'bg-indigo-100 text-indigo-700') : (isDark ? 'hover:bg-white/10' : 'hover:bg-gray-200')}`}>
            {company.name}
          </button>
        ))}
        <div className={`mt-4 pt-4 border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
          <div className="text-xs opacity-50 px-2">{companies.reduce((s, c) => s + Object.keys(c.items).length, 0)} total price items</div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">{selectedCompany ? selectedCompany : 'Price Book Overview'}</h2>
          <input
            placeholder="Search items..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={`text-sm px-3 py-1.5 rounded-lg border w-48 ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-300'}`}
          />
        </div>

        {!selectedCompany && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {companies.map(company => (
              <button key={company.name} onClick={() => setSelectedCompany(company.name)}
                className={`text-left p-4 rounded-xl border transition-all hover:shadow-lg ${isDark ? 'border-white/10 bg-white/5 hover:bg-white/10' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
                <div className="font-semibold">{company.name}</div>
                <div className={`text-xs mt-1 ${isDark ? 'opacity-60' : 'opacity-70'}`}>{Object.keys(company.items).length} price items</div>
                <div className="text-xs mt-1 opacity-50">Click to view details</div>
              </button>
            ))}
          </div>
        )}

        {selectedCompany && (
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className={isDark ? 'bg-white/5' : 'bg-gray-100'}>
                  <th className="px-3 py-2.5 text-left">Description</th>
                  <th className="px-3 py-2.5 text-left">Size</th>
                  <th className="px-3 py-2.5 text-left">Class</th>
                  <th className="px-3 py-2.5 text-right">Current Rate (SAR)</th>
                  <th className="px-3 py-2.5 text-right">Last Update</th>
                  <th className="px-3 py-2.5 text-right">History</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length === 0 && (
                  <tr><td colSpan={6} className="p-8 text-center opacity-50">No matching items.</td></tr>
                )}
                {filteredItems.map((item, idx) => (
                  <tr key={idx} className={`border-t ${isDark ? 'border-white/5 hover:bg-white/5' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <td className="px-3 py-2.5">{item.d}</td>
                    <td className="px-3 py-2.5 text-xs opacity-70">{item.sz || '-'}</td>
                    <td className="px-3 py-2.5 text-xs opacity-70">{item.cl || '-'}</td>
                    <td className="px-3 py-2.5 text-right font-mono font-semibold">{formatCurrency(item.r)}</td>
                    <td className="px-3 py-2.5 text-right text-xs">{item.date || '-'}</td>
                    <td className="px-3 py-2.5 text-right text-xs">{item.h?.length || 0} entries</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}