import { Quotation, Settings } from '../types/quotation';
import { calculateTotals, formatCurrency, formatDateUK, parseSerialNumbers, sanitizeFilename } from '../utils/formatters';

declare global {
  interface Window { jspdf: any; }
}

export class PdfGeneratorService {
  static createQuotePdf(q: Quotation, settings: Settings): any {
    if (!window.jspdf?.jsPDF) throw new Error('jsPDF not loaded');
    const V = q.type === 'valve';
    const doc = new window.jspdf.jsPDF({ unit: 'pt', format: 'letter' });
    const W = 612, H = 792, M = 36, CW = W - 2 * M;
    const TOP = 96, BOT = 712;
    const done = new Set<number>();
    const totals = calculateTotals(q);
    const lh = settings.lh || 'band';
    const ACC = [30, 58, 138];
    const INK = [31, 41, 55];
    const LINE = [203, 213, 225];
    const TOT = [239, 246, 255];
    const ZEB = [248, 250, 252];

    const getDim = (imgUrl: string) => { try { const p = doc.getImageProperties(imgUrl); return p.height / p.width; } catch { return 0.15; } };
    const headerImg = settings.hdr || '';
    const footerImg = settings.ftr || '';
    const watermarkImg = settings.wm || '';

    const decor = () => {
      const pn = doc.internal.getCurrentPageInfo().pageNumber;
      if (done.has(pn)) return;
      done.add(pn);
      if (lh !== 'none' && watermarkImg) {
        try { const GState = doc.GState; doc.setGState(new GState({ opacity: 0.08 })); const wd = getDim(watermarkImg); doc.addImage(watermarkImg, 'PNG', W/2-150, H/2-150*wd, 300, 300*wd); doc.setGState(new GState({ opacity: 1 })); } catch {}
      }
      if (lh !== 'none' && headerImg) {
        try { const hd = getDim(headerImg); doc.setFillColor(ACC[0], ACC[1], ACC[2]); doc.rect(0, 0, W, W*hd, 'F'); doc.addImage(headerImg, 'PNG', 0, 0, W, W*hd); } catch {}
      }
      if (lh !== 'none' && footerImg) {
        try { const fd = getDim(footerImg); doc.setFillColor(ACC[0], ACC[1], ACC[2]); doc.rect(0, H-W*fd, W, W*fd, 'F'); doc.addImage(footerImg, 'PNG', 0, H-W*fd, W, W*fd); } catch {}
      }
    };

    let y = TOP;
    const checkBreak = (h: number) => { if (y + h > BOT) { doc.addPage(); decor(); y = TOP; } };
    const addPara = (text: string, opts: { b?: boolean; g?: number } = {}) => {
      String(text || '').split('\n').forEach(l => {
        if (!l.trim()) { y += 4; return; }
        checkBreak(14);
        doc.setFont('helvetica', opts.b ? 'bold' : 'normal');
        doc.setFontSize(10); doc.setTextColor(INK[0], INK[1], INK[2]);
        const wrapped = doc.splitTextToSize(l, CW);
        wrapped.forEach((w: string) => { checkBreak(14); doc.text(w, M, y + 10); y += 13; });
        y += opts.g ?? 3;
      });
    };
    const addSectionHeader = (title: string) => {
      checkBreak(30); y += 6;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(ACC[0], ACC[1], ACC[2]);
      doc.text(title, M, y + 10); y += 12;
      doc.setDrawColor(ACC[0], ACC[1], ACC[2]); doc.setLineWidth(0.8);
      doc.line(M, y + 0.5, M + CW, y + 0.5); doc.setDrawColor(0); doc.setLineWidth(0.2); y += 9;
    };

    decor();

    // Title banner
    doc.setFillColor(ACC[0], ACC[1], ACC[2]);
    doc.rect(M, y, CW, 22, 'F');
    const titleText = (V && q.revised ? 'REVISED ' : '') + String(q.title || 'QUOTATION').toUpperCase();
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11.5); doc.setTextColor(255, 255, 255);
    doc.text(titleText, W/2, y + 15, { align: 'center' });
    y += 40;

