import React from 'react';
import { AppDatabase, UiTheme } from '../types/quotation';
import { updateService } from '../services/updateService';
import { FileStorageService } from '../services/fileStorageService';

interface HeaderProps {
  view: string;
  db: AppDatabase;
  setDb: React.Dispatch<React.SetStateAction<AppDatabase>>;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export function Header({ db, setDb }: HeaderProps) {
  const settings = db.set;
  const isDark = (settings.uiTheme as UiTheme || 'dark') === 'dark';
  const accent = getAccentColor(settings.theme);

  const handleCheckUpdate = async () => {
    await updateService.checkForUpdates();
  };

  return (
    <header className={`flex items-center justify-between px-5 py-3 border-b backdrop-blur-sm relative z-30 ${isDark ? 'border-white/10 bg-black/60 text-white' : 'border-gray-200 bg-white/80 text-gray-800'}`}>
      <div className="flex items-center gap-4">
        <span className="text-lg font-bold tracking-wider" style={{ color: accent }}>QUOTEFLOW PRO</span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-white/10' : 'bg-gray-100'}`}>v2.0.0</span>
        <button onClick={handleCheckUpdate} className={`text-xs px-2 py-1 rounded ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition-colors`}>
          🔍 Check Updates
        </button>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={async () => {
            const handle = await FileStorageService.selectDefaultDirectory();
            if (handle) {
              setDb(prev => ({ ...prev, set: { ...prev.set, defaultStoragePath: handle.name } }));
              window.Toast && window.Toast.show('Folder saved', 'success');
            }
          }}
          className={`text-xs px-2 py-1 rounded ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition-colors`}
        >
          📁 Save Folder
        </button>
        <button
          onClick={() => {
            const newTheme = settings.uiTheme === 'light' ? 'dark' : 'light';
            setDb(prev => ({ ...prev, set: { ...prev.set, uiTheme: newTheme } }));
          }}
          className={`text-xs px-2 py-1 rounded ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition-colors`}
        >
          {isDark ? '🌙 Dark' : '☀️ Light'}
        </button>
        <select
          value={settings.lang || 'en'}
          onChange={e => setDb(prev => ({ ...prev, set: { ...prev.set, lang: e.target.value as any } }))}
          className={`text-xs px-2 py-1 rounded border ${isDark ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
        >
          <option value="en">EN</option>
          <option value="ar">عربي</option>
        </select>
        <img src="/favicon.ico" alt="Logo" className="h-6 w-6 rounded" />
      </div>
    </header>
  );
}

function getAccentColor(theme?: string): string {
  const colors: Record<string, string> = {
    terminal: '#00ff41', frosted: '#ffffff', navy: '#1e3a5e', ocean: '#0ea5e9',
    anime: '#f43f5e', mechanical: '#b45309', car: '#dc2626', slate: '#64748b',
    emerald: '#059669', midnight: '#6366f1', sapphire: '#1e3a5e', amber: '#d97706',
  };
  return colors[theme || 'terminal'] || '#38bdf8';
}

// Fix: remove unused `view` param or use it - Toast is declared in vite-env.d.ts