import { formatCurrency, formatDate } from '@/utils/formatters'
import {
  CLOSING_NOTE,
  CONFIDENTIALITY_NOTE,
  DEFAULT_CLIENT_PROVISIONS,
  DEFAULT_IMPORTANT_NOTES,
  DEFAULT_SCOPE_OF_WORK,
  DEFAULT_TERMS,
  defaultPdfHeading,
  numberedLines,
  sheetTitleFromHeading,
  signatureDesignation,
  signatureEnabled,
  signatureName,
  signatureSource,
} from '@/utils/uicFormats'
import type { WorkBook, WorkSheet } from 'xlsx'
import type { Quotation, Settings } from '@/types'

/** Totals come from stored values (15% VAT fallback) so exports match the dashboard. */

const safeNumber = (value: unknown, fallback = 0): number => {
  const numeric = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''))
  return Number.isFinite(numeric) ? numeric : fallback
}

const vatRateOf = (quote: Quotation): number => {
  const rate = safeNumber(quote.vat, 15)
  return rate > 0 ? rate : 15
}

const headingOf = (quote: Quotation): string =>
  (quote.pdfHeading || '').trim() || defaultPdfHeading(quote.type)

const subtotalOf = (quote: Quotation): number => safeNumber(quote.subtotal)
const taxOf = (quote: Quotation): number => {
  const fallback = (subtotalOf(quote) * vatRateOf(quote)) / 100
  return safeNumber(quote.tax, fallback)
}
const totalOf = (quote: Quotation): number => {
  const fallback = subtotalOf(quote) + taxOf(quote)
  return safeNumber(quote.total, fallback)
}

const itemDescription = (item: Quotation['items'][number]): string => {
  const base = (item.description || '').trim()
  return item.serialNo && !base.toLowerCase().includes('s/n') ? `${base} S/N: ${item.serialNo}` : base
}

function resolveAutoTable(module: typeof import('jspdf-autotable')) {
  return (
    (module.default as unknown as { default?: typeof module.default })?.default ||
    module.default ||
    (module as unknown as { applyPlugin: typeof module.default }).applyPlugin
  )
}

/** Converts stored data URLs (including SVG) into a jsPDF-compatible image. */
async function pdfSignature(dataUrl: string): Promise<{ data: string; format: 'PNG' | 'JPEG' } | null> {
  if (!dataUrl.startsWith('data:image/')) return null
  try {
    if (/^data:image\/(png|jpeg|jpg)/i.test(dataUrl)) {
      return { data: dataUrl, format: /jpeg|jpg/i.test(dataUrl) ? 'JPEG' : 'PNG' }
    }
    const image = new Image()
    image.src = dataUrl
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth || 420
    canvas.height = image.naturalHeight || 140
    const context = canvas.getContext('2d')
    if (!context) return null
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    return { data: canvas.toDataURL('image/png'), format: 'PNG' }
  } catch {
    return null
  }
}

/** Adds the standard UIC signature block to a PDF and returns the new Y position. */
async function addPdfSignatureBlock(
  doc: import('jspdf').jsPDF,
  quote: Quotation,
  settings: Settings,
  y: number,
): Promise<number> {
  if (!signatureEnabled(quote, settings)) return y
  const image = await pdfSignature(signatureSource(quote, settings))
  if (image) {
    try {
      doc.addImage(image.data, image.format, 14, y, 55, 18)
    } catch {
      // A corrupt image must never block the rest of the export.
    }
  }
  doc.setFontSize(10)
  doc.text(signatureName(quote, settings), 14, y + 26)
  const designation = signatureDesignation(quote, settings)
  if (designation) doc.text(designation, 14, y + 32)
  return y + 38
}

function addPdfLines(doc: import('jspdf').jsPDF, lines: string[], y: number, lineHeight = 5): number {
  let cursor = y
  doc.setFontSize(9)
  for (const line of lines) {
    const wrapped = doc.splitTextToSize(line, 180) as string[]
    for (const part of wrapped) {
      doc.text(part, 14, cursor)
      cursor += lineHeight
    }
  }
  return cursor
}

