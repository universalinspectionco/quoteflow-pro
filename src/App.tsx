import React, { useState, useEffect, useCallback } from 'react';
import { AppDatabase, Quotation, QuoteType, Settings, UiTheme } from './types/quotation';
import { StorageService } from './services/storage';
import { todayISO } from './utils/formatters';
import { updateService } from './services/updateService';
import { Header } from './components/Header';
import { QuotesList } from './components/QuotesList';
import { QuoteEditor } from './components/QuoteEditor';
import type { AiStudioTab } from './components/AiQuoteStudio';
import { ReportView } from './components/ReportView';
import { PriceBookView } from './components/PriceBookView';
import { SettingsView } from './components/SettingsView';
import { PdfPreviewModal } from './components/PdfPreviewModal';
import { TypePickerModal } from './components/TypePickerModal';
import { ShortcutsModal } from './components/ShortcutsModal';
import { DesktopInstallModal } from './components/DesktopInstallModal';
import { AppIntroModal } from './components/AppIntroModal';
import { BackgroundPictureModal } from './components/BackgroundPictureModal';
import { LiveCanvasWallpaper } from './components/LiveCanvasWallpaper';
import { DiagnosticPanel } from './components/DiagnosticPanel';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ImportPastQuotesModal } from './components/ImportPastQuotesModal';
import { ImportPriceBookModal } from './components/ImportPriceBookModal';
import { Toast } from './components/Toast';
import type { UpdateProgress } from './services/updateService';

type ViewState = 'list' | 'editor' | 'report' | 'pricebook' | 'settings' | 'diagnostics';

interface AppState {
  view: ViewState;
  selectedQuoteId: string | null;
  isNew: boolean;
  showNewQuoteTypePicker: boolean;
  openPdfFile: Blob | null;
  toastMessage: string;
  toastType: 'success' | 'error' | 'info';
  importMode: 'quote' | 'pricebook' | null;
  batchSelection: Set<string>;
  batchAction: string | null;
}

