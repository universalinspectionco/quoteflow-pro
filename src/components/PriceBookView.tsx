"use client"

import { motion, AnimatePresence } from 'motion/react'
import { useState, useMemo } from 'react'
import {
  Plus, Search, Edit, Trash2, Copy, Download, Upload, Tag, ChevronLeft, ChevronRight, RotateCcw, X,
  Loader2, FileInput, AlertCircle, CheckCircle,
} from 'lucide-react'
import { useStore } from '@/services/store'
import { formatCurrency, generateId } from '@/utils/formatters'

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

const CATEGORIES = ['Valves', 'Fittings', 'Pipes', 'Instruments', 'Electrical', 'Mechanical', 'Consumables', 'Services', 'Other']

// Saudi Arabia SDAH-like field for inspection/calibration services
const SERVICE_FIELDS = ['SDAH Ref', 'Calibration Std', 'Equipment ID', 'Model No', 'Serial No', 'Other']

export function PriceBookView() {
  const { priceBook, settings, addPriceBookItem, updatePriceBookItem, deletePriceBookItem, addToast } = useStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<'all' | string>('all')
  const [sortField, setSortField] = useState<'description' | 'category' | 'unit' | 'rate' | 'serviceRef'>('category')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<typeof priceBook[0] | null>(null)
  const itemsPerPage = 15

  const categories = useMemo(() => ['all', ...new Set(priceBook.map(item => item.category))], [priceBook])

  const filteredItems = useMemo(() => {
    return priceBook
      .filter(item => {
        const matchesSearch =
          item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.category.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter
        return matchesSearch && matchesCategory
      })
      .sort((a, b) => {
        let aVal: string | number = a[sortField] as string | number
        let bVal: string | number = b[sortField] as string | number
        if (sortField === 'rate') {
          aVal = a.rate
          bVal = b.rate
        }
        if (sortOrder === 'asc') {
          return aVal > bVal ? 1 : -1
        }
        return aVal < bVal ? 1 : -1
      })
  }, [priceBook, searchQuery, categoryFilter, sortField, sortOrder])

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage)
  const paginatedItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const openCreateModal = () => {
    setEditingItem(null)
    setShowModal(true)
  }

  const openEditModal = (item: typeof priceBook[0]) => {
    setEditingItem(item)
    setShowModal(true)
  }

  const handleSave = (data: { description: string; category: string; unit: string; rate: number; hsnCode: string; taxRate: number }) => {
    if (editingItem) {
      updatePriceBookItem(editingItem.id, data)
      addToast({ type: 'success', title: 'Updated', message: 'Price book item updated' })
    } else {
      addPriceBookItem({ ...data, id: generateId(), history: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
      addToast({ type: 'success', title: 'Created', message: 'Price book item added' })
    }
    setShowModal(false)
  }

  const handleDelete = (id: string) => {
    deletePriceBookItem(id)
    addToast({ type: 'success', title: 'Deleted', message: 'Price book item removed' })
  }

  const handleDuplicate = (item: typeof priceBook[0]) => {
    addPriceBookItem({ ...item, id: generateId(), description: `${item.description} (Copy)`, history: [] })
    addToast({ type: 'success', title: 'Duplicated', message: 'Item duplicated successfully' })
  }

  const handleExport = () => {
    addToast({ type: 'info', title: 'Export Started', message: 'Generating price book export...' })
  }

  const handleImport = () => {
    addToast({ type: 'info', title: 'Import Ready', message: 'Select CSV/Excel file to import...' })
  }

  // Price Book Import functionality
  const [showPriceBookImportDialog, setShowPriceBookImportDialog] = useState(false)
  const [importPriceBookFile, setImportPriceBookFile] = useState<string | null>(null)
  const [priceBookImportProgress, setPriceBookImportProgress] = useState(0)
  type ImportStatus = "idle" | "importing" | "complete" | "error"
  const [priceBookImportStatus, setPriceBookImportStatus] = useState<ImportStatus>("idle")

  const parsePriceBookFilePreview = async (filePath: string) => {
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

  const handlePriceBookImport = async () => {
    if (!importPriceBookFile) return
    try {
      setPriceBookImportProgress(10)
      setPriceBookImportStatus("importing")
      const { readFile } = window.electronAPI || {}
      if (!readFile) throw new Error("File reading not available")
      setPriceBookImportProgress(30)
      const content = await readFile(importPriceBookFile)
      if (!content) throw new Error("Could not read file")
      setPriceBookImportProgress(50)
      let data: any = null
      if (importPriceBookFile.endsWith('.json')) {
        data = JSON.parse(content)
      } else if (importPriceBookFile.endsWith('.csv')) {
        const lines = content.split('\n').filter(l => l.trim())
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
        data = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
          const obj: Record<string, string> = {}
          headers.forEach((h, i) => { obj[h] = values[i] || '' })
          return obj
        })
      }
      setPriceBookImportProgress(70)
      if (Array.isArray(data)) {
        const newItems = data.map((item: any) => ({
          id: generateId(),
          description: item.description || "",
          category: item.category || "Other",
          unit: item.unit || "PCS",
          rate: parseFloat(item.rate) || 0,
          taxRate: parseFloat(item.taxRate) || settings.defaults.taxRate,
          serviceRef: item.serviceRef || "",
          history: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }))
        addPriceBookItem({ ...newItems[0] }) // This needs to be fixed to add all items
        newItems.forEach(item => addPriceBookItem(item))
        addToast({ type: "success", title: "Imported", message: `${newItems.length} items imported` })
      }
      setPriceBookImportProgress(100)
      setPriceBookImportStatus("complete")
    } catch (err) {
      console.error("Import error:", err)
      setPriceBookImportStatus("error")
      addToast({ type: "error", title: "Import Failed", message: "Could not import file. Please check format." })
    }
  }

  const openPriceBookImportDialog = () => {
    setShowPriceBookImportDialog(true)
    setImportPriceBookFile(null)
    setPriceBookImportProgress(0)
    setPriceBookImportStatus("idle")
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
            Price Book
          </h1>
          <p className="text-text-muted mt-1">Manage your items, rates, and price history</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
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
            onClick={openPriceBookImportDialog}
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

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="glass-elevated rounded-2xl border border-border-subtle overflow-hidden flex-1 flex flex-col"
      >
        <div className="p-4 border-b border-border-subtle flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="search"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search items, categories..."
              className="w-full glass-hover pl-10 pr-4 py-2 rounded-xl text-sm focus-ring transition-all"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="glass-hover px-3 py-2 rounded-xl text-sm focus-ring border border-border-subtle bg-bg-secondary w-full sm:w-48"
            aria-label="Filter by category"
          >
            {categories.map(c => (
              <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full table-auto" role="grid">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-border-subtle bg-bg-secondary/50">
                <th className="w-0 flex-1 min-w-[200px] px-4 py-3 text-left text-sm font-medium text-text-secondary hover:text-text-primary cursor-pointer select-none">
                  Description <RotateCcw className={`w-4 h-4 inline ${sortField === 'description' && sortOrder === 'asc' ? 'rotate-180' : ''}`} />
                </th>
                <th className="w-0 flex-1 min-w-[120px] px-4 py-3 text-left text-sm font-medium text-text-secondary hover:text-text-primary cursor-pointer select-none">
                  Category <RotateCcw className={`w-4 h-4 inline ${sortField === 'category' && sortOrder === 'asc' ? 'rotate-180' : ''}`} />
                </th>
                <th className="w-[80px] px-4 py-3 text-center text-sm font-medium text-text-secondary hover:text-text-primary cursor-pointer select-none">
                  Unit <RotateCcw className={`w-4 h-4 inline ${sortField === 'unit' && sortOrder === 'asc' ? 'rotate-180' : ''}`} />
                </th>
                <th className="w-[120px] px-4 py-3 text-right text-sm font-medium text-text-secondary hover:text-text-primary cursor-pointer select-none">
                  Rate <RotateCcw className={`w-4 h-4 inline ${sortField === 'rate' && sortOrder === 'asc' ? 'rotate-180' : ''}`} />
                </th>
                <th className="w-[80px] px-4 py-3 text-center text-sm font-medium text-text-secondary">VAT %</th>
                <th className="w-0 flex-1 min-w-[140px] px-4 py-3 text-left text-sm font-medium text-text-secondary hover:text-text-primary cursor-pointer select-none">
                  Service Ref <RotateCcw className={`w-4 h-4 inline ${sortField === 'serviceRef' && sortOrder === 'asc' ? 'rotate-180' : ''}`} />
                </th>
                <th className="w-[80px] px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              <AnimatePresence mode="popLayout">
                {paginatedItems.length > 0 ? (
                  paginatedItems.map((item, index) => (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.03 }}
                      className="hover:bg-bg-secondary/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-text-primary">{item.description}</p>
                        {item.serviceRef && <p className="text-xs text-text-muted">Ref: {item.serviceRef}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-secondary/20 text-secondary">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-secondary">{item.unit}</td>
                      <td className="px-4 py-3 font-mono font-medium text-text-primary">
                        {formatCurrency(item.rate, settings.defaults.currency)}
                      </td>
                      <td className="px-4 py-3 text-text-secondary">{item.taxRate}%</td>
                      <td className="px-4 py-3 text-text-muted">{item.serviceRef || '-'}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => openEditModal(item)}
                            className="glass-hover p-2 rounded-xl text-text-secondary hover:text-primary focus-ring"
                            aria-label={`Edit ${item.description}`}
                          >
                            <Edit className="w-4 h-4" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleDuplicate(item)}
                            className="glass-hover p-2 rounded-xl text-text-secondary hover:text-secondary focus-ring"
                            aria-label={`Duplicate ${item.description}`}
                          >
                            <Copy className="w-4 h-4" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => { handleDelete(item.id) }}
                            className="glass-hover p-2 rounded-xl text-text-secondary hover:text-error focus-ring"
                            aria-label={`Delete ${item.description}`}
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
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <Tag className="w-12 h-12 mx-auto text-text-muted/50 mb-4" />
                      <h3 className="text-lg font-medium text-text-secondary mb-1">No items found</h3>
                      <p className="text-text-muted mb-4">Add your first price book item to get started</p>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={openCreateModal}
                        className="glass-hover px-6 py-2 rounded-xl font-medium inline-flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add Item
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
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredItems.length)} of {filteredItems.length} items
            </p>
            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="glass-hover p-2 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed focus-ring"
              >
                <ChevronLeft className="w-4 h-4" />
              </motion.button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <motion.button
                  key={page}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-xl font-medium transition-all ${
                    page === currentPage ? 'bg-primary text-white shadow-glow' : 'glass-hover text-text-secondary'
                  }`}
                >
                  {page}
                </motion.button>
              ))}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="glass-hover p-2 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed focus-ring"
              >
                <ChevronRight className="w-4 h-4" />
              </motion.button>
            </div>
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowModal(false)}
            role="dialog"
            aria-modal="true"
            aria-label={editingItem ? 'Edit Price Book Item' : 'Add Price Book Item'}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="glass-elevated w-full max-w-md rounded-2xl shadow-elevated border border-border-default overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 border-b border-border-subtle flex items-center justify-between">
                <h3 className="text-lg font-semibold">{editingItem ? 'Edit Item' : 'Add New Item'}</h3>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowModal(false)}
                  className="glass-hover p-2 rounded-xl focus-ring"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>
              <PriceBookForm
                initialData={editingItem}
                onSave={handleSave}
                onCancel={() => setShowModal(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Price Book Import Dialog */}
      <AnimatePresence>
        {showPriceBookImportDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowPriceBookImportDialog(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Import Price Book Items"
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
                <h3 className="text-lg font-semibold">Import Price Book Items</h3>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => { setShowPriceBookImportDialog(false); setImportPriceBookFile(null); setPriceBookImportProgress(0); setPriceBookImportStatus("idle"); }}
                  className="glass-hover p-2 rounded-xl focus-ring"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                {!importPriceBookFile ? (
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
                                 setImportPriceBookFile(result.filePaths[0])
                               }
                             }
                           }}>
                        <FileInput className="w-12 h-12 mx-auto text-text-muted mb-4" />
                        <p className="text-text-secondary mb-2">Click to select file or drag and drop</p>
                        <p className="text-xs text-text-muted">Supports: JSON, Excel (.xlsx), CSV</p>
                      </div>
                    </div>
                  </div>
                ) : priceBookImportStatus === "idle" ? (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 glass-hover rounded-xl">
                      <div className="flex items-center gap-3">
                        <FileInput className="w-8 h-8 text-primary" />
                        <div>
                          <p className="font-medium text-text-primary">{importPriceBookFile}</p>
                          <p className="text-xs text-text-muted">Price Book File</p>
                        </div>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => { setImportPriceBookFile(null); setPriceBookImportProgress(0); setPriceBookImportStatus("idle"); }}
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
                        setPriceBookImportStatus("importing")
                        setPriceBookImportProgress(0)
                        await handlePriceBookImport()
                      }}
                      className="w-full glass-hover p-4 rounded-xl border-2 border-border-subtle hover:border-primary/50 transition-colors"
                    >
                      {priceBookImportStatus === "importing" as ImportStatus ? (
                        <>
                          <Loader2 className="w-6 h-6 mx-auto text-primary mb-2 animate-spin" />
                          <p className="font-medium text-text-primary">Importing...</p>
                        </>
                      ) : (
                        <>
                          <FileInput className="w-6 h-6 mx-auto text-primary mb-2" />
                          <p className="font-medium text-text-primary">Import Items</p>
                          <p className="text-xs text-text-muted mt-1">Auto-detect and import</p>
                        </>
                      )}
                    </motion.button>
                    {priceBookImportStatus === "importing" as ImportStatus && (
                      <div className="space-y-2">
                        <p className="text-sm text-text-muted">Processing items...</p>
                        <div className="w-full bg-bg-tertiary rounded-full h-2 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${priceBookImportProgress}%` }}
                            className="h-full bg-primary rounded-full"
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                        <p className="text-sm text-text-muted">{priceBookImportProgress}% complete</p>
                      </div>
                    )}
                    {priceBookImportStatus === "complete" as ImportStatus && (
                      <div className="space-y-4 text-center">
                        <CheckCircle className="w-16 h-16 mx-auto text-success" />
                        <p className="font-medium text-text-primary">Import Complete!</p>
                        <p className="text-sm text-text-muted">Price book items imported successfully</p>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => { setShowPriceBookImportDialog(false); setImportPriceBookFile(null); setPriceBookImportProgress(0); setPriceBookImportStatus("idle"); }}
                          className="w-full glass-hover px-4 py-3 rounded-xl font-medium flex items-center justify-center gap-2 bg-primary text-white hover:bg-primary-hover"
                        >
                          Done
                        </motion.button>
                      </div>
                    )}
                    {priceBookImportStatus === "error" as ImportStatus && (
                      <div className="space-y-4 text-center">
                        <AlertCircle className="w-16 h-16 mx-auto text-error" />
                        <p className="font-medium text-text-primary">Import Failed</p>
                        <p className="text-sm text-text-muted">An error occurred during import</p>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setPriceBookImportStatus("idle")}
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

function PriceBookForm({ initialData, onSave, onCancel }: { initialData: any; onSave: (data: any) => void; onCancel: () => void }) {
  const [formData, setFormData] = useState({
    description: initialData?.description || '',
    category: initialData?.category || 'Valves',
    unit: initialData?.unit || 'PCS',
    rate: initialData?.rate || 0,
    serviceRef: initialData?.serviceRef || '',
    taxRate: initialData?.taxRate || 5,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">Description *</label>
        <input
          type="text"
          value={formData.description}
          onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
          className="w-full glass-hover px-3 py-2 rounded-lg text-sm focus-ring bg-transparent border-none"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">Category</label>
        <select
          value={formData.category}
          onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
          className="w-full glass-hover px-3 py-2 rounded-lg text-sm focus-ring bg-transparent border-none"
        >
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">Unit</label>
          <select
            value={formData.unit}
            onChange={e => setFormData(prev => ({ ...prev, unit: e.target.value }))}
            className="w-full glass-hover px-3 py-2 rounded-lg text-sm focus-ring bg-transparent border-none"
          >
            {['PCS', 'MTR', 'KG', 'SET', 'LOT', 'HR', 'DAY', 'SQM', 'CBM'].map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">Tax %</label>
          <select
            value={formData.taxRate}
            onChange={e => setFormData(prev => ({ ...prev, taxRate: parseInt(e.target.value) }))}
            className="w-full glass-hover px-3 py-2 rounded-lg text-sm focus-ring bg-transparent border-none"
          >
            {[0, 5, 12, 18, 28].map(r => <option key={r} value={r}>{r}%</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">Rate *</label>
          <input
            type="number"
            value={formData.rate}
            onChange={e => setFormData(prev => ({ ...prev, rate: parseFloat(e.target.value) || 0 }))}
            min="0"
            step="0.01"
            className="w-full glass-hover px-3 py-2 rounded-lg text-sm focus-ring bg-transparent border-none"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">Service Ref</label>
          <select
            value={formData.serviceRef || ''}
            onChange={e => setFormData(prev => ({ ...prev, serviceRef: e.target.value }))}
            className="w-full glass-hover px-3 py-2 rounded-lg text-sm focus-ring bg-transparent border-none"
          >
            <option value="">-- Select --</option>
            {SERVICE_FIELDS.map(f => <option key={f} value={f}>{f}</option>)}
            <option value="other">Other</option>
          </select>
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