/** Standard Inspection / Valve PDF in the strict UIC layout. */
export async function exportQuotationPdf(quote: Quotation, settings: Settings): Promise<void> {
  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])
  const autoTable = resolveAutoTable(autoTableModule)
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const heading = headingOf(quote)
  const isValve = quote.type === 'valve'

  doc.setFontSize(15)
  doc.setFont('helvetica', 'bold')
  doc.text(heading, 14, 18, { maxWidth: 182 })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(settings.company.name || 'Universal Inspection Co. Ltd.', 14, 26)
  if (settings.company.vatNumber) doc.text(`VAT No: ${settings.company.vatNumber}`, 14, 31)

  if (isValve) {
    doc.text(`Client: ${quote.client?.name || ''}`, 14, 38)
    doc.text(`Project: ${quote.project || '-'}`, 14, 43)
    doc.text(`Ref.: ${quote.ref || '-'}`, 110, 38)
    doc.text(`Date: ${formatDate(quote.date)}`, 110, 43)
  } else {
    doc.text(`Attn To: ${quote.attnTo || quote.client?.contactPerson || ''}`, 14, 38)
    doc.text(`Location: ${quote.location || '-'}`, 14, 43)
    doc.text(`Ref.: ${quote.ref || '-'}`, 110, 38)
    doc.text(`Date: ${formatDate(quote.date)}`, 110, 43)
  }

  let cursor = 50
  if (quote.delivery) {
    doc.text(`Delivery Terms: ${quote.delivery}`, 14, cursor)
    cursor += 5
  }
  if (quote.service) {
    doc.text(`Service Beginning Terms: ${quote.service}`, 14, cursor)
    cursor += 5
  }
  const intro = quote.introParagraph ||
    'Dear Sir, Thank you very much for your inquiry regarding our services. We appreciate the opportunity to assist your esteemed organization and look forward to the possibility of serving your needs with the highest standards of quality and performance.'
  cursor = addPdfLines(doc, [intro], cursor) + 2

  const head = isValve
    ? [['S No', 'Description', 'SIZE (Inch)', 'Class', 'QTY', 'Unite Rate in SR (Pass or Fail)', 'Amount in SR (Pass or Fail)', 'Remarks']]
    : [['S No', 'Description', 'Qty', 'Unit Rate (SAR)', 'Amount (SAR)']]

  const body = (quote.items || []).map((item, index) => {
    const description = itemDescription(item)
    if (isValve) {
      return [
        String(item.sNo ?? index + 1),
        description,
        item.sizeInch || '-',
        item.classRating || '-',
        String(item.quantity),
        safeNumber(item.rate).toFixed(2),
        safeNumber(item.amount, item.quantity * item.rate).toFixed(2),
        item.remarks || '',
      ]
    }
    return [
      String(item.sNo ?? index + 1),
      description,
      String(item.quantity),
      safeNumber(item.rate).toFixed(2),
      safeNumber(item.amount, item.quantity * item.rate).toFixed(2),
    ]
  })

  autoTable(doc, {
    head,
    body,
    startY: cursor,
    theme: 'grid',
    headStyles: { fillColor: [255, 255, 255], textColor: [17, 24, 39], lineColor: [17, 24, 39], fontSize: 7 },
    bodyStyles: { fontSize: 7 },
    margin: { left: 14, right: 14 },
    styles: { cellPadding: 2, overflow: 'linebreak' },
  })

  cursor = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 90) + 8
  doc.setFontSize(9)

  if (isValve) {
    doc.text('Vat 15% will be added to all invoices', 14, cursor)
    cursor += 8
    doc.setFont('helvetica', 'bold')
    doc.text('UIC SCOPE OF WORK', 14, cursor)
    doc.setFont('helvetica', 'normal')
    cursor = addPdfLines(
      doc,
      numberedLines(
        (quote.scopeOfWork || []).join('\n'),
        DEFAULT_SCOPE_OF_WORK,
        4,
      ).map((line, index) => `${index + 1}) ${line}`),
      cursor + 5,
    )
    cursor += 3
    doc.setFont('helvetica', 'bold')
    doc.text(`Provisions by ${quote.client?.name || 'Client'}`, 14, cursor)
    doc.setFont('helvetica', 'normal')
    cursor = addPdfLines(
      doc,
      numberedLines(
        (quote.clientProvisions || []).join('\n'),
        DEFAULT_CLIENT_PROVISIONS,
        8,
      ).map((line, index) => `${index + 1}) ${line}`),
      cursor + 5,
    )
  } else {
    const totalQty = (quote.items || []).reduce((sum, item) => sum + safeNumber(item.quantity), 0)
    doc.text(`REQUESTED TOTAL QUANTITIES: ${totalQty}`, 14, cursor)
    cursor += 6
    doc.text(`Total Amount: ${formatCurrency(subtotalOf(quote), 'SAR')}`, 120, cursor)
    doc.text(`Vat Amount 15%: ${formatCurrency(taxOf(quote), 'SAR')}`, 120, cursor + 6)
    doc.setFont('helvetica', 'bold')
    doc.text(`Net Total Amount: ${formatCurrency(totalOf(quote), 'SAR')}`, 120, cursor + 12)
    doc.setFont('helvetica', 'normal')
    cursor += 18
    doc.setFont('helvetica', 'bold')
    doc.text('Terms & Conditions', 14, cursor)
    doc.setFont('helvetica', 'normal')
    cursor = addPdfLines(
      doc,
      numberedLines(quote.terms, DEFAULT_TERMS, 9).map((line, index) => `${index + 1}) ${line}`),
      cursor + 5,
    )
    cursor += 3
    doc.setFont('helvetica', 'bold')
    doc.text('Important Note', 14, cursor)
    doc.setFont('helvetica', 'normal')
    cursor = addPdfLines(
      doc,
      numberedLines(quote.notes, DEFAULT_IMPORTANT_NOTES, 3).map((line, index) => `${index + 1}) ${line}`),
      cursor + 5,
    )
    cursor += 3
    doc.setFont('helvetica', 'bold')
    doc.text('Confidentiality', 14, cursor)
    doc.setFont('helvetica', 'normal')
    cursor = addPdfLines(doc, [CONFIDENTIALITY_NOTE], cursor + 5)
  }

  cursor = addPdfLines(doc, [quote.closingNote || CLOSING_NOTE], cursor + 4)
  doc.text(isValve ? 'With Thanks & Best Regards,' : 'Thanks & Best Regards,', 14, cursor + 4)
  await addPdfSignatureBlock(doc, quote, settings, cursor + 10)

  doc.save(`${heading.replace(/[\\/?*\[\]:]/g, ' ').slice(0, 50)}_${quote.quoteNumber}.pdf`)
}

