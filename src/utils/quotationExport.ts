import { formatCurrency, formatDate } from '@/utils/formatters'
import type { Quotation } from '@/types'

/**
 * List-level exports. Totals come from the stored quotation values (with a
 * 15% VAT fallback), so exported SAR figures always match the dashboard.
 */

const safeNumber = (value: unknown, fallback = 0): number => {
  const numeric = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''))
  return Number.isFinite(numeric) ? numeric : fallback
}

const vatRateOf = (quote: Quotation): number => {
  const rate = safeNumber(quote.vat, 15)
  return rate > 0 ? rate : 15
}

interface ExportRow {
  quote: Quotation
  subtotal: number
  vatRate: number
  tax: number
  total: number
}

function exportRows(quotes: Quotation[]): ExportRow[] {
  return quotes.map((quote) => {
    const vatRate = vatRateOf(quote)
    const subtotal = safeNumber(quote.subtotal)
    const total = safeNumber(quote.total)
    const tax = safeNumber(quote.tax, Math.max(0, total - subtotal))
    return { quote, subtotal, vatRate, tax, total }
  })
}

export async function exportQuotationsToExcel(quotes: Quotation[]): Promise<void> {
  if (quotes.length === 0) return
  const XLSX = await import('xlsx')
  const rows = exportRows(quotes).map(({ quote, subtotal, vatRate, tax, total }, index) => ({
    '#': index + 1,
    'Quote #': quote.quoteNumber,
    Date: quote.date,
    Client: quote.client?.name || '',
    Company: quote.client?.company || '',
    Type: quote.type,
    Status: quote.status,
    Items: quote.items?.length || 0,
    Subtotal: subtotal,
    'VAT %': vatRate,
    'VAT Amount': tax,
    Total: total,
    'Follow-up': quote.followUpDate || '',
  }))

  const worksheet = XLSX.utils.json_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Quotations')
  const stamp = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(workbook, `Quotations_${stamp}.xlsx`)
}

export async function exportQuotationsToPdf(
  quotes: Quotation[],
  currency: string,
  companyName = 'Universal Inspection Co. Ltd.',
): Promise<void> {
  if (quotes.length === 0) return
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const rows = exportRows(quotes)

  doc.setFontSize(14)
  doc.text('Quotations Summary', 14, 16)
  doc.setFontSize(9)
  doc.text(companyName, 14, 22)
  doc.text(`Generated: ${formatDate(new Date().toISOString())}`, 14, 27)

  autoTable(doc, {
    head: [[
      '#', 'Quote #', 'Date', 'Client', 'Type', 'Status',
      `Subtotal (${currency})`, 'VAT %', `VAT (${currency})`, `Total (${currency})`,
    ]],
    body: rows.map(({ quote, subtotal, vatRate, tax, total }, index) => [
      String(index + 1),
      quote.quoteNumber,
      formatDate(quote.date),
      quote.client?.name || '',
      quote.type,
      quote.status,
      formatCurrency(subtotal, currency),
      `${vatRate}%`,
      formatCurrency(tax, currency),
      formatCurrency(total, currency),
    ]),
    startY: 32,
    theme: 'grid',
    headStyles: { fillColor: [99, 102, 241], textColor: 255, fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    margin: { left: 14, right: 14 },
  })

  const subtotal = rows.reduce((sum, row) => sum + row.subtotal, 0)
  const tax = rows.reduce((sum, row) => sum + row.tax, 0)
  const total = rows.reduce((sum, row) => sum + row.total, 0)
  const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 40

  doc.setFontSize(10)
  doc.text(`Subtotal: ${formatCurrency(subtotal, currency)}`, 190, finalY + 10, { align: 'right' })
  doc.text(`VAT: ${formatCurrency(tax, currency)}`, 190, finalY + 16, { align: 'right' })
  doc.text(`Net Total: ${formatCurrency(total, currency)}`, 190, finalY + 22, { align: 'right' })

  const stamp = new Date().toISOString().slice(0, 10)
  doc.save(`Quotations_${stamp}.pdf`)
}