    // Metadata
    const fmtDate = formatDateUK(q.date);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor(ACC[0], ACC[1], ACC[2]);
    doc.text('Attn To:', M, y); doc.setTextColor(INK[0], INK[1], INK[2]);
    doc.text(q.attn || '', M + doc.getTextWidth('Attn To:') + 5, y);
    doc.setTextColor(ACC[0], ACC[1], ACC[2]); doc.text(`Ref.: ${q.ref}`, W - M, y, { align: 'right' });
    y += 16;
    doc.setTextColor(INK[0], INK[1], INK[2]); doc.text(q.client || '', M, y);
    doc.setTextColor(ACC[0], ACC[1], ACC[2]); doc.text(`Date :   ${fmtDate}`, W - M, y, { align: 'right' });
    y += 16;
    doc.setTextColor(INK[0], INK[1], INK[2]); doc.text(`Location: ${q.location || ''}`, M, y);
    y += 22;

    // Subject
    if (V && q.sub) addPara(`Sub: ${q.sub}`, { b: true, g: 8 });
    addPara(q.intro, { b: true, g: 4 });
    if (q.delivery) addPara(`Delivery Terms: ${q.delivery}`, { b: true });
    if (q.service) addPara(`Service Beginning Terms: ${q.service}`, { b: true });
    y += 6;

    // Table
    const RM = !V && q.showRm;
    const fmtSns = (item: any) => { const s = parseSerialNumbers(item.sns); return !s.length ? '' : s.length <= 8 ? `\nS/N: ${s.join(', ')}` : `\nSerial nos.: ${s.length} units (see Annexure)`; };
    const rateSuffix = q.rateNote ? `\n${q.rateNote}` : '';

    const columns = V
      ? [{header:'S No',align:'center',width:34},{header:'Description',align:'left'},{header:'Size (Inch)',align:'center',width:54},{header:'Class Rating',align:'center',width:62},{header:'Qty',align:'center',width:34},{header:`Unit Rate SR${rateSuffix}`,align:'right',width:76},{header:`Amount SR${rateSuffix}`,align:'right',width:76},{header:'Remarks',align:'left',width:72}]
      : [{header:'S No',align:'center',width:42},{header:'Description',align:'left'},{header:'Qty',align:'center',width:40},{header:'Unit Rate (SAR)',align:'right',width:90},{header:'Amount (SAR)',align:'right',width:90},...(RM?[{header:'Remarks',align:'left',width:92}]:[])];

    const colStyles: Record<number, any> = {};
    columns.forEach((c,i) => { colStyles[i] = { halign: c.align }; if (c.width) colStyles[i].cellWidth = c.width; });
    const qtyIdx = V ? 4 : 2, amtIdx = V ? 6 : 4, totalCols = columns.length;

    const tableRows = q.items.map((item, idx) => {
      if (V) return [idx+1, item.d, item.sz||'', item.cl||'', String(item.q), formatCurrency(item.r), formatCurrency(item.q*item.r), item.rm||''];
      const row = [idx+1, item.d + fmtSns(item), String(item.q).padStart(2,'0'), formatCurrency(item.r), formatCurrency(item.q*item.r)];
      if (RM) row.push(item.rm||'');
      return row;
    });

    if (!V) {
      const summaryRow: any[] = [{ content: 'REQUESTED TOTAL QUANTITIES', colSpan: qtyIdx, styles: { halign: 'right', textColor: ACC, fontStyle: 'bold' } }, { content: String(totals.totalQty), styles: { textColor: INK, fontStyle: 'bold', halign: 'center' } }];
      while (summaryRow.length + (qtyIdx-1) < totalCols) summaryRow.push('');
      tableRows.push(summaryRow);
    }

    const tMargin = { left: M, right: M, top: TOP, bottom: H - BOT };

    doc.autoTable({ startY: y, margin: tMargin, theme: 'grid', head: [columns.map(c => c.header)], body: tableRows, styles: { font: 'helvetica', fontSize: V ? 9.5 : 10, textColor: INK, cellPadding: { top: 4.5, bottom: 4.5, left: 6, right: 6 }, valign: 'middle', lineColor: LINE, lineWidth: 0.5 }, headStyles: { fillColor: ACC, textColor: [255,255,255], fontStyle: 'bold', fontSize: V ? 9 : 9.5 }, alternateRowStyles: { fillColor: ZEB }, columnStyles: colStyles, willDrawPage: decor });

    // Totals
    const makeSummary = (label: string, value: string, tc?: number[], bg?: number[]) => [{ content: label, colSpan: amtIdx, styles: { halign: 'right', textColor: tc||INK, fillColor: bg||TOT } }, { content: value, styles: { halign: 'right', textColor: tc||INK, fillColor: bg||TOT } }].concat(totalCols > amtIdx+1 ? [{ content: '', styles: { halign: 'right', textColor: tc||INK, fillColor: bg||TOT } }] : []);

