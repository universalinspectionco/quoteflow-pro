/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY: string;
  readonly RELEASES_URL: string;
  readonly PACKAGE_VERSION: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  electronAPI?: {
    getAppVersion: () => Promise<string>;
    isPackaged: () => boolean;
    checkForUpdates: () => Promise<any>;
    downloadUpdate: () => Promise<any>;
    installUpdate: () => Promise<void>;
    onUpdateAvailable: (callback: (data: any) => void) => () => void;
    onDownloadProgress: (callback: (data: any) => void) => () => void;
    onUpdateDownloaded: (callback: (data: any) => void) => () => void;
    onError: (callback: (data: any) => void) => () => void;
    diagnoseSystem: () => Promise<any>;
    clearCache: () => Promise<void>;
    resetAppData: () => Promise<void>;
    openLogsFolder: () => Promise<void>;
    getPlatform: () => string;
    getProcessMemoryUsage: () => number;
  };
  Toast?: { show: (msg: string, type?: string) => void };
}