"use client"

import { motion, AnimatePresence } from "motion/react"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  Save,
  Trash2,
  Copy,
  Download,
  FileText,
  Plus,
  ChevronUp,
  ChevronDown,
  X,
  Eye,
  Mail,
  MapPin,
  Phone,
  Hash,
  Building2,
  User,
  Settings,
  FilePlus,
  RotateCcw,
  AlertCircle,
  CheckCircle,
  GripVertical,
  DollarSign,
  Upload,
  Loader2,
  FileInput,
  PenLine,
  Landmark,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useStore } from "@/services/store"
import { SignaturePad } from "@/components/SignaturePad"
import { CollapsibleSection } from "@/components/CollapsibleSection"
import { exportQuotationExcel, exportQuotationPdf } from "@/utils/quotationExport"
import {
  importedHeaderPreview,
  mapFlexibleItem,
  normalizeImportedQuotation,
  readImportSources,
} from "@/utils/quotationImport"
import type { ImportGroup, ImportSource } from "@/utils/quotationImport"
import { HEADING_HYDRO, HEADING_INSPECTION, defaultPdfHeading } from "@/utils/uicFormats"
import { formatCurrency, formatDate, formatNumber, generateId } from "@/utils/formatters"
import type {
  AnnexurePage,
  Client,
  Quotation,
  QuotationItem,
  Settings as AppSettings,
} from "@/types"

const VAT_RATE = 15
const CURRENCY = "SAR"
const UNITS = ["PCS", "MTR", "KG", "SET", "LOT", "HR", "DAY", "SQM", "CBM"]

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100

const todayISO = () => new Date().toISOString().split("T")[0]

const createEmptyItem = (): QuotationItem => ({
  id: generateId(),
  description: "",
  quantity: 1,
  unit: "PCS",
  rate: 0,
  taxRate: VAT_RATE,
  amount: 0,
  taxAmount: 0,
  sizeInch: "",
  classRating: "",
  remarks: "",
})

const normalizeItem = (item: Partial<QuotationItem>): QuotationItem => {
  const quantity = Number(item.quantity) || 0
  const rate = Number(item.rate) || 0
  return {
    ...item,
    id: item.id || generateId(),
    description: item.description || "",
    quantity,
    unit: item.unit || "PCS",
    rate,
    taxRate: VAT_RATE,
    amount: round2(quantity * rate),
    taxAmount: round2((quantity * rate * VAT_RATE) / 100),
    sizeInch: item.sizeInch || "",
    classRating: item.classRating || "",
    remarks: item.remarks || "",
  }
}

const makeClient = (client?: Partial<Client>): Client => ({
  id: client?.id || "",
  name: client?.name || "",
  email: client?.email || "",
  phone: client?.phone || "",
  address: client?.address || "",
  vatNumber: client?.vatNumber || "",
  company: client?.company || "",
  contactPerson: client?.contactPerson || "",
})

const computeTotals = (items: QuotationItem[]) => {
  const subtotal = round2(
    items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.rate) || 0), 0)
  )
  const tax = round2((subtotal * VAT_RATE) / 100)
  return { subtotal, tax, total: round2(subtotal + tax) }
}

type QuoteFormData = {
  type: "standard" | "valve"
  quoteNumber: string
  date: string
  client: Client
  items: QuotationItem[]
  notes: string
  terms: string
  serialNumber: string
  annexurePages: AnnexurePage[]
  title: string
  attnTo: string
  ref: string
  poNumber: string
  location: string
  project: string
  introParagraph: string
  vatNote: string
  scopeOfWork: string[]
  clientProvisions: string[]
  closingNote: string
  statusTracking: Quotation["statusTracking"]
  via: string
  clientCode: string
  svc: string
  dept: string
  spDept: string
  showRm: boolean
  signatureOption: Quotation["signatureOption"]
  pdfHeading: string
  signatureImage: string
  sub: string
  revised: boolean
  rateNote: string
  showTot: boolean
  delivery: string
  service: string
  intro: string
  vat: number
  closing: string
  sign: boolean
  isNew: boolean
}

const buildFormData = (
  quote: Quotation | null,
  settings: AppSettings,
  quoteNumber: string
): QuoteFormData => ({
  type: quote?.type || "standard",
  pdfHeading: quote?.pdfHeading || defaultPdfHeading(quote?.type || "standard"),
  signatureImage: quote?.signatureImage || "",
  quoteNumber: quote?.quoteNumber || quoteNumber,
  date: quote?.date || todayISO(),
  client: makeClient(quote?.client),
  items:
    Array.isArray(quote?.items) && quote.items.length
      ? quote.items.map(normalizeItem)
      : [createEmptyItem()],
  notes: quote?.notes || "",
  terms: quote?.terms || settings.defaults.paymentTerms,
  serialNumber: quote?.serialNumber || "",
  annexurePages: Array.isArray(quote?.annexurePages) ? quote.annexurePages : [],
  title: quote?.title || "Hydro Test Services",
  attnTo: quote?.attnTo || "",
  ref: quote?.ref || "",
  poNumber: quote?.poNumber || "",
  location: quote?.location || "",
  project: quote?.project || "",
  introParagraph:
    quote?.introParagraph ||
    "We are pleased to submit our quotation for the following services:",
  vatNote: quote?.vatNote || "15% VAT will be charged extra as per KSA regulations.",
  scopeOfWork:
    Array.isArray(quote?.scopeOfWork) && quote.scopeOfWork.length
      ? quote.scopeOfWork
      : [
          "Mobilization of test equipment and personnel to site",
          "Hydrostatic testing of piping/valves per approved procedure",
          "Documentation and certification of test results",
          "Demobilization and site cleanup",
        ],
  clientProvisions:
    Array.isArray(quote?.clientProvisions) && quote.clientProvisions.length
      ? quote.clientProvisions
      : [
          "Provide safe access to test location",
          "Supply test fluid (water) and power supply",
          "Provide isolation valves and blinds as required",
          "Designate site representative for coordination",
        ],
  closingNote:
    quote?.closingNote ||
    "We look forward to your favorable response and remain available for any clarifications.",
  statusTracking: quote?.statusTracking || "Draft",
  via: quote?.via || "Email",
  clientCode: quote?.clientCode || "",
  svc: quote?.svc || "Valve Test",
  dept: quote?.dept || "",
  spDept: quote?.spDept || "",
  showRm: quote?.showRm || false,
  signatureOption: quote?.signatureOption || "none",
  sub: quote?.sub || "",
  revised: quote?.revised || false,
  rateNote: quote?.rateNote || "",
  showTot: quote?.showTot || false,
  delivery: quote?.delivery || "",
  service: quote?.service || "",
  intro: quote?.intro || "",
  vat: VAT_RATE,
  closing: quote?.closing || "",
  sign: quote?.sign || false,
  isNew: quote?.isNew || false,
})

