import React from 'react';
import { QuoteType } from '../types/quotation';

interface TypePickerModalProps {
  onChoose: (type: QuoteType) => void;
  onClose: () => void;
  existingTypes: QuoteType[];
}

const TYPES: { type: QuoteType; icon: string; title: string; desc: string; }[] = [
  { type: 'std', icon: '📋', title: 'Standard Services', desc: 'Calibration, NDT, lifting gear inspection and general inspection services.' },
  { type: 'valve', icon: '🔧', title: 'Valve Testing', desc: 'Safety relief valves, control valves, POP testing and hydrostatic testing.' },
];

export function TypePickerModal({ onChoose, onClose, existingTypes }: TypePickerModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-slate-800 border border-white/10 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        <h2 className="text-white text-lg font-bold mb-4">Create New Quotation</h2>
        <p className="text-slate-400 text-sm mb-5">Select quotation type to continue.</p>
        <div className="space-y-3">
          {TYPES.map(({ type, icon, title, desc }) => (
            <button key={type} onClick={() => onChoose(type)}
              className="w-full p-4 rounded-xl border border-white/10 hover:border-indigo-500/50 hover:bg-indigo-500/10 text-left transition-all group">
              <div className="flex items-start gap-3">
                <span className="text-3xl">{icon}</span>
                <div>
                  <div className="text-white font-semibold group-hover:text-indigo-300 transition-colors">{title}</div>
                  <div className="text-slate-400 text-xs mt-1">{desc}</div>
                  {existingTypes.includes(type) && <div className="text-emerald-400 text-xs mt-1">✓ Already used</div>}
                </div>
              </div>
            </button>
          ))}
        </div>
        <button onClick={onClose} className="mt-5 w-full py-2 text-slate-400 hover:text-white text-sm border border-white/10 rounded-lg hover:bg-white/5 transition-colors">Cancel</button>
      </div>
    </div>
  );
}