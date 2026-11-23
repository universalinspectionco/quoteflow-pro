import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { AppState, Settings, UserPreferences, Quotation, PriceBookItem, Toast, DiagnosticResult, AIQuoteResponse } from '@/types'

const defaultSettings: Settings = {
  company: {
    name: 'Universal Inspection Co. Ltd.',
    address: 'Office No. 123, Business Tower, Al Hamra District, Riyadh, Saudi Arabia',
    phone: '+966 11 123 4567',
    email: 'info@universalinspection.sa',
    website: 'www.universalinspection.sa',
    vatNumber: '100123456789001',
    panNumber: '',
    cinNumber: '',
  },
  letterhead: {
    logoPosition: 'left',
    showLogo: true,
    headerText: 'Quotation',
    footerText: 'Thank you for your business!',
    backgroundOpacity: 0.05,
  },
  signature: {
    name: 'Authorized Signatory',
    designation: 'Managing Director',
    showSignature: true,
  },
  branding: {
    primaryColor: '#6366f1',
    secondaryColor: '#06b6d4',
    fontFamily: 'Inter',
    theme: 'glass',
    accentColor: '#f43f5e',
    borderRadius: 'lg',
    animationsEnabled: true,
    reducedMotion: false,
  },
  numbering: {
    prefix: 'UIC-Q',
    suffix: '',
    startNumber: 1001,
    currentNumber: 1001,
    format: '{PREFIX}-{NUMBER:0000}{SUFFIX}',
  },
  defaults: {
    taxRate: 5,
    currency: 'AED',
    dateFormat: 'DD/MM/YYYY',
    language: 'en',
    rtlEnabled: false,
    paymentTerms: 'Net 30',
    validityDays: 30,
  },
}

const defaultPreferences: UserPreferences = {
  theme: 'glass',
  language: 'en',
  rtlEnabled: false,
  sidebarCollapsed: false,
  compactMode: false,
  animationsEnabled: true,
  reducedMotion: false,
  recentClients: [],
  favoriteItems: [],
}

const initialQuotations: Quotation[] = []
const initialPriceBook: PriceBookItem[] = []

interface StoreState extends AppState {
  toasts: Toast[]
  diagnosticResults: DiagnosticResult[]
  aiQuoteResponse: AIQuoteResponse | null
  setView: (view: AppState['currentView']) => void
  setSelectedQuote: (id?: string) => void
  addQuotation: (quote: Quotation) => void
  updateQuotation: (id: string, data: Partial<Quotation>) => void
  deleteQuotation: (id: string) => void
  duplicateQuotation: (id: string) => void
  setQuotations: (quotes: Quotation[]) => void
  addPriceBookItem: (item: PriceBookItem) => void
  updatePriceBookItem: (id: string, data: Partial<PriceBookItem>) => void
  deletePriceBookItem: (id: string) => void
  setPriceBook: (items: PriceBookItem[]) => void
  updateSettings: (settings: Partial<Settings>) => void
  updatePreferences: (prefs: Partial<UserPreferences>) => void
  setLoading: (loading: boolean) => void
  setError: (error?: string) => void
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  setDiagnosticResults: (results: DiagnosticResult[]) => void
  setAIQuoteResponse: (response: AIQuoteResponse | null) => void
  incrementQuoteNumber: () => void
  nextQuoteNumber: () => string
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function generateQuoteNumber(settings: Settings): string {
  const { prefix, suffix, currentNumber, format } = settings.numbering
  return format
    .replace('{PREFIX}', prefix)
    .replace('{NUMBER:0000}', currentNumber.toString().padStart(4, '0'))
    .replace('{SUFFIX}', suffix)
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      quotations: initialQuotations,
      priceBook: initialPriceBook,
      settings: defaultSettings,
      preferences: defaultPreferences,
      currentView: 'dashboard',
      selectedQuoteId: undefined,
      isLoading: false,
      error: undefined,
      toasts: [],
      diagnosticResults: [],
      aiQuoteResponse: null,

      setView: (view) => set({ currentView: view }),
      setSelectedQuote: (id) => set({ selectedQuoteId: id }),

      addQuotation: (quote) =>
        set((state) => ({
          quotations: [quote, ...state.quotations],
          settings: {
            ...state.settings,
            numbering: { ...state.settings.numbering, currentNumber: state.settings.numbering.currentNumber + 1 },
          },
        })),

      updateQuotation: (id, data) =>
        set((state) => ({
          quotations: state.quotations.map((q) => (q.id === id ? { ...q, ...data, updatedAt: new Date().toISOString() } : q)),
        })),

      deleteQuotation: (id) =>
        set((state) => ({
          quotations: state.quotations.filter((q) => q.id !== id),
          selectedQuoteId: state.selectedQuoteId === id ? undefined : state.selectedQuoteId,
        })),

      duplicateQuotation: (id) => {
        const quote = get().quotations.find((q) => q.id === id)
        if (quote) {
          const newQuote: Quotation = {
            ...quote,
            id: generateId(),
            quoteNumber: generateQuoteNumber(get().settings),
            status: 'draft',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            items: quote.items.map((item) => ({ ...item, id: generateId() })),
            annexurePages: quote.annexurePages?.map((page) => ({ ...page, id: generateId() })),
          }
          get().addQuotation(newQuote)
        }
      },

      setQuotations: (quotes) => set({ quotations: quotes }),

      addPriceBookItem: (item) =>
        set((state) => ({ priceBook: [{ ...item, id: generateId(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, ...state.priceBook] })),

      updatePriceBookItem: (id, data) =>
        set((state) => ({
          priceBook: state.priceBook.map((item) => (item.id === id ? { ...item, ...data, updatedAt: new Date().toISOString() } : item)),
        })),

      deletePriceBookItem: (id) =>
        set((state) => ({ priceBook: state.priceBook.filter((item) => item.id !== id) })),

      setPriceBook: (items) => set({ priceBook: items }),

      updateSettings: (settings) =>
        set((state) => ({ settings: { ...state.settings, ...settings } })),

      updatePreferences: (prefs) =>
        set((state) => ({ preferences: { ...state.preferences, ...prefs } })),

      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),

      addToast: (toast) =>
        set((state) => ({
          toasts: [{ ...toast, id: generateId() }, ...state.toasts].slice(0, 3),
        })),

      removeToast: (id) =>
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

      setDiagnosticResults: (results) => set({ diagnosticResults: results }),

      setAIQuoteResponse: (response) => set({ aiQuoteResponse: response }),

      incrementQuoteNumber: () =>
        set((state) => ({
          settings: {
            ...state.settings,
            numbering: { ...state.settings.numbering, currentNumber: state.settings.numbering.currentNumber + 1 },
          },
        })),

      nextQuoteNumber: () => generateQuoteNumber(get().settings),
    }),
    {
      name: 'quoteflow-pro-remake',
      storage: createJSONStorage(() => localStorage),
      version: 4,
      migrate: (persisted: unknown, version: number) => {
        if (version < 3) {
          const p = persisted as Record<string, unknown>
          return {
            ...p,
            preferences: { ...defaultPreferences, ...(p.preferences as Record<string, unknown> || {}) },
          }
        }
        if (version < 4) {
          const p = persisted as Record<string, unknown>
          const priceBook = (p.priceBook as any[]) || []
          return {
            ...p,
            priceBook: priceBook.map(item => {
              const { hsnCode, ...rest } = item
              return {
                ...rest,
                serviceRef: hsnCode || '',
              }
            }),
          }
        }
        return persisted
      },
    }
  )
)

export { generateId, generateQuoteNumber }
