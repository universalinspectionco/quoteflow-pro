import { AppDatabase, Quotation, Settings, CompanyPriceBook } from '../types/quotation';

export const TC_STANDARD = `Terms & Conditions:
1) All Calibration / Inspection shall be carried out as per manufacturer specification, project requirement and Good Metallurgical practice unless otherwise indicated.
2) All prices for Calibration/Inspection of Tools & Instruments are applicable only for the Type and List of Equipment mentioned above.
3) After completion of Calibration/Inspection Services, the certificate will be issued.
4) Repair Service: Repair and replacement of spare parts will be extra apart from Calibration charges.
5) Repair Quotation: Shall be submitted upon Calibration.
6) Quotation Validity: 30 days.
7) Payment Terms: 30 days credit, PO/Service Agreement is mandatory for Credit Facility.
8) Payment Mode: Cash/Cheque/Transfer within 30 days from the date of Submitted invoice.
9) We will not accept any demand for adjusting calibration/inspection service invoice dues with your existing Contract.
Confidentiality: All calibration results and documents created during calibration are considered proprietary information and treated as confidential.`;

export const TC_VALVE = TC_STANDARD;

export const DEFAULT_SETTINGS: Settings = {
  tc: TC_STANDARD,
  prefix: "UIC/L/",
  next: 6,
  delivery: "Within 3-5 working days upon receipt of PO and equipment at our Jubail facility.",
  service: "Immediate upon site mobilization / receipt of material.",
  intro: "Dear Sir, Thank you very much for your inquiry regarding our services.\nWe appreciate the opportunity to assist your esteemed organization and look forward to serving your needs with the highest standards of quality and performance.",
  closing: "We hope that our proposal, terms, and conditions meet your requirements.\nPlease issue the Purchase Order and arrange for the schedule.",
  title: "QUOTATION FOR INSPECTION SERVICES",
  vat: 15,
  signer: "Mohammed Al-Otaibi",
  role: "Operations Manager",
  sig: "",
  hdr: "",
  ftr: "",
  wm: "",
  v: 2,
  lh: "band",
  titleV: "QUOTATION FOR VALVE TEST SERVICES",
  subV: "Quotation for safety relief and control valve test & calibration services.",
  rateNote: "(Pass or Fail)",
  vatNote: "VAT 15% will be added to all invoices",
  tcv: TC_VALVE,
  defaultStoragePath: "C:\\UIC_Quotations",
  storageSaveMode: "dialog",
  autoSyncDatabaseFile: true,
  theme: "terminal",
  uiTheme: "dark",
  lang: "en",
  bgType: "canvas",
  bgImage: "",
  bgVideoUrl: "",
  bgAnimationPreset: "particles",
  bgPlayState: "playing",
  bgPlaybackSpeed: 1.0,
  bgOpacity: 80,
  bgBlur: 0,
  bgOverlay: "none",
};

