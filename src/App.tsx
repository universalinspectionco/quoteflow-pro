import { useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Sidebar } from '@/components/Sidebar'
import { Header } from '@/components/Header'
import { Dashboard } from '@/components/Dashboard'
import { QuotesList } from '@/components/QuotesList'
import { QuoteEditor } from '@/components/QuoteEditor'
import { PriceBookView } from '@/components/PriceBookView'
import { ReportsView } from '@/components/ReportsView'
import { SettingsView } from '@/components/SettingsView'
import { AIQuoteStudio } from '@/components/AIQuoteStudio'
import { DiagnosticsView } from '@/components/DiagnosticsView'
import { ToastContainer } from '@/components/ToastContainer'
import { CommandPalette } from '@/components/CommandPalette'
import { useStore } from '@/services/store'

const viewComponents = {
  dashboard: Dashboard,
  quotes: QuotesList,
  editor: QuoteEditor,
  pricebook: PriceBookView,
  reports: ReportsView,
  settings: SettingsView,
  'ai-studio': AIQuoteStudio,
  diagnostics: DiagnosticsView,
} as const

export function App() {
  const { currentView, preferences, selectedQuoteId, toasts, removeToast } = useStore()

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', preferences.theme)
    document.documentElement.setAttribute('data-rtl', preferences.rtlEnabled.toString())
    if (preferences.reducedMotion) {
      document.documentElement.classList.add('reduce-motion')
    } else {
      document.documentElement.classList.remove('reduce-motion')
    }
  }, [preferences.theme, preferences.rtlEnabled, preferences.reducedMotion])

  const CurrentView = viewComponents[currentView]

  return (
    <div className={`min-h-screen ${preferences.rtlEnabled ? 'rtl' : ''}`}>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentView}
                initial={{ opacity: 0, y: 16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -16, scale: 0.98 }}
                transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
                className="w-full h-full"
              >
                <CurrentView selectedQuoteId={selectedQuoteId} />
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <CommandPalette />
    </div>
  )
}
