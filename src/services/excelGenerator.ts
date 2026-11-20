import { Quotation, Settings } from '../types/quotation';
import * as XLSX from 'xlsx';
import { calculateTotals, formatCurrency, formatDateUK, parseSerialNumbers } from '../utils/formatters';

export class ExcelGeneratorService {
  static createQuoteExcel(q: Quotation, settings: Settings): ArrayBuffer {
    const V = q.type === 'valve';
    const workbook = XLSX.utils.book_new();
    const totals = calculateTotals(q);

    // Quote Info Sheet
    const infoData: [string, string][] = [
      ['Reference', q.ref],
      ['Date', formatDateUK(q.date)],
      ['Client', q.client],
      ['Attention', q.attn],
      ['Location', q.location],
      ['Type', V ? 'Valve Test' : 'Standard Services'],
      ['Status', q.status],
      ['VAT %', String(q.vat)],
      ['Subtotal', formatCurrency(totals.subtotal)],
      ['VAT Amount', formatCurrency(totals.vatAmount)],
      ['Net Total', formatCurrency(totals.netTotal)],
    ];
    const infoSheet = XLSX.utils.aoa_to_sheet([[
      ['QUOTE INFORMATION'],
      [],
      ...infoData.map(([k, v]) => [k, v]),
    ]]);
    XLSX.utils.book_append_sheet(workbook, infoSheet, 'Quote Info');

    // Items Sheet
    const RM = !V && q.showRm;
    const header = V
      ? ['S No', 'Description', 'Size (Inch)', 'Class Rating', 'Qty', 'Unit Rate (SAR)', 'Amount (SAR)', 'Remarks']
      : ['S No', 'Description', 'Qty', 'Unit Rate (SAR)', 'Amount (SAR)', ...(RM ? ['Remarks'] : [])];

    const rows: any[][] = [header];
    q.items.forEach((item, idx) => {
      const desc = V ? item.d : item.d + (parseSerialNumbers(item.sns).length ? `\nS/N: ${parseSerialNumbers(item.sns).join(', ')}` : '');
      const row = V
        ? [idx + 1, item.d, item.sz || '', item.cl || '', item.q, item.r, item.q * item.r, item.rm || '']
        : [idx + 1, desc, item.q, item.r, item.q * item.r, ...(RM ? [item.rm || ''] : [])];
      rows.push(row);
    });

    if (!V) rows.push(['', 'TOTAL QTY', '', '', totals.totalQty]);
    rows.push([]);
    rows.push(['Total Amount', formatCurrency(totals.subtotal)]);
    rows.push([`VAT ${q.vat}%`, formatCurrency(totals.vatAmount)]);
    rows.push(['NET TOTAL', formatCurrency(totals.netTotal)]);

    const itemsSheet = XLSX.utils.aoa_to_sheet(rows);
    const colWidths = V
      ? [{wch:6},{wch:30},{wch:12},{wch:12},{wch:8},{wch:14},{wch:14},{wch:20}]
      : [{wch:6},{wch:30},{wch:8},{wch:14},{wch:14}];
    itemsSheet['!cols'] = colWidths.slice(0, header.length);
    XLSX.utils.book_append_sheet(workbook, itemsSheet, 'Line Items');

    // Terms Sheet
    const termsSheet = XLSX.utils.aoa_to_sheet([
      ['TERMS & CONDITIONS'],
      [],
      ...String(q.tc || '').split('\n').map(l => [l]),
    ]);
    XLSX.utils.book_append_sheet(workbook, termsSheet, 'Terms');

    return XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  }

  static getQuoteExcelBlob(q: Quotation, s: Settings): Blob {
    return new Blob([this.createQuoteExcel(q, s)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  static downloadQuoteExcel(q: Quotation, s: Settings): void {
    const blob = this.getQuoteExcelBlob(q, s);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${q.ref}-${q.client}.xlsx`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
