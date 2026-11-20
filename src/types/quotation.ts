export type QuoteType = 'std' | 'valve';

export type QuoteStatus =
  | 'Draft'
  | 'Waiting For PO'
  | 'Job Received'
  | 'Under Process'
  | 'Completed'
  | 'Lost';

export interface LineItem {
  d: string;
  q: number;
  r: number;
  sns?: string;
  sz?: string;
  cl?: string;
  rm?: string;
}

export interface Quotation {
  id: string;
  type: QuoteType;
  ref: string;
  date: string;
  client: string;
  attn: string;
  location: string;
  title: string;
  sub?: string;
  revised?: boolean;
  rateNote?: string;
  vatNote?: string;
  showTot?: boolean;
  showRm?: boolean;
  via?: string;
  clientCode?: string;
  svc?: string;
  dept?: string;
  spDept?: string;
  delivery: string;
  service: string;
  intro: string;
  items: LineItem[];
  tc: string;
  vat: number;
  status: QuoteStatus;
  notes: string;
  closing: string;
  sign: boolean;
  isNew?: boolean;
}

export interface PriceHistoryEntry {
  r: number;
  date: string;
  ref: string;
  src?: string;
}

export interface PriceBookItem {
  d: string;
  bd?: string;
  sz?: string;
  cl?: string;
  c?: string;
  r: number;
  date: string;
  h: PriceHistoryEntry[];
}

export interface CompanyPriceBook {
  name: string;
  items: Record<string, PriceBookItem>;
}

export type AppTheme =
  | 'terminal' | 'frosted' | 'navy' | 'ocean' | 'anime'
  | 'mechanical' | 'car' | 'slate' | 'emerald' | 'midnight'
  | 'sapphire' | 'amber';

export type UiTheme = 'dark' | 'light';

export interface Settings {
  tc: string;
  prefix: string;
  next: number;
  delivery: string;
  service: string;
  intro: string;
  closing: string;
  title: string;
  vat: number;
  signer: string;
  role: string;
  sig: string;
  hdr: string;
  ftr: string;
  wm: string;
  v: number;
  lh: 'band' | 'orig' | 'none';
  titleV: string;
  subV: string;
  rateNote: string;
  vatNote: string;
  tcv: string;
  defaultStoragePath?: string;
  defaultFolderName?: string;
  storageSaveMode?: 'dialog' | 'direct' | 'download';
  autoSyncDatabaseFile?: boolean;
  theme?: AppTheme;
  uiTheme?: UiTheme;
  lang?: 'en' | 'ar';
  bgType?: 'image' | 'video' | 'canvas';
  bgImage?: string;
  bgVideoUrl?: string;
  bgAnimationPreset?: string;
  bgPlayState?: 'playing' | 'paused';
  bgPlaybackSpeed?: number;
  bgOpacity?: number;
  bgBlur?: number;
  bgOverlay?: 'light' | 'dark' | 'theme' | 'none';
}

export interface SessionStats {
  lastLogin: string;
  totalSessions: number;
  totalQuotationsCreated: number;
  startDate: string;
}

export interface AppDatabase {
  quotes: Quotation[];
  set: Settings;
  prices: Record<string, CompanyPriceBook>;
  pb?: number;
  stats?: SessionStats;
}