type XlsxLib = typeof import('xlsx')

function styleSheet(sheet: WorkSheet, widths: number[], mergeFirstRow = false): void {
  sheet['!cols'] = widths.map((width) => ({ wch: width }))
  if (mergeFirstRow) {
    sheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: Math.max(0, widths.length - 1) } }]
  }
  for (const address of Object.keys(sheet)) {
    if (address.startsWith('!')) continue
    const cell = sheet[address]
    if (!cell) continue
    cell.s = {
      alignment: { wrapText: true, vertical: 'top', horizontal: typeof cell.v === 'number' ? 'right' : 'left' },
    }
  }
}

function addSignatureRows(
  XLSX: XlsxLib,
  sheet: WorkSheet,
  quote: Quotation,
  settings: Settings,
  startRow: number,
): number {
  if (!signatureEnabled(quote, settings)) return startRow
  let row = startRow
  sheet[`A${row}`] = { t: 's', v: 'Thanks & Best Regards,' }
  row += 1
  sheet[`A${row}`] = { t: 's', v: 'Authorized Signatory' }
  sheet[`B${row}`] = { t: 's', v: signatureName(quote, settings) }
  row += 1
  const designation = signatureDesignation(quote, settings)
  if (designation) {
    sheet[`A${row}`] = { t: 's', v: 'Designation' }
    sheet[`B${row}`] = { t: 's', v: designation }
    row += 1
  }
  const image = signatureSource(quote, settings)
  if (image) {
    sheet[`A${row}`] = { t: 's', v: 'Signature' }
    sheet[`B${row}`] = { t: 's', v: 'View signature image', l: { Target: image } }
    row += 1
  }
  // aoa_to_sheet fixes !ref at creation time; extend it so appended rows are written.
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1')
  range.e.r = Math.max(range.e.r, row - 1)
  sheet['!ref'] = XLSX.utils.encode_range(range)
  return row
}

function addSerialSheet(XLSX: XlsxLib, workbook: WorkBook, quote: Quotation): void {
  const items = (quote.items || []).filter((item) => Boolean(item.serialNo))
  if (items.length === 0) return
  const rows: unknown[][] = [
    ['Item #', 'Description', 'S No', 'Serial No.'],
    ...items.map((item, index) => [
      index + 1,
      itemDescription(item).replace(/\s+S\/N:.*$/i, '').trim(),
      item.sNo ?? index + 1,
      item.serialNo,
    ]),
  ]
  const sheet = XLSX.utils.aoa_to_sheet(rows)
  styleSheet(sheet, [10, 60, 12, 28])
  XLSX.utils.book_append_sheet(workbook, sheet, 'Serial Numbers')
}

