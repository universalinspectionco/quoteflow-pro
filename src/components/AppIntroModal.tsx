import React, { useEffect, useState } from 'react';

const INTRO_KEY = 'quoteflow_intro_seen_v2';

export function AppIntroModal() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(INTRO_KEY)) {
      setShow(true);
    }
  }, []);

  function dismiss() {
    localStorage.setItem(INTRO_KEY, 'true');
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={dismiss}>
      <div className="bg-slate-800 border border-indigo-500/30 rounded-2xl p-8 max-w-lg w-full shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">✨</div>
          <h1 className="text-2xl font-bold text-white mb-2">Welcome to QuoteFlow Pro</h1>
          <p className="text-slate-400 text-sm">Next-generation quotation management by UIC</p>
        </div>

        <div className="space-y-3 mb-6 text-sm text-slate-300">
          {[
            '📝 Create standard & valve quotations with ease',
            '📊 Track prices with built-in price book',
            '📈 Generate reports and analytics',
            '🤖 AI-assisted quote content generation',
            '🔄 Automatic updates when installed',
            '🛡️ Built-in troubleshoot & diagnostics',
            '🎨 Beautiful animated backgrounds',
            '🌙 Dark & light mode support',
          ].map(text => (<div key={text} className="flex items-start gap-2"><span>{text.split(' ')[0]}</span><span>{text.slice(text.indexOf(' ') + 1)}</span></div>))}
        </div>

        <div className="flex gap-3">
          <button onClick={dismiss} className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-colors">
            Get Started →
          </button>
          <button onClick={() => { localStorage.setItem(INTRO_KEY, 'true'); setShow(false); }}
            className="px-4 py-2.5 text-slate-400 hover:text-white text-sm transition-colors">
            Skip tour
          </button>
        </div>
      </div>
    </div>
  );
}