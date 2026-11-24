import { parseNumeric } from '@/utils/pricebook'
import { generateId } from '@/utils/formatters'
import { defaultPdfHeading } from '@/utils/uicFormats'
import type { Client, Quotation, QuotationItem, Settings } from '@/types'

/**
 * Defensive, format-flexible import helpers shared by quotation, line-item and
 * price book imports. Parsers return loose row objects; mapping functions turn
 * those rows into typed items. Nothing here throws on empty or malformed input
 * except a scanned/empty PDF, which produces an explicit, user-facing error.
 */

export type ImportSource =
  | { kind: 'path'; path: string; name: string }
  | { kind: 'file'; file: File; name: string }

type UnknownRecord = Record<string, unknown>

export const SCANNED_PDF_MESSAGE =
  'This PDF has little or no extractable text (it may be a scanned image). Use an Excel/CSV file or OCR the PDF first.'

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
  return VALID_STATUS_TRACKING.find((status) => status.toLowerCase() === normalized) || 'Draft'
}

const NON_EQUIPMENT_PATTERNS: RegExp[] = [
  /\bsample\s*(holding|storage|retention|note|bottle|container)\b/i,
  /\bsamples?\b[^.]{0,60}\b(held|stored|retained|kept)\b/i,
  /\b(held|stored|retained|kept)\s+for\s+\d+\s+days?\b/i,
  /\bdays?\s+after\s+(collection|receipt|sampling)\b/i,
  /\bholding\s*(days|period|time|charges)\b/i,
  /\bbottle\b/i,
  /\b(terms\s*(and|&)?\s*conditions?|important\s+note|confidentiality|policy|clause)\b/i,
  /^\s*(ref(erence)?\.?|ref\s*(no\.?)?|po\s*(no\.?)?|quote\s*(no\.?)?|quotation\s*(no\.?)?)\s*[:#-]?\s*[\w\-\/]+\s*$/i,
  /^\s*(page\s*\d+|date\s*[:.]|attn\s*to\s*:)/i,
  /\b(dear\s+sir|thanks\s*(and|&)?\s*best\s+regards|we\s+hope|purchase\s+order|vat\s+amount|net\s+total|total\s+amount)\b/i,
  /^\s*\d{1,3}[.)]\s+[A-Za-z]/,
]

/** True for prose/policy/reference lines that must never become equipment rows. */
export function isNonEquipmentLine(value: string): boolean {
  const text = value.trim()
  if (!text) return true
  if (NON_EQUIPMENT_PATTERNS.some((pattern) => pattern.test(text))) return true
  // A bare reference code/number with no description.
  if (!/\s/.test(text) && /\d/.test(text) && text.length <= 30) return true
  return false
}

