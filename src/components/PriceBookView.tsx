"use client"

import { motion, AnimatePresence } from 'motion/react'
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent, FormEvent } from 'react'
import {
  Plus, Search, Edit, Trash2, Copy, Download, Upload, Tag, ChevronLeft, ChevronRight,
  RotateCcw, X, Loader2, FileInput, AlertCircle, CheckCircle, Building2, History,
  Layers, Calculator, GitMerge, ArrowUpDown,
} from 'lucide-react'
import { useStore } from '@/services/store'
import { formatCurrency, formatDateTime, generateId } from '@/utils/formatters'
import type { Company, PriceBookItem } from '@/types'
import {
  DEFAULT_COMPANY_ID,
  DEFAULT_CURRENCY,
  DEFAULT_TAX_RATE,
  countDuplicateDrafts,
  extractRowsFromParsedJson,
  lastRateChange,
  mergePriceBookItems,
  normalizeImportedRows,
  priceBookMatchKey,
  priceBookSearchText,
  toCsv,
} from '@/utils/pricebook'
import type {
  PriceBookImportDraft,
  PriceBookMergeStrategy,
} from '@/utils/pricebook'
import { mapFlexiblePriceBookRow, readQuotationImportRows } from '@/utils/quotationImport'

type ElectronApiWithBase64 = NonNullable<Window['electronAPI']> & {
  readFileBase64?: (path: string) => Promise<string | null>
}

const CATEGORIES = [
  'Valves', 'Fittings', 'Pipes', 'Instruments', 'Electrical', 'Mechanical',
  'Consumables', 'Services', 'Other',
]
const UNITS = ['PCS', 'MTR', 'KG', 'SET', 'LOT', 'HR', 'DAY', 'SQM', 'CBM']
const SERVICE_FIELDS = ['SDAH Ref', 'Calibration Std', 'Equipment ID', 'Model No', 'Serial No', 'Other']
const ITEMS_PER_PAGE = 15

type SortField = 'description' | 'category' | 'unit' | 'rate' | 'serviceRef'
type ImportSource =
  | { kind: 'path'; path: string; name: string }
  | { kind: 'file'; file: File; name: string }
type ImportStatus = 'idle' | 'reading' | 'ready' | 'importing' | 'complete' | 'error'

interface PriceBookFormValues {
  description: string
  category: string
  unit: string
  rate: number
  taxRate: number
  serviceRef: string
}

interface ImportResult {
  added: number
  updated: number
  skipped: number
  invalid: number
}

const fileNameFromPath = (path: string) => path.split(/[\\/]/).pop() || path

const getVisiblePages = (current: number, total: number): number[] => {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1)
  const start = Math.max(1, Math.min(current - 3, total - 6))
  return Array.from({ length: 7 }, (_, index) => start + index)
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}

async function readJsonImportRows(source: ImportSource): Promise<Record<string, unknown>[] | null> {
  if (!source.name.toLowerCase().endsWith('.json')) return null
  let content: string
  if (source.kind === 'file') {
    content = await source.file.text()
  } else {
    const api = window.electronAPI
    if (!api?.readFile) throw new Error('File reading is not available in this environment')
    const result = await api.readFile(source.path)
    if (result === null) throw new Error('Could not read the selected file')
    content = result
  }
  return extractRowsFromParsedJson(JSON.parse(content.replace(/^\uFEFF/, '')))
}

async function readImportRows(source: ImportSource): Promise<Record<string, unknown>[]> {
  const jsonRows = await readJsonImportRows(source)
  if (jsonRows) return jsonRows
  // CSV/Excel/PDF share the flexible, header-detecting parser used by quotations.
  return readQuotationImportRows(source)
}