/** Standard Inspection sheet — mirrors `Quote Format.xlsx` row-for-row. */
function buildStandardSheet(XLSX: XlsxLib, quote: Quotation, settings: Settings): WorkSheet {
  const intro =
    'Dear Sir, Thank you very much for your inquiry regarding our services.\n' +
    'We appreciate the opportunity to assist your esteemed organization and look forward to the possibility of serving your needs with the highest standards of quality and performance.'
  const rows: unknown[][] = [
    ['', headingOf(quote)],
    ['', `Attn To: ${quote.attnTo || quote.client?.name || ''}`, '', '', 'Ref.:', quote.ref || ''],
    ['', quote.client?.name || '', '', '', 'Date :', formatDate(quote.date)],
    ['', `Location: ${quote.location || ''}`],
    [],
    ['', quote.introParagraph || intro],
    [],
    ['', '', 'S No', 'Description', 'Qty', 'Unit Rate (SAR)', 'Amount (SAR)'],
    ...(quote.items || []).map((item, index) => [
      '',
      '',
      String(item.sNo ?? index + 1),
      itemDescription(item).replace(/\n/g, '\n'),
      String(safeNumber(item.quantity)).padStart(2, '0'),
      safeNumber(item.rate).toFixed(2),
      safeNumber(item.amount, item.quantity * item.rate).toFixed(2),
    ]),
    ...Array.from({ length: Math.max(0, 11 - (quote.items?.length || 0)) }, () => ['', '', '', '', '', '', '']),
    ['', '', '', 'REQUESTED TOTAL QUANTITIES', (quote.items || []).reduce((sum, item) => sum + safeNumber(item.quantity), 0)],
    ['', '', '', '', 'Total Amount', subtotalOf(quote).toFixed(2)],
    ['', '', '', '', 'Vat Amount 15%', taxOf(quote).toFixed(2)],
    ['', '', '', '', 'Net Total Amount', totalOf(quote).toFixed(2)],
    [],
    ['', 'Terms & Conditions:'],
    ...numberedLines(quote.terms, DEFAULT_TERMS, 9).map((line, index) => ['', `${index + 1}) ${line}`]),
    [],
    ['', 'Important Note:'],
    ...numberedLines(quote.notes, DEFAULT_IMPORTANT_NOTES, 3).map((line, index) => ['', `${index + 1}) ${line}`]),
    [],
    ['', 'Confidentiality:'],
    ['', CONFIDENTIALITY_NOTE],
  ]
  const sheet = XLSX.utils.aoa_to_sheet(rows)
  const signatureRow = addSignatureRows(XLSX, sheet, quote, settings, rows.length + 2)
  // Template merges: heading, intro, totals and numbered text blocks across B:F.
  const merges: NonNullable<WorkSheet['!merges']> = [
    { s: { r: 0, c: 1 }, e: { r: 0, c: 5 } },
    { s: { r: 5, c: 1 }, e: { r: 5, c: 5 } },
  ]
  const totalStart = 19
  for (let offset = 0; offset < 4; offset += 1) {
    merges.push({ s: { r: totalStart + offset, c: 4 }, e: { r: totalStart + offset, c: 5 } })
  }
  for (let r = totalStart + 5; r < Math.min(signatureRow - 1, rows.length + 8); r += 1) {
    merges.push({ s: { r, c: 1 }, e: { r, c: 5 } })
  }
  sheet['!merges'] = merges
  styleSheet(sheet, [3, 22, 14, 52, 14, 20, 20])
  return sheet
}

/** Valve / Hydro Test sheet in the strict UIC layout. */
function buildValveSheet(XLSX: XlsxLib, quote: Quotation, settings: Settings): WorkSheet {
  const rows: unknown[][] = [
    [headingOf(quote)],
    ['Client', quote.client?.name || ''],
    ['Project', quote.project || ''],
    ['Ref.', quote.ref || ''],
    ['Date', formatDate(quote.date)],
    [quote.introParagraph || 'We are pleased to submit our quotation for the following services:'],
    [
      'S No', 'Description', 'SIZE (Inch)', 'Class', 'QTY',
      'Unite Rate in SR (Pass or Fail)', 'Amount in SR (Pass or Fail)', 'Remarks',
    ],
    ...(quote.items || []).map((item, index) => [
      item.sNo ?? index + 1,
      itemDescription(item),
      item.sizeInch || '',
      item.classRating || '',
      safeNumber(item.quantity),
      safeNumber(item.rate),
      safeNumber(item.amount, item.quantity * item.rate),
      item.remarks || '',
    ]),
    ['Vat 15% will be added to all invoices'],
    ['Total Amount', subtotalOf(quote)],
    ['Net Total Amount', totalOf(quote)],
    ['UIC SCOPE OF WORK'],
    ...numberedLines((quote.scopeOfWork || []).join('\n'), DEFAULT_SCOPE_OF_WORK, 4)
      .map((line, index) => [`${index + 1}) ${line}`]),
    [`Provisions by ${quote.client?.name || 'Client'}`],
    ...numberedLines((quote.clientProvisions || []).join('\n'), DEFAULT_CLIENT_PROVISIONS, 8)
      .map((line, index) => [`${index + 1}) ${line}`]),
    [quote.closingNote || CLOSING_NOTE],
  ]
  const sheet = XLSX.utils.aoa_to_sheet(rows)
  const row = addSignatureRows(XLSX, sheet, quote, settings, rows.length + 1)
  void row
  styleSheet(sheet, [12, 48, 16, 14, 10, 24, 24, 28], true)
  return sheet
}

