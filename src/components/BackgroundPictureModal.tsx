import React, { useState } from 'react';
import { AppDatabase, Settings } from '../types/quotation';

const PRESETS = ['particles', 'cyber-grid', 'ocean-flow', 'aurora-wave', 'starfield', 'matrix-rain', 'neon-circles', 'constellation'] as const;

interface Props {
  db: AppDatabase;
  setDb: React.Dispatch<React.SetStateAction<AppDatabase>>;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export function BackgroundPictureModal({ db, setDb, showToast }: Props) {
  const [open, setOpen] = useState(false);
  const settings = db.set;

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-lg transition-all"
        title="Change wallpaper">
        🎨
      </button>
    );
  }

  const handlePreset = (preset: string) => {
    setDb(prev => ({ ...prev, set: { ...prev.set, bgType: 'canvas', bgAnimationPreset: preset } }));
    setOpen(false);
    showToast(`Wallpaper: ${preset}`, 'success');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setDb(prev => ({ ...prev, set: { ...prev.set, bgType: 'image', bgImage: reader.result as string } }));
      setOpen(false);
      showToast('Custom background set!', 'success');
    };
    reader.readAsDataURL(file);
  };

  const THEMES = ['terminal', 'frosted', 'navy', 'ocean', 'anime', 'mechanical', 'car', 'slate', 'emerald', 'midnight', 'sapphire', 'amber'] as const;
  const COLORS: Record<string, string> = {
    terminal: '#00ff41', frosted: '#ffffff', navy: '#1e3a5e', ocean: '#0ea5e9',
    anime: '#f43f5e', mechanical: '#b45309', car: '#dc2626', slate: '#64748b',
    emerald: '#059669', midnight: '#6366f1', sapphire: '#1e3a5e', amber: '#d97706',
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div className="bg-slate-800 border border-white/10 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        <h2 className="text-white text-lg font-bold mb-4">🎨 Wallpaper & Theme</h2>

        {/* Animation Presets */}
        <div className="mb-4">
          <label className="text-sm text-slate-400 block mb-2">Animation Preset</label>
          <div className="grid grid-cols-4 gap-2">
            {PRESETS.map(p => (
              <button key={p} onClick={() => handlePreset(p)}
                className={`px-2 py-2 rounded-lg text-xs font-medium transition-all ${settings.bgAnimationPreset === p ? 'bg-indigo-600 text-white' : 'bg-white/5 hover:bg-white/10 text-slate-300'}`}>
                {p.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </button>
            ))}
          </div>
        </div>

        {/* Theme Colors */}
        <div className="mb-4">
          <label className="text-sm text-slate-400 block mb-2">Accent Color Theme</label>
          <div className="flex flex-wrap gap-2">
            {THEMES.map(t => (
              <button key={t} onClick={() => setDb(prev => ({ ...prev, set: { ...prev.set, theme: t } }))}
                className={`w-8 h-8 rounded-full border-2 transition-all ${settings.theme === t ? 'border-white scale-110' : 'border-transparent hover:border-white/50'}`}
                style={{ background: COLORS[t] }} title={t} />
            ))}
          </div>
        </div>

        {/* Custom Image */}
        <div className="mb-4">
          <label className="text-sm text-slate-400 block mb-2">Custom Image Background</label>
          <label className="block">
            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            <span className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs text-white cursor-pointer transition-colors inline-block">
              📷 Upload Image
            </span>
          </label>
        </div>

        {/* Controls */}
        <div className="space-y-3 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Opacity</span>
            <input type="range" min="10" max="100" value={settings.bgOpacity ?? 80}
              onChange={e => setDb(prev => ({ ...prev, set: { ...prev.set, bgOpacity: parseInt(e.target.value) } }))}
              className="w-32 accent-indigo-500" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Speed</span>
            <input type="range" min="10" max="300" value={(settings.bgPlaybackSpeed ?? 1) * 100}
              onChange={e => setDb(prev => ({ ...prev, set: { ...prev.set, bgPlaybackSpeed: parseInt(e.target.value) / 100 } }))}
              className="w-32 accent-indigo-500" />
          </div>
        </div>

        <button onClick={() => setOpen(false)} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-colors">Done</button>
      </div>
    </div>
  );
}