export interface Quotation {
  id: string
  type: 'standard' | 'valve'
  quoteNumber: string
  date: string
  client: Client
  items: QuotationItem[]
  subtotal: number
  tax: number
  total: number
  status: 'draft' | 'sent' | 'approved' | 'rejected' | 'expired'
  notes?: string
  terms?: string
  createdAt: string
  updatedAt: string
  serialNumber?: string
  annexurePages?: AnnexurePage[]
  // V1 fields - mapped from V1 Quotation type
  title: string
  attnTo: string
  ref: string
  poNumber?: string
  location: string
  project: string
  introParagraph: string
  vatNote: string
  scopeOfWork: string[]
  clientProvisions: string[]
  closingNote: string
  // Status tracking
  statusTracking: 'Draft' | 'Waiting For PO' | 'Job Received' | 'Under Process' | 'Completed' | 'Lost'
  /** Optional follow-up date (ISO yyyy-mm-dd) used by the quotations dashboard. */
  followUpDate?: string
  via: string
  clientCode: string
  svc: string
  dept: string
  spDept: string
  // Excel/PDF export options
  showRm: boolean
  signatureOption: 'none' | 'digital' | 'handwritten'
  /** Main heading printed on exported PDF/Excel documents. */
  pdfHeading?: string
  /** Optional per-quotation signature image (base64 data URL). */
  signatureImage?: string
  // V1 additional fields
  sub?: string          // Valve quote subject line
  revised?: boolean     // Add "REVISED" to title
  rateNote?: string     // e.g. "(Pass or Fail)"
  showTot?: boolean     // Show total rows on valve quote
  delivery: string
  service: string
  intro: string
  vat: number           // VAT percentage
  closing: string
  sign: boolean         // Whether to attach digital signature
  isNew?: boolean
}

export interface Client {
  id: string
  name: string
  email?: string
  phone?: string
  address?: string
  vatNumber?: string
  company?: string
  contactPerson?: string
  [key: string]: string | undefined
}

export interface QuotationItem {
  id: string
  description: string
  quantity: number
  unit: string
  rate: number
  amount: number
  taxRate?: number
  taxAmount?: number
  hsnCode?: string
  // Valve-specific fields
  sizeInch?: string
  classRating?: string
  remarks?: string
  sNo?: number
  /** Serial number extracted from equipment lists (e.g. "S/N: 12345"). */
  serialNo?: string
}

export interface AnnexurePage {
  id: string
  title: string
  content: string
  order: number
}

export interface PriceBookItem {
  id: string
  /** Company/branch that owns this rate. Rates are segregated per company. */
  companyId: string
  category: string
  description: string
  unit: string
  rate: number
  serviceRef?: string
  taxRate?: number
  history: PriceHistoryEntry[]
  createdAt: string
  updatedAt: string
}

export interface PriceHistoryEntry {
  date: string
  rate: number
  /** Rate before this change, when known. */
  previousRate?: number
  changedBy?: string
  reason?: string
}

/**
 * A company (or branch/division) whose price book is kept separate from the
 * others. `isDefault` marks the company seeded from Settings on first run.
 */
export interface Company {
  id: string
  name: string
  vatNumber?: string
  currency: string
  taxRate: number
  isDefault?: boolean
}

export interface Settings {
  company: CompanySettings
  letterhead: LetterheadSettings
  signature: SignatureSettings
  branding: BrandingSettings
  numbering: NumberingSettings
  defaults: DefaultSettings
}

export interface CompanySettings {
  name: string
  address: string
  phone: string
  email: string
  website?: string
  vatNumber: string
  panNumber?: string
  cinNumber?: string
}

export interface LetterheadSettings {
  logo?: string
  logoPosition: 'left' | 'center' | 'right'
  showLogo: boolean
  headerText?: string
  footerText?: string
  backgroundImage?: string
  backgroundOpacity: number
}

export interface SignatureSettings {
  name: string
  designation: string
  signatureImage?: string
  showSignature: boolean
}

export interface BrandingSettings {
  primaryColor: string
  secondaryColor: string
  fontFamily: string
  theme: 'neumorphism' | 'maximalism' | 'minimalism'
  accentColor: string
  borderRadius: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  animationsEnabled: boolean
  reducedMotion: boolean
}

export interface NumberingSettings {
  prefix: string
  suffix: string
  startNumber: number
  currentNumber: number
  format: string
}

export interface DefaultSettings {
  taxRate: number
  currency: string
  dateFormat: string
  language: 'en' | 'ar'
  rtlEnabled: boolean
  paymentTerms: string
  validityDays: number
}

export interface UserPreferences {
  theme: Settings['branding']['theme']
  language: 'en' | 'ar'
  rtlEnabled: boolean
  sidebarCollapsed: boolean
  compactMode: boolean
  animationsEnabled: boolean
  reducedMotion: boolean
  lastViewedQuoteId?: string
  recentClients: string[]
  favoriteItems: string[]
  /** Local directory chosen in Settings → Local Storage for JSON backups. */
  backupFolder?: string
}

export interface AppState {
  quotations: Quotation[]
  priceBook: PriceBookItem[]
  companies: Company[]
  activeCompanyId: string
  settings: Settings
  preferences: UserPreferences
  currentView: 'dashboard' | 'quotes' | 'editor' | 'pricebook' | 'reports' | 'settings' | 'ai-studio' | 'diagnostics'
  selectedQuoteId?: string
  isLoading: boolean
  error?: string
}

export type ViewType = AppState['currentView']

/** Portable JSON backup format written by Settings / Command Palette. */
export interface BackupPayload {
  app: string
  version: number
  exportedAt: string
  settings: Settings
  preferences: UserPreferences
  quotations: Quotation[]
  priceBook: PriceBookItem[]
  companies: Company[]
  activeCompanyId: string
}

export interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
  action?: { label: string; onClick: () => void }
}

export interface Shortcut {
  key: string
  description: string
  action: () => void
  global?: boolean
}

export interface DiagnosticResult {
  category: string
  checks: DiagnosticCheck[]
  overallStatus: 'healthy' | 'warning' | 'critical'
  timestamp: string
}

export interface DiagnosticCheck {
  name: string
  status: 'pass' | 'fail' | 'warning'
  message: string
  description?: string
  fixable: boolean
  fixAction?: string
}

export interface AIQuoteRequest {
  prompt: string
  clientId?: string
  quoteType: 'standard' | 'valve'
  itemCount?: number
}

export interface AIQuoteItem {
  description: string
  quantity: number
  unit: string
  rate: number
  taxRate?: number
  hsnCode?: string
}

export interface AIQuoteResponse {
  items: AIQuoteItem[]
  notes?: string
  terms?: string
  confidence: number
}