export const INITIAL_QUOTES: Quotation[] = [
  { id: "q-uic-5", type: "std", ref: "UIC/L/5", date: "2026-11-03", client: "Majan", attn: "Majan", location: "Jubail", title: "QUOTATION FOR INSPECTION SERVICES", delivery: "", service: "", intro: "Dear Sir, Thank you very much for your inquiry regarding our services.\nWe appreciate the opportunity to assist your esteemed organization.", items: [{ d: "Electric Hoist", q: 3, r: 26.0, sns: "0001, 125515, 5416161" }], tc: TC_STANDARD, vat: 15, status: "Job Received", notes: "PO received; mobilization scheduled.", closing: "We hope that our proposal meets your requirements.", sign: true, via: "Email", clientCode: "MAJ-08", svc: "Inspection", dept: "Lifting Gear", spDept: "Jubail Plant" },
  { id: "q-uic-4", type: "valve", ref: "UIC/L/4", date: "2026-10-28", client: "Saudi Aramco (Tanajib Gas Plant)", attn: "Eng. Fahad Al-Ghamdi", location: "Tanajib / Ras Tanura", title: "QUOTATION FOR VALVE TEST SERVICES", sub: "Testing, calibration, and POP pressure verification of Safety Relief Valves.", revised: false, rateNote: "(Pass or Fail)", vatNote: "VAT 15% will be added to all invoices", showTot: true, showRm: true, delivery: "5-7 days from valve receipt at Jubail test bay.", service: "Testing commences immediately upon batch staging.", intro: "Dear Sir, Thank you very much for your inquiry regarding our services.", items: [{ d: "Safety Relief Valve", sz: "2\"", cl: "300#", q: 8, r: 350.0, rm: "Hydrotest & Seat Leakage Test included" }, { d: "Safety Relief Valve", sz: "3\"", cl: "600#", q: 12, r: 480.0, rm: "Nitrogen POP & Backpressure Test" }, { d: "Thermal Relief Valve", sz: "1.5\"", cl: "150#", q: 15, r: 270.0, rm: "Bench Calibration" }], tc: TC_VALVE, vat: 15, status: "Completed", notes: "Job completed and certificates delivered.", closing: "We hope that our proposal meets your requirements.", sign: true, via: "Aramco e-Marketplace", clientCode: "ARM-001", svc: "Valve Testing", dept: "Mechanical Testing", spDept: "Tanajib Operations" },
  { id: "q-uic-3", type: "std", ref: "UIC/L/3", date: "2026-10-22", client: "SABIC (Hadeed Iron & Steel)", attn: "Mr. Tariq Al-Shehri", location: "Jubail Industrial City", title: "QUOTATION FOR INSPECTION SERVICES", delivery: "Calibration certificates issued within 48 hours.", service: "On-site NDT & calibration technicians deployment.", intro: "Dear Sir, Thank you very much for your inquiry regarding our services.", items: [{ d: "Ultrasonic Flaw Detector Calibration", q: 2, r: 650.0, sns: "FD-8821, FD-9943", rm: "ASNT Level III verification" }, { d: "Magnetic Particle Yoke (AC/DC)", q: 4, r: 280.0, sns: "MY-101 to MY-104", rm: "10 lb & 40 lb lift test" }, { d: "Coating Thickness Gauge (Elcometer)", q: 6, r: 220.0, sns: "ELC-01 to ELC-06", rm: "Calibration foil certified" }, { d: "Digital Hardness Tester", q: 3, r: 450.0, sns: "HT-4001 to HT-4003", rm: "Standard test block included" }], tc: TC_STANDARD, vat: 15, status: "Under Process", notes: "Testing ongoing at Hadeed rolling mill workshop.", closing: "We hope that our proposal meets your requirements.", sign: true, via: "Email", clientCode: "SAB-HADEED", svc: "NDT & Calibration", dept: "Quality Control", spDept: "Steel Mill 2" },
  { id: "q-uic-2", type: "std", ref: "UIC/L/2", date: "2026-10-15", client: "Rawabi Electric", attn: "Mr. Sameer Khan", location: "Dammam 2nd Industrial City", title: "QUOTATION FOR INSPECTION SERVICES", delivery: "Within 3 days after receipt of instruments.", service: "Laboratory calibration at Jubail UIC lab.", intro: "Dear Sir, Thank you very much for your inquiry regarding our services.", items: [{ d: "Digital Multimeter (Fluke 87V)", q: 5, r: 250.0, sns: "FLK-7121 to FLK-7125", rm: "ISO 17025 Traceable" }, { d: "Insulation Resistance Tester 5kV (Megger)", q: 2, r: 550.0, sns: "MEG-5001, MEG-5002", rm: "High voltage verification" }, { d: "Torque Wrench (100-500 Nm)", q: 3, r: 320.0, sns: "TW-201 to TW-203", rm: "Clockwise & Counter-clockwise" }], tc: TC_STANDARD, vat: 15, status: "Completed", notes: "Invoice paid in full; instruments dispatched.", closing: "We hope that our proposal meets your requirements.", sign: true, via: "Hand Delivery", clientCode: "RAW-ELEC", svc: "Electrical Calibration", dept: "Switchgear Plant", spDept: "Testing Lab" },
  { id: "q-uic-1", type: "std", ref: "UIC/L/1", date: "2026-10-04", client: "Nesma & Partners", attn: "Eng. Abdullah Al-Mansoor", location: "NEOM Community 2", title: "QUOTATION FOR INSPECTION SERVICES", delivery: "On-site lifting equipment inspection.", service: "Crane and lifting accessories load testing.", intro: "Dear Sir, Thank you very much for your inquiry regarding our services.", items: [{ d: "Mobile Crane Annual Thorough Examination (100 Ton)", q: 2, r: 2200.0, sns: "CR-100-A, CR-100-B", rm: "LEEA Certified Inspector" }, { d: "Shackle & Webbing Slings Inspection Lot", q: 2, r: 1500.0, sns: "Batch 2026-NEOM-01, Batch 2026-NEOM-02", rm: "Proof load test & color coding" }, { d: "Forklift Safety Inspection", q: 4, r: 300.0, sns: "FL-01 to FL-04", rm: "Brake & stability test" }], tc: TC_STANDARD, vat: 15, status: "Lost", notes: "Client opted for local on-site provider.", closing: "We hope that our proposal meets your requirements.", sign: false, via: "Email", clientCode: "NES-09", svc: "Lifting Gear Examination", dept: "Heavy Equipment", spDept: "NEOM Site" },
];