/** Strict-format quotation workbook (sheet name matches the editable heading). */
export async function exportQuotationExcel(quote: Quotation, settings: Settings): Promise<void> {
  const XLSX = await import('xlsx')
  const workbook = XLSX.utils.book_new()
  const sheet = quote.type === 'valve'
    ? buildValveSheet(XLSX, quote, settings)
    : buildStandardSheet(XLSX, quote, settings)
  XLSX.utils.book_append_sheet(
    workbook,
    sheet,
    quote.type === 'valve' ? 'Format _Valve Test' : '5',
  )
  addSerialSheet(XLSX, workbook, quote)
  XLSX.writeFile(workbook, `${headingOf(quote).replace(/[\\/?*\[\]:]/g, ' ').slice(0, 50)}_${quote.quoteNumber}.xlsx`)
}

/** All-Time Quotation Report with live COUNTIF / SUMIF formulas. */
export async function exportAllTimeReport(quotations: Quotation[], settings: Settings): Promise<void> {
  const XLSX = await import('xlsx')
  const header = [
    'S.No', 'Date', 'Week', 'Quotation', 'Via', 'Company Name', 'Client Code',
    'Service Type', 'Department', 'Specific Dept', 'Location', 'Status',
    'Net Amount (SAR)', 'Remarks',
  ]
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const reportDate = (value: string): string => {
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return value
    return `${String(parsed.getDate()).padStart(2, '0')}-${MONTHS[parsed.getMonth()]}-${String(parsed.getFullYear()).slice(-2)}`
  }
  const weekOf = (date: string): string => {
    const parsed = new Date(date)
    if (Number.isNaN(parsed.getTime())) return '0-Week'
    const start = new Date(parsed.getFullYear(), 0, 1)
    const week = Math.max(1, Math.ceil((parsed.getTime() - start.getTime()) / 604800000))
    return `${week}-Week`
  }
  const rows: unknown[][] = [
    header,
    ...[...quotations]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((quote, index) => [
        index + 1,
        reportDate(quote.date),
        weekOf(quote.date),
        quote.quoteNumber,
        quote.via || '',
        quote.client?.company || quote.client?.name || '',
        quote.clientCode || '',
        quote.svc || quote.type,
        quote.dept || '',
        quote.spDept || '',
        quote.location || '',
        quote.statusTracking || quote.status,
        totalOf(quote).toFixed(2),
        quote.notes || '',
      ]),
  ]

  const statuses = ['Waiting For PO', 'Job Received', 'Under Process', 'Completed', 'Lost']
  const firstDataRow = 2
  const lastDataRow = Math.max(firstDataRow, rows.length)
  rows.push([])
  rows.push(['', '', '', '', '', 'Summary by status'])
  statuses.forEach((status) => {
    rows.push(['', '', '', '', '', status, 0, '0.00'])
  })
  const summaryStartRow = rows.length - statuses.length + 1

  const sheet = XLSX.utils.aoa_to_sheet(rows)
  statuses.forEach((status, index) => {
    const excelRow = summaryStartRow + index
    sheet[`G${excelRow}`] = {
      t: 'n',
      f: `COUNTIF(L${firstDataRow}:L${lastDataRow},"${status}")`,
      v: 0,
    }
    sheet[`H${excelRow}`] = {
      t: 'n',
      f: `SUMIF(L${firstDataRow}:L${lastDataRow},"${status}",M${firstDataRow}:M${lastDataRow})`,
      v: 0,
    }
  })
  styleSheet(sheet, [8, 14, 10, 20, 18, 34, 14, 18, 16, 16, 26, 20, 20, 44])
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, 'Quotation Report')
  const stamp = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(workbook, `UIC-Quotation-Report-All-Time-${stamp}.xlsx`)
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

/** Compact multi-quotation list exports used by the Quotations dashboard. */
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
  styleSheet(worksheet, [6, 20, 14, 28, 28, 12, 14, 10, 16, 10, 16, 18, 14])
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
  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])
  const autoTable = resolveAutoTable(autoTableModule)
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
