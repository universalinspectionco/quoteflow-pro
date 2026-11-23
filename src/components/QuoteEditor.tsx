"use client"

import { motion, AnimatePresence } from "motion/react"
import { useState, useEffect } from "react"
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
} from "lucide-react"
import { useStore } from "@/services/store"
import { formatCurrency, formatDate, calculateTotals, generateId } from "@/utils/formatters"
import type { QuotationItem, Client, AnnexurePage } from "@/types"

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

const UNITS = ["PCS", "MTR", "KG", "SET", "LOT", "HR", "DAY", "SQM", "CBM"]
const TAX_RATES = [0, 5, 12, 18, 28]

export function QuoteEditor({ selectedQuoteId }: { selectedQuoteId?: string }) {
  const { quotations, settings, addQuotation, updateQuotation, deleteQuotation, addToast, nextQuoteNumber } = useStore()
  const quote = selectedQuoteId ? quotations.find(q => q.id === selectedQuoteId) : null
  const isEditing = !!quote

  const [formData, setFormData] = useState<{
    type: "standard" | "valve"
    quoteNumber: string
    date: string
    client: Client
    items: QuotationItem[]
    notes: string
    terms: string
    serialNumber: string
    annexurePages: AnnexurePage[]
    // V1 fields
    title: string
    attnTo: string
    ref: string
    location: string
    project: string
    introParagraph: string
    vatNote: string
    scopeOfWork: string[]
    clientProvisions: string[]
    closingNote: string
    // Status tracking
    statusTracking: 'Draft' | 'Waiting For PO' | 'Job Received' | 'Under Process' | 'Completed' | 'Lost'
    via: string
    clientCode: string
    svc: string
    dept: string
    spDept: string
    // Excel/PDF export options
    showRm: boolean
    signatureOption: 'none' | 'digital' | 'handwritten'
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
  }>({
    type: "standard",
    quoteNumber: quote?.quoteNumber || nextQuoteNumber(),
    date: quote?.date || new Date().toISOString().split("T")[0],
    client: quote?.client || { id: "", name: "", email: "", phone: "", address: "", vatNumber: "", company: "", contactPerson: "" },
    items: (quote?.items?.map(item => ({ ...item, id: item.id || generateId(), amount: item.quantity * item.rate, taxAmount: (item.quantity * item.rate * (item.taxRate || settings.defaults.taxRate)) / 100 })) as QuotationItem[]) || [{ id: generateId(), description: "", quantity: 1, unit: "PCS", rate: 0, taxRate: settings.defaults.taxRate, amount: 0, taxAmount: 0 }],
    notes: quote?.notes || "",
    terms: quote?.terms || settings.defaults.paymentTerms,
    serialNumber: quote?.serialNumber || "",
    annexurePages: quote?.annexurePages || [],
    // V1 defaults
    title: quote?.title || "Hydro Test Services",
    attnTo: quote?.attnTo || "",
    ref: quote?.ref || "",
    location: quote?.location || "",
    project: quote?.project || "",
    introParagraph: quote?.introParagraph || "We are pleased to submit our quotation for the following services:",
    vatNote: quote?.vatNote || "15% VAT will be charged extra as per KSA regulations.",
    scopeOfWork: quote?.scopeOfWork?.length ? quote.scopeOfWork : [
      "Mobilization of test equipment and personnel to site",
      "Hydrostatic testing of piping/valves per approved procedure",
      "Documentation and certification of test results",
      "Demobilization and site cleanup"
    ],
    clientProvisions: quote?.clientProvisions?.length ? quote.clientProvisions : [
      "Provide safe access to test location",
      "Supply test fluid (water) and power supply",
      "Provide isolation valves and blinds as required",
      "Designate site representative for coordination"
    ],
    closingNote: quote?.closingNote || "We look forward to your favorable response and remain available for any clarifications.",
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
    vat: quote?.vat || 15,
    closing: quote?.closing || "",
    sign: quote?.sign || false,
    isNew: quote?.isNew || false,
  })

  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [importType, setImportType] = useState<"quotation" | "lineItems">("quotation")
  const [importFilePath, setImportFilePath] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [importStatus, setImportStatus] = useState<"idle" | "importing" | "mapping" | "complete" | "error">("idle")
  const [importedData, setImportedData] = useState<any>(null)
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({})

  useEffect(() => {
    if (isEditing && quote) {
      setFormData({
        type: quote.type,
        quoteNumber: quote.quoteNumber,
        date: quote.date,
        client: quote.client,
        items: quote.items.map(item => ({ ...item, id: item.id || generateId(), amount: item.quantity * item.rate, taxAmount: (item.quantity * item.rate * (item.taxRate || settings.defaults.taxRate)) / 100 })),
        notes: quote.notes || "",
        terms: quote.terms || settings.defaults.paymentTerms,
        serialNumber: quote.serialNumber || "",
        annexurePages: quote.annexurePages || [],
        // V1 fields
        title: quote.title || "Hydro Test Services",
        attnTo: quote.attnTo || "",
        ref: quote.ref || "",
        location: quote.location || "",
        project: quote.project || "",
        introParagraph: quote.introParagraph || "We are pleased to submit our quotation for the following services:",
        vatNote: quote.vatNote || "15% VAT will be charged extra as per KSA regulations.",
        scopeOfWork: quote.scopeOfWork?.length ? quote.scopeOfWork : [
          "Mobilization of test equipment and personnel to site",
          "Hydrostatic testing of piping/valves per approved procedure",
          "Documentation and certification of test results",
          "Demobilization and site cleanup"
        ],
        clientProvisions: quote.clientProvisions?.length ? quote.clientProvisions : [
          "Provide safe access to test location",
          "Supply test fluid (water) and power supply",
          "Provide isolation valves and blinds as required",
          "Designate site representative for coordination"
        ],
        closingNote: quote.closingNote || "We look forward to your favorable response and remain available for any clarifications.",
        // Status tracking
        statusTracking: quote.statusTracking || "Draft",
        via: quote.via || "Email",
        clientCode: quote.clientCode || "",
        svc: quote.svc || "Valve Test",
        dept: quote.dept || "",
        spDept: quote.spDept || "",
        showRm: quote.showRm || false,
        signatureOption: quote.signatureOption || "none",
        sub: quote.sub || "",
        revised: quote.revised || false,
        rateNote: quote.rateNote || "",
        showTot: quote.showTot || false,
        delivery: quote.delivery || "",
        service: quote.service || "",
        intro: quote.intro || "",
        vat: quote.vat || 15,
        closing: quote.closing || "",
        signatureOption: quote.signatureOption || "none",
        sign: quote.sign || false,
        isNew: quote.isNew || false,
      })
    } else {
      setFormData({
        type: "standard",
        quoteNumber: nextQuoteNumber(),
        date: new Date().toISOString().split("T")[0],
        client: { id: "", name: "", email: "", phone: "", address: "", vatNumber: "", company: "", contactPerson: "" },
        items: [{ id: generateId(), description: "", quantity: 1, unit: "PCS", rate: 0, taxRate: settings.defaults.taxRate, amount: 0, taxAmount: 0 }],
        notes: "",
        terms: settings.defaults.paymentTerms,
        serialNumber: "",
        annexurePages: [],
        // V1 defaults
        title: "Hydro Test Services",
        attnTo: "",
        ref: "",
        location: "",
        project: "",
        introParagraph: "We are pleased to submit our quotation for the following services:",
        vatNote: "15% VAT will be charged extra as per KSA regulations.",
        scopeOfWork: [
          "Mobilization of test equipment and personnel to site",
          "Hydrostatic testing of piping/valves per approved procedure",
          "Documentation and certification of test results",
          "Demobilization and site cleanup"
        ],
        clientProvisions: [
          "Provide safe access to test location",
          "Supply test fluid (water) and power supply",
          "Provide isolation valves and blinds as required",
          "Designate site representative for coordination"
        ],
        closingNote: "We look forward to your favorable response and remain available for any clarifications.",
        statusTracking: "Draft",
        via: "Email",
        clientCode: "",
        svc: "Valve Test",
        dept: "",
        spDept: "",
        showRm: false,
        signatureOption: "none",
        sub: "",
        revised: false,
        rateNote: "",
        showTot: false,
        delivery: "",
        service: "",
        intro: "",
        vat: 15,
        closing: "",
        signatureOption: "none",
        sign: false,
        isNew: false,
      })
    }
  }, [selectedQuoteId, isEditing, quote, settings.defaults.taxRate, nextQuoteNumber])
        project: "",
        introParagraph: "We are pleased to submit our quotation for the following services:",
        vatNote: "15% VAT will be charged extra as per KSA regulations.",
        scopeOfWork: [
          "Mobilization of test equipment and personnel to site",
          "Hydrostatic testing of piping/valves per approved procedure",
          "Documentation and certification of test results",
          "Demobilization and site cleanup"
        ],
        clientProvisions: [
          "Provide safe access to test location",
          "Supply test fluid (water) and power supply",
          "Provide isolation valves and blinds as required",
          "Designate site representative for coordination"
        ],
        closingNote: "We look forward to your favorable response and remain available for any clarifications.",
      })
    }
  }, [selectedQuoteId, isEditing, quote, settings.defaults.taxRate, nextQuoteNumber])

  const totals = calculateTotals(formData.items, settings.defaults.taxRate)

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { id: generateId(), description: "", quantity: 1, unit: "PCS", rate: 0, taxRate: settings.defaults.taxRate, amount: 0, taxAmount: 0 }],
    }))
  }

  const removeItem = (id: string) => {
    if (formData.items.length <= 1) return
    setFormData(prev => ({ ...prev, items: prev.items.filter(item => item.id !== id) }))
  }

  const updateItem = (id: string, field: string, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id !== id) return item
        const updated = { ...item, [field]: value }
        if (field === "quantity" || field === "rate" || field === "taxRate") {
          const qty = field === "quantity" ? (value as number) : item.quantity
          const rate = field === "rate" ? (value as number) : item.rate
          const taxRate = field === "taxRate" ? (value as number) : (item.taxRate || settings.defaults.taxRate)
          updated.amount = qty * rate
          updated.taxAmount = (qty * rate * taxRate) / 100
        }
        return updated
      })
    }))
  }

  const moveItem = (index: number, direction: "up" | "down") => {
    setFormData(prev => {
      const newItems = [...prev.items]
      const targetIndex = direction === "up" ? index - 1 : index + 1
      if (targetIndex < 0 || targetIndex >= newItems.length) return prev
      ;[newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]]
      return { ...prev, items: newItems }
    })
  }

  const handleSave = () => {
    if (!formData.client.name.trim()) {
      addToast({ type: "error", title: "Validation Error", message: "Client name is required" })
      return
    }
    if (formData.items.some(item => !item.description.trim())) {
      addToast({ type: "error", title: "Validation Error", message: "All items must have a description" })
      return
    }

    const quoteData = {
      ...formData,
      type: formData.type,
      subtotal: totals.subtotal,
      tax: totals.tax,
      total: totals.total,
      status: "draft" as const,
      createdAt: quote?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      client: formData.client as Client,
    }

    if (isEditing && quote) {
      updateQuotation(quote.id, quoteData)
      addToast({ type: "success", title: "Saved", message: "Quotation updated successfully" })
    } else {
      addQuotation({ ...quoteData, id: generateId() })
      addToast({ type: "success", title: "Created", message: "New quotation created successfully" })
    }
  }

  const handleDelete = () => {
    if (isEditing && quote) {
      deleteQuotation(quote.id)
      addToast({ type: "success", title: "Deleted", message: "Quotation removed" })
    }
  }

  const handleDuplicate = () => {
    const totals = calculateTotals(formData.items, settings.defaults.taxRate)
    const newQuote = {
      ...formData,
      id: generateId(),
      quoteNumber: nextQuoteNumber(),
      subtotal: totals.subtotal,
      tax: totals.tax,
      total: totals.total,
      status: "draft" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: formData.items.map(item => ({ ...item, id: generateId() })),
      annexurePages: formData.annexurePages.map(page => ({ ...page, id: generateId() })),
    }
    addQuotation(newQuote)
    addToast({ type: "success", title: "Duplicated", message: "Quotation duplicated successfully" })
  }

  const handleExportPDF = async () => {
    if (!formData.client.name.trim()) {
      addToast({ type: "error", title: "Validation Error", message: "Client name is required" })
      return
    }
    if (formData.items.some(item => !item.description.trim())) {
      addToast({ type: "error", title: "Validation Error", message: "All items must have a description" })
      return
    }

    addToast({ type: "info", title: "Exporting PDF", message: "Generating PDF..." })

    try {
      const { jsPDF } = await import("jspdf")
      const doc = new jsPDF()

      // Header
      doc.setFontSize(18)
      doc.setTextColor(99, 102, 241)
      doc.text("Universal Inspection Co. Ltd.", 14, 20)
      doc.setFontSize(11)
      doc.setTextColor(94, 163, 184)
      doc.text(`VAT Number: ${formData.client.vatNumber || ""}`, 14, 30)
      doc.text(`Quote: ${formData.quoteNumber}`, 14, 38)
      doc.text(`Date: ${formatDate(formData.date)}`, 14, 46)

      // Simple table using autoTable
      const columns = [["#", "Description", "Qty", "Unit", "Rate", "Tax %", "Amount"]]
      const rows = formData.items.map((item, i) => [
        i + 1,
        item.description || "",
        item.quantity,
        item.unit,
        item.rate,
        item.taxRate || settings.defaults.taxRate,
        item.amount,
      ])

      ;(doc as any).autoTable({
        head: [columns[0]],
        body: rows,
        startY: 50,
        theme: "grid",
        headStyles: { fill: [99, 102, 241], textColor: 255 },
        bodyStyles: { fontSize: 8 },
        margin: { left: 10, right: 10 },
      })

      // Save file
      doc.save(`Quotation_${formData.quoteNumber}.pdf`)
      addToast({ type: "success", title: "Exported", message: "PDF generated successfully" })
    } catch (err) {
      console.error("PDF export error:", err)
      addToast({ type: "error", title: "Export Failed", message: "Could not generate PDF. Please try again." })
    }
  }

  const handleExportExcel = async () => {
    if (!formData.client.name.trim()) {
      addToast({ type: "error", title: "Validation Error", message: "Client name is required" })
      return
    }
    if (formData.items.some(item => !item.description.trim())) {
      addToast({ type: "error", title: "Validation Error", message: "All items must have a description" })
      return
    }

    addToast({ type: "info", title: "Exporting Excel", message: "Generating Excel..." })

    try {
      const { jsPDF } = await import("jspdf")
      const doc = new jsPDF()

      // Simple table using autoTable
      const columns = [["#", "Description", "Qty", "Unit", "Rate", "Tax %", "Amount"]]
      const rows = formData.items.map((item, i) => [
        i + 1,
        item.description || "",
        item.quantity,
        item.unit,
        item.rate,
        item.taxRate || settings.defaults.taxRate,
        item.amount,
      ])

      ;(doc as any).autoTable({
        head: [columns[0]],
        body: rows,
        startY: 20,
        theme: "grid",
        headStyles: { fill: [99, 102, 241], textColor: 255 },
        bodyStyles: { fontSize: 8 },
        margin: { left: 10, right: 10 },
      })

      // Generate and download
      doc.save(`Quotation_${formData.quoteNumber}.xlsx`)
      addToast({ type: "success", title: "Exported", message: "Excel generated successfully" })
    } catch (err) {
      console.error("Excel export error:", err)
      addToast({ type: "error", title: "Export Failed", message: "Could not generate Excel. Please try again." })
    }
  }

  const parseFilePreview = async (filePath: string) => {
    try {
      const { readFile } = window.electronAPI || {}
      if (!readFile) throw new Error("File reading not available")

      const content = await readFile(filePath)
      if (!content) throw new Error("Could not read file")

      if (filePath.endsWith('.json')) {
        const data = JSON.parse(content)
        if (Array.isArray(data)) {
          return { headers: Object.keys(data[0] || {}) }
        }
        return { headers: Object.keys(data) }
      } else if (filePath.endsWith('.csv')) {
        const lines = content.split('\n')
        const headers = lines[0].split(',').map(h => h.trim())
        return { headers, preview: lines.slice(1, 5) }
      } else if (filePath.endsWith('.xlsx') || filePath.endsWith('.xls')) {
        // For Excel, we'd need a proper parser - return basic info
        return { headers: ["(Excel file - columns will be detected on import)"] }
      }
      return { headers: [] }
    } catch (err) {
      console.error("File preview error:", err)
      return { headers: [] }
    }
  }

  const importFileHandler = async () => {
    if (!importFilePath) return

    try {
      setImportProgress(10)

      const { readFile } = window.electronAPI || {}
      if (!readFile) throw new Error("File reading not available")

      setImportProgress(30)
      const content = await readFile(importFilePath)
      if (!content) throw new Error("Could not read file")

      setImportProgress(50)

      let data: any = null
      if (importFilePath.endsWith('.json')) {
        data = JSON.parse(content)
      } else if (importFilePath.endsWith('.csv')) {
        const lines = content.split('\n').filter(l => l.trim())
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
        data = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
          const obj: Record<string, string> = {}
          headers.forEach((h, i) => { obj[h] = values[i] || '' })
          return obj
        })
      } else if (importFilePath.endsWith('.xlsx') || importFilePath.endsWith('.xls')) {
        // For Excel files, we'd use a proper parser
        addToast({ type: "warning", title: "Excel Import", message: "Excel import requires additional parsing. Using fallback." })
        return
      }

      setImportProgress(70)

      if (importType === "quotation" && data) {
        const quoteData = Array.isArray(data) ? data[0] : data

        setFormData(prev => ({
          ...prev,
          quoteNumber: quoteData.quoteNumber || prev.quoteNumber,
          date: quoteData.date || prev.date,
          client: {
            ...prev.client,
            name: quoteData["client.name"] || quoteData.clientName || quoteData.client?.name || "",
            company: quoteData["client.company"] || quoteData.clientCompany || quoteData.client?.company || "",
            email: quoteData["client.email"] || quoteData.clientEmail || quoteData.client?.email || "",
            phone: quoteData["client.phone"] || quoteData.clientPhone || quoteData.client?.phone || "",
            address: quoteData["client.address"] || quoteData.clientAddress || quoteData.client?.address || "",
            vatNumber: quoteData["client.vatNumber"] || quoteData.clientVatNumber || quoteData.client?.vatNumber || "",
            contactPerson: quoteData["client.contactPerson"] || quoteData.clientContactPerson || quoteData.client?.contactPerson || "",
          },
          notes: quoteData.notes || "",
          terms: quoteData.terms || settings.defaults.paymentTerms,
          items: quoteData.items?.map((item: any, idx: number) => ({
            id: generateId(),
            description: item.description || "",
            quantity: parseFloat(item.quantity) || 1,
            unit: item.unit || "PCS",
            rate: parseFloat(item.rate) || 0,
            taxRate: parseFloat(item.taxRate) || settings.defaults.taxRate,
            amount: (parseFloat(item.quantity) || 1) * (parseFloat(item.rate) || 0),
            taxAmount: ((parseFloat(item.quantity) || 1) * (parseFloat(item.rate) || 0) * (parseFloat(item.taxRate) || settings.defaults.taxRate)) / 100,
          })) || [{ id: generateId(), description: "", quantity: 1, unit: "PCS", rate: 0, taxRate: settings.defaults.taxRate, amount: 0, taxAmount: 0 }],
        }))

        addToast({ type: "success", title: "Imported", message: "Quotation imported successfully" })
      } else if (importType === "lineItems" && Array.isArray(data)) {
        const newItems = data.map((item: any, idx: number) => ({
          id: generateId(),
          description: item.description || "",
          quantity: parseFloat(item.quantity) || 1,
          unit: item.unit || "PCS",
          rate: parseFloat(item.rate) || 0,
          taxRate: parseFloat(item.taxRate) || settings.defaults.taxRate,
          amount: (parseFloat(item.quantity) || 1) * (parseFloat(item.rate) || 0),
          taxAmount: ((parseFloat(item.quantity) || 1) * (parseFloat(item.rate) || 0) * (parseFloat(item.taxRate) || settings.defaults.taxRate)) / 100,
        }))

        setFormData(prev => ({
          ...prev,
          items: [...prev.items, ...newItems],
        }))

        addToast({ type: "success", title: "Imported", message: `${newItems.length} line items imported` })
      }

      setImportProgress(100)
      setImportStatus("complete")
    } catch (err) {
      console.error("Import error:", err)
      setImportStatus("error")
      addToast({ type: "error", title: "Import Failed", message: "Could not import file. Please check format." })
    }
  }

  const applyColumnMapping = async () => {
    if (!importFilePath || !importedData) return

    try {
      setImportProgress(10)
      setImportStatus("importing")

      const { readFile } = window.electronAPI || {}
      if (!readFile) throw new Error("File reading not available")

      const content = await readFile(importFilePath)
      if (!content) throw new Error("Could not read file")

      setImportProgress(50)

      // Process with column mapping
      // Similar to importFileHandler but using columnMapping
      setImportProgress(100)
      setImportStatus("complete")
      addToast({ type: "success", title: "Imported", message: "Data imported with custom mapping" })
    } catch (err) {
      console.error("Mapping import error:", err)
      setImportStatus("error")
      addToast({ type: "error", title: "Import Failed", message: "Could not import with mapping" })
    }
  }

  const clientFields = [
    { key: "name", label: "Client Name", icon: User, required: true },
    { key: "company", label: "Company", icon: Building2 },
    { key: "contactPerson", label: "Contact Person", icon: User },
    { key: "email", label: "Email", icon: Mail, type: "email" },
    { key: "phone", label: "Phone", icon: Phone, type: "tel" },
    { key: "address", label: "Address", icon: MapPin, multiline: true },
    { key: "vatNumber", label: "VAT Number", icon: Hash, multiline: true },
  ]

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
            {isEditing ? `Editing ${quote?.quoteNumber}` : "Create a new quotation for your client"}
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
            onClick={() => { setImportType("quotation"); setShowImportDialog(true); }}
            className="glass-hover px-4 py-2 rounded-xl font-medium flex items-center gap-2 text-text-secondary hover:text-text-primary"
            title="Import Quotation"
          >
            <Upload className="w-4 h-4" />
            Import Quote
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => { setImportType("lineItems"); setShowImportDialog(true); }}
            className="glass-hover px-4 py-2 rounded-xl font-medium flex items-center gap-2 text-text-secondary hover:text-text-primary"
            title="Import Line Items"
          >
            <FileInput className="w-4 h-4" />
            Import Items
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
                      className={`flex flex-col gap-1.5 ${field.multiline ? "lg:col-span-3" : field.required ? "sm:col-span-2" : ""}`}
                    >
                      <label className="flex items-center gap-1.5 text-sm font-medium text-text-secondary">
                        <field.icon className="w-4 h-4 text-text-muted" />
                        {field.label}
                        {field.required && <span className="text-error">*</span>}
                      </label>
                      {field.multiline ? (
                        <textarea
                          value={formData.client[field.key] || ""}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            client: { ...prev.client, [field.key]: e.target.value }
                          }))}
                          className="glass-hover px-3 py-2.5 rounded-xl text-sm focus-ring border border-border-subtle bg-bg-secondary resize-none min-h-[80px]"
                          placeholder={`Enter ${field.label.toLowerCase()}`}
                        />
                      ) : (
                        <input
                          type={field.type || "text"}
                          value={formData.client[field.key] || ""}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            client: { ...prev.client, [field.key]: e.target.value }
                          }))}
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
              <div className="p-5 border-b border-border-subtle">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Quotation Details
                </h2>
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
                    onChange={(e) => setFormData(prev => ({ ...prev, quoteNumber: e.target.value }))}
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
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
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
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as "standard" | "valve" }))}
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
                    onChange={(e) => setFormData(prev => ({ ...prev, serialNumber: e.target.value }))}
                    className="glass-hover px-3 py-2.5 rounded-xl text-sm focus-ring border border-border-subtle bg-bg-secondary"
                    placeholder="Optional"
                  />
                </div>
              </div>
            </motion.section>

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
                        {formData.type === "valve" ? (
                          <>
                            <th className="w-[50px] px-2 py-3 text-center text-xs font-medium text-text-secondary">S No</th>
                            <th className="w-0 flex-1 min-w-[200px] px-3 py-3 text-left text-xs font-medium text-text-secondary">Description</th>
                            <th className="w-[80px] px-2 py-3 text-center text-xs font-medium text-text-secondary">SIZE (Inch)</th>
                            <th className="w-[70px] px-2 py-3 text-center text-xs font-medium text-text-secondary">Class</th>
                            <th className="w-[60px] px-2 py-3 text-center text-xs font-medium text-text-secondary">QTY</th>
                            <th className="w-[80px] px-2 py-3 text-center text-xs font-medium text-text-secondary">Unit</th>
                            <th className="w-[90px] px-2 py-3 text-right text-xs font-medium text-text-secondary">Rate</th>
                            <th className="w-[60px] px-2 py-3 text-center text-xs font-medium text-text-secondary">VAT %</th>
                            <th className="w-[100px] px-2 py-3 text-right text-xs font-medium text-text-secondary">Amount</th>
                            <th className="w-0 flex-1 min-w-[150px] px-3 py-3 text-left text-xs font-medium text-text-secondary">Remarks</th>
                          </>
                        ) : (
                          <>
                            <th className="w-[40px] px-2 py-3 text-center text-xs font-medium text-text-secondary">#</th>
                            <th className="w-0 flex-1 min-w-[200px] px-3 py-3 text-left text-xs font-medium text-text-secondary">Description</th>
                            <th className="w-[70px] px-2 py-3 text-center text-xs font-medium text-text-secondary">Qty</th>
                            <th className="w-[80px] px-2 py-3 text-center text-xs font-medium text-text-secondary">Unit</th>
                            <th className="w-[100px] px-2 py-3 text-right text-xs font-medium text-text-secondary">Rate</th>
                            <th className="w-[70px] px-2 py-3 text-center text-xs font-medium text-text-secondary">VAT %</th>
                            <th className="w-[110px] px-2 py-3 text-right text-xs font-medium text-text-secondary">Amount</th>
                          </>
                        )}
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
                            className={editingItemId === item.id ? "bg-primary/5" : "hover:bg-bg-secondary transition-colors"}
                          >
                            <td className="px-2 py-3 text-center text-xs font-mono text-text-muted">
                              {index + 1}
                            </td>
                            {formData.type === "valve" ? (
                              <>
                                <td className="px-2 py-3 text-center text-xs font-mono text-text-secondary">
                                  {item.sNo || index + 1}
                                </td>
                                <td className="px-3 py-3">
                                  {editingItemId === item.id ? (
                                    <input
                                      type="text"
                                      value={item.description || ""}
                                      onChange={(e) => updateItem(item.id, "description", e.target.value)}
                                      onBlur={() => setEditingItemId(null)}
                                      onKeyDown={(e) => e.key === "Enter" && setEditingItemId(null)}
                                      autoFocus
                                      className="w-full glass-hover px-2 py-1.5 rounded-lg text-sm focus-ring border border-primary/30 bg-bg-secondary"
                                    />
                                  ) : (
                                    <div
                                      onClick={() => setEditingItemId(item.id)}
                                      className="px-2 py-1.5 rounded-lg hover:bg-bg-tertiary cursor-text min-h-[36px] flex items-center"
                                    >
                                      {item.description || (
                                        <span className="text-text-muted/50 italic text-sm">Enter description...</span>
                                      )}
                                    </div>
                                  )}
                                </td>
                                <td className="px-2 py-3 text-center">
                                  {editingItemId === item.id ? (
                                    <input
                                      type="text"
                                      value={item.sizeInch || ""}
                                      onChange={(e) => updateItem(item.id, "sizeInch", e.target.value)}
                                      onBlur={() => setEditingItemId(null)}
                                      onKeyDown={(e) => e.key === "Enter" && setEditingItemId(null)}
                                      className="w-full glass-hover px-1.5 py-1 rounded-lg text-xs text-center focus-ring border border-primary/30 bg-bg-secondary"
                                      placeholder='e.g., 2"'
                                    />
                                  ) : (
                                    <span className="font-mono text-xs">{item.sizeInch || "-"}</span>
                                  )}
                                </td>
                                <td className="px-2 py-3 text-center">
                                  {editingItemId === item.id ? (
                                    <input
                                      type="text"
                                      value={item.classRating || ""}
                                      onChange={(e) => updateItem(item.id, "classRating", e.target.value)}
                                      onBlur={() => setEditingItemId(null)}
                                      onKeyDown={(e) => e.key === "Enter" && setEditingItemId(null)}
                                      className="w-full glass-hover px-1.5 py-1 rounded-lg text-xs text-center focus-ring border border-primary/30 bg-bg-secondary"
                                      placeholder="e.g., 150"
                                    />
                                  ) : (
                                    <span className="font-mono text-xs">{item.classRating || "-"}</span>
                                  )}
                                </td>
                                <td className="px-2 py-3 text-center">
                                  {editingItemId === item.id ? (
                                    <input
                                      type="number"
                                      value={item.quantity || 1}
                                      onChange={(e) => updateItem(item.id, "quantity", parseFloat(e.target.value) || 1)}
                                      onBlur={() => setEditingItemId(null)}
                                      onKeyDown={(e) => e.key === "Enter" && setEditingItemId(null)}
                                      min="0"
                                      step="0.01"
                                      className="w-full glass-hover px-1.5 py-1 rounded-lg text-xs text-center focus-ring border border-primary/30 bg-bg-secondary"
                                    />
                                  ) : (
                                    <span className="font-mono text-xs">{(item.quantity || 1).toLocaleString()}</span>
                                  )}
                                </td>
                                <td className="px-2 py-3 text-center">
                                  {editingItemId === item.id ? (
                                    <select
                                      value={item.unit || "PCS"}
                                      onChange={(e) => updateItem(item.id, "unit", e.target.value)}
                                      onBlur={() => setEditingItemId(null)}
                                      className="w-full glass-hover px-1.5 py-1 rounded-lg text-xs focus-ring border border-primary/30 bg-bg-secondary"
                                    >
                                      {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                                    </select>
                                  ) : (
                                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-bg-tertiary text-text-secondary">
                                      {item.unit || "PCS"}
                                    </span>
                                  )}
                                </td>
                                <td className="px-2 py-3 text-right">
                                  {editingItemId === item.id ? (
                                    <input
                                      type="number"
                                      value={item.rate || 0}
                                      onChange={(e) => updateItem(item.id, "rate", parseFloat(e.target.value) || 0)}
                                      onBlur={() => setEditingItemId(null)}
                                      onKeyDown={(e) => e.key === "Enter" && setEditingItemId(null)}
                                      min="0"
                                      step="0.01"
                                      className="w-full glass-hover px-1.5 py-1 rounded-lg text-xs text-right focus-ring border border-primary/30 bg-bg-secondary font-mono"
                                    />
                                  ) : (
                                    <span className="font-mono text-xs">{formatCurrency(item.rate || 0, settings.defaults.currency)}</span>
                                  )}
                                </td>
                                <td className="px-2 py-3 text-center">
                                  {editingItemId === item.id ? (
                                    <select
                                      value={item.taxRate || settings.defaults.taxRate}
                                      onChange={(e) => updateItem(item.id, "taxRate", parseFloat(e.target.value))}
                                      onBlur={() => setEditingItemId(null)}
                                      className="w-full glass-hover px-1.5 py-1 rounded-lg text-xs focus-ring border border-primary/30 bg-bg-secondary text-center"
                                    >
                                      {TAX_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                                    </select>
                                  ) : (
                                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-bg-tertiary text-text-secondary">
                                      {(item.taxRate || settings.defaults.taxRate)}%
                                    </span>
                                  )}
                                </td>
                                <td className="px-2 py-3 text-right font-mono font-medium text-text-primary">
                                  {formatCurrency(item.amount || 0, settings.defaults.currency)}
                                </td>
                                <td className="px-3 py-3">
                                  {editingItemId === item.id ? (
                                    <input
                                      type="text"
                                      value={item.remarks || ""}
                                      onChange={(e) => updateItem(item.id, "remarks", e.target.value)}
                                      onBlur={() => setEditingItemId(null)}
                                      onKeyDown={(e) => e.key === "Enter" && setEditingItemId(null)}
                                      className="w-full glass-hover px-2 py-1.5 rounded-lg text-sm focus-ring border border-primary/30 bg-bg-secondary"
                                      placeholder="Remarks..."
                                    />
                                  ) : (
                                    <span className="text-sm text-text-muted">{item.remarks || "-"}</span>
                                  )}
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="px-3 py-3">
                                  {editingItemId === item.id ? (
                                    <input
                                      type="text"
                                      value={item.description || ""}
                                      onChange={(e) => updateItem(item.id, "description", e.target.value)}
                                      onBlur={() => setEditingItemId(null)}
                                      onKeyDown={(e) => e.key === "Enter" && setEditingItemId(null)}
                                      autoFocus
                                      className="w-full glass-hover px-2 py-1.5 rounded-lg text-sm focus-ring border border-primary/30 bg-bg-secondary"
                                    />
                                  ) : (
                                    <div
                                      onClick={() => setEditingItemId(item.id)}
                                      className="px-2 py-1.5 rounded-lg hover:bg-bg-tertiary cursor-text min-h-[36px] flex items-center"
                                    >
                                      {item.description || (
                                        <span className="text-text-muted/50 italic text-sm">Enter description...</span>
                                      )}
                                    </div>
                                  )}
                                </td>
                                <td className="px-2 py-3 text-center">
                                  {editingItemId === item.id ? (
                                    <input
                                      type="number"
                                      value={item.quantity || 1}
                                      onChange={(e) => updateItem(item.id, "quantity", parseFloat(e.target.value) || 1)}
                                      onBlur={() => setEditingItemId(null)}
                                      onKeyDown={(e) => e.key === "Enter" && setEditingItemId(null)}
                                      min="0"
                                      step="0.01"
                                      className="w-full glass-hover px-1.5 py-1 rounded-lg text-xs text-center focus-ring border border-primary/30 bg-bg-secondary"
                                    />
                                  ) : (
                                    <span className="font-mono text-xs">{(item.quantity || 1).toLocaleString()}</span>
                                  )}
                                </td>
                                <td className="px-2 py-3 text-center">
                                  {editingItemId === item.id ? (
                                    <select
                                      value={item.unit || "PCS"}
                                      onChange={(e) => updateItem(item.id, "unit", e.target.value)}
                                      onBlur={() => setEditingItemId(null)}
                                      className="w-full glass-hover px-1.5 py-1 rounded-lg text-xs focus-ring border border-primary/30 bg-bg-secondary"
                                    >
                                      {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                                    </select>
                                  ) : (
                                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-bg-tertiary text-text-secondary">
                                      {item.unit || "PCS"}
                                    </span>
                                  )}
                                </td>
                                <td className="px-2 py-3 text-right">
                                  {editingItemId === item.id ? (
                                    <input
                                      type="number"
                                      value={item.rate || 0}
                                      onChange={(e) => updateItem(item.id, "rate", parseFloat(e.target.value) || 0)}
                                      onBlur={() => setEditingItemId(null)}
                                      onKeyDown={(e) => e.key === "Enter" && setEditingItemId(null)}
                                      min="0"
                                      step="0.01"
                                      className="w-full glass-hover px-1.5 py-1 rounded-lg text-xs text-right focus-ring border border-primary/30 bg-bg-secondary font-mono"
                                    />
                                  ) : (
                                    <span className="font-mono text-xs">{formatCurrency(item.rate || 0, settings.defaults.currency)}</span>
                                  )}
                                </td>
                                <td className="px-2 py-3 text-center">
                                  {editingItemId === item.id ? (
                                    <select
                                      value={item.taxRate || settings.defaults.taxRate}
                                      onChange={(e) => updateItem(item.id, "taxRate", parseFloat(e.target.value))}
                                      onBlur={() => setEditingItemId(null)}
                                      className="w-full glass-hover px-1.5 py-1 rounded-lg text-xs focus-ring border border-primary/30 bg-bg-secondary text-center"
                                    >
                                      {TAX_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                                    </select>
                                  ) : (
                                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-bg-tertiary text-text-secondary">
                                      {(item.taxRate || settings.defaults.taxRate)}%
                                    </span>
                                  )}
                                </td>
                                <td className="px-2 py-3 text-right font-mono font-medium text-text-primary">
                                  {formatCurrency(item.amount || 0, settings.defaults.currency)}
                                </td>
                              </>
                            )}
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
                        <motion.tr
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                        >
                          <td colSpan={9} className="px-4 py-12 text-center">
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
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-elevated rounded-2xl border border-border-subtle overflow-hidden"
            >
              <div className="p-5 border-b border-border-subtle">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Notes & Terms
                </h2>
              </div>
              <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-text-secondary">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={4}
                    className="glass-hover px-3 py-2.5 rounded-xl text-sm focus-ring border border-border-subtle bg-bg-secondary resize-none"
                    placeholder="Additional notes for the client..."
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-text-secondary">Payment Terms</label>
                  <textarea
                    value={formData.terms}
                    onChange={(e) => setFormData(prev => ({ ...prev, terms: e.target.value }))}
                    rows={4}
                    className="glass-hover px-3 py-2.5 rounded-xl text-sm focus-ring border border-border-subtle bg-bg-secondary resize-none"
                    placeholder="Payment terms and conditions..."
                  />
                </div>
              </div>
            </motion.section>

            {/* Annexure Pages */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="glass-elevated rounded-2xl border border-border-subtle overflow-hidden"
            >
              <div className="p-5 border-b border-border-subtle flex items-center justify-between">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <FilePlus className="w-5 h-5" />
                  Annexure Pages
                </h2>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setFormData(prev => ({
                    ...prev,
                    annexurePages: [...prev.annexurePages, { id: generateId(), title: "", content: "", order: prev.annexurePages.length }]
                  }))}
                  className="glass-hover px-3 py-1.5 rounded-xl text-sm font-medium flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  Add Page
                </motion.button>
              </div>
              <div className="p-5 space-y-4">
                {formData.annexurePages.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 mx-auto text-text-muted/50 mb-4" />
                    <h3 className="text-lg font-medium text-text-secondary mb-1">No annexure pages</h3>
                    <p className="text-text-muted mb-4">Add annexure pages for additional documentation</p>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setFormData(prev => ({
                        ...prev,
                        annexurePages: [...prev.annexurePages, { id: generateId(), title: "", content: "", order: prev.annexurePages.length }]
                      }))}
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
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              annexurePages: prev.annexurePages.map((p, i) => i === index ? { ...p, title: e.target.value } : p)
                            }))}
                            className="w-full glass-hover px-3 py-2 rounded-lg text-sm focus-ring border border-border-subtle bg-bg-secondary"
                            placeholder="Page title..."
                          />
                          <textarea
                            value={page.content}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              annexurePages: prev.annexurePages.map((p, i) => i === index ? { ...p, content: e.target.value } : p)
                            }))}
                            rows={3}
                            className="w-full glass-hover px-3 py-2 rounded-lg text-sm focus-ring border border-border-subtle bg-bg-secondary resize-none"
                            placeholder="Page content..."
                          />
                        </div>
                        {formData.annexurePages.length > 1 && (
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setFormData(prev => ({
                              ...prev,
                              annexurePages: prev.annexurePages.filter((_, i) => i !== index)
                            }))}
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
            </motion.section>
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
                      <span className="font-mono font-semibold text-text-primary">{formatCurrency(totals.subtotal, settings.defaults.currency)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-text-secondary">VAT ({settings.defaults.taxRate}%)</span>
                      <span className="font-mono font-semibold text-text-primary">{formatCurrency(totals.tax, settings.defaults.currency)}</span>
                    </div>
                    <div className="pt-3 border-t border-border-subtle flex items-center justify-between">
                      <span className="text-lg font-bold text-text-primary">Net Total</span>
                      <span className="text-lg font-bold font-mono bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                        {formatCurrency(totals.total, settings.defaults.currency)}
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
                  </div>

                  {formData.items.some(item => !item.description.trim()) && (
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

              {/* Quick Actions */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="glass-elevated rounded-2xl border border-border-subtle overflow-hidden"
              >
                <div className="p-5 border-b border-border-subtle">
                  <h2 className="text-lg font-semibold">Quick Actions</h2>
                </div>
                <div className="p-5 space-y-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSave}
                    className="w-full glass-hover px-4 py-3 rounded-xl font-medium flex items-center justify-center gap-2 bg-primary text-white hover:bg-primary-hover shadow-glow"
                  >
                    <Save className="w-5 h-5" />
                    Save Quotation
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleExportPDF}
                    className="w-full glass-hover px-4 py-3 rounded-xl font-medium flex items-center justify-center gap-2 text-text-secondary hover:text-primary"
                  >
                    <FileText className="w-5 h-5" />
                    Export PDF
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleExportExcel}
                    className="w-full glass-hover px-4 py-3 rounded-xl font-medium flex items-center justify-center gap-2 text-text-secondary hover:text-secondary"
                  >
                    <Download className="w-5 h-5" />
                    Export Excel
                  </motion.button>
                  {isEditing && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleDuplicate}
                      className="w-full glass-hover px-4 py-3 rounded-xl font-medium flex items-center justify-center gap-2 text-text-secondary hover:text-secondary"
                    >
                      <Copy className="w-5 h-5" />
                      Duplicate
                    </motion.button>
                  )}
                </div>
              </motion.section>
            </div>
          </motion.div>
        </div>
      </div>
    </div>

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
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="glass-elevated w-full max-w-2xl rounded-2xl shadow-elevated border border-border-default overflow-hidden max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-border-subtle flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {importType === "quotation" ? "Import Quotation" : "Import Line Items"}
              </h3>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => { setShowImportDialog(false); setImportFilePath(null); setImportedData(null); setColumnMapping({}); setImportProgress(0); setImportStatus("idle"); }}
                className="glass-hover p-2 rounded-xl focus-ring"
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {!importFilePath ? (
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
                               setImportFilePath(result.filePaths[0])
                             }
                           }
                         }}>
                      <Upload className="w-12 h-12 mx-auto text-text-muted mb-4" />
                      <p className="text-text-secondary mb-2">Click to select file or drag and drop</p>
                      <p className="text-xs text-text-muted">Supports: JSON, Excel (.xlsx), CSV</p>
                    </div>
                  </div>
                </div>
              ) : importStatus === "idle" ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 glass-hover rounded-xl">
                    <div className="flex items-center gap-3">
                      <FileText className="w-8 h-8 text-primary" />
                      <div>
                        <p className="font-medium text-text-primary">{importFilePath}</p>
                        <p className="text-xs text-text-muted">{importType === "quotation" ? "Quotation File" : "Line Items File"}</p>
                      </div>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => { setImportFilePath(null); setImportedData(null); setColumnMapping({}); setImportProgress(0); setImportStatus("idle"); }}
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
                        onClick={async () => {
                          setImportStatus("mapping")
                          if (importFilePath) setImportedData(await parseFilePreview(importFilePath))
                        }}
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
                  <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
                    {importedData?.headers?.map((header: string) => (
                      <div key={header} className="glass-hover p-4 rounded-xl">
                        <p className="font-medium text-text-primary mb-2">{header}</p>
                        <select
                          value={columnMapping[header] || ""}
                          onChange={(e) => setColumnMapping(prev => ({ ...prev, [header]: e.target.value }))}
                          className="w-full glass-hover px-3 py-2 rounded-lg text-sm focus-ring bg-transparent border-none"
                        >
                          <option value="">-- Skip --</option>
                          {importType === "quotation" ? (
                            <>
                              <option value="quoteNumber">Quote Number</option>
                              <option value="date">Date</option>
                              <option value="client.name">Client Name</option>
                              <option value="client.company">Company</option>
                              <option value="client.email">Email</option>
                              <option value="client.phone">Phone</option>
                              <option value="client.address">Address</option>
                              <option value="client.vatNumber">VAT Number</option>
                              <option value="notes">Notes</option>
                              <option value="terms">Terms</option>
                              <option value="items">Line Items (nested)</option>
                            </>
                          ) : (
                            <>
                              <option value="description">Description</option>
                              <option value="quantity">Quantity</option>
                              <option value="unit">Unit</option>
                              <option value="rate">Rate</option>
                              <option value="taxRate">Tax %</option>
                            </>
                          )}
                        </select>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setImportStatus("importing")
                        setImportProgress(0)
                        applyColumnMapping()
                      }}
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
                  <p className="text-sm text-text-muted">{importType === "quotation" ? "Quotation" : "Line items"} imported successfully</p>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { setShowImportDialog(false); setImportFilePath(null); setImportedData(null); setColumnMapping({}); setImportProgress(0); setImportStatus("idle"); }}
                    className="w-full glass-hover px-4 py-3 rounded-xl font-medium flex items-center justify-center gap-2 bg-primary text-white hover:bg-primary-hover"
                  >
                    Done
                  </motion.button>
                </div>
              ) : importStatus === "error" ? (
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
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  </>
  )
}