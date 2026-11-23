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
import { useState, useMemo } from 'react'
import { useStore } from '@/services/store'
import { generateId } from '@/utils/formatters'
import { formatCurrency, formatDate } from '@/utils/formatters'

declare global {
  interface Window {
    electronAPI?: {
      minimize: () => void
      maximize: () => void
      close: () => void
      showOpenDialog: (options: any) => Promise<any>
      showSaveDialog: (options: any) => Promise<any>
      readFile: (path: string) => Promise<string | null>
      writeFile: (path: string, content: string) => Promise<boolean>
      isMaximized: () => Promise<boolean>
    }
  }
}

const statusOptions = ['all', 'draft', 'sent', 'approved', 'rejected', 'expired'] as const
const typeOptions = ['all', 'standard', 'valve'] as const

export function QuotesList() {
  const { quotations, setView, setSelectedQuote, deleteQuotation, addToast, settings, addQuotation } = useStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'sent' | 'approved' | 'rejected' | 'expired'>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | 'standard' | 'valve'>('all')
  const [sortField, setSortField] = useState<'date' | 'quoteNumber' | 'client' | 'total' | 'status'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedQuotes, setSelectedQuotes] = useState<string[]>([])
  const itemsPerPage = 10

  // Quotation Import functionality
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [importFile, setImportFile] = useState<string | null>(null)
  const [importProgress, setImportProgress] = useState(0)
  type ImportStatus = "idle" | "importing" | "complete" | "error"
  const [importStatus, setImportStatus] = useState<ImportStatus>("idle")

  const parseFilePreview = async (filePath: string) => {
    try {
      const { readFile } = window.electronAPI || {}
      if (!readFile) throw new Error("File reading not available")
      const content = await readFile(filePath)
      if (!content) throw new Error("Could not read file")
      if (filePath.endsWith('.json')) {
        const data = JSON.parse(content)
        if (Array.isArray(data)) return { headers: Object.keys(data[0] || {}) }
        return { headers: Object.keys(data) }
      } else if (filePath.endsWith('.csv')) {
        const lines = content.split('\n')
        const headers = lines[0].split(',').map(h => h.trim())
        return { headers, preview: lines.slice(1, 5) }
      }
      return { headers: [] }
    } catch (err) {
      console.error("File preview error:", err)
      return { headers: [] }
    }
  }

  const handleImportFile = async () => {
    if (!importFile) return
    try {
      setImportProgress(10)
      setImportStatus("importing")
      const { readFile } = window.electronAPI || {}
      if (!readFile) throw new Error("File reading not available")
      setImportProgress(30)
      const content = await readFile(importFile)
      if (!content) throw new Error("Could not read file")
      setImportProgress(50)
      let data: any = null
      if (importFile.endsWith('.json')) {
        data = JSON.parse(content)
      } else if (importFile.endsWith('.csv')) {
        const lines = content.split('\n').filter(l => l.trim())
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
        data = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
          const obj: Record<string, string> = {}
          headers.forEach((h, i) => { obj[h] = values[i] || '' })
          return obj
        })
      }
      setImportProgress(70)
      if (Array.isArray(data)) {
        // Import quotations
        for (const item of data) {
          if (item.quoteNumber && item.client) {
            addQuotation({
              id: generateId(),
              type: item.type || "standard",
              quoteNumber: item.quoteNumber,
              date: item.date,
              client: item.client,
              items: item.items || [],
              subtotal: item.subtotal || 0,
              tax: item.tax || 0,
              total: item.total || 0,
              status: item.status || "draft",
              notes: item.notes || "",
              terms: item.terms || settings.defaults.paymentTerms,
              serialNumber: item.serialNumber || "",
              annexurePages: item.annexurePages || [],
              createdAt: item.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            })
          }
        }
        addToast({ type: "success", title: "Imported", message: `${data.length} quotations imported` })
      }
      setImportProgress(100)
      setImportStatus("complete")
    } catch (err) {
      console.error("Import error:", err)
      setImportStatus("error")
      addToast({ type: "error", title: "Import Failed", message: "Could not import file. Please check format." })
    }
  }

  const handleImportQuotations = () => {
    setShowImportDialog(true)
    setImportFile(null)
    setImportProgress(0)
    setImportStatus("idle")
  }

  const filteredQuotes = useMemo(() => {
    return quotations
      .filter((q) => {
        const matchesSearch =
          q.quoteNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          q.client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          q.client.email?.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesStatus = statusFilter === 'all' || q.status === statusFilter
        const matchesType = typeFilter === 'all' || q.type === typeFilter
        return matchesSearch && matchesStatus && matchesType
      })
      .sort((a, b) => {
        let aVal: string | number
        let bVal: string | number
        if (sortField === 'date') {
          aVal = new Date(a.date).getTime()
          bVal = new Date(b.date).getTime()
        } else if (sortField === 'quoteNumber') {
          aVal = a.quoteNumber
          bVal = b.quoteNumber
        } else if (sortField === 'client') {
          aVal = a.client.name.toLowerCase()
          bVal = b.client.name.toLowerCase()
        } else if (sortField === 'total') {
          aVal = a.total
          bVal = b.total
        } else if (sortField === 'status') {
          aVal = a.status
          bVal = b.status
        } else {
          aVal = a[sortField as keyof typeof a] as string | number
          bVal = b[sortField as keyof typeof b] as string | number
        }
        if (sortOrder === 'asc') {
          return aVal > bVal ? 1 : -1
        }
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

  const handleBulkExport = () => {
    addToast({ type: 'info', title: 'Export Started', message: `Exporting ${selectedQuotes.length} quotation(s)...` })
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
                onClick={handleBulkExport}
                className="text-sm text-primary hover:text-primary-hover font-medium flex items-center gap-1"
              >
                <Download className="w-3 h-3" />
                Export
              </motion.button>
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
            onClick={() => setView('editor')}
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
                {[
                  { key: 'number', label: 'Quote #', field: 'number' },
                  { key: 'date', label: 'Date', field: 'date' },
                  { key: 'client', label: 'Client', field: 'client' },
                  { key: 'type', label: 'Type', field: 'type' },
                  { key: 'total', label: 'Total', field: 'total' },
                  { key: 'status', label: 'Status', field: 'status' },
                ].map((col) => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.field as typeof sortField)}
                    className="px-4 py-3 text-left text-sm font-medium text-text-secondary hover:text-text-primary cursor-pointer select-none flex items-center gap-1"
                  >
                    {col.label}
                    {sortField === col.field && (
                      <ArrowUpDown className={`w-4 h-4 ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />
                    )}
                  </th>
                ))}
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
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusColors[quote.status]}`}>
                          {statusIcons[quote.status]}
                          {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
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
                            onClick={() => { setSelectedQuote(quote.id); setView('editor') }}
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
                        onClick={() => setView('editor')}
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
      <AnimatePresence>
        {showImportDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowImportDialog(false)}
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
                  onClick={() => { setShowImportDialog(false); setImportFile(null); setImportProgress(0); setImportStatus("idle"); }}
                  className="glass-hover p-2 rounded-xl focus-ring"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                {!importFile ? (
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-medium text-text-primary mb-3">Select Import File</h4>
                      <div className="glass-hover border-2 border-dashed border-border-subtle rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                           onClick={async () => {
                             if (typeof window !== 'undefined' && window.electronAPI) {
                               const result = await window.electronAPI.showOpenDialog({
                                 filters: [
                                   { name: 'All Supported', extensions: ['json', 'xlsx', 'csv'] },
                                   { name: 'JSON', extensions: ['json'] },
                                   { name: 'Excel', extensions: ['xlsx', 'xls'] },
                                   { name: 'CSV', extensions: ['csv'] },
                                 ],
                                 properties: ['openFile'],
                               })
                               if (!result.canceled && result.filePaths.length > 0) {
                                 setImportFile(result.filePaths[0])
                               }
                             }
                           }}>
                        <FileInput className="w-12 h-12 mx-auto text-text-muted mb-4" />
                        <p className="text-text-secondary mb-2">Click to select file or drag and drop</p>
                        <p className="text-xs text-text-muted">Supports: JSON, Excel (.xlsx), CSV</p>
                      </div>
                    </div>
                  </div>
                ) : importStatus === "idle" ? (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 glass-hover rounded-xl">
                      <div className="flex items-center gap-3">
                        <FileInput className="w-8 h-8 text-primary" />
                        <div>
                          <p className="font-medium text-text-primary">{importFile}</p>
                          <p className="text-xs text-text-muted">Quotation File</p>
                        </div>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => { setImportFile(null); setImportProgress(0); setImportStatus("idle"); }}
                        className="glass-hover px-3 py-1.5 rounded-lg text-sm text-text-secondary hover:text-error"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Remove
                      </motion.button>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={async () => {
                        setImportStatus("importing")
                        setImportProgress(0)
                        await handleImportFile()
                      }}
                      className="w-full glass-hover p-4 rounded-xl border-2 border-border-subtle hover:border-primary/50 transition-colors"
                    >
                      {importStatus === "importing" as ImportStatus ? (
                        <>
                          <Loader2 className="w-6 h-6 mx-auto text-primary mb-2 animate-spin" />
                          <p className="font-medium text-text-primary">Importing...</p>
                        </>
                      ) : (
                        <>
                          <FileInput className="w-6 h-6 mx-auto text-primary mb-2" />
                          <p className="font-medium text-text-primary">Import Quotations</p>
                          <p className="text-xs text-text-muted mt-1">Auto-detect and import</p>
                        </>
                      )}
                    </motion.button>
                    {importStatus === "importing" as ImportStatus && (
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
                    {importStatus === "complete" as ImportStatus && (
                      <div className="space-y-4 text-center">
                        <CheckCircle className="w-16 h-16 mx-auto text-success" />
                        <p className="font-medium text-text-primary">Import Complete!</p>
                        <p className="text-sm text-text-muted">Quotations imported successfully</p>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => { setShowImportDialog(false); setImportFile(null); setImportProgress(0); setImportStatus("idle"); }}
                          className="w-full glass-hover px-4 py-3 rounded-xl font-medium flex items-center justify-center gap-2 bg-primary text-white hover:bg-primary-hover"
                        >
                          Done
                        </motion.button>
                      </div>
                    )}
                    {importStatus === "error" as ImportStatus && (
                      <div className="space-y-4 text-center">
                        <AlertCircle className="w-16 h-16 mx-auto text-error" />
                        <p className="font-medium text-text-primary">Import Failed</p>
                        <p className="text-sm text-text-muted">An error occurred during import</p>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setImportStatus("idle")}
                          className="w-full glass-hover px-4 py-3 rounded-xl font-medium flex items-center justify-center gap-2 text-error hover:bg-error/10 hover:border-error/30"
                        >
                          Try Again
                        </motion.button>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
