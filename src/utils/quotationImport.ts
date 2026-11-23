import { parseNumeric } from '@/utils/pricebook'
import { generateId } from '@/utils/formatters'
import type { Client, Quotation, QuotationItem, Settings } from '@/types'

/**
 * Shared, defensive import helpers for quotations.
 *
 * All parsers return plain row objects and never throw on empty or malformed
 * input. `normalizeImportedQuotation` is the single place where a loose row
 * becomes a fully populated Quotation, so every supported format (JSON, CSV,
 * Excel, PDF) maps fields the same way.
 */

export type ImportSource =
  | { kind: 'path'; path: string; name: string }
  | { kind: 'file'; file: File; name: string }

type UnknownRecord = Record<string, unknown>

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const normalizeKey = (key: string) => key.trim().toLowerCase().replace(/[^a-z0-9]/g, '')

const extensionOf = (name: string) => name.split('.').pop()?.toLowerCase() || ''

function pickField(row: UnknownRecord, aliases: string[]): unknown {
  const normalized = new Map<string, unknown>()
  for (const [key, value] of Object.entries(row)) {
    normalized.set(normalizeKey(key), value)
  }
  for (const alias of aliases) {
    const value = normalized.get(normalizeKey(alias))
    if (value !== undefined && value !== null && String(value).trim() !== '') return value
  }
  return undefined
}

function textValue(value: unknown, fallback = ''): string {
  if (value === undefined || value === null) return fallback
  if (typeof value === 'string') return value.trim() || fallback
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  // Nested objects are handled by the client/item mappers, not here.
  return Array.isArray(value) ? value.map((entry) => String(entry ?? '')).join(', ') : fallback
}

function isoDate(value: unknown, fallback: string): string {
  const text = textValue(value)
  if (!text) return fallback
  const parsed = new Date(text)
  if (Number.isNaN(parsed.getTime())) return fallback
  return parsed.toISOString().slice(0, 10)
}

const VALID_STATUSES: Quotation['status'][] = ['draft', 'sent', 'approved', 'rejected', 'expired']
const VALID_STATUS_TRACKING: Quotation['statusTracking'][] = [
  'Draft', 'Waiting For PO', 'Job Received', 'Under Process', 'Completed', 'Lost',
]

function asStatus(value: unknown): Quotation['status'] {
  const normalized = textValue(value).toLowerCase()
  return VALID_STATUSES.find((status) => status === normalized) || 'draft'
}

function asStatusTracking(value: unknown): Quotation['statusTracking'] {
  const normalized = textValue(value).toLowerCase()
  return (
    VALID_STATUS_TRACKING.find((status) => status.toLowerCase() === normalized) || 'Draft'
  )
}

/** Split a CSV row while honouring quoted cells, escaped quotes and CRLF. */
function splitCsvLine(line: string): string[] {
  const cells: string[] = []
  let current = ''
  let inQuotes = false
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      cells.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  cells.push(current.trim())
  return cells
}

export function parseCsvRows(content: string): UnknownRecord[] {
  const lines = content
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
  if (lines.length < 2) return []

  const headers = splitCsvLine(lines[0]).map((header) => normalizeKey(header))
  if (headers.every((header) => !header)) return []

  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line)
    const row: UnknownRecord = {}
    headers.forEach((header, index) => {
      if (header) row[header] = values[index] ?? ''
    })
    return row
  })
}

function extractRowsFromJson(data: unknown): UnknownRecord[] {
  if (Array.isArray(data)) return data.filter(isRecord)
  if (!isRecord(data)) return []

  const candidates = ['quotations', 'quotes', 'items', 'rows', 'records', 'data']
  for (const key of candidates) {
    const candidate = data[key]
    if (Array.isArray(candidate)) return candidate.filter(isRecord)
  }

  const state = data.state
  if (isRecord(state)) {
    for (const key of candidates) {
      const candidate = state[key]
      if (Array.isArray(candidate)) return candidate.filter(isRecord)
    }
  }

  // A single quotation object.
  if ('quoteNumber' in data || 'client' in data || 'items' in data) return [data]

  const values = Object.values(data).filter(isRecord)
  if (values.length > 0 && values.some((value) => 'quoteNumber' in value || 'client' in value)) {
    return values
  }
  return []
}

