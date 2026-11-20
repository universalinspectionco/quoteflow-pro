# QuoteFlow Pro V2

Professional Quotation & Price Book Management System by Universal Inspection Co. Ltd. (UIC)

## Features (V1 Migrated + V2 New)

### Core (from V1)
- Standard & Valve Quotation creation/editing
- Price Book with price history tracking
- Reports & Dashboard with monthly filtering
- Full Settings management (letterhead, signature, branding)
- PDF Export with official corporate letterhead
- Excel Export & Word Document Export
- AI Quote Studio (Gemini API integration)
- Custom backgrounds (video, image, canvas animations)
- 11 professional color themes
- Serial number tracking & annexure pages
- Import past quotes from PDF/Excel files
- Auto-save with keyboard shortcuts
- Online/offline detection with PWA support
- Local/network folder sync via File System Access API

### New in V2
- **Auto-Update System** — Check & install updates directly from GitHub releases
- **Troubleshoot & Diagnostics Tool** — Self-diagnostics, database repair, cache clearing
- **Light/Dark Mode Toggle** — User-selectable light or dark theme
- **RTL Arabic Support** — Full bilingual interface (English/Arabic)
- **Enhanced Analytics Dashboard** — Charts showing revenue trends, client frequency, status distribution
- **Batch Operations** — Select multiple quotes for batch delete/status change/export
- **Advanced Search & Filtering** — Multi-field search, date range, status, client filters
- **Cloud Backup Option** — Optional JSON backup upload/download (cross-device sync)
- **Improved PDF Generation** — Better RTL text rendering, configurable fonts, print-preview mode
- **Session History** — Track last login time, sessions count, uptime stats
- **Performance Monitor** — Real-time memory usage, render count, FPS indicator

## Tech Stack
- React 19 + TypeScript
- Vite 8 + Tailwind CSS v4
- Electron 33 (desktop packaging)
- jsPDF + jspdf-autotable (PDF generation)
- SheetJS/xlsx (Excel export)
- Google Gemini AI (AI Quote Studio)

## Building
```bash
npm install
npm run dev          # Dev server at http://localhost:1420
npm run build        # Production build
npm run package:windows  # Windows installer + portable
```
