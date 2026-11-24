import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type {
  AppState,
  Company,
  Settings,
  UserPreferences,
  Quotation,
  PriceBookItem,
  Toast,
  DiagnosticResult,
  AIQuoteResponse,
} from '@/types'
import {
  DEFAULT_COMPANY_ID,
  DEFAULT_CURRENCY,
  DEFAULT_TAX_RATE,
} from '@/utils/pricebook'
import { normalizeImportedQuotation } from '@/utils/quotationImport'

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
    taxRate: 15,
    currency: 'SAR',
    dateFormat: 'DD/MM/YYYY',
    language: 'en',
    rtlEnabled: false,
    paymentTerms: 'Net 30',
    validityDays: 30,
  },
}

const defaultCompanies: Company[] = [
  {
    id: DEFAULT_COMPANY_ID,
    name: defaultSettings.company.name,
    vatNumber: defaultSettings.company.vatNumber,
    currency: defaultSettings.defaults.currency,
    taxRate: defaultSettings.defaults.taxRate,
    isDefault: true,
  },
]

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
  updatePriceBookItem: (id: string, data: Partial<PriceBookItem>, historyReason?: string) => void
  deletePriceBookItem: (id: string) => void
  setPriceBook: (items: PriceBookItem[]) => void
  setActiveCompany: (id: string) => void
  addCompany: (company: Company) => void
  updateCompany: (id: string, data: Partial<Company>) => void
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
  restoreBackup: (data: {
    settings?: Partial<Settings>
    preferences?: Partial<UserPreferences>
    quotations?: unknown[]
    priceBook?: unknown[]
    companies?: unknown[]
    activeCompanyId?: string
  }) => boolean
  resetSettings: () => void
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function generateQuoteNumber(settings: Settings): string {
  const { prefix, suffix, currentNumber, format } = settings.numbering
  return format
    .replace('{PREFIX}', prefix)
    .replace('{NUMBER:0000}', currentNumber.toString().padStart(4, '0'))
    .replace('{SUFFIX}', suffix)
}

function toFiniteNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''))
  return Number.isFinite(parsed) ? parsed : fallback
}

function normalizeHistory(value: unknown): PriceBookItem['history'] {
  if (!Array.isArray(value)) return []
  return value
    .filter((entry): entry is Record<string, unknown> => typeof entry === 'object' && entry !== null)
    .map((entry) => ({
      date: typeof entry.date === 'string' ? entry.date : new Date().toISOString(),
      rate: toFiniteNumber(entry.rate, 0),
      previousRate: Number.isFinite(Number(entry.previousRate)) ? Number(entry.previousRate) : undefined,
      changedBy: typeof entry.changedBy === 'string' ? entry.changedBy : undefined,
      reason: typeof entry.reason === 'string' ? entry.reason : undefined,
    }))
    .slice(-200)
}

/** Normalizes persisted or imported price book data so old rows never crash the view. */
function normalizePriceBookItem(item: Partial<PriceBookItem> | null | undefined, fallbackCompanyId: string): PriceBookItem {
  const now = new Date().toISOString()
  return {
    id: typeof item?.id === 'string' && item.id ? item.id : generateId(),
    companyId:
      typeof item?.companyId === 'string' && item.companyId ? item.companyId : fallbackCompanyId,
    description: typeof item?.description === 'string' ? item.description : 'Untitled item',
    category: typeof item?.category === 'string' && item.category ? item.category : 'Other',
    unit: typeof item?.unit === 'string' && item.unit ? item.unit : 'PCS',
    rate: toFiniteNumber(item?.rate, 0),
    taxRate: toFiniteNumber(item?.taxRate, DEFAULT_TAX_RATE),
    serviceRef: typeof item?.serviceRef === 'string' && item.serviceRef ? item.serviceRef : undefined,
    history: normalizeHistory(item?.history),
    createdAt: typeof item?.createdAt === 'string' ? item.createdAt : now,
    updatedAt: typeof item?.updatedAt === 'string' ? item.updatedAt : now,
  }
}