async function rowsFromWorkbook(
  input: string | Uint8Array,
  type: 'string' | 'base64' | 'array',
): Promise<UnknownRecord[]> {
  const XLSX = await import('xlsx')
  const workbook = XLSX.read(input, { type })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName || !workbook.Sheets[sheetName]) return []
  return XLSX.utils.sheet_to_json<UnknownRecord>(workbook.Sheets[sheetName], {
    defval: '',
    raw: false,
  })
}

interface PdfTextItem {
  str?: string
  transform?: number[]
}

/**
 * Best-effort PDF mapping: labeled fields become quotation fields, and rows
 * ending in three numeric cells become line items. Unknown or empty PDFs yield
 * an empty array instead of throwing.
 */
export async function extractPdfRows(bytes: Uint8Array): Promise<UnknownRecord[]> {
  const [pdfjs, worker] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ])
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default

  const pdf = await pdfjs.getDocument({ data: bytes }).promise
  const lines: string[] = []

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    const content = await page.getTextContent()
    const byPosition = new Map<number, string[]>()
    for (const entry of content.items as PdfTextItem[]) {
      const value = String(entry.str ?? '').trim()
      if (!value) continue
      const y = Math.round(entry.transform?.[5] ?? 0)
      const parts = byPosition.get(y) || []
      parts.push(value)
      byPosition.set(y, parts)
    }
    const pageLines = [...byPosition.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([, parts]) => parts.join(' ').trim())
      .filter(Boolean)
    lines.push(...pageLines)
  }

  if (lines.length === 0) return []

  const fieldAliases = new Map<string, string>([
    ['quotenumber', 'quoteNumber'],
    ['quoteno', 'quoteNumber'],
    ['quotationnumber', 'quoteNumber'],
    ['number', 'quoteNumber'],
    ['ref', 'ref'],
    ['reference', 'ref'],
    ['date', 'date'],
    ['client', 'client'],
    ['clientname', 'clientName'],
    ['customer', 'clientName'],
    ['company', 'clientCompany'],
    ['email', 'clientEmail'],
    ['phone', 'clientPhone'],
    ['address', 'clientAddress'],
    ['vatnumber', 'clientVatNumber'],
    ['project', 'project'],
    ['title', 'title'],
    ['notes', 'notes'],
    ['terms', 'terms'],
    ['status', 'status'],
  ])

  const draft: UnknownRecord = {}
  const items: QuotationItem[] = []

  for (const line of lines) {
    const separator = line.indexOf(':')
    if (separator > 0) {
      const key = normalizeKey(line.slice(0, separator))
      const value = line.slice(separator + 1).trim()
      const field = fieldAliases.get(key)
      if (field && value) {
        draft[field] = value
        continue
      }
    }

    const cells = line
      .split(/\s{2,}|\t+/)
      .map((cell) => cell.trim())
      .filter(Boolean)
    if (cells.length >= 4) {
      const numbers = cells.slice(-3).map(parseNumeric)
      if (numbers.every((number) => Number.isFinite(number))) {
        items.push({
          id: generateId(),
          description: cells.slice(0, -3).join(' '),
          quantity: numbers[0],
          unit: 'PCS',
          rate: numbers[1],
          amount: numbers[2],
        })
      }
    }
  }

  if (Object.keys(draft).length === 0 && items.length === 0) return []
  draft.items = items
  return [draft]
}

async function readBytes(source: ImportSource): Promise<Uint8Array> {
  if (source.kind === 'file') return new Uint8Array(await source.file.arrayBuffer())
  const api = window.electronAPI
  if (!api?.readFileBase64) throw new Error('Binary file reading is not available in this runtime')
  const base64 = await api.readFileBase64(source.path)
  if (!base64) throw new Error('Could not read the selected file')
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}

