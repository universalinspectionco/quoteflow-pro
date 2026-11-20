import React, { useEffect, useState } from 'react';

export function ShortcutsModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'K') setOpen(v => !v);
      if (e.key === 'Escape' && open) setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  if (!open) return null;

  const SHORTCUTS = [
    ['Ctrl+S', 'Save current quotation'],
    ['Esc', 'Close modal / Go back'],
    ['Ctrl+Shift+N', 'New standard quotation'],
    ['Ctrl+Shift+V', 'New valve quotation'],
    ['Ctrl+Shift+K', 'Toggle this help'],
    ['↓ / ↑', 'Navigate list (when focused)'],
    ['Enter', 'Open selected quote'],
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={() => setOpen(false)}>
      <div className="bg-gray-900 border border-green-500 p-6 max-w-lg w-full mx-4 shadow-[0_0_30px_rgba(0,255,0,.2)]" onClick={e => e.stopPropagation()}>
        <h2 className="text-green-400 text-lg font-mono mb-4">⌨ Keyboard Shortcuts</h2>
        <div className="grid grid-cols-2 gap-2 text-sm font-mono text-green-300">
          {SHORTCUTS.map(([key, desc]) => (
            <div key={key} className="flex items-center gap-2">
              <kbd className="px-2 py-0.5 bg-green-900/50 border border-green-500/50 rounded text-green-400 text-xs">{key}</kbd>
              <span className="text-green-600">{desc}</span>
            </div>
          ))}
        </div>
        <button onClick={() => setOpen(false)} className="mt-4 w-full py-2 border border-green-500 text-green-400 hover:bg-green-900 font-mono text-sm">CLOSE</button>
      </div>
    </div>
  );
}