/** Turns `88953-Powerline Solutions Gen.Cont.xlsx` into `Powerline Solutions Gen.Cont`. */
export function clientNameFromFileName(fileName: string): string {
  let name = fileName.replace(/\.[^.]+$/, '').replace(/^\uFEFF/, '')
  name = name.replace(/^\s*\d{4,}\s*[-–—_:]\s*/, '').trim()
  name = name.replace(/^\s*[A-Za-z]{1,4}\s*-?\s*\d{2,}\s*[-–—_:]\s*/, '').trim()
  return name
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

/** Flexible column aliases — header text is normalized to lowercase alphanumerics. */
const ITEM_ALIASES: Record<string, string[]> = {
  description: [
    'description', 'item', 'itemdescription', 'equipment', 'equipmentdescription',
    'service', 'servicedescription', 'particulars', 'details', 'product',
    'productname', 'name', 'workdescription',
  ],
  quantity: ['quantity', 'qty', 'q', 'nos', 'no', 'noofitems', 'sno', 'sno'],
  rate: [
    'rate', 'unitrate', 'price', 'unitprice', 'unitrateinsar', 'unitrateinsr',
    'rateinsar', 'ratesar', 'priceinsar', 'unitcost', 'cost',
  ],
  amount: ['amount', 'lineamount', 'total', 'totalamount', 'amountinsar', 'amountsar', 'value'],
  unit: ['unit', 'uom', 'unitofmeasure', 'units'],
  size: ['size', 'sizeinch', 'sizeinches', 'sizein', 'pipesize'],
  class: ['class', 'classrating', 'rating', 'classratings'],
  remarks: ['remarks', 'remark', 'note', 'notes', 'comment', 'comments'],
  serial: ['serialno', 'serialnumber', 'serial', 'serno', 'sn', 'serialnumbers'],
  category: ['category', 'type', 'group', 'itemcategory', 'servicecategory'],
  taxRate: ['taxrate', 'vat', 'vatrate', 'tax', 'taxpercent', 'vatpercent'],
  quoteNumber: ['quotenumber', 'quotationnumber', 'quoteno', 'quote', 'number', 'ref'],
  client: ['client', 'clientname', 'customer', 'customername', 'company', 'companyname', 'clientcompany', 'attnto', 'attn', 'buyer'],
  date: ['date', 'quotedate', 'quotationdate'],
}

function matchesAlias(cell: unknown, aliases: string[]): boolean {
  const key = normalizeKey(textValue(cell))
  return Boolean(key && aliases.some((alias) => normalizeKey(alias) === key))
}

function isFooterRow(cells: unknown[]): boolean {
  if (cells.some((cell) => typeof cell === 'string' && cell.trim().startsWith('='))) return true
  const normalized = cells.map((cell) => textValue(cell).trim().toLowerCase())
  const footerLabels = new Set([
    'total', 'grand total', 'subtotal', 'sub total', 'net total', 'total amount',
    'summary', 'balance due', 'amount due', 'total qty', 'requested total quantities',
    'vat amount', 'vat', 'tax', 'sum',
  ])
  if (normalized.some((cell) => footerLabels.has(cell))) return true
  return normalized.some((cell) => /^(total|subtotal|net total|grand total|vat|summary)\s*[:(]/i.test(cell))
}

/**
 * Converts a raw spreadsheet/CSV matrix into records. The header row is
 * detected by scoring alias matches, so it can sit on row 8 (or later) and
 * column A may be blank. Footer/summary rows are dropped.
 */
export function rowsFromMatrix(matrix: unknown[][]): UnknownRecord[] {
  const usable = matrix.filter((row) => Array.isArray(row) && row.some((cell) => textValue(cell)))
  if (usable.length === 0) return []

  let headerIndex = 0
  let bestScore = -1
  const scanLimit = Math.min(usable.length, 40)
  for (let index = 0; index < scanLimit; index += 1) {
    const cells = usable[index]
    const score = Object.values(ITEM_ALIASES).reduce(
      (total, aliases) => total + (cells.some((cell) => matchesAlias(cell, aliases)) ? 1 : 0),
      0,
    )
    if (score > bestScore) {
      bestScore = score
      headerIndex = index
    }
    if (score >= 4) break
  }

  const headerCells = usable[headerIndex]
  const headerKeys = headerCells.map((cell, index) => {
    const key = normalizeKey(textValue(cell))
    return key || `column${index + 1}`
  })

  const rows: UnknownRecord[] = []
  for (let index = headerIndex + 1; index < usable.length; index += 1) {
    const cells = usable[index]
    if (isFooterRow(cells)) continue
    const row: UnknownRecord = {}
    cells.forEach((cell, columnIndex) => {
      const key = headerKeys[columnIndex] || `column${columnIndex + 1}`
      row[key] = cell
    })
    const hasContent = Object.values(row).some((value) => textValue(value) !== '')
    if (hasContent) rows.push(row)
  }
  return rows
}

export function parseCsvRows(content: string): UnknownRecord[] {
  const matrix = content
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => splitCsvLine(line))
  return rowsFromMatrix(matrix)
}

function extractRowsFromJson(data: unknown): UnknownRecord[] {
  if (Array.isArray(data)) return data.filter(isRecord)
  if (!isRecord(data)) return []

  const candidates = ['quotations', 'quotes', 'items', 'rows', 'records', 'data', 'lineItems']
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
  const rows: UnknownRecord[] = []
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName]
    if (!sheet) continue
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: '',
      blankrows: false,
      raw: true,
    })
    rows.push(...rowsFromMatrix(matrix))
  }
  return rows
}