/** Reads any supported quotation import source into loose row objects. */
export async function readQuotationImportRows(source: ImportSource): Promise<UnknownRecord[]> {
  const extension = extensionOf(source.name)

  if (extension === 'json') {
    let content: string
    if (source.kind === 'file') {
      content = await source.file.text()
    } else {
      const api = window.electronAPI
      if (!api?.readFile) throw new Error('File reading is not available in this runtime')
      const result = await api.readFile(source.path)
      if (result === null) throw new Error('Could not read the selected file')
      content = result
    }
    return extractRowsFromJson(JSON.parse(content.replace(/^\uFEFF/, '')))
  }

  if (extension === 'csv' || extension === 'txt') {
    let content: string
    if (source.kind === 'file') {
      content = await source.file.text()
    } else {
      const api = window.electronAPI
      if (!api?.readFile) throw new Error('File reading is not available in this runtime')
      const result = await api.readFile(source.path)
      if (result === null) throw new Error('Could not read the selected file')
      content = result
    }
    return parseCsvRows(content)
  }

  if (extension === 'xlsx' || extension === 'xls') {
    if (source.kind === 'file') {
      return rowsFromWorkbook(new Uint8Array(await source.file.arrayBuffer()), 'array')
    }
    return rowsFromWorkbook(await readBytes(source), 'array')
  }

  if (extension === 'pdf') return extractPdfRows(await readBytes(source))

  throw new Error(`Unsupported file type: .${extension || '?'}`)
}

export function importedHeaderPreview(rows: UnknownRecord[]): string[] {
  const headers = new Set<string>()
  for (const row of rows.slice(0, 5)) {
    for (const key of Object.keys(row)) {
      if (key && key !== 'items') headers.add(key)
    }
  }
  return [...headers]
}

function mapClient(value: unknown, row: UnknownRecord): Client {
  const source = isRecord(value) ? value : {}
  const name = textValue(pickField(source, ['name', 'clientName'])) ||
    textValue(pickField(row, ['clientName', 'client', 'customer', 'customerName'])) ||
    'Imported Client'
  return {
    id: textValue(pickField(source, ['id', 'clientId']), generateId()) || generateId(),
    name,
    email: textValue(pickField(source, ['email', 'clientEmail']) || pickField(row, ['clientEmail', 'email'])),
    phone: textValue(pickField(source, ['phone', 'clientPhone']) || pickField(row, ['clientPhone', 'phone'])),
    address: textValue(pickField(source, ['address', 'clientAddress']) || pickField(row, ['clientAddress', 'address'])),
    vatNumber: textValue(pickField(source, ['vatNumber', 'vat', 'taxNumber']) || pickField(row, ['clientVatNumber', 'vatNumber'])),
    company: textValue(pickField(source, ['company', 'companyName']) || pickField(row, ['clientCompany', 'company'])),
    contactPerson: textValue(pickField(source, ['contactPerson', 'attnTo']) || pickField(row, ['attnTo', 'contactPerson'])),
  }
}

