import type { PriceBookItem, PriceHistoryEntry } from '@/types'
import { generateId } from '@/utils/formatters'

export const DEFAULT_COMPANY_ID = 'company-uic'
export const DEFAULT_TAX_RATE = 15
export const DEFAULT_CURRENCY = 'SAR'

export type PriceBookMergeStrategy = 'merge' | 'skip' | 'add'

export interface PriceBookImportDraft {
  description: string
  category: string
  unit: string
  rate: number
  taxRate: number
  serviceRef: string
  companyId: string
}

export interface NormalizedImport {
  drafts: PriceBookImportDraft[]
  invalid: number
}

export interface PriceBookMergeResult {
  priceBook: PriceBookItem[]
  added: number
  updated: number
  skipped: number
}

type UnknownRecord = Record<string, unknown>

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const normalizeKey = (key: string) => key.trim().toLowerCase().replace(/[^a-z0-9]/g, '')

const HEADER_ALIASES: Record<keyof PriceBookImportDraft | 'company', string[]> = {
  description: [
    'description', 'itemdescription', 'item', 'name', 'particulars', 'details',
    'product', 'productname', 'service', 'servicedescription', 'title',
  ],
  category: ['category', 'type', 'group', 'itemcategory', 'servicecategory', 'class'],
  unit: ['unit', 'uom', 'unitofmeasure', 'units'],
  rate: [
    'rate', 'price', 'unitprice', 'unitrate', 'value', 'cost', 'amount',
    'sar', 'ratesar', 'pricesar', 'rateaed', 'priceaed',
  ],
  taxRate: ['taxrate', 'vat', 'vatrate', 'tax', 'taxpercent', 'vatpercent'],
  serviceRef: [
    'serviceref', 'servicereference', 'ref', 'reference', 'hsncode', 'hsn',
    'code', 'itemcode', 'sdahref', 'serialno',
  ],
  companyId: ['companyid'],
  company: ['company', 'companyname', 'branch', 'entity', 'division'],
}

/** Parses numbers written as "SAR 1,250.50", "1 250,50", "(25)", "15%" etc. */
export function parseNumeric(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN
  if (value === null || value === undefined) return NaN
  let text = String(value).trim()
  if (!text) return NaN

  let negative = false
  if (/^\(.*\)$/.test(text)) {
    negative = true
    text = text.slice(1, -1)
  }
  text = text.replace(/[^0-9.,+\-]/g, '')

  // Handle both 1,234.56 and 1.234,56 layouts.
  const lastComma = text.lastIndexOf(',')
  const lastDot = text.lastIndexOf('.')
  if (lastComma > lastDot) {
    text = text.replace(/\./g, '').replace(',', '.')
  } else {
    text = text.replace(/,/g, '')
  }
  text = text.replace(/^\+/, '')
  const parsed = Number.parseFloat(text)
  if (!Number.isFinite(parsed)) return NaN
  return negative ? -parsed : parsed
}

function pickField(row: UnknownRecord, aliases: string[]): unknown {
  const normalized = new Map<string, unknown>()
  for (const [key, value] of Object.entries(row)) {
    normalized.set(normalizeKey(key), value)
  }
  for (const alias of aliases) {
    const value = normalized.get(normalizeKey(alias))
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return value
    }
  }
  return undefined
}

/**
 * Pulls row-like objects out of common JSON price book shapes:
 * an array, `{ items: [...] }`, a persisted store snapshot, or a keyed map.
 */
export function extractRowsFromParsedJson(data: unknown): UnknownRecord[] {
  if (Array.isArray(data)) return data.filter(isRecord)
  if (!isRecord(data)) return []

  const directCandidates = ['items', 'priceBook', 'pricebook', 'rows', 'records', 'data']
  for (const key of directCandidates) {
    const candidate = data[key]
    if (Array.isArray(candidate)) return candidate.filter(isRecord)
  }

  const state = data.state
  if (isRecord(state) && Array.isArray(state.priceBook)) {
    return state.priceBook.filter(isRecord)
  }

  // A map keyed by id, e.g. { "item-1": { description, rate } }
  const values = Object.values(data).filter(isRecord)
  if (values.length > 0 && values.some((value) => 'description' in value || 'rate' in value)) {
    return values
  }

  return []
}

/**
 * Converts loose spreadsheet/JSON rows into validated price book drafts.
 * Rows without a description or a numeric rate are counted as invalid.
 */
export function normalizeImportedRows(
  rows: UnknownRecord[],
  options: { companyId: string; defaultTaxRate?: number },
): NormalizedImport {
  const defaultTaxRate = Number.isFinite(options.defaultTaxRate)
    ? Number(options.defaultTaxRate)
    : DEFAULT_TAX_RATE
  const drafts: PriceBookImportDraft[] = []
  let invalid = 0

  for (const row of rows) {
    const description = String(pickField(row, HEADER_ALIASES.description) ?? '').trim()
    const rate = parseNumeric(pickField(row, HEADER_ALIASES.rate))
    if (!description || !Number.isFinite(rate)) {
      invalid += 1
      continue
    }

    const taxValue = parseNumeric(pickField(row, HEADER_ALIASES.taxRate))
    const taxRate = Number.isFinite(taxValue)
      ? Math.min(100, Math.max(0, taxValue))
      : defaultTaxRate

    const category = String(pickField(row, HEADER_ALIASES.category) ?? '').trim() || 'Other'
    const unit = String(pickField(row, HEADER_ALIASES.unit) ?? '').trim() || 'PCS'
    const serviceRef = String(pickField(row, HEADER_ALIASES.serviceRef) ?? '').trim()
    const rowCompanyId = String(pickField(row, HEADER_ALIASES.companyId) ?? '').trim()

    drafts.push({
      description,
      category,
      unit,
      rate: Math.max(0, rate),
      taxRate,
      serviceRef,
      companyId: rowCompanyId || options.companyId,
    })
  }

  return { drafts, invalid }
}

