import { Quotation, Settings } from '../types/quotation';
import * as zip from 'jszip';
import { calculateTotals, formatCurrency, formatDateUK, parseSerialNumbers } from '../utils/formatters';

const DOCX_TEMPLATE = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    <w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="0"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="28"/><w:color w:val="1E3A5E"/></w:rPr><w:t>{{TITLE}}</w:t></w:r></w:p>
    <w:p><w:pPr><w:jc w:val="right"/><w:spacing w:before="0" w:after="0"/></w:pPr><w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t>Ref: {{REF}}</w:t></w:r></w:p>
    <w:p><w:pPr><w:jc w:val="right"/><w:spacing w:before="0" w:after="0"/></w:pPr><w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t>Date: {{DATE}}</w:t></w:r></w:p>
    <w:p><w:pPr><w:spacing w:before="120" w:after="0"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="22"/></w:rPr><w:t>Attn: {{ATTN}}</w:t></w:r></w:p>
    <w:p><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr><w:r><w:rPr><w:sz w:val="22"/></w:rPr><w:t>{{CLIENT}}</w:t></w:r></w:p>
    <w:p><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr><w:r><w:rPr><w:sz w:val="22"/></w:rPr><w:t>{{LOCATION}}</w:t></w:r></w:p>
    {{#SUB}}
    <w:p><w:pPr><w:spacing w:before="120" w:after="0"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="22"/></w:rPr><w:t>Sub: {{SUB}}</w:t></w:r></w:p>
    {{/SUB}}
    <w:p><w:pPr><w:spacing w:before="120" w:after="0"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="22"/></w:rPr><w:t>Dear Sir,</w:t></w:r></w:p>
    {{#INTRO_LINES}}
    <w:p><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr><w:r><w:rPr><w:sz w:val="22"/></w:rPr><w:t>{{.}}</w:t></w:r></w:p>
    {{/INTRO_LINES}}
    {{#DELIVERY}}
    <w:p><w:pPr><w:spacing w:before="120" w:after="0"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="22"/></w:rPr><w:t>Delivery Terms: {{DELIVERY}}</w:t></w:r></w:p>
    {{/DELIVERY}}
    {{#SERVICE}}
    <w:p><w:pPr><w:spacing w:before="120" w:after="0"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="22"/></w:rPr><w:t>Service Beginning Terms: {{SERVICE}}</w:t></w:r></w:p>
    {{/SERVICE}}
    {{#TABLE}}
    <w:p><w:pPr><w:spacing w:before="120" w:after="0"/></w:pPr></w:p>
    <w:tbl>
      <w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblBorders><w:top w:val="single" w:sz="4" w:color="000000"/><w:left w:val="single" w:sz="4" w:color="000000"/><w:bottom w:val="single" w:sz="4" w:color="000000"/><w:right w:val="single" w:sz="4" w:color="000000"/><w:insideH w:val="single" w:sz="4" w:color="000000"/><w:insideV w:val="single" w:sz="4" w:color="000000"/></w:tblBorders></w:tblPr>
      <w:tr>{{#HEADERS}}<w:tc><w:tcPr><w:shd w:val="clear" w:fill="1E3A5E"/><w:tcW w:w="{{WIDTH}}" w:type="pct"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="FFFFFF"/><w:sz w:val="20"/></w:rPr><w:t>{{.}}</w:t></w:r></w:p></w:tc>{{/HEADERS}}</w:tr>
      {{#ROWS}}
      <w:tr>{{#CELLS}}<w:tc><w:tcPr><w:tcW w:w="{{WIDTH}}" w:type="pct"/>{{#SHADE}}<w:shd w:val="clear" w:fill="F0F4F8"/>{{/SHADE}}</w:tcPr><w:p><w:pPr><w:jc w:val="{{ALIGN}}"/></w:pPr><w:r><w:rPr><w:sz w:val="20"/>{{#BOLD}}<w:b/>{{/BOLD}}</w:rPr><w:t>{{.}}</w:t></w:r></w:p></w:tc>{{/CELLS}}</w:tr>
      {{/ROWS}}
    </w:tbl>
    {{/TABLE}}
    {{#TOTALS}}
    <w:p><w:pPr><w:spacing w:before="120" w:after="0"/></w:pPr></w:p>
    <w:tbl>
      <w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblBorders><w:top w:val="single" w:sz="4" w:color="000000"/><w:left w:val="single" w:sz="4" w:color="000000"/><w:bottom w:val="single" w:sz="4" w:color="000000"/><w:right w:val="single" w:sz="4" w:color="000000"/><w:insideH w:val="single" w:sz="4" w:color="000000"/><w:insideV w:val="single" w:sz="4" w:color="000000"/></w:tblBorders></w:tblPr>
      {{#TOTAL_ROWS}}
      <w:tr><w:tc><w:tcPr><w:tcW w:w="7000" w:type="pct"/></w:tcPr><w:p><w:pPr><w:jc w:val="right"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="22"/></w:rPr><w:t>{{LABEL}}</w:t></w:r></w:p></w:tc><w:tc><w:tcPr><w:tcW w:w="3000" w:type="pct"/></w:tcPr><w:p><w:pPr><w:jc w:val="right"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="22"/></w:rPr><w:t>{{VALUE}}</w:t></w:r></w:p></w:tc></w:tr>
      {{/TOTAL_ROWS}}
    </w:tbl>
    {{/TOTALS}}
    <w:p><w:pPr><w:spacing w:before="240" w:after="0"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="24"/><w:color w:val="1E3A5E"/></w:rPr><w:t>Terms & Conditions</w:t></w:r></w:p>
    {{#TC_LINES}}
    <w:p><w:pPr><w:spacing w:before="0" w:after="60"/></w:pPr><w:r><w:rPr><w:sz w:val="20"/>{{#BOLD}}<w:b/>{{/BOLD}}</w:rPr><w:t>{{.}}</w:t></w:r></w:p>
    {{/TC_LINES}}
    <w:p><w:pPr><w:spacing w:before="120" w:after="0"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="22"/></w:rPr><w:t>{{CLOSING}}</w:t></w:r></w:p>
    <w:p><w:pPr><w:spacing w:before="120" w:after="0"/></w:pPr><w:r><w:rPr><w:sz w:val="22"/></w:rPr><w:t>Thanks & Best Regards,</w:t></w:r></w:p>
    {{#SIGN}}
    <w:p><w:pPr><w:spacing w:before="240" w:after="0"/></w:pPr><w:r><w:rPr><w:sz w:val="22"/></w:rPr><w:t>{{SIGNER}}</w:t></w:r></w:p>
    <w:p><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr><w:r><w:rPr><w:sz w:val="22"/></w:rPr><w:t>{{ROLE}}</w:t></w:r></w:p>
    <w:p><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr><w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t>{{DATE_SIGNED}}</w:t></w:r></w:p>
    {{/SIGN}}
  </w:body>
</w:document>`;

function renderTemplate(tmpl: string, data: any): string {
  return tmpl.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (match, key, content) => {
    const val = data[key];
    if (!val) return '';
    if (Array.isArray(val)) {
      return val.map(v => renderTemplate(content, typeof v === 'object' ? v : { '.': v, ...data })).join('');
    }
    return renderTemplate(content, { ...data, [key]: val });
  }).replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] != null ? String(data[key]) : '';
  });
}

export class WordGeneratorService {
  static async createQuoteWord(q: Quotation, settings: Settings): Promise<ArrayBuffer> {
    const V = q.type === 'valve';
    const totals = calculateTotals(q);
    const isRTL = settings.lang === 'ar';

    const headers = V
      ? ['S No', 'Description', 'Size (Inch)', 'Class Rating', 'Qty', 'Unit Rate (SAR)', 'Amount (SAR)', 'Remarks']
      : ['S No', 'Description', 'Qty', 'Unit Rate (SAR)', 'Amount (SAR)', ...(q.showRm ? ['Remarks'] : [])];

    const colWidths = V
      ? [5, 28, 10, 12, 6, 14, 14, 11]
      : [5, 40, 8, 15, 15, ...(q.showRm ? [17] : [])];

    const rows = q.items.map((item, idx) => {
      const desc = V ? item.d : item.d + (parseSerialNumbers(item.sns).length ? `\nS/N: ${parseSerialNumbers(item.sns).join(', ')}` : '');
      const cells: any[] = V
        ? [idx + 1, item.d, item.sz || '', item.cl || '', item.q, item.r, item.q * item.r, item.rm || '']
        : [idx + 1, desc, item.q, item.r, item.q * item.r, ...(q.showRm ? [item.rm || ''] : [])];
      return cells.map((c, i) => ({ '.': String(c), ALIGN: ['S No', 'Qty', 'Unit Rate', 'Amount'].some(h => headers[i]?.includes(h)) ? 'right' : 'left', WIDTH: `${colWidths[i]}%`, SHADE: idx % 2 === 1 }));
    });

    if (!V) {
      rows.push([{ '.': 'TOTAL QTY', ALIGN: 'right', WIDTH: `${colWidths[0] + colWidths[1]}%`, BOLD: true }, { '.': '', ALIGN: 'left', WIDTH: `${colWidths[2]}%` }, { '.': String(totals.totalQty), ALIGN: 'center', WIDTH: `${colWidths[3]}%`, BOLD: true }, { '.': '', ALIGN: 'right', WIDTH: `${colWidths[4]}%` }] as any[]);
    }

    const totalRows = [
      { LABEL: 'Total Amount', VALUE: formatCurrency(totals.subtotal) },
      { LABEL: `VAT Amount ${q.vat}%`, VALUE: formatCurrency(totals.vatAmount) },
      { LABEL: 'NET TOTAL AMOUNT', VALUE: formatCurrency(totals.netTotal) },
    ];

    const introLines = String(q.intro || '').split('\n').filter(Boolean);
    const tcLines = String(q.tc || '').split('\n').map(l => ({ '.': l.trim(), BOLD: /^[A-Za-z&'\s]{3,40}:$/.test(l.trim()) }));

    const templateData = {
      TITLE: (V && q.revised ? 'REVISED ' : '') + String(q.title || 'QUOTATION').toUpperCase(),
      REF: q.ref,
      DATE: formatDateUK(q.date),
      ATTN: q.attn || '',
      CLIENT: q.client || '',
      LOCATION: q.location || '',
      SUB: V && q.sub ? q.sub : undefined,
      INTRO_LINES: introLines,
      DELIVERY: q.delivery || '',
      SERVICE: q.service || '',
      TABLE: true,
      HEADERS: headers.map((h, i) => ({ '.': h, WIDTH: `${colWidths[i]}%` })),
      ROWS: rows,
      TOTALS: true,
      TOTAL_ROWS: totalRows,
      TC_LINES: tcLines,
      CLOSING: q.closing || '',
      SIGN: q.sign && settings.signer,
      SIGNER: settings.signer || '',
      ROLE: settings.role || '',
      DATE_SIGNED: new Date().toLocaleDateString('en-GB'),
    };

    const documentXml = renderTemplate(DOCX_TEMPLATE, templateData);

    const zipFile = new zip();
    zipFile.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);
    zipFile.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);
    zipFile.folder('word')!.file('document.xml', documentXml);
    zipFile.folder('word/_rels')!.file('document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`);
    zipFile.folder('word')!.file('styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="22"/></w:rPr></w:rPrDefault></w:docDefaults>
</w:styles>`);

    return await zipFile.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE' });
  }

  static getQuoteWordBlob(q: Quotation, s: Settings): Promise<Blob> {
    return this.createQuoteWord(q, s).then(buf => new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }));
  }

  static async downloadQuoteWord(q: Quotation, s: Settings): Promise<void> {
    const blob = await this.getQuoteWordBlob(q, s);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${q.ref}-${q.client}.docx`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}