function mapLineItem(value: unknown, index: number): QuotationItem | null {
  if (!isRecord(value)) return null
  const description = textValue(pickField(value, ['description', 'item', 'particulars', 'service', 'name']))
  if (!description) return null
  const quantity = parseNumeric(pickField(value, ['quantity', 'qty', 'no', 'sNo']))
  const rate = parseNumeric(pickField(value, ['rate', 'unitRate', 'price', 'unitPrice']))
  const rawAmount = parseNumeric(pickField(value, ['amount', 'total', 'lineTotal']))
  const safeQuantity = Number.isFinite(quantity) ? quantity : 1
  const safeRate = Number.isFinite(rate) ? rate : 0
  const taxRate = parseNumeric(pickField(value, ['taxRate', 'vatRate', 'tax', 'vat']))
  const taxAmount = parseNumeric(pickField(value, ['taxAmount', 'vatAmount']))
  return {
    id: textValue(pickField(value, ['id', 'itemId']), generateId()) || generateId(),
    description,
    quantity: safeQuantity,
    unit: textValue(pickField(value, ['unit', 'uom']), 'PCS') || 'PCS',
    rate: safeRate,
    amount: Number.isFinite(rawAmount) ? rawAmount : safeQuantity * safeRate,
    taxRate: Number.isFinite(taxRate) ? taxRate : undefined,
    taxAmount: Number.isFinite(taxAmount) ? taxAmount : undefined,
    hsnCode: textValue(pickField(value, ['hsnCode', 'hsn', 'serviceRef', 'code'])),
    sizeInch: textValue(pickField(value, ['sizeInch', 'size'])),
    classRating: textValue(pickField(value, ['classRating', 'class', 'rating'])),
    remarks: textValue(pickField(value, ['remarks', 'note'])),
    sNo: Number.isFinite(parseNumeric(pickField(value, ['sNo', 'serialNo']))) ? parseNumeric(pickField(value, ['sNo', 'serialNo'])) : index + 1,
  }
}

