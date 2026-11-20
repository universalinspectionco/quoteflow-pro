import React, { useState, useEffect } from 'react';

const INSTALL_KEY = 'quoteflow_desktop_prompt_v2';

export function DesktopInstallModal() {
  const [dismissed, setDismissed] = useState(localStorage.getItem(INSTALL_KEY) === '1');
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (dismissed) return;
    if (typeof navigator === 'undefined') return;
    
    // Check if we're in Electron (would have electronAPI)
    if ((window as any).electronAPI) return;

    // Check for standalone/PWA mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
    if (isStandalone) return;

    // Show after a delay
    const timer = setTimeout(() => setShow(true), 5000);
    return () => clearTimeout(timer);
  }, [dismissed]);

  if (!show) return null;

  return (
    <div className="fixed bottom-6 left-6 z-50 max-w-sm">
      <div className="bg-slate-800 border border-indigo-500/30 rounded-2xl p-4 shadow-2xl text-white">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-sm">📲 Install QuoteFlow Pro</h3>
          <button onClick={() => { localStorage.setItem(INSTALL_KEY, '1'); setShow(false); }} className="text-white/50 hover:text-white">✕</button>
        </div>
        <p className="text-xs text-slate-400 mb-3">Get the desktop app for offline use, auto-updates, and native performance.</p>
        <div className="flex gap-2">
          <a href="https://github.com/universalinspectionco/Quotation-Manager-V2/releases" target="_blank" rel="noreferrer" className="flex-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-xs font-semibold text-center transition-colors">
            Download Installer
          </a>
          <button onClick={() => { localStorage.setItem(INSTALL_KEY, '1'); setShow(false); }}
            className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs transition-colors">
            Later
          </button>
        </div>
      </div>
    </div>
  );
}