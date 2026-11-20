import React, { useState } from 'react';
import { Quotation, Quotation as QType } from '../types/quotation';
import { AiQuoteService } from '../services/aiQuoteService';

export type AiStudioTab = 'generate' | 'review' | 'describe';

interface AiQuoteStudioProps {
  quote: Partial<Quotation>;
  setQuote: <K extends keyof Quotation>(field: K, value: Quotation[K]) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export function AiQuoteStudio({ quote, setQuote, showToast }: AiQuoteStudioProps) {
  const [tab, setTab] = useState<AiStudioTab>('generate');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [serviceName, setServiceName] = useState('');
  const [specifications, setSpecifications] = useState('');

  const handleGenerate = async () => {
    const client = quote.client || '';
    const service = quote.svc || serviceName;
    if (!client || !service) { showToast('Fill in client name first', 'info'); return; }
    setLoading(true); setResult('');
    try {
      const suggestion = await AiQuoteService.generateQuoteDetails(client, service);
      setQuote('intro', suggestion.intro);
      setQuote('closing', suggestion.closing);
      setQuote('delivery', suggestion.delivery);
      setQuote('service', suggestion.service);
      setResult(`Generated suggestions for "${client}" (${service})`);
      showToast('AI suggestions applied', 'success');
    } catch (e: any) {
      setResult(e.message);
      showToast('AI error: ' + e.message, 'error');
    } finally { setLoading(false); }
  };

  const handleReview = async () => {
    setLoading(true); setResult('');
    try {
      const review = await AiQuoteService.reviewQuote(quote as QType);
      setResult(review);
      showToast('Review generated', 'success');
    } catch (e: any) {
      setResult(e.message);
      showToast('AI error: ' + e.message, 'error');
    } finally { setLoading(false); }
  };

  const handleDescribe = async () => {
    if (!serviceName || !specifications) { showToast('Enter service name and specs', 'info'); return; }
    setLoading(true); setResult('');
    try {
      const desc = await AiQuoteService.generateDescription(serviceName, specifications);
      setResult(desc);
      showToast('Description generated', 'success');
    } catch (e: any) {
      setResult(e.message);
      showToast('AI error: ' + e.message, 'error');
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-1">
        {(['generate', 'review', 'describe'] as AiStudioTab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-1.5 text-xs rounded-lg font-medium transition-colors ${tab === t ? 'bg-indigo-600 text-white' : 'bg-white/10 text-white/60 hover:text-white'}`}>
            {t === 'generate' ? '✨ Generate' : t === 'review' ? '🔍 Review' : '📝 Describe'}
          </button>
        ))}
      </div>

      {tab === 'generate' && (
        <div className="space-y-2">
          <button onClick={handleGenerate} disabled={loading}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm rounded-lg transition-colors">
            {loading ? '⏳ Generating...' : '✨ Generate Quote Content'}
          </button>
          <div className={`text-xs p-2 rounded-lg whitespace-pre-wrap ${result ? 'bg-emerald-600/20 text-emerald-300' : 'bg-white/5 text-white/50'}`}>
            {result || 'Fill in client name and select service type, then click generate.'}
          </div>
        </div>
      )}

      {tab === 'review' && (
        <div className="space-y-2">
          <button onClick={handleReview} disabled={loading}
            className="w-full py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm rounded-lg transition-colors">
            {loading ? '⏳ Reviewing...' : '🔍 Review Current Quote'}
          </button>
          <div className={`text-xs p-2 rounded-lg whitespace-pre-wrap max-h-40 overflow-y-auto ${result ? 'bg-purple-600/20 text-purple-300' : 'bg-white/5 text-white/50'}`}>
            {result || 'Click review to get AI suggestions for your current quote.'}
          </div>
        </div>
      )}

      {tab === 'describe' && (
        <div className="space-y-2">
          <input placeholder="Service name (e.g., Ultrasonic Calibration)" value={serviceName} onChange={e => setServiceName(e.target.value)}
            className="w-full px-2 py-1.5 rounded text-sm bg-white/5 border border-white/10 text-white" />
          <textarea placeholder="Specifications..." value={specifications} onChange={e => setSpecifications(e.target.value)} rows={3}
            className="w-full px-2 py-1.5 rounded text-sm bg-white/5 border border-white/10 text-white" />
          <button onClick={handleDescribe} disabled={loading}
            className="w-full py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm rounded-lg transition-colors">
            {loading ? '⏳ Generating...' : '📝 Generate Description'}
          </button>
          <div className={`text-xs p-2 rounded-lg whitespace-pre-wrap max-h-40 overflow-y-auto ${result ? 'bg-amber-600/20 text-amber-300' : 'bg-white/5 text-white/50'}`}>
            {result || 'Enter a service name and specs to generate a professional description.'}
          </div>
        </div>
      )}
    </div>
  );
}