interface PdfWord {
  text: string
  x: number
  y: number
}

interface PdfLine {
  text: string
  cells: string[]
}

interface ExtractedPdf {
  fields: UnknownRecord
  items: UnknownRecord[]
  lines: PdfLine[]
}

function splitLineCells(words: PdfWord[]): string[] {
  const cells: string[] = []
  let current = ''
  let previousEnd: number | null = null
  for (const word of [...words].sort((a, b) => a.x - b.x)) {
    const gap = previousEnd === null ? 0 : word.x - previousEnd
    if (previousEnd !== null && gap > 12 && current.trim()) {
      cells.push(current.trim())
      current = ''
    }
    current += `${current ? ' ' : ''}${word.text}`
    previousEnd = word.x + Math.max(6, word.text.length * 2.6)
  }
  if (current.trim()) cells.push(current.trim())
  return cells
}

async function extractPdfContent(bytes: Uint8Array): Promise<ExtractedPdf> {
  const [pdfjs, worker] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ])
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default

  const pdf = await pdfjs.getDocument({ data: bytes }).promise
  const words: PdfWord[] = []
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    const content = await page.getTextContent()
    for (const entry of content.items as Array<{ str?: string; transform?: number[] }>) {
      const text = String(entry.str ?? '').trim()
      if (!text) continue
      words.push({
        text,
        x: entry.transform?.[4] ?? 0,
        y: entry.transform?.[5] ?? 0,
      })
    }
  }

  const alphaCount = words.reduce(
    (total, word) => total + (word.text.match(/[A-Za-z]/g)?.length || 0),
    0,
  )
  if (words.length === 0 || alphaCount < 12) throw new Error(SCANNED_PDF_MESSAGE)

  const groups = new Map<number, PdfWord[]>()
  for (const word of words) {
    const key = Math.round(word.y / 2) * 2
    const group = groups.get(key) || []
    group.push(word)
    groups.set(key, group)
  }
  const lines: PdfLine[] = [...groups.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([, group]) => {
      const sorted = [...group].sort((a, b) => a.x - b.x)
      return { text: sorted.map((word) => word.text).join(' ').trim(), cells: splitLineCells(sorted) }
    })
    .filter((line) => line.text)

  return { fields: {}, items: [], lines }
}