    if (!V || q.showTot) {
      doc.autoTable({ startY: doc.lastAutoTable.finalY, margin: tMargin, theme: 'grid', body: [makeSummary('Total Amount', formatCurrency(totals.subtotal)), makeSummary(`VAT Amount ${q.vat}%`, formatCurrency(totals.vatAmount)), makeSummary('Net Total Amount', formatCurrency(totals.netTotal), [255,255,255], ACC)], styles: { font: 'helvetica', fontSize: 10.5, fontStyle: 'bold', cellPadding: { top: 4.5, bottom: 4.5, left: 6, right: 6 }, lineColor: LINE, lineWidth: 0.5 }, columnStyles: colStyles, willDrawPage: decor });
    }

    if (V && q.vatNote) {
      doc.autoTable({ startY: doc.lastAutoTable.finalY, margin: tMargin, theme: 'grid', body: [[{ content: q.vatNote, colSpan: totalCols, styles: { halign: 'center', textColor: [200,30,30] } }]], styles: { font: 'helvetica', fontSize: 9.5, cellPadding: 4.5, lineColor: LINE, lineWidth: 0.5 }, willDrawPage: decor });
    }

    y = doc.lastAutoTable.finalY + 14;
    const tcLines = String(q.tc || '').split('\n');
    tcLines.forEach(line => {
      const t = line.trim(); if (!t) { y += 3; return; }
      if (/^[A-Za-z&'\s]{3,40}:$/.test(t)) addSectionHeader(t); else addPara(line);
    });

    y += 8; addPara(q.closing || ''); y += 4; addPara('Thanks & Best Regards,', { b: true });

    if (q.sign && settings.sig) {
      try {
        const ip = doc.getImageProperties(settings.sig);
        const sigW = Math.min(130, ip.width), sigH = (sigW * ip.height) / ip.width;
        checkBreak(sigH + 52);
        doc.addImage(settings.sig, 'PNG', M, y + 4, sigW, sigH);
        y += sigH + 12;
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(INK[0], INK[1], INK[2]);
        const now = new Date();
        const pad2 = (v: number) => String(v).padStart(2, '0');
        const ts = `${now.getFullYear()}.${pad2(now.getMonth()+1)}.${pad2(now.getDate())} ${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
        [settings.signer, settings.role, ts].filter(Boolean).forEach(l => { doc.text(l as string, M, y + 8); y += 11; });
      } catch {}
    }

    // Annexure for serial numbers > 8
    const annexItems = V ? [] : q.items.map((item, idx) => ({ idx, item, serials: parseSerialNumbers(item.sns) })).filter(o => o.serials.length > 8);
    if (annexItems.length) {
      doc.addPage(); decor(); y = TOP;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(ACC[0], ACC[1], ACC[2]);
      doc.text('ANNEXURE – SERIAL NUMBERS', M, y + 10); y += 26;
      annexItems.forEach(obj => {
        if (y > BOT - 70) { doc.addPage(); decor(); y = TOP; }
        const gridRows: string[][] = [];
        for (let a = 0; a < obj.serials.length; a += 4) gridRows.push([0,1,2,3].map(j => obj.serials[a+j] ? `${a+j+1}.  ${obj.serials[a+j]}` : ''));
        doc.autoTable({ startY: y, margin: tMargin, theme: 'grid', head: [[{ content: `Item ${obj.idx+1} - ${obj.item.d} (${obj.serials.length} serial numbers)`, colSpan: 4, styles: { halign: 'left' } }]], body: gridRows, styles: { font: 'helvetica', fontSize: 9, textColor: INK, cellPadding: 3.5, lineColor: LINE, lineWidth: 0.5 }, headStyles: { fillColor: ACC, textColor: [255,255,255], fontStyle: 'bold' }, willDrawPage: decor });
        y = doc.lastAutoTable.finalY + 14;
      });
    }

    // Page numbers
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i); doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
      if (lh === 'band') { doc.setTextColor(255,255,255); doc.text(`Page ${i} of ${totalPages}`, W/2, H-14, { align: 'center' }); }
      else { doc.setTextColor(120,120,120); doc.text(`Page ${i} of ${totalPages}`, lh==='orig'?W-M:W/2, lh==='orig'?H-62:H-30, { align: lh==='orig'?'right':'center' }); }
    }
    return doc;
  }

  static getQuotePdfBlob(q: Quotation, s: Settings): Blob { return this.createQuotePdf(q, s).output('blob'); }

  static downloadQuotePdf(q: Quotation, s: Settings): void {
    const blob = this.getQuotePdfBlob(q, s);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${sanitizeFilename(q)}.pdf`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