export const priceBookMatchKey = (
  item: Pick<PriceBookItem, 'description' | 'category' | 'companyId'>,
) =>
  [
    item.companyId || DEFAULT_COMPANY_ID,
    item.description.trim().toLowerCase().replace(/\s+/g, ' '),
    item.category.trim().toLowerCase(),
  ].join('|')

export function countDuplicateDrafts(drafts: PriceBookImportDraft[]): number {
  const seen = new Set<string>()
  let duplicates = 0
  for (const draft of drafts) {
    const key = priceBookMatchKey(draft)
    if (seen.has(key)) duplicates += 1
    else seen.add(key)
  }
  return duplicates
}

function rateHistoryEntry(
  previousRate: number,
  nextRate: number,
  reason: string,
  changedBy: string,
): PriceHistoryEntry {
  return {
    date: new Date().toISOString(),
    rate: nextRate,
    previousRate,
    changedBy,
    reason,
  }
}

/**
 * Merges imported drafts into the existing price book in one pass.
 * `merge` updates matching items (and records a history entry when the rate
 * changes), `skip` leaves existing items untouched, `add` always creates new
 * items. Duplicate rows inside the file are resolved by the same strategy.
 */
export function mergePriceBookItems(
  existing: PriceBookItem[],
  drafts: PriceBookImportDraft[],
  strategy: PriceBookMergeStrategy,
  changedBy = 'Price Book Import',
): PriceBookMergeResult {
  const working = existing.map((item) => ({
    ...item,
    history: Array.isArray(item.history) ? [...item.history] : [],
  }))
  const indexByKey = new Map<string, number>()
  working.forEach((item, index) => indexByKey.set(priceBookMatchKey(item), index))

  let added = 0
  let updated = 0
  let skipped = 0

  for (const draft of drafts) {
    const key = priceBookMatchKey(draft)
    const existingIndex = indexByKey.get(key)
    const now = new Date().toISOString()

    if (existingIndex !== undefined) {
      if (strategy === 'skip') {
        skipped += 1
        continue
      }
      if (strategy === 'add') {
        const created: PriceBookItem = {
          id: generateId(),
          companyId: draft.companyId || DEFAULT_COMPANY_ID,
          description: draft.description,
          category: draft.category,
          unit: draft.unit,
          rate: draft.rate,
          taxRate: draft.taxRate,
          serviceRef: draft.serviceRef || undefined,
          history: [],
          createdAt: now,
          updatedAt: now,
        }
        working.push(created)
        indexByKey.set(key, working.length - 1)
        added += 1
        continue
      }

      const current = working[existingIndex]
      const rateChanged = current.rate !== draft.rate
      const changed =
        rateChanged ||
        current.description !== draft.description ||
        current.category !== draft.category ||
        current.unit !== draft.unit ||
        (current.taxRate ?? DEFAULT_TAX_RATE) !== draft.taxRate ||
        (current.serviceRef ?? '') !== (draft.serviceRef ?? '')

      if (!changed) {
        skipped += 1
        continue
      }

      working[existingIndex] = {
        ...current,
        description: draft.description,
        category: draft.category,
        unit: draft.unit,
        rate: draft.rate,
        taxRate: draft.taxRate,
        serviceRef: draft.serviceRef || undefined,
        history: rateChanged
          ? [...current.history, rateHistoryEntry(current.rate, draft.rate, 'Rate updated by import', changedBy)]
          : current.history,
        updatedAt: now,
      }
      updated += 1
      continue
    }

    const created: PriceBookItem = {
      id: generateId(),
      companyId: draft.companyId || DEFAULT_COMPANY_ID,
      description: draft.description,
      category: draft.category,
      unit: draft.unit,
      rate: draft.rate,
      taxRate: draft.taxRate,
      serviceRef: draft.serviceRef || undefined,
      history: [],
      createdAt: now,
      updatedAt: now,
    }
    working.push(created)
    indexByKey.set(key, working.length - 1)
    added += 1
  }

  return { priceBook: working, added, updated, skipped }
}

export function lastRateChange(item: PriceBookItem): PriceHistoryEntry | undefined {
  if (!Array.isArray(item.history) || item.history.length === 0) return undefined
  return item.history[item.history.length - 1]
}

export function priceBookSearchText(item: PriceBookItem, companyName: string): string {
  const last = lastRateChange(item)
  return [
    item.description,
    item.category,
    item.unit,
    item.serviceRef ?? '',
    companyName,
    last?.reason ?? '',
  ]
    .join(' ')
    .toLowerCase()
}

export function toCsv(rows: PriceBookItem[], companyName: string): string {
  const escape = (value: unknown) => {
    const text = String(value ?? '')
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }
  const header = ['Company', 'Description', 'Category', 'Unit', 'Rate', 'Tax Rate', 'Service Ref', 'Updated']
  const lines = rows.map((item) =>
    [
      companyName,
      item.description,
      item.category,
      item.unit,
      item.rate,
      item.taxRate ?? DEFAULT_TAX_RATE,
      item.serviceRef ?? '',
      item.updatedAt,
    ]
      .map(escape)
      .join(','),
  )
  return [header.join(','), ...lines].join('\r\n')
}