/** Extracts structured quotation/equipment rows from any text-based PDF layout. */
export async function extractPdfRows(bytes: Uint8Array): Promise<UnknownRecord[]> {
  const { lines } = await extractPdfContent(bytes)
  if (lines.length === 0) throw new Error(SCANNED_PDF_MESSAGE)

  let headerIndex = -1
  let bestScore = 0
  lines.forEach((line, index) => {
    const score = Object.values(ITEM_ALIASES).reduce(
      (total, aliases) => total + (line.cells.some((cell) => matchesAlias(cell, aliases)) ? 1 : 0),
      0,
    )
    if (score > bestScore) {
      bestScore = score
      headerIndex = index
    }
  })

  const rows: UnknownRecord[] = []
  if (bestScore >= 2 && headerIndex >= 0) {
    const headerKeys = lines[headerIndex].cells.map((cell, index) => {
      const key = normalizeKey(cell)
      return key || `column${index + 1}`
    })
    for (const line of lines.slice(headerIndex + 1)) {
      if (isFooterRow(line.cells) || isNonEquipmentLine(line.text)) continue
      const row: UnknownRecord = {}
      line.cells.forEach((cell, index) => {
        row[headerKeys[index] || `column${index + 1}`] = cell
      })
      rows.push(row)
    }
  }

  if (rows.length === 0) {
    const draft: UnknownRecord = {}
    const fieldAliases: Array<[string, string[]]> = [
      ['quoteNumber', ITEM_ALIASES.quoteNumber],
      ['client', ITEM_ALIASES.client],
      ['date', ITEM_ALIASES.date],
      ['ref', ['ref', 'reference']],
      ['project', ['project']],
      ['location', ['location']],
      ['title', ['title', 'subject']],
    ]
    for (const line of lines) {
      const separator = line.text.indexOf(':')
      if (separator <= 0) continue
      const key = normalizeKey(line.text.slice(0, separator))
      const value = line.text.slice(separator + 1).trim()
      const field = fieldAliases.find(([, aliases]) =>
        aliases.some((alias) => normalizeKey(alias) === key),
      )
      if (field && value) draft[field[0]] = value
    }

    for (const line of lines) {
      if (isFooterRow(line.cells)) continue
      const numbers = line.text.match(/-?\d+(?:[.,]\d+)*/g) || []
      if (numbers.length < 1) continue
      const numericCount = numbers.reduce((total, token) => total + token.length, 0)
      const words = line.text.replace(/[^\w\s]/g, ' ').trim().split(/\s+/).filter(Boolean).length
      if (words < 2 && numericCount < 4) continue

      const serialMatch = line.text.match(/(?:S\/N|Serial\s*No\.?|Serial)[\s:#-]*([A-Za-z0-9-]+)/i)
      const sizeMatch = line.text.match(/(\d+(?:\.\d+)?)\s*(?:"|inch|inches)\b/i)
      const classMatch = line.text.match(/\bClass\s*([A-Za-z0-9]+)/i)
      const qty = parseNumeric(numbers[0])
      const rate = numbers.length > 1 ? parseNumeric(numbers[1]) : NaN
      const amount = numbers.length > 2 ? parseNumeric(numbers[2]) : NaN
      const description = line.text
        .replace(numbers[0] || '', '')
        .replace(/\s+/g, ' ')
        .trim() || line.text.trim()
      if (isNonEquipmentLine(description)) continue

      rows.push({
        description,
        quantity: Number.isFinite(qty) ? qty : 1,
        rate: Number.isFinite(rate) ? rate : 0,
        amount: Number.isFinite(amount) ? amount : undefined,
        sizeInch: sizeMatch ? sizeMatch[1] : '',
        classRating: classMatch ? classMatch[1] : '',
        serialNo: serialMatch ? serialMatch[1] : '',
      })
    }

    if (rows.length > 0) draft.items = rows
    if (Object.keys(draft).length === 0) throw new Error(SCANNED_PDF_MESSAGE)
    return [draft]
  }

  return rows
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

/** Reads one import source into loose row objects. */
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

export interface ImportGroup {
  source: ImportSource
  rows: UnknownRecord[]
  clientName: string
}

/** Infers a distinct client/company name for one imported file. */
export function inferClientName(source: ImportSource, rows: UnknownRecord[]): string {
  for (const row of rows) {
    for (const alias of ITEM_ALIASES.client) {
      const value = textValue(pickField(row, [alias]))
      if (value && !/^(unknown client|unknown|n\/a|-)$/i.test(value)) return value
    }
    const description = textValue(pickField(row, ITEM_ALIASES.description))
    const embedded = description.match(/(?:Attn\s*To|Client|Customer|Company)\s*:\s*([A-Za-z][A-Za-z0-9 .&'\-]{2,80})/i)
    if (embedded && !isNonEquipmentLine(embedded[1])) return embedded[1].trim()
  }
  const fromFileName = clientNameFromFileName(source.name)
  if (fromFileName) return fromFileName
  return 'Imported Client'
}

/** Reads several files in one pass, keeping each file's rows grouped with its own client. */
export async function readImportSources(
  sources: ImportSource[],
): Promise<{ rows: UnknownRecord[]; groups: ImportGroup[]; errors: string[]; files: string[] }> {
  const rows: UnknownRecord[] = []
  const groups: ImportGroup[] = []
  const errors: string[] = []
  const files: string[] = []
  for (const source of sources) {
    try {
      const parsed = await readQuotationImportRows(source)
      rows.push(...parsed)
      files.push(source.name)
      groups.push({ source, rows: parsed, clientName: inferClientName(source, parsed) })
    } catch (error) {
      errors.push(`${source.name}: ${error instanceof Error ? error.message : 'Could not read file'}`)
    }
  }
  return { rows, groups, errors, files }
}

export function importedHeaderPreview(rows: UnknownRecord[]): string[] {
  const headers = new Set<string>()
  for (const row of rows.slice(0, 5)) {
    for (const key of Object.keys(row)) {
      if (key && key !== 'items' && !key.startsWith('column')) headers.add(key)
    }
  }
  return [...headers]
}

/** Maps any flexible row into an editable quotation line item. */
export function mapFlexibleItem(row: UnknownRecord, index = 0): QuotationItem | null {
  if (!isRecord(row)) return null
  const rawDescription = textValue(pickField(row, ITEM_ALIASES.description))
  const serialFromText = rawDescription.match(/(?:S\/N|Serial\s*No\.?|Serial)[\s:#-]*([A-Za-z0-9-]+)/i)
  const serialNo = textValue(pickField(row, ITEM_ALIASES.serial)) || (serialFromText ? serialFromText[1] : '')
  let description = rawDescription
  if (serialNo && !description.toLowerCase().includes('s/n')) {
    description = `${description} ${serialNo ? `S/N: ${serialNo}` : ''}`.trim()
  }
  if (!description || isNonEquipmentLine(description)) return null

  const quantity = parseNumeric(pickField(row, ITEM_ALIASES.quantity))
  const rate = parseNumeric(pickField(row, ITEM_ALIASES.rate))
  const amount = parseNumeric(pickField(row, ITEM_ALIASES.amount))
  const sNo = parseNumeric(pickField(row, ['sno', 'itemno', 'itemnumber']))
  const taxRate = parseNumeric(pickField(row, ITEM_ALIASES.taxRate))
  const safeQuantity = Number.isFinite(quantity) && quantity !== 0 ? quantity : 1
  const safeRate = Number.isFinite(rate) ? rate : (Number.isFinite(amount) ? amount / safeQuantity : 0)

  return {
    id: textValue(pickField(row, ['id', 'itemid']), generateId()) || generateId(),
    description,
    quantity: safeQuantity,
    unit: textValue(pickField(row, ITEM_ALIASES.unit), 'PCS') || 'PCS',
    rate: safeRate,
    amount: Number.isFinite(amount) ? amount : safeQuantity * safeRate,
    taxRate: Number.isFinite(taxRate) ? taxRate : 15,
    taxAmount: Number.isFinite(taxRate) ? (safeQuantity * safeRate * taxRate) / 100 : undefined,
    sizeInch: textValue(pickField(row, ITEM_ALIASES.size)),
    classRating: textValue(pickField(row, ITEM_ALIASES.class)),
    remarks: textValue(pickField(row, ITEM_ALIASES.remarks)),
    serialNo: serialNo || undefined,
    sNo: Number.isFinite(sNo) ? sNo : index + 1,
  }
}

/** Maps flexible equipment columns onto canonical price book fields. */
export function mapFlexiblePriceBookRow(row: UnknownRecord): UnknownRecord {
  const item = mapFlexibleItem(row)
  if (!item) return {}
  const extras = [item.sizeInch ? `Size ${item.sizeInch}` : '', item.classRating ? `Class ${item.classRating}` : '', item.serialNo ? `S/N ${item.serialNo}` : '']
    .filter(Boolean)
    .join(' | ')
  return {
    description: item.description.replace(/\s+S\/N:.*$/i, '').trim() || item.description,
    category: textValue(pickField(row, ITEM_ALIASES.category), 'Other') || 'Other',
    unit: item.unit,
    rate: item.rate,
    taxRate: item.taxRate ?? 15,
    serviceRef: extras || textValue(pickField(row, ['serviceref', 'hsncode', 'code'])),
  }
}

function mapClient(value: unknown, row: UnknownRecord, overrideName?: string): Client {
  const source = isRecord(value) ? value : {}
  const name =
    (overrideName && /^(unknown client|unknown|n\/a|-)$/i.test(overrideName) ? '' : overrideName) ||
    textValue(pickField(source, ['name', 'clientName'])) ||
    textValue(pickField(row, ITEM_ALIASES.client)) ||
    'Imported Client'
  return {
    id:
      textValue(pickField(source, ['id', 'clientId'])) ||
      `client-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`,
    name,
    email: textValue(pickField(source, ['email', 'clientEmail']) || pickField(row, ['clientEmail', 'email'])),
    phone: textValue(pickField(source, ['phone', 'clientPhone']) || pickField(row, ['clientPhone', 'phone'])),
    address: textValue(pickField(source, ['address', 'clientAddress']) || pickField(row, ['clientAddress', 'address'])),
    vatNumber: textValue(pickField(source, ['vatNumber', 'vat', 'taxNumber']) || pickField(row, ['clientVatNumber', 'vatNumber'])),
    company:
      textValue(pickField(source, ['company', 'companyName']) || pickField(row, ['clientCompany', 'company'])) || name,
    contactPerson: textValue(pickField(source, ['contactPerson', 'attnTo']) || pickField(row, ['attnTo', 'contactPerson'])),
  }
}

/** Converts one loose imported row into a complete, renderable Quotation. */
export function normalizeImportedQuotation(
  raw: unknown,
  options: { settings: Settings; index?: number; now?: Date; clientName?: string } | undefined,
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
    ? rawItems.map((item, itemIndex) => mapFlexibleItem(isRecord(item) ? item : {}, itemIndex)).filter((item): item is QuotationItem => item !== null)
    : []

  const inlineItem = mapFlexibleItem(row, 0)
  if (items.length === 0 && inlineItem) items.push(inlineItem)

  const type: Quotation['type'] =
    textValue(pickField(row, ['type'])).toLowerCase() === 'valve' ||
    /hydro/i.test(textValue(pickField(row, ['pdfHeading', 'title', 'subject'])))
      ? 'valve'
      : 'standard'
  const quoteNumber =
    textValue(pickField(row, ITEM_ALIASES.quoteNumber)) ||
    `IMP-${today.replace(/-/g, '')}-${String(index + 1).padStart(4, '0')}`
  const client = mapClient(pickField(row, ['client', 'customer']), row, options?.clientName)

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
  const signatureOption = textValue(pickField(row, ['signatureOption'])).toLowerCase()

  return {
    id: textValue(pickField(row, ['id', 'quoteId']), generateId()) || generateId(),
    type,
    quoteNumber,
    date: isoDate(pickField(row, ITEM_ALIASES.date), today),
    client,
    items,
    subtotal,
    tax: Number.isFinite(tax) ? tax : 0,
    total: Number.isFinite(total) ? total : subtotal,
    status: asStatus(pickField(row, ['status'])),
    notes: textValue(pickField(row, ['notes', 'note'])),
    terms: textValue(pickField(row, ['terms', 'paymentTerms']), settings?.defaults.paymentTerms || 'Net 30'),
    createdAt: `${isoDate(pickField(row, ['createdAt']), today)}T00:00:00.000Z`,
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
    vatNote: textValue(pickField(row, ['vatNote']), `${vat}% VAT will be charged extra as per KSA regulations.`),
    scopeOfWork: Array.isArray(scopeOfWork)
      ? scopeOfWork.map((entry) => textValue(entry)).filter(Boolean)
      : [],
    clientProvisions: Array.isArray(clientProvisions)
      ? clientProvisions.map((entry) => textValue(entry)).filter(Boolean)
      : [],
    closingNote: textValue(pickField(row, ['closingNote', 'closing'])),
    statusTracking: asStatusTracking(pickField(row, ['statusTracking'])),
    followUpDate: isoDate(pickField(row, ['followUpDate', 'followup']), ''),
    via: textValue(pickField(row, ['via']), 'Email'),
    clientCode: textValue(pickField(row, ['clientCode', 'code'])),
    svc: textValue(pickField(row, ['svc']), 'Valve Test'),
    dept: textValue(pickField(row, ['dept', 'department'])),
    spDept: textValue(pickField(row, ['spDept'])),
    showRm: Boolean(pickField(row, ['showRm', 'showRates']) ?? false),
    signatureOption: signatureOption === 'digital' || signatureOption === 'handwritten'
      ? signatureOption
      : 'none',
    pdfHeading: textValue(pickField(row, ['pdfHeading', 'heading']), defaultPdfHeading(type)),
    signatureImage: textValue(pickField(row, ['signatureImage'])),
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
