import React, { useEffect, useRef } from 'react';
import { Settings, Quotation } from '../types/quotation';
import { PdfGeneratorService } from '../services/pdfGenerator';

interface PdfPreviewModalProps {
  pdfFile: Blob | null;
  settings: Settings;
  onClose: () => void;
  quote?: Quotation | null;
}

export function PdfPreviewModal({ pdfFile, settings, onClose, quote }: PdfPreviewModalProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const urlRef = useRef<string>('');

  useEffect(() => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    const blob = pdfFile || (quote ? PdfGeneratorService.getQuotePdfBlob(quote, settings) : null);
    if (blob) {
      urlRef.current = URL.createObjectURL(blob);
      if (iframeRef.current) iframeRef.current.src = urlRef.current;
    }
    return () => { if (urlRef.current) URL.revokeObjectURL(urlRef.current); };
  }, [pdfFile, quote, settings]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
          <h2 className="text-white font-semibold">PDF Preview</h2>
          <div className="flex gap-2">
            <button onClick={onClose} className="text-white/70 hover:text-white text-lg leading-none">✕</button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden rounded-b-xl">
          {pdfFile || quote ? (
            <iframe ref={iframeRef} className="w-full h-full min-h-0" style={{ minHeight: '60vh' }} title="PDF Preview" />
          ) : (
            <div className="h-full min-h-60 flex items-center justify-center text-white/50">Loading preview...</div>
          )}
        </div>
      </div>
    </div>
  );
}