function mergeSettings(base: Settings, partial?: Partial<Settings>): Settings {
  if (!partial || typeof partial !== 'object') return base
  const section = <T>(value: unknown, fallback: T): T =>
    value && typeof value === 'object' && !Array.isArray(value)
      ? ({ ...fallback, ...(value as Partial<T>) } as T)
      : fallback
  const defaults = section(partial.defaults, base.defaults)
  return {
    company: section(partial.company, base.company),
    letterhead: section(partial.letterhead, base.letterhead),
    signature: section(partial.signature, base.signature),
    branding: section(partial.branding, base.branding),
    numbering: section(partial.numbering, base.numbering),
    defaults: {
      ...defaults,
      // Saudi Arabia: keep a valid 15% VAT and SAR currency on every restore.
      taxRate: Number.isFinite(defaults.taxRate) && defaults.taxRate > 0 ? defaults.taxRate : DEFAULT_TAX_RATE,
      currency: typeof defaults.currency === 'string' && defaults.currency ? defaults.currency : DEFAULT_CURRENCY,
    },
  }
}

function normalizePersistedState(persisted: unknown): Record<string, unknown> {
  const source =
    typeof persisted === 'object' && persisted !== null
      ? ({ ...(persisted as Record<string, unknown>) } as Record<string, unknown>)
      : {}

  const rawSettings = source.settings
  const persistedSettings =
    typeof rawSettings === 'object' && rawSettings !== null
      ? (rawSettings as Record<string, unknown>)
      : {}
  const persistedCompany =
    typeof persistedSettings.company === 'object' && persistedSettings.company !== null
      ? (persistedSettings.company as Record<string, unknown>)
      : {}

  const fallbackCompanyId =
    typeof source.activeCompanyId === 'string' && source.activeCompanyId
      ? source.activeCompanyId
      : DEFAULT_COMPANY_ID

  const rawPriceBook = source.priceBook
  const priceBook = Array.isArray(rawPriceBook)
    ? rawPriceBook.map((item) =>
        normalizePriceBookItem(item as Partial<PriceBookItem>, fallbackCompanyId),
      )
    : []

  const rawCompanies = source.companies
  const companies: Company[] =
    Array.isArray(rawCompanies) && rawCompanies.length > 0
      ? rawCompanies
          .filter((company): company is Record<string, unknown> => typeof company === 'object' && company !== null)
          .map((company, index) => ({
            id: typeof company.id === 'string' && company.id ? company.id : `company-${index + 1}`,
            name:
              typeof company.name === 'string' && company.name
                ? company.name
                : defaultCompanies[0].name,
            vatNumber: typeof company.vatNumber === 'string' ? company.vatNumber : undefined,
            currency:
              typeof company.currency === 'string' && company.currency
                ? company.currency
                : DEFAULT_CURRENCY,
            taxRate: toFiniteNumber(company.taxRate, DEFAULT_TAX_RATE),
            isDefault: Boolean(company.isDefault),
          }))
      : [
          {
            id: DEFAULT_COMPANY_ID,
            name:
              typeof persistedCompany.name === 'string' && persistedCompany.name
                ? persistedCompany.name
                : defaultCompanies[0].name,
            vatNumber:
              typeof persistedCompany.vatNumber === 'string'
                ? persistedCompany.vatNumber
                : defaultCompanies[0].vatNumber,
            currency:
              typeof persistedSettings.defaults === 'object' &&
              persistedSettings.defaults !== null &&
              typeof (persistedSettings.defaults as Record<string, unknown>).currency === 'string'
                ? String((persistedSettings.defaults as Record<string, unknown>).currency)
                : DEFAULT_CURRENCY,
            taxRate:
              typeof persistedSettings.defaults === 'object' &&
              persistedSettings.defaults !== null
                ? toFiniteNumber(
                    (persistedSettings.defaults as Record<string, unknown>).taxRate,
                    DEFAULT_TAX_RATE,
                  )
                : DEFAULT_TAX_RATE,
            isDefault: true,
          },
        ]

  const activeCompanyId =
    typeof source.activeCompanyId === 'string' &&
    companies.some((company) => company.id === source.activeCompanyId)
      ? source.activeCompanyId
      : companies[0].id

  return { ...source, priceBook, companies, activeCompanyId }
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      quotations: initialQuotations,
      priceBook: initialPriceBook,
      companies: defaultCompanies,
      activeCompanyId: DEFAULT_COMPANY_ID,
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
        set((state) => {
          const now = new Date().toISOString()
          const companyId =
            typeof item.companyId === 'string' && item.companyId
              ? item.companyId
              : state.activeCompanyId
          return {
            priceBook: [
              {
                ...item,
                id: item.id || generateId(),
                companyId,
                history: normalizeHistory(item.history),
                createdAt: item.createdAt || now,
                updatedAt: now,
              },
              ...state.priceBook,
            ],
          }
        }),

      updatePriceBookItem: (id, data, historyReason = 'Manual rate update') =>
        set((state) => ({
          priceBook: state.priceBook.map((item) => {
            if (item.id !== id) return item
            const now = new Date().toISOString()
            const nextRate = typeof data.rate === 'number' ? data.rate : item.rate
            const rateChanged = Number.isFinite(nextRate) && nextRate !== item.rate
            const history = rateChanged
              ? [
                  ...normalizeHistory(item.history),
                  {
                    date: now,
                    rate: nextRate,
                    previousRate: item.rate,
                    changedBy: 'Price Book',
                    reason: historyReason,
                  },
                ].slice(-200)
              : normalizeHistory(item.history)

            return {
              ...item,
              ...data,
              rate: nextRate,
              history,
              updatedAt: now,
            }
          }),
        })),

      deletePriceBookItem: (id) =>
        set((state) => ({ priceBook: state.priceBook.filter((item) => item.id !== id) })),

      setPriceBook: (items) => set({ priceBook: items }),

      setActiveCompany: (id) =>
        set((state) =>
          state.companies.some((company) => company.id === id) ? { activeCompanyId: id } : {},
        ),

      addCompany: (company) =>
        set((state) => {
          if (state.companies.some((existing) => existing.id === company.id)) {
            return {
              companies: state.companies.map((existing) =>
                existing.id === company.id ? { ...existing, ...company } : existing,
              ),
            }
          }
          return {
            companies: [...state.companies, company],
            activeCompanyId: company.id,
          }
        }),

      updateCompany: (id, data) =>
        set((state) => ({
          companies: state.companies.map((company) =>
            company.id === id ? { ...company, ...data } : company,
          ),
        })),

      updateSettings: (settings) =>
        set((state) => {
          const nextSettings = { ...state.settings, ...settings }
          const shouldSyncDefaultCompany = Boolean(settings.company)
          return {
            settings: nextSettings,
            companies: shouldSyncDefaultCompany
              ? state.companies.map((company) =>
                  company.isDefault || company.id === DEFAULT_COMPANY_ID
                    ? {
                        ...company,
                        name: nextSettings.company.name || company.name,
                        vatNumber: nextSettings.company.vatNumber || company.vatNumber,
                        currency: nextSettings.defaults.currency || company.currency,
                        taxRate: Number.isFinite(nextSettings.defaults.taxRate)
                          ? nextSettings.defaults.taxRate
                          : company.taxRate,
                      }
                    : company,
                )
              : state.companies,
          }
        }),

      updatePreferences: (prefs) =>
        set((state) => ({ preferences: { ...state.preferences, ...prefs } })),

      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),

      addToast: (toast) =>
        set((state) => {
          // Replace an existing notification of the same kind/title instead of
          // stacking duplicates, and keep at most three visible at a time.
          const remaining = state.toasts.filter(
            (existing) => !(existing.type === toast.type && existing.title === toast.title),
          )
          return { toasts: [{ ...toast, id: generateId() }, ...remaining].slice(0, 3) }
        }),

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

      restoreBackup: (data) => {
        const state = get()
        const settings = mergeSettings(defaultSettings, data.settings)
        const normalized = normalizePersistedState({
          priceBook: data.priceBook ?? state.priceBook,
          companies: data.companies ?? state.companies,
          activeCompanyId: data.activeCompanyId ?? state.activeCompanyId,
          settings,
        })
        const quotations = Array.isArray(data.quotations)
          ? data.quotations
              .map((quote, index) => normalizeImportedQuotation(quote, { settings, index }))
              .filter((quote): quote is Quotation => quote !== null)
          : state.quotations
        const preferences = {
          ...defaultPreferences,
          ...state.preferences,
          ...(data.preferences && typeof data.preferences === 'object' ? data.preferences : {}),
        }
        set({
          settings,
          preferences,
          quotations,
          priceBook: Array.isArray(normalized.priceBook)
            ? (normalized.priceBook as PriceBookItem[])
            : state.priceBook,
          companies: Array.isArray(normalized.companies) && normalized.companies.length > 0
            ? (normalized.companies as Company[])
            : state.companies,
          activeCompanyId:
            typeof normalized.activeCompanyId === 'string'
              ? normalized.activeCompanyId
              : state.activeCompanyId,
          error: undefined,
        })
        return true
      },

      resetSettings: () =>
        set((state) => ({
          settings: defaultSettings,
          preferences: {
            ...state.preferences,
            theme: defaultSettings.branding.theme,
            language: 'en',
            rtlEnabled: false,
          },
          companies: state.companies.map((company) =>
            company.isDefault || company.id === DEFAULT_COMPANY_ID
              ? {
                  ...company,
                  name: defaultSettings.company.name,
                  vatNumber: defaultSettings.company.vatNumber,
                  currency: defaultSettings.defaults.currency,
                  taxRate: defaultSettings.defaults.taxRate,
                }
              : company,
          ),
        })),
    }),
    {
      name: 'quoteflow-pro-remake',
      storage: createJSONStorage(() => localStorage),
      version: 5,
      migrate: (persisted: unknown, version: number) => {
        let next = normalizePersistedState(persisted)

        if (version < 3) {
          const currentPrefs =
            typeof next.preferences === 'object' && next.preferences !== null
              ? (next.preferences as Record<string, unknown>)
              : {}
          next = { ...next, preferences: { ...defaultPreferences, ...currentPrefs } }
        }
        if (version < 4) {
          const rows = Array.isArray(next.priceBook)
            ? (next.priceBook as Array<Record<string, unknown>>)
            : []
          next = {
            ...next,
            priceBook: rows.map((item) => {
              const { hsnCode, ...rest } = item
              return {
                ...rest,
                serviceRef: item.serviceRef || (typeof hsnCode === 'string' ? hsnCode : ''),
              }
            }),
          }
        }
        if (version < 5) {
          next = normalizePersistedState(next)
        }
        return next
      },
      merge: (persisted, current) => {
        const normalized = normalizePersistedState(persisted)
        return {
          ...current,
          ...(normalized as Partial<StoreState>),
          settings: {
            ...current.settings,
            ...((normalized.settings as Partial<Settings> | undefined) || {}),
            company: {
              ...current.settings.company,
              ...((normalized.settings as Settings | undefined)?.company || {}),
            },
            defaults: {
              ...current.settings.defaults,
              ...((normalized.settings as Settings | undefined)?.defaults || {}),
            },
          },
          preferences: {
            ...current.preferences,
            ...((normalized.preferences as Partial<UserPreferences> | undefined) || {}),
          },
          priceBook: Array.isArray(normalized.priceBook)
            ? (normalized.priceBook as PriceBookItem[])
            : current.priceBook,
          companies:
            Array.isArray(normalized.companies) && normalized.companies.length > 0
              ? (normalized.companies as Company[])
              : current.companies,
          activeCompanyId:
            typeof normalized.activeCompanyId === 'string'
              ? normalized.activeCompanyId
              : current.activeCompanyId,
        }
      },
    },
  ),
)

export {
  generateId,
  generateQuoteNumber,
  defaultSettings,
  defaultCompanies,
  defaultPreferences,
  normalizePriceBookItem,
}
