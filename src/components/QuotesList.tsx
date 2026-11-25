"use client"

import { motion, AnimatePresence } from 'motion/react'
import {
  FileText,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  Download,
  Eye,
  Mail,
  Tag,
  Calendar,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Plus,
  Check,
  X,
  ArrowUpDown,
  Upload,
  Loader2,
  FileInput,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { normalizePriceBookItem, useStore } from '@/services/store'
import { formatCurrency, formatDate } from '@/utils/formatters'
import {
  importedHeaderPreview,
  mapFlexiblePriceBookRow,
  normalizeImportedQuotation,
  readImportSources,
} from '@/utils/quotationImport'
import type { ImportGroup, ImportSource } from '@/utils/quotationImport'
import {
  exportQuotationsToExcel,
  exportQuotationsToPdf,
  exportQuotationExcel,
  exportQuotationPdf,
} from '@/utils/quotationExport'
import type { Quotation } from '@/types'

const statusOptions = ['all', 'draft', 'sent', 'approved', 'rejected', 'expired'] as const
const typeOptions = ['all', 'standard', 'valve'] as const

export function QuotesList() {
  const {
    quotations,
    setView,
    setSelectedQuote,
    deleteQuotation,
    duplicateQuotation,
    updateQuotation,
    setQuotations,
    addToast,
    settings,
    companies,
    activeCompanyId,
    addPriceBookItem,
    addCompany,
    setActiveCompany,
  } = useStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'sent' | 'approved' | 'rejected' | 'expired'>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | 'standard' | 'valve'>('all')
  const [sortField, setSortField] = useState<'date' | 'quoteNumber' | 'client' | 'type' | 'total' | 'status'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedQuotes, setSelectedQuotes] = useState<string[]>([])
  const itemsPerPage = 10

  // Multi-file import state — supports JSON, CSV, Excel and PDF.
  type ImportStatus = 'idle' | 'reading' | 'importing' | 'complete' | 'error'
  type ImportTarget = 'quotations' | 'priceBook'
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [importSources, setImportSources] = useState<ImportSource[]>([])
  const [importRows, setImportRows] = useState<Record<string, unknown>[]>([])
  const [importGroups, setImportGroups] = useState<ImportGroup[]>([])
  const [importWarnings, setImportWarnings] = useState<string[]>([])
  const [importTarget, setImportTarget] = useState<ImportTarget>('quotations')
  const [importProgress, setImportProgress] = useState(0)
  const [importStatus, setImportStatus] = useState<ImportStatus>('idle')
  const [importError, setImportError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilter, typeFilter, sortField, sortOrder])

  const currency = settings.defaults.currency || 'SAR'
  const companyName = companies.find((c) => c.id === companies[0]?.id)?.name ||
    settings.company.name ||
    'Universal Inspection Co. Ltd.'

  const loadImportSources = async (sources: ImportSource[]) => {
    if (sources.length === 0) return
    setImportSources(sources)
    setImportRows([])
    setImportGroups([])
    setImportWarnings([])
    setImportProgress(0)
    setImportError('')
    setImportStatus('reading')
    const result = await readImportSources(sources)
    if (result.rows.length === 0) {
      setImportError(result.errors.join(' · ') || 'No data rows were found in the selected files')
      setImportStatus('error')
      return
    }
    setImportRows(result.rows)
    setImportGroups(result.groups)
    setImportWarnings(result.errors)
    setImportStatus('idle')
  }

  const handleElectronImportFile = async () => {
    const result = await window.electronAPI?.showOpenDialog({
      title: 'Import Quotations / Items',
      filters: [
        { name: 'All Supported', extensions: ['json', 'xlsx', 'xls', 'csv', 'pdf'] },
        { name: 'JSON', extensions: ['json'] },
        { name: 'Excel', extensions: ['xlsx', 'xls'] },
        { name: 'CSV', extensions: ['csv'] },
        { name: 'PDF', extensions: ['pdf'] },
      ],
      properties: ['openFile', 'multiSelections'],
    })
    if (result?.canceled || !result?.filePaths?.length) return
    await loadImportSources(
      result.filePaths.map((filePath) => ({
        kind: 'path' as const,
        path: String(filePath),
        name: String(filePath).split(/[\\/]/).pop() || String(filePath),
      })),
    )
  }

  const handleFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length > 0) {
      void loadImportSources(files.map((file) => ({ kind: 'file' as const, file, name: file.name })))
    }
    event.target.value = ''
  }

  const handleImportFile = async () => {
    if (importRows.length === 0) return
    try {
      setImportStatus('importing')
      setImportProgress(20)
      const groups: ImportGroup[] = importGroups.length > 0
        ? importGroups
        : [{ source: importSources[0] || { kind: 'path', path: '', name: 'import' }, rows: importRows, clientName: 'Imported Client' }]

      // Helper to create/select company
      const getOrCreateCompany = (companyName: string): string => {
        const slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
        const companyId = `company-${slug || 'imported'}`
        if (!companies.some((company) => company.name.toLowerCase() === companyName.toLowerCase())) {
          addCompany({ id: companyId, name: companyName, currency: 'SAR', taxRate: 15 })
        }
        return companyId
      }

      if (importTarget === 'priceBook') {
        let count = 0
        const newCompanyIds: string[] = []
        groups.forEach((group) => {
          const companyId = getOrCreateCompany(group.clientName)
          newCompanyIds.push(companyId)
          // Set first company as active
          if (newCompanyIds.length === 1) setActiveCompany(companyId)
          group.rows
            .map(mapFlexiblePriceBookRow)
            .filter((row) => Object.keys(row).length > 0)
            .forEach((draft) => {
              addPriceBookItem(normalizePriceBookItem(draft, companyId))
              count += 1
            })
        })
        if (count === 0) throw new Error('No price book items were found in the selected files')
        setImportProgress(70)
        addToast({ type: 'success', title: 'Imported', message: `${count} price book item(s) added` })
      } else {
        const imported = groups
          .map((group, index) => {
            // Create/select company for this quotation
            const companyId = getOrCreateCompany(group.clientName)
            if (index === 0) setActiveCompany(companyId)
            const head = group.rows[0] || {}
            const merged = {
              ...head,
              client: group.clientName,
              items: group.rows,
            }
            return normalizeImportedQuotation(merged, { settings, index, clientName: group.clientName })
          })
          .filter((quote): quote is Quotation => quote !== null)
        if (imported.length === 0) throw new Error('No valid quotations were found in the selected files')
        setImportProgress(70)
        // One store write keeps bulk imports fast and avoids renumbering every row.
        setQuotations([...imported, ...quotations])
        addToast({
          type: 'success',
          title: 'Imported',
          message: `${imported.length} quotation${imported.length === 1 ? '' : 's'} imported (one per file)`,
        })
      }
      setImportProgress(100)
      setImportStatus('complete')
    } catch (err) {
      console.error('Quotation import failed:', err)
      setImportError(err instanceof Error ? err.message : 'Could not import the selected files')
      setImportStatus('error')
      addToast({ type: 'error', title: 'Import Failed', message: 'Please check the file format and try again.' })
    }
  }

  const resetImport = () => {
    setShowImportDialog(false)
    setImportSources([])
    setImportRows([])
    setImportGroups([])
    setImportWarnings([])
    setImportProgress(0)
    setImportStatus('idle')
    setImportError('')
  }

  const handleImportQuotations = () => {
    setShowImportDialog(true)
    setImportSources([])
    setImportRows([])
    setImportGroups([])
    setImportWarnings([])
    setImportProgress(0)
    setImportStatus('idle')
    setImportError('')
  }

  const quotesForExport = (): Quotation[] => {
    const byId = new Set(selectedQuotes)
    return byId.size > 0 ? quotations.filter((quote) => byId.has(quote.id)) : filteredQuotes
  }

  const handleExportExcel = async () => {
    const quotes = quotesForExport()
    if (quotes.length === 0) return
    try {
      await exportQuotationsToExcel(quotes)
      addToast({ type: 'success', title: 'Exported', message: `${quotes.length} quotation(s) exported to Excel` })
    } catch (err) {
      console.error('Excel export failed:', err)
      addToast({ type: 'error', title: 'Export Failed', message: 'Could not generate the Excel file.' })
    }
  }

  const handleExportPdf = async () => {
    const quotes = quotesForExport()
    if (quotes.length === 0) return
    try {
      await exportQuotationsToPdf(quotes, currency, companyName)
      addToast({ type: 'success', title: 'Exported', message: `${quotes.length} quotation(s) exported to PDF` })
    } catch (err) {
      console.error('PDF export failed:', err)
      addToast({ type: 'error', title: 'Export Failed', message: 'Could not generate the PDF file.' })
    }
  }

  const handleExportQuoteExcel = async (quote: Quotation) => {
    try {
      await exportQuotationExcel(quote, settings)
      addToast({ type: 'success', title: 'Exported', message: `${quote.quoteNumber} exported to Excel` })
    } catch (err) {
      console.error('Excel export failed:', err)
      addToast({ type: 'error', title: 'Export Failed', message: 'Could not generate the Excel file.' })
    }
  }

  const handleExportQuotePdf = async (quote: Quotation) => {
    try {
      await exportQuotationPdf(quote, settings)
      addToast({ type: 'success', title: 'Exported', message: `${quote.quoteNumber} exported to PDF` })
    } catch (err) {
      console.error('PDF export failed:', err)
      addToast({ type: 'error', title: 'Export Failed', message: 'Could not generate the PDF file.' })
    }
  }

  const filteredQuotes = useMemo(() => {
    return quotations
      .filter((q) => {
        const needle = searchQuery.trim().toLowerCase()
        const haystack = [
          q.quoteNumber,
          q.title,
          q.ref,
          q.poNumber,
          q.client?.name,
          q.client?.company,
          q.client?.email,
          q.client?.contactPerson,
          ...(q.items || []).map((item) => item.description),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        const matchesSearch = !needle || haystack.includes(needle)
        const matchesStatus = statusFilter === 'all' || q.status === statusFilter
        const matchesType = typeFilter === 'all' || q.type === typeFilter
        return matchesSearch && matchesStatus && matchesType
      })
      .sort((a, b) => {
        let aVal: string | number
        let bVal: string | number
        switch (sortField) {
          case 'date':
            aVal = new Date(a.date).getTime() || 0
            bVal = new Date(b.date).getTime() || 0
            break
          case 'quoteNumber':
            aVal = a.quoteNumber.toLowerCase()
            bVal = b.quoteNumber.toLowerCase()
            break
          case 'client':
            aVal = (a.client?.name || '').toLowerCase()
            bVal = (b.client?.name || '').toLowerCase()
            break
          case 'type':
            aVal = a.type
            bVal = b.type
            break
          case 'total':
            aVal = Number.isFinite(a.total) ? a.total : 0
            bVal = Number.isFinite(b.total) ? b.total : 0
            break
          case 'status':
          default:
            aVal = a.status
            bVal = b.status
            break
        }
        if (aVal === bVal) return 0
        if (sortOrder === 'asc') return aVal > bVal ? 1 : -1
        return aVal < bVal ? 1 : -1
      })
  }, [quotations, searchQuery, statusFilter, typeFilter, sortField, sortOrder])

  const totalPages = Math.ceil(filteredQuotes.length / itemsPerPage)
  const paginatedQuotes = filteredQuotes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedQuotes((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const toggleSelectAll = () => {
    if (selectedQuotes.length === paginatedQuotes.length) {
      setSelectedQuotes([])
    } else {
      setSelectedQuotes(paginatedQuotes.map((q) => q.id))
    }
  }

  const handleBulkDelete = () => {
    if (selectedQuotes.length === 0) return
    selectedQuotes.forEach((id) => deleteQuotation(id))
    setSelectedQuotes([])
    addToast({ type: 'success', title: 'Deleted', message: `${selectedQuotes.length} quotation(s) removed` })
  }

  const statusColors: Record<string, string> = {
    draft: 'bg-warning/20 text-warning border-warning/30',
    sent: 'bg-primary/20 text-primary border-primary/30',
    approved: 'bg-success/20 text-success border-success/30',
    rejected: 'bg-error/20 text-error border-error/30',
    expired: 'bg-text-muted/20 text-text-muted border-text-muted/30',
  }

  const statusIcons: Record<string, React.ReactNode> = {
    draft: <FileText className="w-3 h-3" />,
    sent: <Mail className="w-3 h-3" />,
    approved: <Check className="w-3 h-3" />,
    rejected: <X className="w-3 h-3" />,
    expired: <Calendar className="w-3 h-3" />,
  }

  return (
    <div className="h-full flex flex-col animate-in">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-text-primary to-text-secondary bg-clip-text text-transparent">
            Quotations
          </h1>
          <p className="text-text-muted mt-1">Manage all your quotations in one place</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {selectedQuotes.length > 0 && (
            <div className="glass-hover px-4 py-2 rounded-xl flex items-center gap-3 border border-primary/30 bg-primary/10">
              <span className="text-sm font-medium text-primary">{selectedQuotes.length} selected</span>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleBulkDelete}
                className="text-sm text-error hover:text-error-hover font-medium flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                Delete
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedQuotes([])}
                className="text-sm text-text-muted hover:text-text-primary font-medium"
              >
                Clear
              </motion.button>
            </div>
          )}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => { setSelectedQuote(undefined); setView('editor') }}
            className="glass-hover px-4 py-2 rounded-xl font-medium flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Quotation
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleImportQuotations}
            className="glass-hover px-4 py-2 rounded-xl font-medium flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Import
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleExportExcel}
            className="glass-hover px-4 py-2 rounded-xl font-medium flex items-center gap-2"
            title="Export all filtered quotations to Excel"
          >
            <Download className="w-4 h-4" />
            Excel
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleExportPdf}
            className="glass-hover px-4 py-2 rounded-xl font-medium flex items-center gap-2"
            title="Export all filtered quotations to PDF"
          >
            <Download className="w-4 h-4" />
            PDF
          </motion.button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="glass-elevated rounded-2xl border border-border-subtle overflow-hidden"
      >
        <div className="p-4 border-b border-border-subtle flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search quotes, clients, items..."
              className="w-full glass-hover pl-10 pr-4 py-2 rounded-xl text-sm focus-ring transition-all"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="glass-hover px-3 py-2 rounded-xl text-sm focus-ring border border-border-subtle bg-bg-secondary"
              aria-label="Filter by status"
            >
              {statusOptions.map((s) => (
                <option key={s} value={s}>{s === 'all' ? 'All Statuses' : s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
              className="glass-hover px-3 py-2 rounded-xl text-sm focus-ring border border-border-subtle bg-bg-secondary"
              aria-label="Filter by type"
            >
              {typeOptions.map((t) => (
                <option key={t} value={t}>{t === 'all' ? 'All Types' : t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full" role="grid">
            <thead>
              <tr className="border-b border-border-subtle bg-bg-secondary/50">
                <th className="w-12 px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={selectedQuotes.length === paginatedQuotes.length && paginatedQuotes.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-border-default text-primary focus:ring-primary"
                    aria-label="Select all"
                  />
                </th>
                {([
                  { key: 'number', label: 'Quote #', field: 'quoteNumber' },
                  { key: 'date', label: 'Date', field: 'date' },
                  { key: 'client', label: 'Client', field: 'client' },
                  { key: 'type', label: 'Type', field: 'type' },
                  { key: 'total', label: 'Total', field: 'total' },
                  { key: 'status', label: 'Status', field: 'status' },
                ] as { key: string; label: string; field: typeof sortField }[]).map((col) => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.field)}
                    className="px-4 py-3 text-left text-sm font-medium text-text-secondary hover:text-text-primary cursor-pointer select-none whitespace-nowrap"
                    aria-label={`Sort by ${col.label}`}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {sortField === col.field && (
                        <ArrowUpDown className={`w-4 h-4 ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />
                      )}
                    </span>
                  </th>
                ))}
                <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary whitespace-nowrap">Follow-up</th>
                <th className="w-16 px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              <AnimatePresence mode="popLayout">
                {paginatedQuotes.length > 0 ? (
                  paginatedQuotes.map((quote, index) => (
                    <motion.tr
                      key={quote.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.03 }}
                      className={`hover:bg-bg-secondary transition-colors ${selectedQuotes.includes(quote.id) ? 'bg-primary/5' : ''}`}
                    >
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedQuotes.includes(quote.id)}
                          onChange={() => toggleSelect(quote.id)}
                          className="w-4 h-4 rounded border-border-default text-primary focus:ring-primary"
                          aria-label={`Select ${quote.quoteNumber}`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono font-medium text-text-primary">{quote.quoteNumber}</span>
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        <Calendar className="w-4 h-4 inline-block align-middle mr-1" />
                        {formatDate(quote.date)}
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-text-primary truncate max-w-xs">{quote.client.name}</p>
                          {quote.client.company && (
                            <p className="text-xs text-text-muted truncate max-w-xs">{quote.client.company}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          quote.type === 'valve' ? 'bg-secondary/20 text-secondary' : 'bg-primary/20 text-primary'
                        }`}>
                          {quote.type.charAt(0).toUpperCase() + quote.type.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-text-primary">
                        {formatCurrency(quote.total, settings.defaults.currency)}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={quote.status}
                          onChange={(e) => updateQuotation(quote.id, { status: e.target.value as Quotation['status'] })}
                          className={`px-2 py-1 rounded-lg text-xs font-medium border bg-transparent focus-ring ${statusColors[quote.status] || ''}`}
                          aria-label={`Status for ${quote.quoteNumber}`}
                        >
                          {statusOptions.filter((status) => status !== 'all').map((status) => (
                            <option key={status} value={status}>
                              {status.charAt(0).toUpperCase() + status.slice(1)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="date"
                          value={quote.followUpDate || ''}
                          onChange={(e) => updateQuotation(quote.id, { followUpDate: e.target.value || undefined })}
                          className="glass-hover px-2 py-1 rounded-lg text-xs text-text-secondary focus-ring bg-transparent border border-border-subtle"
                          aria-label={`Follow-up date for ${quote.quoteNumber}`}
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleExportQuotePdf(quote)}
                            className="glass-hover p-2 rounded-xl text-text-secondary hover:text-primary focus-ring"
                            aria-label={`Export PDF for ${quote.quoteNumber}`}
                          >
                            <FileText className="w-4 h-4" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleExportQuoteExcel(quote)}
                            className="glass-hover p-2 rounded-xl text-text-secondary hover:text-secondary focus-ring"
                            aria-label={`Export Excel for ${quote.quoteNumber}`}
                          >
                            <Download className="w-4 h-4" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => { setSelectedQuote(quote.id); setView('editor') }}
                            className="glass-hover p-2 rounded-xl text-text-secondary hover:text-primary focus-ring"
                            aria-label={`Edit ${quote.quoteNumber}`}
                          >
                            <Eye className="w-4 h-4" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => {
                              duplicateQuotation(quote.id)
                              addToast({ type: 'success', title: 'Duplicated', message: `${quote.quoteNumber} copied as a new draft` })
                            }}
                            className="glass-hover p-2 rounded-xl text-text-secondary hover:text-secondary focus-ring"
                            aria-label={`Duplicate ${quote.quoteNumber}`}
                          >
                            <Copy className="w-4 h-4" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => { deleteQuotation(quote.id); addToast({ type: 'success', title: 'Deleted', message: `${quote.quoteNumber} removed` }) }}
                            className="glass-hover p-2 rounded-xl text-text-secondary hover:text-error focus-ring"
                            aria-label={`Delete ${quote.quoteNumber}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </motion.button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                ) : (
                  <motion.tr
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <td colSpan={9} className="px-4 py-12 text-center">
                      <FileText className="w-12 h-12 mx-auto text-text-muted/50 mb-4" />
                      <h3 className="text-lg font-medium text-text-secondary mb-1">No quotations found</h3>
                      <p className="text-text-muted mb-4">Try adjusting your filters or create a new quotation</p>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => { setSelectedQuote(undefined); setView('editor') }}
                        className="glass-hover px-6 py-2 rounded-xl font-medium inline-flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Create Quotation
                      </motion.button>
                    </td>
                  </motion.tr>
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="p-4 border-t border-border-subtle flex items-center justify-between">
            <p className="text-sm text-text-muted">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredQuotes.length)} of {filteredQuotes.length} quotations
            </p>
            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="glass-hover p-2 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed focus-ring"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </motion.button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <motion.button
                  key={page}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-xl font-medium transition-all ${
                    page === currentPage
                      ? 'bg-primary text-white shadow-glow'
                      : 'glass-hover text-text-secondary'
                  }`}
                  aria-label={`Page ${page}`}
                  aria-current={page === currentPage ? 'page' : undefined}
                >
                  {page}
                </motion.button>
              ))}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="glass-hover p-2 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed focus-ring"
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </motion.button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Import Quotations Dialog */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.csv,.txt,.xlsx,.xls,.pdf"
        multiple
        onChange={handleFileInput}
        className="hidden"
        aria-label="Choose quotation import file"
      />
      <AnimatePresence>
        {showImportDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={resetImport}
            role="dialog"
            aria-modal="true"
            aria-label="Import Quotations"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="glass-elevated w-full max-w-2xl rounded-2xl shadow-elevated border border-border-default overflow-hidden max-h-[90vh] flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 border-b border-border-subtle flex items-center justify-between">
                <h3 className="text-lg font-semibold">Import Quotations</h3>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={resetImport}
                  className="glass-hover p-2 rounded-xl focus-ring"
                  aria-label="Close import dialog"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                {importStatus === 'reading' ? (
                  <div className="text-center py-12">
                    <Loader2 className="w-10 h-10 mx-auto text-primary animate-spin mb-4" />
                    <p className="font-medium text-text-primary">Reading files...</p>
                    <p className="text-sm text-text-muted mt-1">
                      {importSources.map((source) => source.name).join(', ')}
                    </p>
                  </div>
                ) : importSources.length === 0 || importRows.length === 0 ? (
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-medium text-text-primary mb-3">Select Import Files</h4>
                      <div
                        className="glass-hover border-2 border-dashed border-border-subtle rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                        onClick={() => {
                          if (window.electronAPI?.showOpenDialog) void handleElectronImportFile()
                          else fileInputRef.current?.click()
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault()
                          const files = Array.from(e.dataTransfer.files || [])
                          if (files.length > 0) {
                            void loadImportSources(
                              files.map((file) => ({ kind: 'file' as const, file, name: file.name })),
                            )
                          }
                        }}
                      >
                        <FileInput className="w-12 h-12 mx-auto text-text-muted mb-4" />
                        <p className="text-text-secondary mb-2">Select multiple files or drop them here</p>
                        <p className="text-xs text-text-muted">
                          Supports JSON, CSV, Excel (.xlsx/.xls) and PDF · headers auto-detected on any row
                        </p>
                      </div>
                      {importError && (
                        <p className="mt-3 text-sm text-error flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" />
                          {importError}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 glass-hover rounded-xl gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-text-primary truncate">
                          {importSources.map((source) => source.name).join(', ')}
                        </p>
                        <p className="text-xs text-text-muted">
                          {importRows.length} row{importRows.length === 1 ? '' : 's'} detected ·{' '}
                          {importedHeaderPreview(importRows).slice(0, 8).join(', ') || 'no columns'}
                        </p>
                        {importWarnings.length > 0 && (
                          <p className="text-xs text-warning mt-1">{importWarnings.join(' · ')}</p>
                        )}
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => { setImportSources([]); setImportRows([]); setImportGroups([]); setImportWarnings([]); setImportError(''); setImportStatus('idle') }}
                        className="glass-hover px-3 py-1.5 rounded-lg text-sm text-text-secondary hover:text-error shrink-0"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Remove
                      </motion.button>
                    </div>

                    {importStatus === 'complete' ? (
                      <div className="space-y-4 text-center">
                        <CheckCircle className="w-16 h-16 mx-auto text-success" />
                        <p className="font-medium text-text-primary">Import Complete!</p>
                        <p className="text-sm text-text-muted">
                          {importTarget === 'quotations'
                            ? 'Quotations imported successfully with 15% VAT in SAR.'
                            : 'Price book entries imported successfully.'}
                        </p>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={resetImport}
                          className="w-full glass-hover px-4 py-3 rounded-xl font-medium flex items-center justify-center gap-2 bg-primary text-white hover:bg-primary-hover"
                        >
                          Done
                        </motion.button>
                      </div>
                    ) : importStatus === 'error' ? (
                      <div className="space-y-4 text-center">
                        <AlertCircle className="w-16 h-16 mx-auto text-error" />
                        <p className="font-medium text-text-primary">Import Failed</p>
                        <p className="text-sm text-text-muted">{importError || 'An error occurred during import'}</p>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => { setImportError(''); setImportStatus('idle') }}
                          className="w-full glass-hover px-4 py-3 rounded-xl font-medium flex items-center justify-center gap-2 text-error hover:bg-error/10 hover:border-error/30"
                        >
                          Try Again
                        </motion.button>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-sm font-medium text-text-secondary" htmlFor="import-target">
                            Import rows as
                          </label>
                          <select
                            id="import-target"
                            value={importTarget}
                            onChange={(e) => setImportTarget(e.target.value as ImportTarget)}
                            className="glass-hover px-3 py-2 rounded-xl text-sm focus-ring border border-border-subtle bg-bg-secondary"
                          >
                            <option value="quotations">Quotations (with line items)</option>
                            <option value="priceBook">Price Book entries</option>
                          </select>
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => void handleImportFile()}
                          className="w-full glass-hover p-4 rounded-xl border-2 border-border-subtle hover:border-primary/50 transition-colors"
                        >
                          <FileInput className="w-6 h-6 mx-auto text-primary mb-2" />
                          <p className="font-medium text-text-primary">
                            Import {importTarget === 'quotations' ? 'Quotations' : 'Price Book Items'}
                          </p>
                          <p className="text-xs text-text-muted mt-1">Auto-detect and import</p>
                        </motion.button>
                        {importStatus === 'importing' && (
                          <div className="space-y-2">
                            <p className="text-sm text-text-muted">Processing quotations...</p>
                            <div className="w-full bg-bg-tertiary rounded-full h-2 overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${importProgress}%` }}
                                className="h-full bg-primary rounded-full"
                                transition={{ duration: 0.3 }}
                              />
                            </div>
                            <p className="text-sm text-text-muted">{importProgress}% complete</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
