import React, { useState } from 'react';
import { AppDatabase, UiTheme, AppTheme, Settings } from '../types/quotation';
import { StorageService } from '../services/storage';
import { FileStorageService } from '../services/fileStorageService';

interface SettingsViewProps {
  db: AppDatabase;
  setDb: React.Dispatch<React.SetStateAction<AppDatabase>>;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export function SettingsView({ db, setDb, showToast }: SettingsViewProps) {
  const isDark = (db.set.uiTheme as UiTheme || 'dark') === 'dark';
  const settings = db.set;
  const themes: AppTheme[] = ['terminal', 'frosted', 'navy', 'ocean', 'anime', 'mechanical', 'car', 'slate', 'emerald', 'midnight', 'sapphire', 'amber'];

  const updateSetting = <K extends keyof Settings>(field: K, value: Settings[K]) => {
    setDb(prev => ({ ...prev, set: { ...prev.set, [field]: value } }));
  };

  const handleExportBackup = () => {
    StorageService.exportDatabaseJson(db);
    showToast('Database exported!', 'success');
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const imported = StorageService.importDatabaseJson(text);
      setDb(imported);
      showToast('Database imported successfully!', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleSelectFolder = async () => {
    const handle = await FileStorageService.selectDefaultDirectory();
    if (handle) {
      updateSetting('defaultStoragePath', handle.name as any);
      showToast(`Folder saved: ${handle.name}`, 'success');
    }
  };

  return (
    <div className={`flex-1 overflow-y-auto p-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
      <h1 className="text-xl font-bold mb-6">⚙️ Settings</h1>

      {/* Section: Business Info */}
      <section className={`mb-8 rounded-xl p-4 border ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>
        <h2 className="font-semibold mb-4 flex items-center gap-2">🏢 Business Information</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { key: 'prefix' as const, label: 'Reference Prefix', placeholder: 'UIC/L/' },
            { key: 'title' as const, label: 'Title (Standard)', placeholder: '' },
            { key: 'titleV' as const, label: 'Title (Valve)', placeholder: '' },
            { key: 'signer' as const, label: 'Signatory Name', placeholder: '' },
            { key: 'role' as const, label: 'Signatory Role', placeholder: '' },
            { key: 'vat' as const, label: 'VAT (%)', type: 'number' as const },
          ].map(({ key, label, placeholder, type }) => (
            <div key={key}>
              <label className={`block text-xs mb-1 ${isDark ? 'opacity-60' : 'opacity-70'}`}>{label}</label>
              <input
                value={String((settings as any)[key] ?? '')}
                onChange={e => updateSetting(key, type === 'number' ? parseFloat(e.target.value) as any : e.target.value as any)}
                placeholder={placeholder}
                className={`w-full px-3 py-1.5 rounded-lg border text-sm ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-300'}`}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Section: Appearance */}
      <section className={`mb-8 rounded-xl p-4 border ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>
        <h2 className="font-semibold mb-4 flex items-center gap-2">🎨 Appearance</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className={`block text-xs mb-1 ${isDark ? 'opacity-60' : 'opacity-70'}`}>UI Theme</label>
            <select value={settings.uiTheme || 'dark'} onChange={e => updateSetting('uiTheme', e.target.value as UiTheme)}
              className={`w-full px-3 py-1.5 rounded-lg border text-sm ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-300'}`}>
              <option value="dark">🌙 Dark</option>
              <option value="light">☀️ Light</option>
            </select>
          </div>
          <div>
            <label className={`block text-xs mb-1 ${isDark ? 'opacity-60' : 'opacity-70'}`}>Accent Theme</label>
            <select value={settings.theme || 'terminal'} onChange={e => updateSetting('theme', e.target.value as AppTheme)}
              className={`w-full px-3 py-1.5 rounded-lg border text-sm ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-300'}`}>
              {themes.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className={`block text-xs mb-1 ${isDark ? 'opacity-60' : 'opacity-70'}`}>Language</label>
            <select value={settings.lang || 'en'} onChange={e => updateSetting('lang', e.target.value as 'en' | 'ar')}
              className={`w-full px-3 py-1.5 rounded-lg border text-sm ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-300'}`}>
              <option value="en">English</option>
              <option value="ar">العربية</option>
            </select>
          </div>
          <div>
            <label className={`block text-xs mb-1 ${isDark ? 'opacity-60' : 'opacity-70'}`}>Letterhead Style</label>
            <select value={settings.lh || 'band'} onChange={e => updateSetting('lh', e.target.value as any)}
              className={`w-full px-3 py-1.5 rounded-lg border text-sm ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-300'}`}>
              <option value="band">Band (Header/Footer)</option>
              <option value="orig">Original</option>
              <option value="none">None</option>
            </select>
          </div>
        </div>
      </section>

      {/* Section: Storage */}
      <section className={`mb-8 rounded-xl p-4 border ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>
        <h2 className="font-semibold mb-4 flex items-center gap-2">💾 Storage & Sync</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <label className={`text-sm ${isDark ? 'opacity-80' : ''}`}>Auto-sync database to folder:</label>
            <button onClick={() => updateSetting('autoSyncDatabaseFile', !settings.autoSyncDatabaseFile)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${settings.autoSyncDatabaseFile !== false ? 'bg-emerald-600 text-white' : isDark ? 'bg-white/10 text-white/50' : 'bg-gray-200'}`}>
              {settings.autoSyncDatabaseFile !== false ? '✅ On' : '❌ Off'}
            </button>
          </div>
          <div className="flex items-center gap-3">
            <label className={`text-sm ${isDark ? 'opacity-80' : ''}`}>Save mode:</label>
            <select value={settings.storageSaveMode || 'dialog'} onChange={e => updateSetting('storageSaveMode', e.target.value as any)}
              className={`px-3 py-1 rounded-lg border text-sm ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-300'}`}>
              <option value="dialog">Dialog (Save As...)</option>
              <option value="direct">Direct to Folder</option>
              <option value="download">Browser Download</option>
            </select>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleSelectFolder} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm">📁 Select Default Folder</button>
            {settings.defaultStoragePath && <span className={`text-xs ${isDark ? 'opacity-50' : 'opacity-70'}`}>{settings.defaultStoragePath}</span>}
          </div>
        </div>
      </section>

      {/* Section: Backup / Restore */}
      <section className={`mb-8 rounded-xl p-4 border ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>
        <h2 className="font-semibold mb-4 flex items-center gap-2">🔄 Backup & Restore</h2>
        <div className="flex gap-3 flex-wrap">
          <button onClick={handleExportBackup} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm">📤 Export Database (JSON)</button>
          <label className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm cursor-pointer transition-colors">
            📥 Import Database
            <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
          </label>
        </div>
      </section>

      {/* Section: AI API Key */}
      <section className={`mb-8 rounded-xl p-4 border ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>
        <h2 className="font-semibold mb-4 flex items-center gap-2">🤖 AI Quote Studio</h2>
        <p className={`text-xs mb-3 ${isDark ? 'opacity-60' : 'opacity-70'}`}>Set your Gemini API key in the .env file or environment variables.</p>
        <p className="text-xs opacity-50">VITE_GEMINI_API_KEY=your_key_here</p>
      </section>

      {/* Section: About */}
      <section className={`rounded-xl p-4 border ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>
        <h2 className="font-semibold mb-4 flex items-center gap-2">ℹ️ About</h2>
        <div className={`text-sm space-y-1 ${isDark ? 'opacity-70' : ''}`}>
          <p><strong>QuoteFlow Pro</strong> v2.0.0</p>
          <p>Universal Inspection Co. Ltd. (UIC)</p>
          <p>Cross-platform quotation management with auto-update & diagnostics.</p>
          <p className="text-xs mt-2 opacity-50">Built with React 19 · Vite 8 · Electron 33</p>
        </div>
      </section>
    </div>
  );
}