export default function App() {
  const [view, setView] = useState<ViewState>('list');
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [showNewQuoteTypePicker, setShowNewQuoteTypePicker] = useState(false);
  const [openPdfFile, setOpenPdfFile] = useState<Blob | null>(null);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');
  const [importMode, setImportMode] = useState<'quote' | 'pricebook' | null>(null);
  const [batchSelection, setBatchSelection] = useState<Set<string>>(new Set());
  const [batchAction, setBatchAction] = useState<string | null>(null);
  const [db, setDb] = useState<AppDatabase>(() => StorageService.loadDatabase());
  const [onlineStatus, setOnlineStatus] = useState(navigator.onLine);
  const [updateDownloaded, setUpdateDownloaded] = useState(false);

  // Apply RTL/LTR based on language setting
  useEffect(() => {
    const dir = (db.set.lang === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', db.set.lang || 'en');
  }, [db.set.lang]);

  // Persist DB to localStorage whenever it changes
  useEffect(() => {
    StorageService.saveDatabaseImmediate(db);
  }, [db]);

  useEffect(() => {
    const onOnline = () => setOnlineStatus(true);
    const onOffline = () => setOnlineStatus(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
  }, []);

  useEffect(() => {
    return updateService.subscribe((progress: UpdateProgress) => {
      if (progress.status === 'downloaded') { setUpdateDownloaded(true); showToast(progress.message || 'Update downloaded!', 'success'); }
      else if (progress.status === 'error' && progress.message) showToast(progress.message, 'error');
    });
  }, []);

  const showToast = useCallback((msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage(msg); setToastType(type);
    setTimeout(() => setToastMessage(''), 3500);
  }, []);

  const handleNavigate = useCallback((next: ViewState, id?: string) => {
    setView(next);
    if (id !== undefined) setSelectedQuoteId(id);
    else if (next !== 'editor') setSelectedQuoteId(null);
    if (next !== 'editor') setIsNew(false);
  }, []);

  const handleDeleteQuote = useCallback((id: string) => {
    setDb(prev => ({ ...prev, quotes: prev.quotes.filter(q => q.id !== id) }));
    setBatchSelection(prev => { const n = new Set(prev); n.delete(id); return n; });
    showToast('Quote deleted', 'success');
  }, [showToast]);

  const handleSaveQuote = useCallback((q: Quotation) => {
    setDb(prev => {
      const idx = prev.quotes.findIndex(x => x.id === q.id);
      if (idx >= 0) { const qs = [...prev.quotes]; qs[idx] = q; return { ...prev, quotes: qs }; }
      return { ...prev, quotes: [...prev.quotes, q] };
    });
    const count = StorageService.recordPriceBook(db, db.set.prefix + db.set.next, q.items, q.date, q.ref, 'save');
    if (count > 0) showToast(`Recorded ${count} price(s)`, 'info');
  }, [db, showToast]);

  const handleDuplicateQuote = useCallback((quote: Quotation) => {
    const newQuote: Quotation = { ...quote, id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, ref: `${db.set.prefix}${db.set.next}`, date: todayISO(), isNew: true };
    db.set.next += 1;
    setDb(prev => ({ ...prev, quotes: [...prev.quotes, newQuote], set: { ...prev.set, next: prev.set.next } }));
    setSelectedQuoteId(newQuote.id); setIsNew(true); setView('editor');
  }, [db]);

  const handleToggleSelect = useCallback((id: string) => {
    setBatchSelection(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }, []);

  const selectQuote = useCallback((id: string) => { setSelectedQuoteId(id); setIsNew(false); setView('editor'); }, []);

  const createNewQuote = useCallback((type: QuoteType) => {
    setIsNew(true); setView('editor'); setSelectedQuoteId(null); setShowNewQuoteTypePicker(false);
  }, []);

  const renderView = () => {
    switch (view) {
      case 'report': return <ReportView db={db} showToast={showToast} />;
      case 'pricebook': return <PriceBookView db={db} showToast={showToast} />;
      case 'settings': return <SettingsView db={db} setDb={setDb} showToast={showToast} />;
      case 'diagnostics': return <DiagnosticPanel db={db} showToast={showToast} />;
      default: return (
        <QuotesList
          db={db} onSelect={selectQuote} onDelete={handleDeleteQuote} onCreateNew={() => setShowNewQuoteTypePicker(true)}
          onReport={() => setView('report')} onPriceBook={() => setView('pricebook')}
          onSettings={() => setView('settings')} onDiagnostics={() => setView('diagnostics')}
          onlineStatus={onlineStatus} batchSelection={batchSelection} onToggleSelect={handleToggleSelect}
          onBatchAction={setBatchAction} onImportQuotes={() => setImportMode('quote')} onImportPb={() => setImportMode('pricebook')}
        />
      );
    }
  };

  return (
    <ErrorBoundary>
      <div className="relative h-screen flex flex-col overflow-hidden">
        <LiveCanvasWallpaper settings={db.set} />
        {(view === 'list' || isNew || view === 'editor') ? (
          <>
            <Header view={view} db={db} setDb={setDb} showToast={showToast} />
            {!onlineStatus && <div className="fixed top-0 left-0 right-0 z-40 bg-red-500 text-white text-center text-xs py-1 font-semibold tracking-wide">OFFLINE — Some features unavailable.</div>}
            {updateDownloaded && (
              <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-4 py-2 rounded-full shadow-lg text-sm flex items-center gap-2 animate-bounce">
                ✨ Update ready! Click below to restart.
                <button onClick={() => updateService.installUpdate()} className="ml-2 underline font-bold hover:text-yellow-200">Restart Now</button>
              </div>
            )}
            {renderView()}
          </>
        ) : (
          renderView()
        )}
        {view === 'editor' && (
          <QuoteEditor
            db={db} setDb={setDb}
            initialQuoteId={selectedQuoteId} isNew={isNew}
            showToast={showToast} onSave={(q) => { handleSaveQuote(q); setView('list'); }}
            onBack={() => setView('list')} onDuplicate={handleDuplicateQuote}
          />
        )}
        {showNewQuoteTypePicker && (
          <TypePickerModal
            onChoose={(type) => createNewQuote(type)}
            onClose={() => setShowNewQuoteTypePicker(false)}
            existingTypes={db.quotes.map(q => q.type)}
          />
        )}
        {openPdfFile && (
          <PdfPreviewModal pdfFile={openPdfFile} settings={db.set} onClose={() => setOpenPdfFile(null)} />
        )}
        {importMode === 'quote' && (
          <ImportPastQuotesModal db={db} setDb={setDb} onClose={() => setImportMode(null)} showToast={showToast} />
        )}
        {importMode === 'pricebook' && (
          <ImportPriceBookModal db={db} setDb={setDb} onClose={() => setImportMode(null)} showToast={showToast} />
        )}
        {db.set.theme === 'terminal' && <ShortcutsModal />}
        <DesktopInstallModal />
        <AppIntroModal />
        <BackgroundPictureModal db={db} setDb={setDb} showToast={showToast} />
        <Toast message={toastMessage} type={toastType} visible={!!toastMessage} />
      </div>
    </ErrorBoundary>
  );
}