/** Converts one loose imported row into a complete, renderable Quotation. */
export function normalizeImportedQuotation(
  raw: unknown,
  options: { settings: Settings; index?: number; now?: Date } | undefined,
): Quotation | null {
  if (!isRecord(raw)) return null

  const row = raw
  const settings = options?.settings
  const index = options?.index ?? 0
  const now = options?.now ?? new Date()
  const createdAt = now.toISOString()
  const today = createdAt.slice(0, 10)
  const defaultTaxRate = settings && Number.isFinite(settings.defaults.taxRate)
    ? settings.defaults.taxRate
    : 15

  const rawItems = pickField(row, ['items', 'lineItems', 'quotationItems'])
  const items: QuotationItem[] = Array.isArray(rawItems)
    ? rawItems.map(mapLineItem).filter((item): item is QuotationItem => item !== null)
    : []

  const inlineItem = mapLineItem(row, 0)
  if (items.length === 0 && inlineItem) items.push(inlineItem)

  const quoteNumber =
    textValue(pickField(row, ['quoteNumber', 'quotationNumber', 'quoteNo', 'number', 'ref'])) ||
    `IMP-${today.replace(/-/g, '')}-${String(index + 1).padStart(4, '0')}`

  const client = mapClient(pickField(row, ['client', 'customer']), row)

  const subtotalRaw = parseNumeric(pickField(row, ['subtotal', 'subTotal', 'netAmount']))
  const taxRaw = parseNumeric(pickField(row, ['tax', 'vatAmount', 'taxAmount']))
  const totalRaw = parseNumeric(pickField(row, ['total', 'grandTotal', 'netTotal']))

  const computedSubtotal = items.reduce((sum, item) => sum + item.quantity * item.rate, 0)
  const subtotal = Number.isFinite(subtotalRaw)
    ? subtotalRaw
    : computedSubtotal || (Number.isFinite(totalRaw) ? totalRaw / (1 + defaultTaxRate / 100) : 0)
  const tax = Number.isFinite(taxRaw)
    ? taxRaw
    : (Number.isFinite(totalRaw) ? totalRaw - subtotal : (subtotal * defaultTaxRate) / 100)
  const total = Number.isFinite(totalRaw) ? totalRaw : subtotal + tax

  const vatRaw = parseNumeric(pickField(row, ['vat', 'vatRate', 'taxRate', 'tax']))
  const vat = Number.isFinite(vatRaw) && vatRaw > 0 ? vatRaw : defaultTaxRate

  const scopeOfWork = pickField(row, ['scopeOfWork', 'scope'])
  const clientProvisions = pickField(row, ['clientProvisions', 'provisions'])
  const annexurePages = pickField(row, ['annexurePages', 'annexures'])

  return {
    id: textValue(pickField(row, ['id', 'quoteId']), generateId()) || generateId(),
    type: textValue(pickField(row, ['type'])).toLowerCase() === 'valve' ? 'valve' : 'standard',
    quoteNumber,
    date: isoDate(pickField(row, ['date', 'quoteDate', 'createdAt']), today),
    client,
    items,
    subtotal,
    tax: Number.isFinite(tax) ? tax : 0,
    total: Number.isFinite(total) ? total : subtotal,
    status: asStatus(pickField(row, ['status'])),
    notes: textValue(pickField(row, ['notes', 'note'])),
    terms: textValue(pickField(row, ['terms', 'paymentTerms']), settings?.defaults.paymentTerms || 'Net 30'),
    createdAt: isoDate(pickField(row, ['createdAt']), createdAt) + 'T00:00:00.000Z',
    updatedAt: createdAt,
    serialNumber: textValue(pickField(row, ['serialNumber', 'serialNo'])),
    annexurePages: Array.isArray(annexurePages)
      ? annexurePages.map((page, pageIndex) => ({
          id: generateId(),
          title: textValue(isRecord(page) ? page.title : undefined, `Annexure ${pageIndex + 1}`),
          content: textValue(isRecord(page) ? page.content : undefined),
          order: pageIndex + 1,
        }))
      : [],
    // V1 fields — preserved so imported quotes open correctly in QuoteEditor.
    title: textValue(pickField(row, ['title', 'subject']), 'Hydro Test Services'),
    attnTo: textValue(pickField(row, ['attnTo', 'attention'])),
    ref: textValue(pickField(row, ['ref', 'reference'])),
    poNumber: textValue(pickField(row, ['poNumber', 'po'])),
    location: textValue(pickField(row, ['location'])),
    project: textValue(pickField(row, ['project'])),
    introParagraph: textValue(
      pickField(row, ['introParagraph', 'intro']),
      'We are pleased to submit our quotation for the following services:',
    ),
    vatNote: textValue(
      pickField(row, ['vatNote']),
      `${vat}% VAT will be charged extra as per KSA regulations.`,
    ),
    scopeOfWork: Array.isArray(scopeOfWork)
      ? scopeOfWork.map((entry) => textValue(entry)).filter(Boolean)
      : [],
    clientProvisions: Array.isArray(clientProvisions)
      ? clientProvisions.map((entry) => textValue(entry)).filter(Boolean)
      : [],
    closingNote: textValue(
      pickField(row, ['closingNote', 'closing']),
      'We look forward to your favorable response and remain available for any clarifications.',
    ),
    statusTracking: asStatusTracking(pickField(row, ['statusTracking'])),
    followUpDate: isoDate(pickField(row, ['followUpDate', 'followup']), ''),
    via: textValue(pickField(row, ['via']), 'Email'),
    clientCode: textValue(pickField(row, ['clientCode', 'code'])),
    svc: textValue(pickField(row, ['svc']), 'Valve Test'),
    dept: textValue(pickField(row, ['dept', 'department'])),
    spDept: textValue(pickField(row, ['spDept'])),
    showRm: Boolean(pickField(row, ['showRm', 'showRates']) ?? false),
    signatureOption: textValue(pickField(row, ['signatureOption'])).toLowerCase() === 'digital'
      ? 'digital'
      : textValue(pickField(row, ['signatureOption'])).toLowerCase() === 'handwritten'
        ? 'handwritten'
        : 'none',
    sub: textValue(pickField(row, ['sub', 'subject'])),
    revised: Boolean(pickField(row, ['revised']) ?? false),
    rateNote: textValue(pickField(row, ['rateNote'])),
    showTot: Boolean(pickField(row, ['showTot', 'showTotal']) ?? false),
    delivery: textValue(pickField(row, ['delivery'])),
    service: textValue(pickField(row, ['service'])),
    intro: textValue(pickField(row, ['intro'])),
    vat,
    closing: textValue(pickField(row, ['closing'])),
    sign: Boolean(pickField(row, ['sign']) ?? false),
    isNew: Boolean(pickField(row, ['isNew']) ?? false),
  }
}