export const INITIAL_PRICE_BOOKS: Record<string, CompanyPriceBook> = {
  majan: { name: "Majan", items: { "electric hoist": { d: "Electric Hoist", bd: "Electric Hoist", c: "eh", r: 26.0, date: "2026-11-03", h: [{ r: 26.0, date: "2026-11-03", ref: "UIC/L/5", src: "quote" }] }, "chain block": { d: "Chain Block 5 Ton", bd: "Chain Block 5 Ton", c: "cb", r: 45.0, date: "2026-10-10", h: [{ r: 45.0, date: "2026-10-10", ref: "UIC/L/PAST", src: "quote" }] } } },
  "saudi aramco tanajib gas plant": { name: "Saudi Aramco (Tanajib Gas Plant)", items: { "safety relief valve 2 300": { d: "Safety Relief Valve 2\" 300#", bd: "Safety Relief Valve", sz: "2\"", cl: "300#", c: "srv-2", r: 350.0, date: "2026-10-28", h: [{ r: 350.0, date: "2026-10-28", ref: "UIC/L/4", src: "quote" }] }, "safety relief valve 3 600": { d: "Safety Relief Valve 3\" 600#", bd: "Safety Relief Valve", sz: "3\"", cl: "600#", c: "srv-3", r: 480.0, date: "2026-10-28", h: [{ r: 480.0, date: "2026-10-28", ref: "UIC/L/4", src: "quote" }] }, "thermal relief valve 1 5 150": { d: "Thermal Relief Valve 1.5\" 150#", bd: "Thermal Relief Valve", sz: "1.5\"", cl: "150#", c: "trv-1", r: 270.0, date: "2026-10-28", h: [{ r: 270.0, date: "2026-10-28", ref: "UIC/L/4", src: "quote" }] } } },
  "sabic hadeed iron steel": { name: "SABIC (Hadeed Iron & Steel)", items: { "ultrasonic flaw detector calibration": { d: "Ultrasonic Flaw Detector Calibration", bd: "Ultrasonic Flaw Detector Calibration", c: "ut", r: 650.0, date: "2026-10-22", h: [{ r: 650.0, date: "2026-10-22", ref: "UIC/L/3", src: "quote" }] }, "magnetic particle yoke ac dc": { d: "Magnetic Particle Yoke (AC/DC)", bd: "Magnetic Particle Yoke (AC/DC)", c: "mpy", r: 280.0, date: "2026-10-22", h: [{ r: 280.0, date: "2026-10-22", ref: "UIC/L/3", src: "quote" }] } } },
  "rawabi electric": { name: "Rawabi Electric", items: { "digital multimeter fluke 87v": { d: "Digital Multimeter (Fluke 87V)", bd: "Digital Multimeter (Fluke 87V)", c: "dmm", r: 250.0, date: "2026-10-15", h: [{ r: 250.0, date: "2026-10-15", ref: "UIC/L/2", src: "quote" }] }, "torque wrench 100 500 nm": { d: "Torque Wrench (100-500 Nm)", bd: "Torque Wrench (100-500 Nm)", c: "tw", r: 320.0, date: "2026-10-15", h: [{ r: 320.0, date: "2026-10-15", ref: "UIC/L/2", src: "quote" }] } } },
};

export const INITIAL_DATABASE: AppDatabase = { quotes: INITIAL_QUOTES, set: DEFAULT_SETTINGS, prices: INITIAL_PRICE_BOOKS, pb: 1 };
