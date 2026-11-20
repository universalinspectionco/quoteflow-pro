import React from 'react';

interface ClientFrequencyChartProps {
  entries: [string, number][];
  dark: boolean;
}

export function ClientFrequencyChart({ entries, dark }: ClientFrequencyChartProps) {
  if (!entries.length) return <div className={`text-sm ${dark ? 'opacity-50' : 'opacity-70'}`}>No client data yet.</div>;
  const max = Math.max(...entries.map(([, c]) => c), 1);
  const colors = ['#6366f1','#8b5cf6','#a855f7','#ec4899','#f43f5e','#ef4444','#f97316','#eab308','#22c55e','#14b8a6'];

  return (
    <div className="space-y-2">
      {entries.map(([name, count], idx) => (
        <div key={name} className="flex items-center gap-3">
          <span className={`text-xs w-32 truncate ${dark ? 'text-slate-300' : 'text-gray-600'}`}>{name}</span>
          <div className="flex-1 h-4 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${(count / max) * 100}%`, background: colors[idx % colors.length] }} />
          </div>
          <span className={`text-xs font-mono w-8 text-right ${dark ? 'opacity-60' : 'opacity-70'}`}>{count}</span>
        </div>
      ))}
    </div>
  );
}