const clientFields: Array<{
  key: keyof Client
  label: string
  icon: LucideIcon
  required?: boolean
  type?: string
  multiline?: boolean
}> = [
  { key: "name", label: "Client Name", icon: User, required: true },
  { key: "company", label: "Company", icon: Building2 },
  { key: "contactPerson", label: "Contact Person", icon: User },
  { key: "email", label: "Email", icon: Mail, type: "email" },
  { key: "phone", label: "Phone", icon: Phone, type: "tel" },
  { key: "address", label: "Address", icon: MapPin, multiline: true },
  { key: "vatNumber", label: "VAT Number", icon: Hash, multiline: true },
]

export function QuoteEditor({ selectedQuoteId }: { selectedQuoteId?: string }) {
  const {
    quotations,
    settings,
    addQuotation,
    updateQuotation,
    deleteQuotation,
    addToast,
    nextQuoteNumber,
    setSelectedQuote,
  } = useStore()

  const quote = selectedQuoteId
    ? quotations.find((q) => q.id === selectedQuoteId) || null
    : null
  const isEditing = Boolean(quote)

  const [formData, setFormData] = useState<QuoteFormData>(() =>
    buildFormData(quote, settings, nextQuoteNumber())
  )

  const previousQuoteId = useRef(selectedQuoteId)

  useEffect(() => {
    // Skip the initial mount: state was already built from the selected quote.
    // This also prevents StrictMode's double effect from replacing line item ids.
    if (previousQuoteId.current === selectedQuoteId) return
    previousQuoteId.current = selectedQuoteId
    setFormData(buildFormData(quote, settings, nextQuoteNumber()))
    // The current quote object intentionally is not a dependency so saving does
    // not wipe in-progress UI state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedQuoteId])

  const [showImportDialog, setShowImportDialog] = useState(false)
  const [importType, setImportType] = useState<"quotation" | "lineItems">("quotation")
  const [importSources, setImportSources] = useState<ImportSource[]>([])
  const [importRows, setImportRows] = useState<Record<string, unknown>[]>([])
  const [importGroups, setImportGroups] = useState<ImportGroup[]>([])
  const [importWarnings, setImportWarnings] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importProgress, setImportProgress] = useState(0)
  const [importStatus, setImportStatus] = useState<
    "idle" | "reading" | "importing" | "mapping" | "complete" | "error"
  >("idle")
  const [importedData, setImportedData] = useState<{ headers: string[] } | null>(null)
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({})

  const totals = useMemo(() => computeTotals(formData.items), [formData.items])

  const addItem = () => {
    setFormData((prev) => ({ ...prev, items: [...prev.items, createEmptyItem()] }))
  }

  const removeItem = (id: string) => {
    setFormData((prev) => {
      if (prev.items.length <= 1) return prev
      return { ...prev, items: prev.items.filter((item) => item.id !== id) }
    })
  }

  const updateItem = (id: string, field: keyof QuotationItem, value: unknown) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.id !== id) return item
        const next = { ...item, [field]: value } as QuotationItem
        const quantity = field === "quantity" ? Number(value) || 0 : Number(next.quantity) || 0
        const rate = field === "rate" ? Number(value) || 0 : Number(next.rate) || 0
        return {
          ...next,
          quantity,
          rate,
          taxRate: VAT_RATE,
          amount: round2(quantity * rate),
          taxAmount: round2((quantity * rate * VAT_RATE) / 100),
        }
      }),
    }))
  }

  const moveItem = (index: number, direction: "up" | "down") => {
    setFormData((prev) => {
      const newItems = [...prev.items]
      const targetIndex = direction === "up" ? index - 1 : index + 1
      if (targetIndex < 0 || targetIndex >= newItems.length) return prev
      ;[newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]]
      return { ...prev, items: newItems }
    })
  }

  const validate = () => {
    if (!formData.client.name.trim()) {
      addToast({ type: "error", title: "Validation Error", message: "Client name is required" })
      return false
    }
    if (formData.items.length === 0) {
      addToast({ type: "error", title: "Validation Error", message: "Add at least one line item" })
      return false
    }
    if (formData.items.some((item) => !item.description.trim())) {
      addToast({ type: "error", title: "Validation Error", message: "All items must have a description" })
      return false
    }
    return true
  }

  const buildQuotePayload = (items: QuotationItem[]): Omit<Quotation, "id"> => {
    const itemTotals = computeTotals(items)
    return {
      ...formData,
      items,
      subtotal: itemTotals.subtotal,
      tax: itemTotals.tax,
      total: itemTotals.total,
      status: isEditing && quote ? quote.status : "draft",
      createdAt: quote?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  }

  const handleSave = () => {
    if (!validate()) return

    const items = formData.items.map(normalizeItem)
    const payload = buildQuotePayload(items)

    if (isEditing && quote) {
      updateQuotation(quote.id, payload)
      addToast({ type: "success", title: "Saved", message: "Quotation updated successfully" })
    } else {
      const id = generateId()
      addQuotation({ ...payload, id })
      setSelectedQuote(id)
      addToast({ type: "success", title: "Created", message: "New quotation created successfully" })
    }
  }

  const handleDelete = () => {
    if (!isEditing || !quote) return
    deleteQuotation(quote.id)
    setSelectedQuote(undefined)
    addToast({ type: "success", title: "Deleted", message: "Quotation removed" })
  }

  const handleDuplicate = () => {
    const items = formData.items.map((item) => ({ ...normalizeItem(item), id: generateId() }))
    const itemTotals = computeTotals(items)
    const id = generateId()
    const newQuote: Quotation = {
      ...formData,
      id,
      quoteNumber: nextQuoteNumber(),
      items,
      subtotal: itemTotals.subtotal,
      tax: itemTotals.tax,
      total: itemTotals.total,
      status: "draft",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      annexurePages: formData.annexurePages.map((page) => ({ ...page, id: generateId() })),
      isNew: true,
    }
    addQuotation(newQuote)
    setSelectedQuote(id)
    addToast({ type: "success", title: "Duplicated", message: "Quotation duplicated successfully" })
  }

  const exportableQuote = (): Quotation => {
    const now = new Date().toISOString()
    return {
      ...formData,
      id: quote?.id || generateId(),
      status: quote?.status || "draft",
      subtotal: totals.subtotal,
      tax: totals.tax,
      total: totals.total,
      createdAt: quote?.createdAt || now,
      updatedAt: now,
    } as Quotation
  }

  const handleExportPDF = async () => {
    if (!validate()) return
    addToast({ type: "info", title: "Exporting PDF", message: "Generating UIC PDF..." })
    try {
      await exportQuotationPdf(exportableQuote(), settings)
      addToast({ type: "success", title: "Exported", message: "PDF generated successfully" })
    } catch (err) {
      console.error("PDF export error:", err)
      addToast({ type: "error", title: "Export Failed", message: "Could not generate PDF. Please try again." })
    }
  }

  const handleExportExcel = async () => {
    if (!validate()) return
    addToast({ type: "info", title: "Exporting Excel", message: "Generating UIC Excel..." })
    try {
      await exportQuotationExcel(exportableQuote(), settings)
      addToast({ type: "success", title: "Exported", message: "Excel generated successfully" })
    } catch (err) {
      console.error("Excel export error:", err)
      addToast({ type: "error", title: "Export Failed", message: "Could not generate Excel. Please try again." })
    }
  }

  const loadImportSources = async (sources: ImportSource[]) => {
    if (sources.length === 0) return
    setImportSources(sources)
    setImportRows([])
    setImportGroups([])
    setImportWarnings([])
    setImportProgress(0)
    setImportStatus("reading")
    const result = await readImportSources(sources)
    if (result.rows.length === 0) {
      setImportWarnings(result.errors)
      setImportStatus("error")
      return
    }
    setImportRows(result.rows)
    setImportGroups(result.groups)
    setImportWarnings(result.errors)
    setImportedData({ headers: importedHeaderPreview(result.rows) })
    setColumnMapping({})
    setImportStatus("idle")
  }

  const handleElectronImportFile = async () => {
    const result = await window.electronAPI?.showOpenDialog({
      title: "Import Quotation Files",
      filters: [
        { name: "All Supported", extensions: ["json", "xlsx", "xls", "csv", "pdf"] },
        { name: "Excel", extensions: ["xlsx", "xls"] },
        { name: "CSV", extensions: ["csv"] },
        { name: "PDF", extensions: ["pdf"] },
        { name: "JSON", extensions: ["json"] },
      ],
      properties: ["openFile", "multiSelections"],
    })
    if (result?.canceled || !result?.filePaths?.length) return
    await loadImportSources(
      result.filePaths.map((filePath) => ({
        kind: "path" as const,
        path: String(filePath),
        name: String(filePath).split(/[\\/]/).pop() || String(filePath),
      })),
    )
  }

  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length > 0) {
      void loadImportSources(files.map((file) => ({ kind: "file" as const, file, name: file.name })))
    }
    event.target.value = ""
  }

  const importedItems = (): QuotationItem[] => {
    const result: QuotationItem[] = []
    importRows.forEach((row) => {
      const nested = Array.isArray(row.items) ? row.items : [row]
      nested.forEach((entry) => {
        if (typeof entry !== "object" || entry === null || Array.isArray(entry)) return
        const item = mapFlexibleItem(entry as Record<string, unknown>, result.length)
        if (item) result.push(normalizeItem(item))
      })
    })
    return result
  }

  const importFileHandler = async () => {
    if (importRows.length === 0) return
    try {
      setImportStatus("importing")
      setImportProgress(20)
      const items = importedItems()
      if (items.length === 0) throw new Error("No line items were found in the selected files")
      setImportProgress(60)

      const inferredName = importGroups[0]?.clientName
      if (importType === "quotation") {
        const head = normalizeImportedQuotation(importRows[0], { settings, clientName: inferredName })
        setFormData((prev) => ({
          ...prev,
          quoteNumber: head?.quoteNumber || prev.quoteNumber,
          date: head?.date || prev.date,
          client: head?.client
            ? {
                ...prev.client,
                ...head.client,
                name: prev.client.name && prev.client.name !== "Imported Client" ? prev.client.name : head.client.name,
              }
            : prev.client,
          notes: head?.notes || prev.notes,
          terms: head?.terms || prev.terms,
          ref: head?.ref || prev.ref,
          poNumber: head?.poNumber || prev.poNumber,
          attnTo: head?.attnTo || prev.attnTo,
          location: head?.location || prev.location,
          project: head?.project || prev.project,
          pdfHeading: head?.pdfHeading || prev.pdfHeading,
          signatureImage: head?.signatureImage || prev.signatureImage,
          items,
        }))
        addToast({ type: "success", title: "Imported", message: "Quotation loaded and ready to edit" })
      } else {
        setFormData((prev) => ({
          ...prev,
          client:
            !prev.client.name || prev.client.name === "Imported Client"
              ? { ...prev.client, name: inferredName || prev.client.name, company: inferredName || prev.client.company }
              : prev.client,
          items: [...prev.items, ...items],
        }))
        addToast({ type: "success", title: "Imported", message: `${items.length} line items imported` })
      }

      setImportProgress(100)
      setImportStatus("complete")
    } catch (err) {
      console.error("Import error:", err)
      setImportStatus("error")
      addToast({
        type: "error",
        title: "Import Failed",
        message: err instanceof Error ? err.message : "Could not import files. Please check format.",
      })
    }
  }

  const applyColumnMapping = async () => {
    if (importRows.length === 0) return
    try {
      setImportStatus("importing")
      setImportProgress(10)
      const mapped = importRows.map((row) => {
        const item: Partial<QuotationItem> = {}
        Object.entries(columnMapping).forEach(([header, target]) => {
          if (!target) return
          const value = row[header]
          if (target === "description") item.description = String(value ?? "")
          if (target === "quantity") item.quantity = Number(value) || 0
          if (target === "unit") item.unit = String(value ?? "PCS")
          if (target === "rate") item.rate = Number(value) || 0
          if (target === "sizeInch") item.sizeInch = String(value ?? "")
          if (target === "classRating") item.classRating = String(value ?? "")
          if (target === "remarks") item.remarks = String(value ?? "")
          if (target === "serialNo") item.serialNo = String(value ?? "")
        })
        return normalizeItem(item)
      })
      setFormData((prev) => ({ ...prev, items: [...prev.items, ...mapped] }))
      setImportProgress(100)
      setImportStatus("complete")
      addToast({ type: "success", title: "Imported", message: "Data imported with custom mapping" })
    } catch (err) {
      console.error("Mapping import error:", err)
      setImportStatus("error")
      addToast({ type: "error", title: "Import Failed", message: "Could not import with mapping" })
    }
  }

  return (
    <>
      <div className="h-full flex flex-col animate-in">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6"
        >
          <div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-text-primary to-text-secondary bg-clip-text text-transparent">
              {isEditing ? "Edit Quotation" : "New Quotation"}
            </h1>
            <p className="text-text-muted mt-1">
              {isEditing
                ? `Editing ${quote?.quoteNumber}`
                : "Create a new quotation for your client"}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleExportExcel}
              className="glass-hover px-4 py-2 rounded-xl font-medium flex items-center gap-2 text-text-secondary hover:text-text-primary"
              title="Export to Excel"
            >
              <Download className="w-4 h-4" />
              Excel
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleExportPDF}
              className="glass-hover px-4 py-2 rounded-xl font-medium flex items-center gap-2 text-text-secondary hover:text-text-primary"
              title="Export to PDF"
            >
              <FileText className="w-4 h-4" />
              PDF
            </motion.button>
            {isEditing && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleDuplicate}
                className="glass-hover px-4 py-2 rounded-xl font-medium flex items-center gap-2 text-text-secondary hover:text-secondary"
                title="Duplicate"
              >
                <Copy className="w-4 h-4" />
                Duplicate
              </motion.button>
            )}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowImportDialog(true)}
              className="glass-hover px-4 py-2 rounded-xl font-medium flex items-center gap-2 text-text-secondary hover:text-text-primary"
              title="Import a quotation or line items"
            >
              <Upload className="w-4 h-4" />
              Import
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleDelete}
              disabled={!isEditing}
              className="glass-hover px-4 py-2 rounded-xl font-medium flex items-center gap-2 text-text-secondary hover:text-error disabled:opacity-50 disabled:cursor-not-allowed"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSave}
              className="glass-hover px-4 py-2 rounded-xl font-medium flex items-center gap-2 bg-primary text-white hover:bg-primary-hover shadow-glow"
            >
              <Save className="w-4 h-4" />
              Save
            </motion.button>
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left Panel - Form */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:col-span-3 space-y-6"
            >
              {/* Client Details */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="glass-elevated rounded-2xl border border-border-subtle overflow-hidden"
              >
                <div className="p-5 border-b border-border-subtle flex items-center justify-between">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Client Details
                  </h2>
                  <span className="text-sm text-text-muted">
                    {isEditing ? "Editing existing client" : "New client"}
                  </span>
                </div>
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {clientFields.map((field) => (
                      <div
                        key={field.key}
                        className={`flex flex-col gap-1.5 ${
                          field.multiline ? "lg:col-span-3" : field.required ? "sm:col-span-2" : ""
                        }`}
                      >
                        <label className="flex items-center gap-1.5 text-sm font-medium text-text-secondary">
                          <field.icon className="w-4 h-4 text-text-muted" />
                          {field.label}
                          {field.required && <span className="text-error">*</span>}
                        </label>
                        {field.multiline ? (
                          <textarea
                            value={formData.client[field.key] || ""}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                client: { ...prev.client, [field.key]: e.target.value },
                              }))
                            }
                            className="glass-hover px-3 py-2.5 rounded-xl text-sm focus-ring border border-border-subtle bg-bg-secondary resize-none min-h-[80px]"
                            placeholder={`Enter ${field.label.toLowerCase()}`}
                          />
                        ) : (
                          <input
                            type={field.type || "text"}
                            value={formData.client[field.key] || ""}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                client: { ...prev.client, [field.key]: e.target.value },
                              }))
                            }
                            className="glass-hover px-3 py-2.5 rounded-xl text-sm focus-ring border border-border-subtle bg-bg-secondary"
                            placeholder={`Enter ${field.label.toLowerCase()}`}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.section>

              {/* Quote Details */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="glass-elevated rounded-2xl border border-border-subtle overflow-hidden"
              >
                <div className="p-5 border-b border-border-subtle flex items-center justify-between">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Quotation Details
                  </h2>
                  <span className="text-sm text-text-muted">
                    {formData.type === "valve" ? "Valve quotation" : "Standard quotation"}
                  </span>
                </div>
                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="flex items-center gap-1.5 text-sm font-medium text-text-secondary">
                      <Hash className="w-4 h-4 text-text-muted" />
                      Quote Number
                    </label>
                    <input
                      type="text"
                      value={formData.quoteNumber}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, quoteNumber: e.target.value }))
                      }
                      className="glass-hover px-3 py-2.5 rounded-xl text-sm focus-ring border border-border-subtle bg-bg-secondary font-mono"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="flex items-center gap-1.5 text-sm font-medium text-text-secondary">
                      <FileText className="w-4 h-4 text-text-muted" />
                      Date
                    </label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                      className="glass-hover px-3 py-2.5 rounded-xl text-sm focus-ring border border-border-subtle bg-bg-secondary"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="flex items-center gap-1.5 text-sm font-medium text-text-secondary">
                      <Settings className="w-4 h-4 text-text-muted" />
                      Type
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => {
                        const nextType = e.target.value as "standard" | "valve"
                        setFormData((prev) => ({
                          ...prev,
                          type: nextType,
                          pdfHeading:
                            prev.pdfHeading === HEADING_HYDRO || prev.pdfHeading === HEADING_INSPECTION || !prev.pdfHeading
                              ? defaultPdfHeading(nextType)
                              : prev.pdfHeading,
                        }))
                      }}
                      className="glass-hover px-3 py-2.5 rounded-xl text-sm focus-ring border border-border-subtle bg-bg-secondary"
                    >
                      <option value="standard">Standard</option>
                      <option value="valve">Valve</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="flex items-center gap-1.5 text-sm font-medium text-text-secondary">
                      <RotateCcw className="w-4 h-4 text-text-muted" />
                      Serial Number
                    </label>
                    <input
                      type="text"
                      value={formData.serialNumber}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, serialNumber: e.target.value }))
                      }
                      className="glass-hover px-3 py-2.5 rounded-xl text-sm focus-ring border border-border-subtle bg-bg-secondary"
                      placeholder="Optional"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="flex items-center gap-1.5 text-sm font-medium text-text-secondary">
                      <Landmark className="w-4 h-4 text-text-muted" />
                      PO Number
                    </label>
                    <input
                      type="text"
                      value={formData.poNumber}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, poNumber: e.target.value }))
                      }
                      className="glass-hover px-3 py-2.5 rounded-xl text-sm focus-ring border border-border-subtle bg-bg-secondary"
                      placeholder="Customer PO number"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="flex items-center gap-1.5 text-sm font-medium text-text-secondary">
                      <Hash className="w-4 h-4 text-text-muted" />
                      Reference
                    </label>
                    <input
                      type="text"
                      value={formData.ref}
                      onChange={(e) => setFormData((prev) => ({ ...prev, ref: e.target.value }))}
                      className="glass-hover px-3 py-2.5 rounded-xl text-sm focus-ring border border-border-subtle bg-bg-secondary"
                      placeholder="Reference / enquiry no."
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="flex items-center gap-1.5 text-sm font-medium text-text-secondary">
                      <User className="w-4 h-4 text-text-muted" />
                      Attn To
                    </label>
                    <input
                      type="text"
                      value={formData.attnTo}
                      onChange={(e) => setFormData((prev) => ({ ...prev, attnTo: e.target.value }))}
                      className="glass-hover px-3 py-2.5 rounded-xl text-sm focus-ring border border-border-subtle bg-bg-secondary"
                      placeholder="Contact person"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="flex items-center gap-1.5 text-sm font-medium text-text-secondary">
                      <Building2 className="w-4 h-4 text-text-muted" />
                      Project
                    </label>
                    <input
                      type="text"
                      value={formData.project}
                      onChange={(e) => setFormData((prev) => ({ ...prev, project: e.target.value }))}
                      className="glass-hover px-3 py-2.5 rounded-xl text-sm focus-ring border border-border-subtle bg-bg-secondary"
                      placeholder="Project name"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 lg:col-span-2">
                    <label className="flex items-center gap-1.5 text-sm font-medium text-text-secondary">
                      <MapPin className="w-4 h-4 text-text-muted" />
                      Location
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, location: e.target.value }))
                      }
                      className="glass-hover px-3 py-2.5 rounded-xl text-sm focus-ring border border-border-subtle bg-bg-secondary"
                      placeholder="Site / delivery location"
                    />
                  </div>
                </div>
              </motion.section>

              {/* PDF Heading */}
              <CollapsibleSection
                title="PDF Heading"
                icon={<FileText className="w-4 h-4" />}
                summary={formData.pdfHeading || "Heading used on exported documents"}
              >
                <div className="flex items-center gap-2 flex-wrap mb-3">
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, pdfHeading: HEADING_INSPECTION }))}
                      className={`glass-hover px-3 py-1.5 rounded-lg text-xs font-medium ${
                        formData.pdfHeading === HEADING_INSPECTION ? 'text-primary border border-primary/40' : 'text-text-secondary'
                      }`}
                    >
                      Inspection Services
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, pdfHeading: HEADING_HYDRO }))}
                      className={`glass-hover px-3 py-1.5 rounded-lg text-xs font-medium ${
                        formData.pdfHeading === HEADING_HYDRO ? 'text-primary border border-primary/40' : 'text-text-secondary'
                      }`}
                    >
                      Hydro Test Services
                    </button>
                  </div>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={formData.pdfHeading}
                    onChange={(e) => setFormData((prev) => ({ ...prev, pdfHeading: e.target.value }))}
                    className="w-full glass-hover px-3 py-2.5 rounded-xl text-sm focus-ring border border-border-subtle bg-bg-secondary font-semibold"
                    placeholder="QUOTATION FOR THE HYDRO TEST SERVICES"
                    aria-label="PDF Heading"
                  />
                </div>
              </CollapsibleSection>

              {/* Line Items */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="glass-elevated rounded-2xl border border-border-subtle overflow-hidden"
              >
                <div className="p-5 border-b border-border-subtle flex items-center justify-between">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <FilePlus className="w-5 h-5" />
                    Line Items
                  </h2>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={addItem}
                    className="glass-hover px-3 py-1.5 rounded-xl text-sm font-medium flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    Add Item
                  </motion.button>
                </div>
                <div className="p-5">
                  <div className="overflow-x-auto">
                    <table className="w-full table-auto" role="grid">
                      <thead>
                        <tr className="border-b border-border-subtle bg-bg-secondary/50">
                          <th className="w-[40px] px-2 py-3 text-center text-xs font-medium text-text-secondary">#</th>
                          <th className="w-0 flex-1 min-w-[220px] px-3 py-3 text-left text-xs font-medium text-text-secondary">Description</th>
                          <th className="w-[90px] px-2 py-3 text-center text-xs font-medium text-text-secondary">Size (Inch)</th>
                          <th className="w-[90px] px-2 py-3 text-center text-xs font-medium text-text-secondary">Class Rating</th>
                          <th className="w-[70px] px-2 py-3 text-center text-xs font-medium text-text-secondary">Qty</th>
                          <th className="w-[80px] px-2 py-3 text-center text-xs font-medium text-text-secondary">Unit</th>
                          <th className="w-[100px] px-2 py-3 text-right text-xs font-medium text-text-secondary">Rate (SAR)</th>
                          <th className="w-[110px] px-2 py-3 text-right text-xs font-medium text-text-secondary">Amount (SAR)</th>
                          <th className="w-0 flex-1 min-w-[160px] px-3 py-3 text-left text-xs font-medium text-text-secondary">Remarks</th>
                          <th className="w-[40px] px-2 py-3 text-center text-xs font-medium text-text-secondary">
                            <GripVertical className="w-3 h-3 mx-auto text-text-muted" />
                          </th>
                          <th className="w-[40px] px-2 py-3 text-center text-xs font-medium text-text-secondary"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-subtle">
                        <AnimatePresence mode="popLayout">
                          {formData.items.map((item, index) => (
                            <motion.tr
                              key={item.id}
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 10 }}
                              transition={{ delay: index * 0.03 }}
                              className="hover:bg-bg-secondary transition-colors"
                            >
                              <td className="px-2 py-3 text-center text-xs font-mono text-text-muted">
                                {index + 1}
                              </td>
                              <td className="px-3 py-3">
                                <input
                                  type="text"
                                  value={item.description || ""}
                                  onChange={(e) => updateItem(item.id, "description", e.target.value)}
                                  className="w-full glass-hover px-2 py-1.5 rounded-lg text-sm focus-ring border border-border-subtle bg-bg-secondary"
                                  placeholder="Enter description..."
                                />
                              </td>
                              <td className="px-2 py-3">
                                <input
                                  type="text"
                                  value={item.sizeInch || ""}
                                  onChange={(e) => updateItem(item.id, "sizeInch", e.target.value)}
                                  className="w-full glass-hover px-1.5 py-1 rounded-lg text-xs text-center focus-ring border border-border-subtle bg-bg-secondary"
                                  placeholder='e.g., 2"'
                                />
                              </td>
                              <td className="px-2 py-3">
                                <input
                                  type="text"
                                  value={item.classRating || ""}
                                  onChange={(e) => updateItem(item.id, "classRating", e.target.value)}
                                  className="w-full glass-hover px-1.5 py-1 rounded-lg text-xs text-center focus-ring border border-border-subtle bg-bg-secondary"
                                  placeholder="e.g., 150"
                                />
                              </td>
                              <td className="px-2 py-3">
                                <input
                                  type="number"
                                  value={item.quantity ?? 0}
                                  onChange={(e) => updateItem(item.id, "quantity", Number(e.target.value))}
                                  min="0"
                                  step="any"
                                  className="w-full glass-hover px-1.5 py-1 rounded-lg text-xs text-center focus-ring border border-border-subtle bg-bg-secondary"
                                />
                              </td>
                              <td className="px-2 py-3">
                                <select
                                  value={item.unit || "PCS"}
                                  onChange={(e) => updateItem(item.id, "unit", e.target.value)}
                                  className="w-full glass-hover px-1.5 py-1 rounded-lg text-xs focus-ring border border-border-subtle bg-bg-secondary"
                                >
                                  {UNITS.map((unit) => (
                                    <option key={unit} value={unit}>
                                      {unit}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-2 py-3">
                                <input
                                  type="number"
                                  value={item.rate ?? 0}
                                  onChange={(e) => updateItem(item.id, "rate", Number(e.target.value))}
                                  min="0"
                                  step="0.01"
                                  className="w-full glass-hover px-1.5 py-1 rounded-lg text-xs text-right focus-ring border border-border-subtle bg-bg-secondary font-mono"
                                />
                              </td>
                              <td className="px-2 py-3 text-right font-mono font-medium text-text-primary">
                                {formatNumber(item.amount || 0)}
                              </td>
                              <td className="px-3 py-3">
                                <input
                                  type="text"
                                  value={item.remarks || ""}
                                  onChange={(e) => updateItem(item.id, "remarks", e.target.value)}
                                  className="w-full glass-hover px-2 py-1.5 rounded-lg text-sm focus-ring border border-border-subtle bg-bg-secondary"
                                  placeholder="Remarks..."
                                />
                              </td>
                              <td className="px-2 py-3 text-center">
                                <div className="flex items-center justify-center gap-0.5">
                                  <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => moveItem(index, "up")}
                                    disabled={index === 0}
                                    className="glass-hover p-1 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed text-text-muted hover:text-primary focus-ring"
                                    aria-label="Move up"
                                  >
                                    <ChevronUp className="w-3 h-3" />
                                  </motion.button>
                                  <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => moveItem(index, "down")}
                                    disabled={index === formData.items.length - 1}
                                    className="glass-hover p-1 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed text-text-muted hover:text-primary focus-ring"
                                    aria-label="Move down"
                                  >
                                    <ChevronDown className="w-3 h-3" />
                                  </motion.button>
                                </div>
                              </td>
                              <td className="px-2 py-3 text-center">
                                {formData.items.length > 1 && (
                                  <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => removeItem(item.id)}
                                    className="glass-hover p-1 rounded-lg text-text-muted hover:text-error hover:bg-error/10 focus-ring"
                                    aria-label="Remove item"
                                  >
                                    <X className="w-3 h-3" />
                                  </motion.button>
                                )}
                              </td>
                            </motion.tr>
                          ))}
                        </AnimatePresence>
                        {formData.items.length === 0 && (
                          <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <td colSpan={11} className="px-4 py-12 text-center">
                              <FileText className="w-12 h-12 mx-auto text-text-muted/50 mb-4" />
                              <h3 className="text-lg font-medium text-text-secondary mb-1">No items yet</h3>
                              <p className="text-text-muted mb-4">Add your first line item to get started</p>
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={addItem}
                                className="glass-hover px-6 py-2 rounded-xl font-medium inline-flex items-center gap-2"
                              >
                                <Plus className="w-4 h-4" />
                                Add Item
                              </motion.button>
                            </td>
                          </motion.tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.section>

              {/* Notes & Terms */}
              <CollapsibleSection
                title="Notes & Terms"
                icon={<FileText className="w-4 h-4" />}
                summary="Client notes and payment terms"
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-text-secondary">Notes</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                      rows={4}
                      className="glass-hover px-3 py-2.5 rounded-xl text-sm focus-ring border border-border-subtle bg-bg-secondary resize-none"
                      placeholder="Additional notes for the client..."
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-text-secondary">Payment Terms</label>
                    <textarea
                      value={formData.terms}
                      onChange={(e) => setFormData((prev) => ({ ...prev, terms: e.target.value }))}
                      rows={4}
                      className="glass-hover px-3 py-2.5 rounded-xl text-sm focus-ring border border-border-subtle bg-bg-secondary resize-none"
                      placeholder="Payment terms and conditions..."
                    />
                  </div>
                </div>
              </CollapsibleSection>

              {/* Signature & Options */}
              <CollapsibleSection
                title="Signature & Options"
                icon={<PenLine className="w-4 h-4" />}
                summary={`${formData.signatureOption === "none" ? "No signature" : formData.signatureOption} · ${settings.signature.name}`}
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-text-secondary">Signature Option</label>
                    <select
                      value={formData.signatureOption}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          signatureOption: e.target.value as Quotation["signatureOption"],
                        }))
                      }
                      className="glass-hover px-3 py-2.5 rounded-xl text-sm focus-ring border border-border-subtle bg-bg-secondary"
                    >
                      <option value="none">No signature</option>
                      <option value="digital">Digital signature</option>
                      <option value="handwritten">Handwritten signature</option>
                    </select>
                  </div>
                  <div className="flex flex-col justify-end gap-2">
                    <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.sign}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, sign: e.target.checked }))
                        }
                        className="w-4 h-4 rounded border-border-default text-primary focus:ring-primary"
                      />
                      Attach signature block
                    </label>
                    <p className="text-xs text-text-muted">
                      {settings.signature.name} — {settings.signature.designation}
                    </p>
                  </div>
                  <div className="lg:col-span-2">
                    <SignaturePad
                      value={formData.signatureImage}
                      onChange={(dataUrl) => setFormData((prev) => ({ ...prev, signatureImage: dataUrl }))}
                      label="Quotation Signature"
                    />
                    <p className="text-xs text-text-muted mt-2">
                      Leave empty to use the signature saved in Settings. Uploaded images are stored as base64 on this quotation.
                    </p>
                  </div>
                </div>
              </CollapsibleSection>

              {/* Annexure Pages */}
              <CollapsibleSection
                title="Annexure Pages"
                icon={<FilePlus className="w-4 h-4" />}
                summary={`${formData.annexurePages.length} page${formData.annexurePages.length === 1 ? '' : 's'} attached`}
              >
                <div className="flex justify-end mb-3">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        annexurePages: [
                          ...prev.annexurePages,
                          { id: generateId(), title: "", content: "", order: prev.annexurePages.length },
                        ],
                      }))
                    }
                    className="glass-hover px-3 py-1.5 rounded-xl text-sm font-medium flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    Add Page
                  </button>
                </div>
                <div className="space-y-4">
                  {formData.annexurePages.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="w-12 h-12 mx-auto text-text-muted/50 mb-4" />
                      <h3 className="text-lg font-medium text-text-secondary mb-1">No annexure pages</h3>
                      <p className="text-text-muted mb-4">Add annexure pages for additional documentation</p>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            annexurePages: [
                              ...prev.annexurePages,
                              { id: generateId(), title: "", content: "", order: prev.annexurePages.length },
                            ],
                          }))
                        }
                        className="glass-hover px-6 py-2 rounded-xl font-medium inline-flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add Page
                      </motion.button>
                    </div>
                  ) : (
                    formData.annexurePages.map((page, index) => (
                      <motion.div
                        key={page.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="glass-hover p-4 rounded-xl border border-border-subtle"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg flex-shrink-0">
                            {index + 1}
                          </div>
                          <div className="flex-1 space-y-3 min-w-0">
                            <input
                              type="text"
                              value={page.title}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  annexurePages: prev.annexurePages.map((p, i) =>
                                    i === index ? { ...p, title: e.target.value } : p
                                  ),
                                }))
                              }
                              className="w-full glass-hover px-3 py-2 rounded-lg text-sm focus-ring border border-border-subtle bg-bg-secondary"
                              placeholder="Page title..."
                            />
                            <textarea
                              value={page.content}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  annexurePages: prev.annexurePages.map((p, i) =>
                                    i === index ? { ...p, content: e.target.value } : p
                                  ),
                                }))
                              }
                              rows={3}
                              className="w-full glass-hover px-3 py-2 rounded-lg text-sm focus-ring border border-border-subtle bg-bg-secondary resize-none"
                              placeholder="Page content..."
                            />
                          </div>
                          {formData.annexurePages.length > 1 && (
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() =>
                                setFormData((prev) => ({
                                  ...prev,
                                  annexurePages: prev.annexurePages.filter((_, i) => i !== index),
                                }))
                              }
                              className="glass-hover p-2 rounded-lg text-text-muted hover:text-error hover:bg-error/10 focus-ring flex-shrink-0 self-start"
                              aria-label="Remove page"
                            >
                              <Trash2 className="w-5 h-5" />
                            </motion.button>
                          )}
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </CollapsibleSection>
            </motion.div>

            {/* Right Panel - Totals */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="lg:col-span-1"
            >
              <div className="sticky top-6 space-y-6">
                {/* Totals Card */}
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-elevated rounded-2xl border border-border-subtle overflow-hidden"
                >
                  <div className="p-5 border-b border-border-subtle">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <DollarSign className="w-5 h-5" />
                      Totals
                    </h2>
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-text-secondary">Subtotal</span>
                        <span className="font-mono font-semibold text-text-primary">
                          {formatCurrency(totals.subtotal, CURRENCY)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-text-secondary">VAT ({VAT_RATE}%)</span>
                        <span className="font-mono font-semibold text-text-primary">
                          {formatCurrency(totals.tax, CURRENCY)}
                        </span>
                      </div>
                      <div className="pt-3 border-t border-border-subtle flex items-center justify-between">
                        <span className="text-lg font-bold text-text-primary">Net Total</span>
                        <span className="text-lg font-bold font-mono bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                          {formatCurrency(totals.total, CURRENCY)}
                        </span>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-border-subtle space-y-2 text-sm text-text-muted">
                      <p className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-success" />
                        {formData.items.length} line item{formData.items.length !== 1 ? "s" : ""}
                      </p>
                      <p className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-success" />
                        Client: {formData.client.name || "Not set"}
                      </p>
                      <p className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-success" />
                        Quote: {formData.quoteNumber}
                      </p>
                      <p className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-success" />
                        Date: {formatDate(formData.date)}
                      </p>
                      <p className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-success" />
                        Currency: {CURRENCY}
                      </p>
                    </div>

                    {formData.items.some((item) => !item.description.trim()) && (
                      <div className="p-3 rounded-lg bg-warning/10 border border-warning/30 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-warning flex-shrink-0" />
                        <span className="text-sm text-warning">Some items are missing descriptions</span>
                      </div>
                    )}
                    {!formData.client.name.trim() && (
                      <div className="p-3 rounded-lg bg-error/10 border border-error/30 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-error flex-shrink-0" />
                        <span className="text-sm text-error">Client name is required</span>
                      </div>
                    )}
                  </div>
                </motion.section>

              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.csv,.txt,.xlsx,.xls,.pdf"
        multiple
        onChange={handleFileInput}
        className="hidden"
        aria-label="Choose quotation import files"
      />

      {/* Import Dialog */}
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
            aria-label={importType === "quotation" ? "Import Quotation" : "Import Line Items"}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="glass-elevated w-full max-w-2xl rounded-2xl shadow-elevated border border-border-default overflow-hidden max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-border-subtle flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  {importType === "quotation" ? "Import Quotation" : "Import Line Items"}
                </h3>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    setShowImportDialog(false)
                    setImportSources([])
                    setImportRows([])
                    setImportWarnings([])
                    setImportedData(null)
                    setColumnMapping({})
                    setImportProgress(0)
                    setImportStatus("idle")
                  }}
                  className="glass-hover p-2 rounded-xl focus-ring"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>
              <div className="px-6 pt-4 flex gap-2">
                {(["quotation", "lineItems"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setImportType(mode)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                      importType === mode
                        ? "border-primary/40 text-primary bg-primary/10"
                        : "border-border-subtle text-text-muted hover:text-text-primary"
                    }`}
                  >
                    {mode === "quotation" ? "Import as quotation" : "Add line items"}
                  </button>
                ))}
              </div>

              <div className="p-6 pt-4 overflow-y-auto flex-1">
                {importStatus === "reading" ? (
                  <div className="text-center py-12">
                    <Loader2 className="w-10 h-10 mx-auto text-primary animate-spin mb-4" />
                    <p className="font-medium text-text-primary">Reading files...</p>
                    <p className="text-sm text-text-muted mt-1">
                      {importSources.map((source) => source.name).join(", ")}
                    </p>
                  </div>
                ) : importSources.length === 0 ? (
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
                            void loadImportSources(files.map((file) => ({ kind: "file" as const, file, name: file.name })))
                          }
                        }}
                      >
                        <Upload className="w-12 h-12 mx-auto text-text-muted mb-4" />
                        <p className="text-text-secondary mb-2">Select multiple files or drop them here</p>
                        <p className="text-xs text-text-muted">
                          Supports JSON, CSV, Excel (.xlsx/.xls) and PDF · headers auto-detected on any row
                        </p>
                      </div>
                    </div>
                  </div>
                ) : importStatus === "idle" ? (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 glass-hover rounded-xl">
                      <div className="flex items-center gap-3">
                        <FileText className="w-8 h-8 text-primary" />
                        <div>
                          <p className="font-medium text-text-primary">
                            {importSources.map((source) => source.name).join(", ")}
                          </p>
                          <p className="text-xs text-text-muted">
                            {importRows.length} row(s) · {importType === "quotation" ? "Quotation" : "Line Items"} ·{' '}
                            {importedData?.headers?.slice(0, 8).join(", ") || "no columns"}
                          </p>
                          {importWarnings.length > 0 && (
                            <p className="text-xs text-warning mt-1">{importWarnings.join(" · ")}</p>
                          )}
                        </div>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setImportSources([])
                          setImportRows([])
                          setImportWarnings([])
                          setImportedData(null)
                          setColumnMapping({})
                          setImportProgress(0)
                          setImportStatus("idle")
                        }}
                        className="glass-hover px-3 py-1.5 rounded-lg text-sm text-text-secondary hover:text-error"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Remove
                      </motion.button>
                    </div>
                    <div>
                      <h4 className="font-medium text-text-primary mb-3">Choose Import Method</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={async () => {
                            setImportStatus("importing")
                            setImportProgress(0)
                            await importFileHandler()
                          }}
                          className="glass-hover p-4 rounded-xl border-2 border-border-subtle hover:border-primary/50 transition-colors"
                        >
                          <Loader2 className="w-6 h-6 mx-auto text-primary mb-2" />
                          <p className="font-medium text-text-primary">Auto Import</p>
                          <p className="text-xs text-text-muted mt-1">Auto-detect and import</p>
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setImportStatus("mapping")}
                          className="glass-hover p-4 rounded-xl border-2 border-border-subtle hover:border-secondary/50 transition-colors"
                        >
                          <FileInput className="w-6 h-6 mx-auto text-secondary mb-2" />
                          <p className="font-medium text-text-primary">Manual Mapping</p>
                          <p className="text-xs text-text-muted mt-1">Choose column mappings</p>
                        </motion.button>
                      </div>
                    </div>
                  </div>
                ) : importStatus === "importing" ? (
                  <div className="space-y-4 text-center">
                    <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin" />
                    <p className="font-medium text-text-primary">Importing {importType}...</p>
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
                ) : importStatus === "mapping" ? (
                  <div className="space-y-6">
                    <h4 className="font-medium text-text-primary">Map Columns</h4>
                    <p className="text-sm text-text-muted">Match file columns to quotation fields</p>
                    <div
                      className="grid gap-4"
                      style={{ gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))" }}
                    >
                      {importedData?.headers?.map((header) => (
                        <div key={header} className="glass-hover p-4 rounded-xl">
                          <p className="font-medium text-text-primary mb-2">{header}</p>
                          <select
                            value={columnMapping[header] || ""}
                            onChange={(e) =>
                              setColumnMapping((prev) => ({ ...prev, [header]: e.target.value }))
                            }
                            className="w-full glass-hover px-3 py-2 rounded-lg text-sm focus-ring bg-transparent border-none"
                          >
                            <option value="">-- Skip --</option>
                            <option value="description">Description</option>
                            <option value="quantity">Quantity</option>
                            <option value="unit">Unit</option>
                            <option value="rate">Rate</option>
                            <option value="sizeInch">Size (Inch)</option>
                            <option value="classRating">Class Rating</option>
                            <option value="remarks">Remarks</option>
                            <option value="serialNo">Serial No</option>
                          </select>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-3">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={applyColumnMapping}
                        className="flex-1 glass-hover px-4 py-3 rounded-xl font-medium flex items-center justify-center gap-2 bg-primary text-white hover:bg-primary-hover"
                      >
                        <Loader2 className="w-5 h-5" />
                        Import Mapped Data
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setImportStatus("idle")}
                        className="flex-1 glass-hover px-4 py-3 rounded-xl font-medium flex items-center justify-center gap-2 text-text-secondary hover:text-text-primary"
                      >
                        Back
                      </motion.button>
                    </div>
                  </div>
                ) : importStatus === "complete" ? (
                  <div className="space-y-4 text-center">
                    <CheckCircle className="w-16 h-16 mx-auto text-success" />
                    <p className="font-medium text-text-primary">Import Complete!</p>
                    <p className="text-sm text-text-muted">
                      {importType === "quotation" ? "Quotation" : "Line items"} imported successfully
                    </p>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setShowImportDialog(false)
                        setImportSources([])
                        setImportRows([])
                        setImportWarnings([])
                        setImportedData(null)
                        setColumnMapping({})
                        setImportProgress(0)
                        setImportStatus("idle")
                      }}
                      className="w-full glass-hover px-4 py-3 rounded-xl font-medium flex items-center justify-center gap-2 bg-primary text-white hover:bg-primary-hover"
                    >
                      Done
                    </motion.button>
                  </div>
                ) : importStatus === "error" ? (
                  <div className="space-y-4 text-center">
                    <AlertCircle className="w-16 h-16 mx-auto text-error" />
                    <p className="font-medium text-text-primary">Import Failed</p>
                    <p className="text-sm text-text-muted">
                      {importWarnings.join(" · ") || "An error occurred during import"}
                    </p>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setImportStatus("idle")}
                      className="w-full glass-hover px-4 py-3 rounded-xl font-medium flex items-center justify-center gap-2 text-error hover:bg-error/10 hover:border-error/30"
                    >
                      Try Again
                    </motion.button>
                  </div>
                ) : null}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
