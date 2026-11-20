import React, { useMemo, useState } from 'react';
import { AppDatabase, UiTheme } from '../types/quotation';
import { formatCurrency } from '../utils/formatters';
import { calculateTotals } from '../utils/formatters';
import { ClientFrequencyChart } from './ClientFrequencyChart';

interface ReportViewProps {
  db: AppDatabase;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export function ReportView({ db }: ReportViewProps) {
  const isDark = (db.set.uiTheme as UiTheme || 'dark') === 'dark';
  const [year] = useState(new Date().getFullYear());

  const stats = useMemo(() => {
    const quotes = db.quotes.filter(q => q.date.startsWith(String(year)));
    let totalRevenue = 0, completedCount = 0, draftCount = 0, activeCount = 0;
    const clientMap: Record<string, number> = {};

    quotes.forEach(q => {
      const t = calculateTotals(q);
      totalRevenue += t.netTotal;
      if (q.status === 'Completed') completedCount++;
      if (q.status === 'Draft') draftCount++;
      if (['Job Received', 'Under Process'].includes(q.status)) activeCount++;
      if (q.client) clientMap[q.client] = (clientMap[q.client] || 0) + 1;
    });

    const sortedClients = Object.entries(clientMap).sort((a, b) => b[1] - a[1]).slice(0, 10);

    return { quotes: quotes.length, totalRevenue, completedCount, draftCount, activeCount, sortedClients };
  }, [db.quotes, year]);

  return (
    <div className={`flex-1 overflow-y-auto p-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
      <h1 className="text-xl font-bold mb-6">📊 Reports & Dashboard</h1>

      {/* Year Selector */}
      <div className="flex items-center gap-3 mb-6">
        <label className={`text-sm ${isDark ? 'opacity-70' : ''}`}>Year:</label>
        <span className="px-3 py-1.5 rounded-lg border text-sm font-semibold">{year}</span>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {[
          { label: 'Total Quotes', value: stats.quotes, color: 'from-blue-600 to-blue-800' },
          { label: 'Revenue', value: formatCurrency(stats.totalRevenue), color: 'from-emerald-600 to-emerald-800' },
          { label: 'Completed', value: stats.completedCount, color: 'from-green-600 to-green-800' },
          { label: 'In Progress', value: stats.activeCount, color: 'from-purple-600 to-purple-800' },
          { label: 'Drafts', value: stats.draftCount, color: 'from-gray-600 to-gray-800' },
        ].map(card => (
          <div key={card.label} className={`bg-gradient-to-br ${card.color} rounded-xl p-4 text-white`}>
            <div className="text-xs opacity-70">{card.label}</div>
            <div className="text-2xl font-bold mt-1">{card.value}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className={`rounded-xl p-4 border ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>
          <h3 className="font-semibold mb-3">Top Clients by Quote Count</h3>
          <ClientFrequencyChart entries={stats.sortedClients} dark={isDark} />
        </div>
        <div className={`rounded-xl p-4 border ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>
          <h3 className="font-semibold mb-3">Status Distribution</h3>
          <StatusChart quotes={db.quotes.filter(q => q.date.startsWith(String(year)))} dark={isDark} />
        </div>
      </div>

      {/* Monthly Breakdown */}
      <div className={`rounded-xl p-4 border ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>
        <h3 className="font-semibold mb-3">Monthly Revenue Breakdown</h3>
        <MonthlyChart quotes={db.quotes.filter(q => q.date.startsWith(String(year)))} dark={isDark} />
      </div>

      {/* Recent Activity */}
      <div className={`mt-6 rounded-xl p-4 border ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>
        <h3 className="font-semibold mb-3">Recent Quotes</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className={isDark ? 'text-left opacity-60' : 'text-left'}>
              <th className="pb-2">Ref</th>
              <th className="pb-2">Client</th>
              <th className="pb-2">Date</th>
              <th className="pb-2">Status</th>
              <th className="pb-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {db.quotes.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8).map(q => {
              const totals = calculateTotals(q);
              return (
                <tr key={q.id} className={`border-t ${isDark ? 'border-white/5' : 'border-gray-200'}`}>
                  <td className="py-2 font-mono text-xs">{q.ref}</td>
                  <td className="py-2">{q.client}</td>
                  <td className="py-2">{q.date}</td>
                  <td className="py-2"><span className={`px-2 py-0.5 rounded-full text-xs ${statusColor(q.status, isDark)}`}>{q.status}</span></td>
                  <td className="py-2 text-right font-mono">{formatCurrency(totals.netTotal)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function statusColor(status: string, isDark: boolean): string {
  const colors: Record<string, string> = {
    Draft: isDark ? 'bg-gray-700/60 text-gray-300' : 'bg-gray-200 text-gray-700',
    'Waiting For PO': isDark ? 'bg-yellow-600/30 text-yellow-300' : 'bg-yellow-100 text-yellow-700',
    'Job Received': isDark ? 'bg-blue-600/30 text-blue-300' : 'bg-blue-100 text-blue-700',
    'Under Process': isDark ? 'bg-purple-600/30 text-purple-300' : 'bg-purple-100 text-purple-700',
    Completed: isDark ? 'bg-emerald-600/30 text-emerald-300' : 'bg-emerald-100 text-emerald-700',
    Lost: isDark ? 'bg-red-600/30 text-red-300' : 'bg-red-100 text-red-700',
  };
  return colors[status] || colors['Draft'];
}

function StatusChart({ quotes, dark }: { quotes: any[]; dark: boolean }) {
  const counts: Record<string, number> = {};
  quotes.forEach(q => { counts[q.status] = (counts[q.status] || 0) + 1; });
  const entries = Object.entries(counts);
  const total = entries.reduce((s, [, c]) => s + c, 0) || 1;
  const colors = ['#64748b', '#eab308', '#3b82f6', '#8b5cf6', '#10b981', '#ef4444'];

  return (
    <div className="flex items-center gap-6">
      <svg width="120" height="120" viewBox="0 0 120 120">
        {entries.map(([status, count], idx) => {
          const pct = count / total;
          const angle = pct * 360;
          const cumAngle = entries.slice(0, idx).reduce((s, [, c]) => s + c / total * 360, 0);
          const startAngle = cumAngle;
          const endAngle = cumAngle + angle;
          const radStart = (startAngle - 90) * Math.PI / 180;
          const radEnd = (endAngle - 90) * Math.PI / 180;
          const largeArc = angle > 180 ? 1 : 0;
          const x1 = 60 + 50 * Math.cos(radStart);
          const y1 = 60 + 50 * Math.sin(radStart);
          const x2 = 60 + 50 * Math.cos(radEnd);
          const y2 = 60 + 50 * Math.sin(radEnd);
          return (
            <path key={status} d={`M 60 60 L ${x1} ${y1} A 50 50 0 ${largeArc} 1 ${x2} ${y2} Z`}
              fill={colors[idx % colors.length]} stroke={dark ? '#1e293b' : '#fff'} strokeWidth="2" />
          );
        })}
        <circle cx="60" cy="60" r="28" fill={dark ? '#1e293b' : '#fff'} />
      </svg>
      <div className="space-y-1 text-xs">
        {entries.map(([status, count], idx) => (
          <div key={status} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: colors[idx % colors.length] }} />
            <span className={dark ? 'text-slate-300' : ''}>{status}: {count} ({Math.round(count / total * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MonthlyChart({ quotes, dark }: { quotes: any[]; dark: boolean }) {
  const months = Array.from({ length: 12 }, (_, i) => `${i + 1}`.padStart(2, '0'));
  const monthlyData = months.map(m => {
    const monthQuotes = quotes.filter(q => q.date.startsWith(`${new Date().getFullYear()}-${m}`));
    const revenue = monthQuotes.reduce((sum, q) => sum + calculateTotals(q).netTotal, 0);
    return { month: m, count: monthQuotes.length, revenue };
  });
  const maxRev = Math.max(...monthlyData.map(d => d.revenue), 1);

  return (
    <div className="flex items-end gap-1 h-40">
      {monthlyData.map((d, i) => (
        <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full relative flex justify-center" style={{ height: '100%' }}>
            <div
              className="w-full max-w-[2rem] bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t transition-all duration-300"
              style={{ height: `${(d.revenue / maxRev) * 100}%`, minHeight: d.revenue > 0 ? '4px' : '0' }}
            />
          </div>
          <span className={`text-xs ${dark ? 'opacity-50' : 'opacity-70'}`}>{months[i]}</span>
        </div>
      ))}
    </div>
  );
}