export function PriceBookView() {
  const {
    priceBook,
    companies,
    activeCompanyId,
    settings,
    addPriceBookItem,
    updatePriceBookItem,
    deletePriceBookItem,
    setPriceBook,
    setActiveCompany,
    addCompany,
    addToast,
  } = useStore()

  const [searchInput, setSearchInput] = useState('')
  const searchQuery = useDeferredValue(searchInput)
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<SortField>('category')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<PriceBookItem | null>(null)
  const [historyItemId, setHistoryItemId] = useState<string | null>(null)
  const [showLookup, setShowLookup] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [showCompanies, setShowCompanies] = useState(false)

  const currency = settings.defaults.currency || DEFAULT_CURRENCY
  const defaultTaxRate = Number.isFinite(settings.defaults.taxRate)
    ? settings.defaults.taxRate
    : DEFAULT_TAX_RATE

  // Never trust a persisted company id that no longer has a company record.
  const companyList = companies.length > 0 ? companies : [{
    id: DEFAULT_COMPANY_ID,
    name: settings.company.name,
    vatNumber: settings.company.vatNumber,
    currency,
    taxRate: defaultTaxRate,
    isDefault: true,
  }]
  const resolvedCompanyId =
    companyList.some((company) => company.id === activeCompanyId)
      ? activeCompanyId
      : companyList[0].id
  const activeCompany = companyList.find((company) => company.id === resolvedCompanyId) ?? companyList[0]
  const companyNames = useMemo(() => {
    const names = new Map<string, string>()
    companyList.forEach((company) => names.set(company.id, company.name))
    return names
  }, [companyList])

  const companyItems = useMemo(
    () => priceBook.filter((item) => (item.companyId || DEFAULT_COMPANY_ID) === resolvedCompanyId),
    [priceBook, resolvedCompanyId],
  )

  const companyCounts = useMemo(() => {
    const counts = new Map<string, number>()
    priceBook.forEach((item) => {
      const id = item.companyId || DEFAULT_COMPANY_ID
      counts.set(id, (counts.get(id) || 0) + 1)
    })
    return counts
  }, [priceBook])

  const categoryOptions = useMemo(() => {
    const counts = new Map<string, number>()
    companyItems.forEach((item) => {
      const category = item.category || 'Other'
      counts.set(category, (counts.get(category) || 0) + 1)
    })
    return Array.from(counts.entries())
      .sort((a, b) => a[0].localeCompare(b[0], undefined, { sensitivity: 'base' }))
      .map(([name, count]) => ({ name, count }))
  }, [companyItems])

  const historyCount = useMemo(
    () => companyItems.reduce((sum, item) => sum + (Array.isArray(item.history) ? item.history.length : 0), 0),
    [companyItems],
  )

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase().replace(/\s+/g, ' ')
    const matches = companyItems.filter((item) => {
      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter
      if (!matchesCategory) return false
      if (!query) return true
      return priceBookSearchText(item, companyNames.get(item.companyId || DEFAULT_COMPANY_ID) || '').includes(query)
    })

    return matches.sort((a, b) => {
      let comparison = 0
      if (sortField === 'rate') {
        comparison = Number(a.rate) - Number(b.rate)
      } else {
        const left = String(a[sortField] ?? '')
        const right = String(b[sortField] ?? '')
        comparison = left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' })
      }
      if (comparison === 0) {
        comparison = a.description.localeCompare(b.description, undefined, { sensitivity: 'base' })
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })
  }, [companyItems, searchQuery, categoryFilter, sortField, sortOrder, companyNames])

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE))
  const paginatedItems = useMemo(
    () => filteredItems.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE),
    [filteredItems, currentPage],
  )
  const visiblePages = useMemo(() => getVisiblePages(currentPage, totalPages), [currentPage, totalPages])

  useEffect(() => {
    setCurrentPage(1)
  }, [resolvedCompanyId, searchQuery, categoryFilter])

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages))
  }, [totalPages])

  useEffect(() => {
    if (categoryFilter !== 'all' && !categoryOptions.some((option) => option.name === categoryFilter)) {
      setCategoryFilter('all')
    }
  }, [categoryFilter, categoryOptions])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((order) => (order === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const openCreateModal = () => {
    setEditingItem(null)
    setShowForm(true)
  }

  const openEditModal = (item: PriceBookItem) => {
    setEditingItem(item)
    setShowForm(true)
  }

  const handleSave = (values: PriceBookFormValues) => {
    if (editingItem) {
      updatePriceBookItem(editingItem.id, values, 'Manual rate update')
      addToast({ type: 'success', title: 'Updated', message: 'Price book item updated' })
    } else {
      const now = new Date().toISOString()
      addPriceBookItem({
        id: generateId(),
        companyId: resolvedCompanyId,
        ...values,
        history: [],
        createdAt: now,
        updatedAt: now,
      })
      addToast({ type: 'success', title: 'Created', message: 'Price book item added' })
    }
    setShowForm(false)
  }

  const handleDelete = (item: PriceBookItem) => {
    if (!window.confirm(`Delete "${item.description}" from the price book?`)) return
    deletePriceBookItem(item.id)
    addToast({ type: 'success', title: 'Deleted', message: 'Price book item removed' })
  }

  const handleDuplicate = (item: PriceBookItem) => {
    const now = new Date().toISOString()
    addPriceBookItem({
      ...item,
      id: generateId(),
      companyId: item.companyId || resolvedCompanyId,
      description: `${item.description} (Copy)`,
      history: [],
      createdAt: now,
      updatedAt: now,
    })
    addToast({ type: 'success', title: 'Duplicated', message: 'Item duplicated successfully' })
  }

  const handleExport = async () => {
    const rows = filteredItems.length > 0 ? filteredItems : companyItems
    if (rows.length === 0) {
      addToast({ type: 'warning', title: 'Nothing to export', message: 'Add items to this company first' })
      return
    }
    const date = new Date().toISOString().slice(0, 10)
    const safeName = activeCompany.name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'company'
    const fileName = `pricebook-${safeName}-${date}`

    try {
      const api = window.electronAPI
      if (api?.showSaveDialog && api.writeFile) {
        const result = await api.showSaveDialog({
          defaultPath: `${fileName}.csv`,
          filters: [{ name: 'CSV', extensions: ['csv'] }, { name: 'JSON', extensions: ['json'] }],
        })
        if (result?.canceled) return
        const path = result?.filePath as string | undefined
        if (!path) return
        const asJson = path.toLowerCase().endsWith('.json')
        const content = asJson
          ? JSON.stringify({ company: activeCompany.name, currency, items: rows }, null, 2)
          : toCsv(rows, activeCompany.name)
        const written = await api.writeFile(path, content)
        if (!written) throw new Error('Could not write the export file')
      } else {
        const blob = new Blob([toCsv(rows, activeCompany.name)], { type: 'text/csv;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${fileName}.csv`
        link.click()
        URL.revokeObjectURL(url)
      }
      addToast({ type: 'success', title: 'Exported', message: `${rows.length} items exported` })
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Export Failed',
        message: error instanceof Error ? error.message : 'Could not export price book',
      })
    }
  }

  const handleImported = (companyId: string, result: ImportResult) => {
    setActiveCompany(companyId)
    setCurrentPage(1)
    addToast({
      type: 'success',
      title: 'Import Complete',
      message: `${result.added} added, ${result.updated} updated, ${result.skipped} skipped`,
    })
  }

  const historyItem = historyItemId
    ? priceBook.find((item) => item.id === historyItemId) ?? null
    : null

  const stats = [
    { label: 'Items in company', value: companyItems.length, icon: Tag, color: 'text-primary' },
    { label: 'Categories', value: categoryOptions.length, icon: Layers, color: 'text-secondary' },
    { label: 'Rate changes', value: historyCount, icon: History, color: 'text-success' },
    { label: 'Matching filters', value: filteredItems.length, icon: Search, color: 'text-accent' },
  ]

  return (
    <div className="h-full flex flex-col animate-in">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-text-primary to-text-secondary bg-clip-text text-transparent">
            Price Book
          </h1>
          <p className="text-text-muted mt-1">
            Company-segregated items, rates and price history · {activeCompany.name}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowCompanies(true)}
            className="glass-hover p-2 rounded-xl text-text-secondary hover:text-text-primary"
            title="Manage companies"
            aria-label="Manage companies"
          >
            <Building2 className="w-4 h-4" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowLookup(true)}
            className="glass-hover p-2 rounded-xl text-text-secondary hover:text-text-primary"
            title="Look up a rate"
            aria-label="Look up a rate"
          >
            <Calculator className="w-4 h-4" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleExport}
            className="glass-hover px-4 py-2 rounded-xl font-medium flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowImport(true)}
            className="glass-hover px-4 py-2 rounded-xl font-medium flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Import
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={openCreateModal}
            className="glass-hover px-4 py-2 rounded-xl font-medium flex items-center gap-2 bg-primary text-white hover:bg-primary-hover"
          >
            <Plus className="w-4 h-4" />
            Add Item
          </motion.button>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.03 * index }}
            className="glass-elevated p-3 rounded-xl border border-border-subtle flex items-center justify-between gap-3"
          >
            <div>
              <p className="text-xs text-text-muted">{stat.label}</p>
              <p className="text-xl font-bold text-text-primary mt-0.5">{stat.value}</p>
            </div>
            <stat.icon className={`w-5 h-5 ${stat.color} shrink-0`} />
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="glass-elevated rounded-2xl border border-border-subtle overflow-hidden flex-1 flex flex-col min-h-0"
      >
        <div className="p-4 border-b border-border-subtle flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search items, categories, refs, history..."
              className="w-full glass-hover pl-10 pr-4 py-2 rounded-xl text-sm focus-ring transition-all bg-transparent border border-border-subtle"
              aria-label="Search price book"
            />
          </div>
          <select
            value={resolvedCompanyId}
            onChange={(event) => setActiveCompany(event.target.value)}
            className="glass-hover px-3 py-2 rounded-xl text-sm focus-ring border border-border-subtle bg-bg-secondary w-full sm:w-56"
            aria-label="Filter by company"
          >
            {companyList.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name} ({companyCounts.get(company.id) || 0})
              </option>
            ))}
          </select>
          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            className="glass-hover px-3 py-2 rounded-xl text-sm focus-ring border border-border-subtle bg-bg-secondary w-full sm:w-48"
            aria-label="Filter by category"
          >
            <option value="all">All Categories ({companyItems.length})</option>
            {categoryOptions.map((option) => (
              <option key={option.name} value={option.name}>
                {option.name} ({option.count})
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-auto min-h-0">
          <table className="w-full table-auto" role="grid">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-border-subtle bg-bg-secondary/95 backdrop-blur">
                <th
                  className="w-0 flex-1 min-w-[220px] px-4 py-3 text-left text-sm font-medium text-text-secondary hover:text-text-primary cursor-pointer select-none"
                  onClick={() => handleSort('description')}
                  aria-sort={sortField === 'description' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  Description <ArrowUpDown className={`w-3 h-3 inline ${sortField === 'description' ? 'text-primary' : ''}`} />
                </th>
                <th
                  className="w-0 flex-1 min-w-[120px] px-4 py-3 text-left text-sm font-medium text-text-secondary hover:text-text-primary cursor-pointer select-none"
                  onClick={() => handleSort('category')}
                  aria-sort={sortField === 'category' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  Category <ArrowUpDown className={`w-3 h-3 inline ${sortField === 'category' ? 'text-primary' : ''}`} />
                </th>
                <th
                  className="w-[80px] px-4 py-3 text-center text-sm font-medium text-text-secondary hover:text-text-primary cursor-pointer select-none"
                  onClick={() => handleSort('unit')}
                  aria-sort={sortField === 'unit' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  Unit <ArrowUpDown className={`w-3 h-3 inline ${sortField === 'unit' ? 'text-primary' : ''}`} />
                </th>
                <th
                  className="w-[130px] px-4 py-3 text-right text-sm font-medium text-text-secondary hover:text-text-primary cursor-pointer select-none"
                  onClick={() => handleSort('rate')}
                  aria-sort={sortField === 'rate' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  Rate <ArrowUpDown className={`w-3 h-3 inline ${sortField === 'rate' ? 'text-primary' : ''}`} />
                </th>
                <th className="w-[80px] px-4 py-3 text-center text-sm font-medium text-text-secondary">VAT %</th>
                <th
                  className="w-[150px] px-4 py-3 text-left text-sm font-medium text-text-secondary hover:text-text-primary cursor-pointer select-none"
                  onClick={() => handleSort('serviceRef')}
                  aria-sort={sortField === 'serviceRef' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  Service Ref <ArrowUpDown className={`w-3 h-3 inline ${sortField === 'serviceRef' ? 'text-primary' : ''}`} />
                </th>
                <th className="w-[140px] px-4 py-3 text-left text-sm font-medium text-text-secondary">Rate History</th>
                <th className="w-[150px] px-4 py-3 text-right text-sm font-medium text-text-secondary">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              <AnimatePresence mode="popLayout">
                {paginatedItems.length > 0 ? (
                  paginatedItems.map((item, index) => {
                    const last = lastRateChange(item)
                    return (
                      <motion.tr
                        key={item.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: Math.min(index * 0.02, 0.2) }}
                        className="hover:bg-bg-secondary/50 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium text-text-primary">{item.description}</p>
                          {item.category && <p className="text-xs text-text-muted">{item.category}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-secondary/20 text-secondary">
                            {item.category || 'Other'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-text-secondary">{item.unit || 'PCS'}</td>
                        <td className="px-4 py-3 font-mono font-medium text-text-primary text-right">
                          {formatCurrency(Number(item.rate) || 0, currency)}
                        </td>
                        <td className="px-4 py-3 text-text-secondary text-center">
                          {item.taxRate ?? defaultTaxRate}%
                        </td>
                        <td className="px-4 py-3 text-text-muted">{item.serviceRef || '-'}</td>
                        <td className="px-4 py-3">
                          {last ? (
                            <button
                              type="button"
                              onClick={() => setHistoryItemId(item.id)}
                              className="text-left hover:text-primary transition-colors"
                              title="View rate history"
                            >
                              <p className="font-mono text-xs text-text-secondary">
                                {formatCurrency(last.rate, currency)}
                                {last.previousRate !== undefined && last.previousRate !== last.rate && (
                                  <span className="text-text-muted ml-1">
                                    (was {formatCurrency(last.previousRate, currency)})
                                  </span>
                                )}
                              </p>
                              <p className="text-[11px] text-text-muted mt-0.5">
                                {formatDateTime(last.date)}
                              </p>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setHistoryItemId(item.id)}
                              className="text-xs text-text-muted hover:text-primary transition-colors"
                            >
                              No changes yet
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => setHistoryItemId(item.id)}
                              className="glass-hover p-2 rounded-xl text-text-secondary hover:text-secondary focus-ring"
                              aria-label={`Rate history for ${item.description}`}
                              title="Rate history"
                            >
                              <History className="w-4 h-4" />
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => openEditModal(item)}
                              className="glass-hover p-2 rounded-xl text-text-secondary hover:text-primary focus-ring"
                              aria-label={`Edit ${item.description}`}
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleDuplicate(item)}
                              className="glass-hover p-2 rounded-xl text-text-secondary hover:text-secondary focus-ring"
                              aria-label={`Duplicate ${item.description}`}
                              title="Duplicate"
                            >
                              <Copy className="w-4 h-4" />
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleDelete(item)}
                              className="glass-hover p-2 rounded-xl text-text-secondary hover:text-error focus-ring"
                              aria-label={`Delete ${item.description}`}
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </motion.button>
                          </div>
                        </td>
                      </motion.tr>
                    )
                  })
                ) : (
                  <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <td colSpan={8} className="px-4 py-12 text-center">
                      <Tag className="w-12 h-12 mx-auto text-text-muted/50 mb-4" />
                      <h3 className="text-lg font-medium text-text-secondary mb-1">
                        {companyItems.length === 0 ? 'No items for this company' : 'No items found'}
                      </h3>
                      <p className="text-text-muted mb-4">
                        {companyItems.length === 0
                          ? 'Add an item or import a price book to get started'
                          : 'Try a different search or category filter'}
                      </p>
                      {companyItems.length === 0 ? (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={openCreateModal}
                          className="glass-hover px-6 py-2 rounded-xl font-medium inline-flex items-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          Add Item
                        </motion.button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => { setSearchInput(''); setCategoryFilter('all') }}
                          className="glass-hover px-6 py-2 rounded-xl font-medium inline-flex items-center gap-2"
                        >
                          <RotateCcw className="w-4 h-4" />
                          Clear filters
                        </button>
                      )}
                    </td>
                  </motion.tr>
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {filteredItems.length > 0 && (
          <div className="p-4 border-t border-border-subtle flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-sm text-text-muted">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredItems.length)} of {filteredItems.length} items
              {filteredItems.length !== companyItems.length && ` (${companyItems.length} in company)`}
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={currentPage === 1}
                  className="glass-hover p-2 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed focus-ring"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </motion.button>
                {visiblePages[0] > 1 && <span className="text-text-muted text-sm">…</span>}
                {visiblePages.map((page) => (
                  <motion.button
                    key={page}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 rounded-xl font-medium transition-all ${
                      page === currentPage ? 'bg-primary text-white shadow-glow' : 'glass-hover text-text-secondary'
                    }`}
                    aria-label={`Page ${page}`}
                    aria-current={page === currentPage ? 'page' : undefined}
                  >
                    {page}
                  </motion.button>
                ))}
                {visiblePages[visiblePages.length - 1] < totalPages && (
                  <span className="text-text-muted text-sm">…</span>
                )}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={currentPage === totalPages}
                  className="glass-hover p-2 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed focus-ring"
                  aria-label="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </motion.button>
              </div>
            )}
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {showForm && (
          <ModalShell
            title={editingItem ? 'Edit Price Book Item' : 'Add Price Book Item'}
            subtitle={`Company: ${activeCompany.name}`}
            onClose={() => setShowForm(false)}
            width="max-w-md"
          >
            <PriceBookForm
              initialData={editingItem}
              defaultTaxRate={defaultTaxRate}
              onSave={handleSave}
              onCancel={() => setShowForm(false)}
            />
          </ModalShell>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {historyItem && (
          <HistoryModal
            item={historyItem}
            companyName={companyNames.get(historyItem.companyId || DEFAULT_COMPANY_ID) || 'Unassigned'}
            currency={currency}
            defaultTaxRate={defaultTaxRate}
            onClose={() => setHistoryItemId(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLookup && (
          <RateLookupModal
            priceBook={priceBook}
            companyNames={companyNames}
            companyList={companyList}
            currency={currency}
            defaultTaxRate={defaultTaxRate}
            defaultCompanyId={resolvedCompanyId}
            onClose={() => setShowLookup(false)}
            onViewHistory={(item) => {
              setShowLookup(false)
              setHistoryItemId(item.id)
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showImport && (
          <ImportDialog
            priceBook={priceBook}
            companies={companyList}
            defaultCompanyId={resolvedCompanyId}
            defaultTaxRate={defaultTaxRate}
            onClose={() => setShowImport(false)}
            onApply={(items) => setPriceBook(items)}
            onImported={handleImported}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCompanies && (
          <CompanyModal
            companies={companyList}
            companyCounts={companyCounts}
            activeCompanyId={resolvedCompanyId}
            currency={currency}
            taxRate={defaultTaxRate}
            onAdd={(company) => addCompany(company)}
            onClose={() => setShowCompanies(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function ModalShell({
  title,
  subtitle,
  onClose,
  children,
  width = 'max-w-2xl',
}: {
  title: string
  subtitle?: string
  onClose: () => void
  children: React.ReactNode
  width?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className={`glass-elevated w-full ${width} rounded-2xl shadow-elevated border border-border-default overflow-hidden max-h-[90vh] flex flex-col`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="p-4 border-b border-border-subtle flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold">{title}</h3>
            {subtitle && <p className="text-xs text-text-muted mt-0.5 truncate">{subtitle}</p>}
          </div>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="glass-hover p-2 rounded-xl focus-ring shrink-0"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </motion.button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  )
}

function PriceBookForm({
  initialData,
  defaultTaxRate,
  onSave,
  onCancel,
}: {
  initialData: PriceBookItem | null
  defaultTaxRate: number
  onSave: (data: PriceBookFormValues) => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState<PriceBookFormValues>({
    description: initialData?.description || '',
    category: initialData?.category || 'Valves',
    unit: initialData?.unit || 'PCS',
    rate: Number(initialData?.rate) || 0,
    taxRate: Number.isFinite(Number(initialData?.taxRate))
      ? Number(initialData?.taxRate)
      : defaultTaxRate,
    serviceRef: initialData?.serviceRef || '',
  })

  const taxOptions = useMemo(
    () =>
      Array.from(new Set([0, 5, 12, 15, 18, 28, defaultTaxRate, formData.taxRate]))
        .filter((rate) => Number.isFinite(rate))
        .sort((a, b) => a - b),
    [defaultTaxRate, formData.taxRate],
  )

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const description = formData.description.trim()
    const rate = Number(formData.rate)
    if (!description || !Number.isFinite(rate) || rate < 0) return
    onSave({ ...formData, description, rate })
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2" htmlFor="pb-description">
          Description *
        </label>
        <input
          id="pb-description"
          type="text"
          value={formData.description}
          onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
          className="w-full glass-hover px-3 py-2 rounded-lg text-sm focus-ring bg-transparent border border-border-subtle"
          required
          autoFocus
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2" htmlFor="pb-category">
          Category
        </label>
        <select
          id="pb-category"
          value={formData.category}
          onChange={(event) => setFormData((prev) => ({ ...prev, category: event.target.value }))}
          className="w-full glass-hover px-3 py-2 rounded-lg text-sm focus-ring bg-bg-secondary border border-border-subtle"
        >
          {Array.from(new Set([...CATEGORIES, formData.category])).map((category) => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2" htmlFor="pb-unit">
            Unit
          </label>
          <select
            id="pb-unit"
            value={formData.unit}
            onChange={(event) => setFormData((prev) => ({ ...prev, unit: event.target.value }))}
            className="w-full glass-hover px-3 py-2 rounded-lg text-sm focus-ring bg-bg-secondary border border-border-subtle"
          >
            {Array.from(new Set([...UNITS, formData.unit])).map((unit) => (
              <option key={unit} value={unit}>{unit}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2" htmlFor="pb-tax">
            VAT %
          </label>
          <select
            id="pb-tax"
            value={formData.taxRate}
            onChange={(event) => setFormData((prev) => ({ ...prev, taxRate: Number(event.target.value) }))}
            className="w-full glass-hover px-3 py-2 rounded-lg text-sm focus-ring bg-bg-secondary border border-border-subtle"
          >
            {taxOptions.map((rate) => <option key={rate} value={rate}>{rate}%</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2" htmlFor="pb-rate">
            Rate *
          </label>
          <input
            id="pb-rate"
            type="number"
            value={formData.rate}
            onChange={(event) => setFormData((prev) => ({ ...prev, rate: Number(event.target.value) }))}
            min="0"
            step="0.01"
            className="w-full glass-hover px-3 py-2 rounded-lg text-sm focus-ring bg-transparent border border-border-subtle"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2" htmlFor="pb-service-ref">
            Service Ref
          </label>
          <input
            id="pb-service-ref"
            type="text"
            list="pb-service-fields"
            value={formData.serviceRef}
            onChange={(event) => setFormData((prev) => ({ ...prev, serviceRef: event.target.value }))}
            placeholder="e.g. SDAH-2026-001"
            className="w-full glass-hover px-3 py-2 rounded-lg text-sm focus-ring bg-transparent border border-border-subtle"
          />
          <datalist id="pb-service-fields">
            {SERVICE_FIELDS.map((field) => <option key={field} value={field} />)}
          </datalist>
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-4 border-t border-border-subtle">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={onCancel}
          className="glass-hover px-4 py-2 rounded-xl font-medium"
        >
          Cancel
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          className="glass-hover px-4 py-2 rounded-xl font-medium bg-primary text-white hover:bg-primary-hover"
        >
          {initialData ? 'Update' : 'Add Item'}
        </motion.button>
      </div>
    </form>
  )
}

function HistoryModal({
  item,
  companyName,
  currency,
  defaultTaxRate,
  onClose,
}: {
  item: PriceBookItem
  companyName: string
  currency: string
  defaultTaxRate: number
  onClose: () => void
}) {
  const history = Array.isArray(item.history) ? [...item.history].reverse() : []
  return (
    <ModalShell
      title="Rate History"
      subtitle={`${item.description} · ${companyName}`}
      onClose={onClose}
      width="max-w-lg"
    >
      <div className="p-5 border-b border-border-subtle grid grid-cols-3 gap-3">
        <div className="glass-hover p-3 rounded-xl">
          <p className="text-xs text-text-muted">Current rate</p>
          <p className="font-mono font-semibold text-primary mt-1">
            {formatCurrency(Number(item.rate) || 0, currency)}
          </p>
        </div>
        <div className="glass-hover p-3 rounded-xl">
          <p className="text-xs text-text-muted">VAT</p>
          <p className="font-semibold text-text-primary mt-1">{item.taxRate ?? defaultTaxRate}%</p>
        </div>
        <div className="glass-hover p-3 rounded-xl">
          <p className="text-xs text-text-muted">Changes</p>
          <p className="font-semibold text-text-primary mt-1">{history.length}</p>
        </div>
      </div>
      <div className="p-5 overflow-y-auto space-y-3 min-h-[140px]">
        {history.length > 0 ? history.map((entry, index) => (
          <div key={`${entry.date}-${index}`} className="glass-hover p-4 rounded-xl border border-border-subtle">
            <div className="flex items-center justify-between gap-3">
              <p className="font-mono font-semibold text-text-primary">
                {formatCurrency(Number(entry.rate) || 0, currency)}
              </p>
              {entry.previousRate !== undefined && (
                <p className="text-xs text-text-muted">
                  From {formatCurrency(Number(entry.previousRate) || 0, currency)}
                </p>
              )}
            </div>
            <p className="text-xs text-text-muted mt-1">
              {formatDateTime(entry.date)}
              {entry.changedBy ? ` · ${entry.changedBy}` : ''}
            </p>
            {entry.reason && <p className="text-sm text-text-secondary mt-2">{entry.reason}</p>}
          </div>
        )) : (
          <div className="text-center py-6">
            <History className="w-10 h-10 mx-auto text-text-muted/50 mb-3" />
            <p className="text-sm text-text-secondary">No rate changes recorded yet</p>
            <p className="text-xs text-text-muted mt-1">
              Updating an item's rate will add an entry here automatically.
            </p>
          </div>
        )}
      </div>
    </ModalShell>
  )
}

function RateLookupModal({
  priceBook,
  companyNames,
  companyList,
  currency,
  defaultTaxRate,
  defaultCompanyId,
  onClose,
  onViewHistory,
}: {
  priceBook: PriceBookItem[]
  companyNames: Map<string, string>
  companyList: Company[]
  currency: string
  defaultTaxRate: number
  defaultCompanyId: string
  onClose: () => void
  onViewHistory: (item: PriceBookItem) => void
}) {
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const [companyFilter, setCompanyFilter] = useState(defaultCompanyId)
  const [quantityInput, setQuantityInput] = useState('1')
  const quantity = Math.max(0, Number(quantityInput) || 1)

  const results = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase().replace(/\s+/g, ' ')
    return priceBook
      .filter((item) => companyFilter === 'all' || (item.companyId || DEFAULT_COMPANY_ID) === companyFilter)
      .filter((item) =>
        !normalizedQuery ||
        priceBookSearchText(item, companyNames.get(item.companyId || DEFAULT_COMPANY_ID) || '').includes(normalizedQuery),
      )
      .sort((a, b) => a.description.localeCompare(b.description, undefined, { sensitivity: 'base' }))
      .slice(0, 100)
  }, [priceBook, deferredQuery, companyFilter, companyNames])

  return (
    <ModalShell
      title="Rate Lookup"
      subtitle="Search catalogue rates across companies and estimate a line total"
      onClose={onClose}
      width="max-w-3xl"
    >
      <div className="p-4 border-b border-border-subtle flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search description, category or service ref..."
            className="w-full glass-hover pl-10 pr-4 py-2 rounded-xl text-sm focus-ring bg-transparent border border-border-subtle"
            autoFocus
          />
        </div>
        <select
          value={companyFilter}
          onChange={(event) => setCompanyFilter(event.target.value)}
          className="glass-hover px-3 py-2 rounded-xl text-sm focus-ring border border-border-subtle bg-bg-secondary w-full sm:w-52"
          aria-label="Lookup company"
        >
          <option value="all">All companies</option>
          {companyList.map((company) => (
            <option key={company.id} value={company.id}>{company.name}</option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <label className="text-sm text-text-muted" htmlFor="lookup-qty">Qty</label>
          <input
            id="lookup-qty"
            type="number"
            min="0"
            step="any"
            value={quantityInput}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setQuantityInput(event.target.value)}
            className="w-20 glass-hover px-3 py-2 rounded-xl text-sm focus-ring bg-transparent border border-border-subtle"
          />
        </div>
      </div>
      <div className="p-4 overflow-y-auto space-y-2 min-h-[180px] max-h-[55vh]">
        <p className="text-xs text-text-muted">Showing up to 100 matches · {results.length} found</p>
        {results.length > 0 ? results.map((item) => {
          const taxRate = Number.isFinite(Number(item.taxRate)) ? Number(item.taxRate) : defaultTaxRate
          const lineTotal = quantity * (Number(item.rate) || 0) * (1 + taxRate / 100)
          const last = lastRateChange(item)
          return (
            <div key={item.id} className="glass-hover p-3 rounded-xl border border-border-subtle flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-text-primary truncate">{item.description}</p>
                <p className="text-xs text-text-muted mt-0.5 truncate">
                  {item.category} · {item.unit || 'PCS'} ·{' '}
                  {companyNames.get(item.companyId || DEFAULT_COMPANY_ID) || 'Unassigned'}
                  {item.serviceRef ? ` · ${item.serviceRef}` : ''}
                  {last ? ` · updated ${formatDateTime(last.date)}` : ''}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-mono font-semibold text-primary">
                  {formatCurrency(Number(item.rate) || 0, currency)}
                </p>
                <p className="text-xs text-text-muted">VAT {taxRate}% · {formatCurrency(lineTotal, currency)}</p>
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => onViewHistory(item)}
                className="glass-hover p-2 rounded-xl text-text-secondary hover:text-secondary focus-ring shrink-0"
                aria-label={`Rate history for ${item.description}`}
                title="View rate history"
              >
                <History className="w-4 h-4" />
              </motion.button>
            </div>
          )
        }) : (
          <div className="text-center py-8">
            <Search className="w-10 h-10 mx-auto text-text-muted/50 mb-3" />
            <p className="text-sm text-text-secondary">No matching rates found</p>
          </div>
        )}
      </div>
    </ModalShell>
  )
}

function ImportDialog({
  priceBook,
  companies,
  defaultCompanyId,
  defaultTaxRate,
  onClose,
  onApply,
  onImported,
}: {
  priceBook: PriceBookItem[]
  companies: Company[]
  defaultCompanyId: string
  defaultTaxRate: number
  onClose: () => void
  onApply: (items: PriceBookItem[]) => void
  onImported: (companyId: string, result: ImportResult) => void
}) {
  const [sources, setSources] = useState<ImportSource[]>([])
  const [warnings, setWarnings] = useState<string[]>([])
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [status, setStatus] = useState<ImportStatus>('idle')
  const [error, setError] = useState('')
  const [targetCompanyId, setTargetCompanyId] = useState(defaultCompanyId)
  const [strategy, setStrategy] = useState<PriceBookMergeStrategy>('merge')
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<ImportResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const normalized = useMemo(
    () => normalizeImportedRows(rows.map(mapFlexiblePriceBookRow), { companyId: targetCompanyId, defaultTaxRate }),
    [rows, targetCompanyId, defaultTaxRate],
  )
  const drafts = normalized.drafts
  const duplicateCount = useMemo(() => countDuplicateDrafts(drafts), [drafts])
  const mergeableCount = useMemo(() => {
    const keys = new Set(priceBook.map(priceBookMatchKey))
    return drafts.filter((draft) => keys.has(priceBookMatchKey(draft))).length
  }, [priceBook, drafts])

  const loadSources = async (nextSources: ImportSource[]) => {
    if (nextSources.length === 0) return
    setSources(nextSources)
    setRows([])
    setWarnings([])
    setError('')
    setResult(null)
    setProgress(0)
    setStatus('reading')
    try {
      const collected: Record<string, unknown>[] = []
      const problems: string[] = []
      for (const file of nextSources) {
        try {
          const parsed = await readImportRows(file)
          if (Array.isArray(parsed)) collected.push(...parsed)
          else problems.push(`${file.name}: no rows found`)
        } catch (caught) {
          problems.push(`${file.name}: ${caught instanceof Error ? caught.message : 'Could not read file'}`)
        }
      }
      if (collected.length === 0) {
        throw new Error(problems.join(' · ') || 'No data rows were found in the selected files')
      }
      setRows(collected)
      setWarnings(problems)
      setTargetCompanyId((current) =>
        companies.some((company) => company.id === current) ? current : defaultCompanyId,
      )
      setStatus('ready')
    } catch (caught) {
      console.warn('Price book import preview failed:', caught)
      setError(caught instanceof Error ? caught.message : 'Could not read the selected files')
      setStatus('error')
    }
  }

  const pickElectronFile = async () => {
    const api = window.electronAPI
    if (!api?.showOpenDialog) return
    const selected = await api.showOpenDialog({
      filters: [
        { name: 'All Supported', extensions: ['json', 'xlsx', 'xls', 'csv', 'pdf'] },
        { name: 'JSON', extensions: ['json'] },
        { name: 'Excel', extensions: ['xlsx', 'xls'] },
        { name: 'CSV', extensions: ['csv'] },
        { name: 'PDF', extensions: ['pdf'] },
      ],
      properties: ['openFile', 'multiSelections'],
    })
    if (!selected?.canceled && selected?.filePaths?.length > 0) {
      await loadSources(
        selected.filePaths.map((path) => ({
          kind: 'path' as const,
          path: String(path),
          name: fileNameFromPath(String(path)),
        })),
      )
    }
  }

  const handleFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length > 0) {
      void loadSources(files.map((file) => ({ kind: 'file' as const, file, name: file.name })))
    }
    event.target.value = ''
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const files = Array.from(event.dataTransfer.files || [])
    if (files.length > 0) {
      void loadSources(files.map((file) => ({ kind: 'file' as const, file, name: file.name })))
    }
  }

  const handleImport = async () => {
    if (drafts.length === 0) return
    setStatus('importing')
    setProgress(25)
    setError('')
    try {
      // Yield once so the progress state paints before the synchronous merge.
      await new Promise<void>((resolve) => setTimeout(resolve, 0))
      setProgress(65)
      const merged = mergePriceBookItems(
        priceBook,
        drafts,
        strategy,
        `Import: ${sources.map((item) => item.name).join(', ') || 'price book'}`,
      )
      onApply(merged.priceBook)
      setProgress(100)
      setResult({
        added: merged.added,
        updated: merged.updated,
        skipped: merged.skipped + normalized.invalid,
        invalid: normalized.invalid,
      })
      setStatus('complete')
      onImported(targetCompanyId, {
        added: merged.added,
        updated: merged.updated,
        skipped: merged.skipped + normalized.invalid,
        invalid: normalized.invalid,
      })
    } catch (caught) {
      console.error('Price book import failed:', caught)
      setError(caught instanceof Error ? caught.message : 'Could not import the selected file')
      setStatus('error')
    }
  }

  const reset = () => {
    setSources([])
    setWarnings([])
    setRows([])
    setStatus('idle')
    setError('')
    setProgress(0)
    setResult(null)
  }

  const strategies: Array<{ value: PriceBookMergeStrategy; label: string; hint: string }> = [
    { value: 'merge', label: 'Merge & update rates', hint: 'Update matching items and log rate changes' },
    { value: 'skip', label: 'Skip duplicates', hint: 'Only insert items that do not already exist' },
    { value: 'add', label: 'Add all as new', hint: 'Always create new items, even for duplicates' },
  ]

  return (
    <ModalShell
      title="Import Price Book"
      subtitle="Multiple JSON, CSV, Excel or PDF files · rows are merged into one company"
      onClose={onClose}
      width="max-w-2xl"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.csv,.txt,.xlsx,.xls,.pdf"
        multiple
        onChange={handleFileInput}
        className="hidden"
      />

      <div className="p-6 overflow-y-auto flex-1">
        {status === 'idle' && (
          <div
            className="glass-hover border-2 border-dashed border-border-subtle rounded-xl p-10 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => {
              if (window.electronAPI?.showOpenDialog) void pickElectronFile()
              else fileInputRef.current?.click()
            }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop}
          >
            <FileInput className="w-12 h-12 mx-auto text-text-muted mb-4" />
            <p className="text-text-secondary mb-2">Select multiple files or drop them here</p>
            <p className="text-xs text-text-muted">
              Supports JSON, CSV, Excel (.xlsx, .xls) and PDF · headers auto-detected on any row
            </p>
            <p className="text-xs text-text-muted mt-2">
              Recognized columns: Description/Equipment/Service, Qty, Rate, Size, Class, Unit, Remarks, Serial No
            </p>
          </div>
        )}

        {status === 'reading' && (
          <div className="text-center py-12">
            <Loader2 className="w-10 h-10 mx-auto text-primary animate-spin mb-4" />
            <p className="font-medium text-text-primary">Reading file...</p>
            <p className="text-sm text-text-muted mt-1">
              {sources.map((item) => item.name).join(', ')}
            </p>
          </div>
        )}

        {status === 'ready' && sources.length > 0 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between p-4 glass-hover rounded-xl gap-3">
              <div className="min-w-0">
                <p className="font-medium text-text-primary truncate">
                  {sources.map((item) => item.name).join(', ')}
                </p>
                <p className="text-xs text-text-muted mt-0.5">
                  {rows.length} rows · {drafts.length} valid · {normalized.invalid} invalid · {duplicateCount} duplicated in file
                </p>
                {warnings.length > 0 && (
                  <p className="text-xs text-warning mt-1">{warnings.join(' · ')}</p>
                )}
              </div>
              <button
                type="button"
                onClick={reset}
                className="glass-hover px-3 py-1.5 rounded-lg text-sm text-text-secondary hover:text-error shrink-0"
              >
                <X className="w-4 h-4 mr-1 inline" />
                Remove
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2" htmlFor="import-company">
                  Import into company
                </label>
                <select
                  id="import-company"
                  value={targetCompanyId}
                  onChange={(event) => setTargetCompanyId(event.target.value)}
                  className="w-full glass-hover px-3 py-2 rounded-lg text-sm focus-ring bg-bg-secondary border border-border-subtle"
                >
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>{company.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Duplicate handling</label>
                <p className="text-sm text-text-secondary glass-hover px-3 py-2 rounded-lg">
                  {mergeableCount} of {drafts.length} rows match existing items
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {strategies.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                    strategy === option.value
                      ? 'border-primary/60 bg-primary/10'
                      : 'border-border-subtle hover:bg-bg-secondary/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="import-strategy"
                    value={option.value}
                    checked={strategy === option.value}
                    onChange={() => setStrategy(option.value)}
                    className="mt-1 accent-primary"
                  />
                  <span>
                    <span className="block text-sm font-medium text-text-primary">{option.label}</span>
                    <span className="block text-xs text-text-muted mt-0.5">{option.hint}</span>
                  </span>
                </label>
              ))}
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => void handleImport()}
              disabled={drafts.length === 0}
              className="w-full glass-hover px-4 py-3 rounded-xl font-medium flex items-center justify-center gap-2 bg-primary text-white hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <GitMerge className="w-4 h-4" />
              Import {drafts.length} {drafts.length === 1 ? 'item' : 'items'}
            </motion.button>
          </div>
        )}

        {status === 'importing' && (
          <div className="space-y-4 py-8">
            <Loader2 className="w-10 h-10 mx-auto text-primary animate-spin" />
            <p className="text-center font-medium text-text-primary">Processing price book...</p>
            <div className="w-full bg-bg-tertiary rounded-full h-2 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full bg-primary rounded-full"
                transition={{ duration: 0.3 }}
              />
            </div>
            <p className="text-center text-sm text-text-muted">{progress}% complete</p>
          </div>
        )}

        {status === 'complete' && result && (
          <div className="space-y-4 text-center py-6">
            <CheckCircle className="w-16 h-16 mx-auto text-success" />
            <p className="font-medium text-text-primary">Import Complete</p>
            <div className="flex flex-wrap justify-center gap-2">
              <span className="px-3 py-1 rounded-full bg-success/15 text-success text-sm">{result.added} added</span>
              <span className="px-3 py-1 rounded-full bg-secondary/15 text-secondary text-sm">{result.updated} updated</span>
              <span className="px-3 py-1 rounded-full bg-bg-tertiary text-text-secondary text-sm">{result.skipped} skipped</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full glass-hover px-4 py-3 rounded-xl font-medium bg-primary text-white hover:bg-primary-hover"
            >
              Done
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4 text-center py-6">
            <AlertCircle className="w-16 h-16 mx-auto text-error" />
            <p className="font-medium text-text-primary">Import Failed</p>
            <p className="text-sm text-text-muted">{error}</p>
            <button
              type="button"
              onClick={reset}
              className="w-full glass-hover px-4 py-3 rounded-xl font-medium flex items-center justify-center gap-2 text-error hover:bg-error/10 hover:border-error/30"
            >
              <RotateCcw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        )}
      </div>
    </ModalShell>
  )
}

function CompanyModal({
  companies,
  companyCounts,
  activeCompanyId,
  currency,
  taxRate,
  onAdd,
  onClose,
}: {
  companies: Company[]
  companyCounts: Map<string, number>
  activeCompanyId: string
  currency: string
  taxRate: number
  onAdd: (company: Company) => void
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const [vatNumber, setVatNumber] = useState('')
  const [companyCurrency, setCompanyCurrency] = useState(currency)
  const [companyTax, setCompanyTax] = useState(String(taxRate))
  const [error, setError] = useState('')

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Company name is required')
      return
    }
    if (companies.some((company) => company.name.toLowerCase() === trimmedName.toLowerCase())) {
      setError('A company with this name already exists')
      return
    }
    const parsedTax = Number(companyTax)
    onAdd({
      id: generateId(),
      name: trimmedName,
      vatNumber: vatNumber.trim() || undefined,
      currency: companyCurrency.trim().toUpperCase() || DEFAULT_CURRENCY,
      taxRate: Number.isFinite(parsedTax) ? Math.min(100, Math.max(0, parsedTax)) : DEFAULT_TAX_RATE,
    })
    onClose()
  }

  return (
    <ModalShell
      title="Companies"
      subtitle="Each company keeps its own price book and rates"
      onClose={onClose}
      width="max-w-lg"
    >
      <div className="p-5 border-b border-border-subtle space-y-2 max-h-[35vh] overflow-y-auto">
        {companies.map((company) => (
          <div key={company.id} className="glass-hover p-3 rounded-xl flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium text-text-primary truncate">
                {company.name}
                {company.id === activeCompanyId && (
                  <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] bg-primary/20 text-primary">Current</span>
                )}
              </p>
              <p className="text-xs text-text-muted mt-0.5">
                {companyCounts.get(company.id) || 0} items · {company.currency} · VAT {company.taxRate}%
                {company.vatNumber ? ` · ${company.vatNumber}` : ''}
              </p>
            </div>
            <Building2 className="w-5 h-5 text-text-muted shrink-0" />
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
        <h4 className="font-medium text-text-primary">Add a company</h4>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2" htmlFor="company-name">
            Company name *
          </label>
          <input
            id="company-name"
            value={name}
            onChange={(event) => { setName(event.target.value); setError('') }}
            className="w-full glass-hover px-3 py-2 rounded-lg text-sm focus-ring bg-transparent border border-border-subtle"
            placeholder="e.g. UIC Trading Division"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2" htmlFor="company-vat">
            VAT number
          </label>
          <input
            id="company-vat"
            value={vatNumber}
            onChange={(event) => setVatNumber(event.target.value)}
            className="w-full glass-hover px-3 py-2 rounded-lg text-sm focus-ring bg-transparent border border-border-subtle"
            placeholder="Optional"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2" htmlFor="company-currency">
              Currency
            </label>
            <input
              id="company-currency"
              value={companyCurrency}
              onChange={(event) => setCompanyCurrency(event.target.value)}
              className="w-full glass-hover px-3 py-2 rounded-lg text-sm focus-ring bg-transparent border border-border-subtle"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2" htmlFor="company-tax">
              Default VAT %
            </label>
            <input
              id="company-tax"
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={companyTax}
              onChange={(event) => setCompanyTax(event.target.value)}
              className="w-full glass-hover px-3 py-2 rounded-lg text-sm focus-ring bg-transparent border border-border-subtle"
            />
          </div>
        </div>
        {error && <p className="text-sm text-error">{error}</p>}
        <div className="flex justify-end gap-3 pt-2 border-t border-border-subtle">
          <button type="button" onClick={onClose} className="glass-hover px-4 py-2 rounded-xl font-medium">
            Cancel
          </button>
          <button
            type="submit"
            className="glass-hover px-4 py-2 rounded-xl font-medium bg-primary text-white hover:bg-primary-hover"
          >
            Add Company
          </button>
        </div>
      </form>
    </ModalShell>
  )
}
