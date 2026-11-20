import { Settings } from '../types/quotation';

const IDB_NAME = 'quoteflow_storage_db';
const IDB_STORE = 'handles';
const DIR_KEY = 'default_storage_directory';

function openHandleDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB not supported'));
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(IDB_STORE)) req.result.createObjectStore(IDB_STORE); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function storeDirHandle(handle: any): Promise<void> {
  try {
    const db = await openHandleDb();
    return new Promise((res, rej) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      const putReq = store.put(handle, DIR_KEY);
      putReq.onsuccess = () => { res(); db.close(); };
      putReq.onerror = () => { rej(putReq.error); db.close(); };
    });
  } catch {}
}

async function getStoredDirHandle(): Promise<any | null> {
  try {
    const db = await openHandleDb();
    return new Promise((res) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const getReq = store.get(DIR_KEY);
      getReq.onsuccess = () => { res((getReq as any).result || null); db.close(); };
      getReq.onerror = () => { res(null); db.close(); };
    });
  } catch { return null; }
}

async function removeDirHandle(): Promise<void> {
  try {
    const db = await openHandleDb();
    return new Promise((res, rej) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      const delReq = store.delete(DIR_KEY);
      delReq.onsuccess = () => { res(); db.close(); };
      delReq.onerror = () => { rej(delReq.error); db.close(); };
    });
  } catch {}
}

export interface SaveFileOptions { blob: Blob; filename: string; mimeType: string; description: string; extension: string; settings?: Settings; modeOverride?: 'dialog' | 'direct' | 'download'; }
export interface SaveResult { success: boolean; method: 'dialog' | 'direct' | 'download'; filename: string; folderName?: string; message: string; }

export class FileStorageService {
  private static cachedDirHandle: any = null;

  public static isFileSystemAccessSupported(): boolean {
    return typeof window !== 'undefined' && ('showSaveFilePicker' in window);
  }
  public static isDirectoryPickerSupported(): boolean {
    return typeof window !== 'undefined' && ('showDirectoryPicker' in window);
  }

  public static async selectDefaultDirectory(): Promise<{ handle: any; name: string } | null> {
    if (!this.isDirectoryPickerSupported()) { alert('Your browser does not support the File System Access API. Please use Microsoft Edge, Google Chrome, or the standalone Windows desktop app.'); return null; }
    try {
      const handle = await (window as any).showDirectoryPicker({ mode: 'readwrite', startIn: 'documents' });
      if (handle.requestPermission) { const perm = await handle.requestPermission({ mode: 'readwrite' }); if (perm !== 'granted') { alert('Permission denied for selected folder.'); return null; } }
      this.cachedDirHandle = handle; await storeDirHandle(handle);
      return { handle, name: handle.name };
    } catch (e: any) {
      if (e.name === 'AbortError') return null;
      console.error('Directory selection failed:', e);
      alert(`Could not select folder: ${e.message || 'Unknown error'}`);
      return null;
    }
  }

  public static async getActiveDirectoryHandle(_requestIfPrompt = false): Promise<any | null> {
    if (this.cachedDirHandle) {
      try { const query = await this.cachedDirHandle.queryPermission?.({ mode: 'readwrite' }); if (query === 'granted') return this.cachedDirHandle; } catch {}
    }
    const stored = await getStoredDirHandle();
    if (stored) {
      try { const query = await stored.queryPermission?.({ mode: 'readwrite' }); if (query === 'granted') { this.cachedDirHandle = stored; return stored; } } catch {}
      this.cachedDirHandle = stored; return stored;
    }
    return null;
  }

  public static async disconnectDirectory(): Promise<void> { this.cachedDirHandle = null; await removeDirHandle(); }

  public static async saveFile(options: SaveFileOptions): Promise<SaveResult> {
    const { blob, filename, mimeType, description, extension, settings, modeOverride } = options;
    const saveMode = modeOverride || settings?.storageSaveMode || 'dialog';
    const dirHandle = await this.getActiveDirectoryHandle(false);

    if (saveMode === 'direct' && dirHandle) {
      try {
        const fh = await dirHandle.getFileHandle(filename, { create: true });
        const w = await fh.createWritable(); await w.write(blob); await w.close();
        return { success: true, method: 'direct', filename, folderName: dirHandle.name, message: `Saved to ${dirHandle.name}\\${filename}` };
      } catch (e: any) { console.warn('Direct save failed:', e); }
    }

    if (saveMode === 'dialog' || saveMode === 'direct') {
      if (this.isFileSystemAccessSupported()) {
        try {
          const pickerOpts: any = { suggestedName: filename, types: [{ description: description || 'Document', accept: { [mimeType]: [extension] } }] };
          if (dirHandle) pickerOpts.startIn = dirHandle;
          const fh = await (window as any).showSaveFilePicker(pickerOpts);
          const w = await fh.createWritable(); await w.write(blob); await w.close();
          return { success: true, method: 'dialog', filename: fh.name || filename, message: `Saved as: ${fh.name || filename}` };
        } catch (e: any) {
          if (e.name === 'AbortError') return { success: false, method: 'dialog', filename, message: 'Save cancelled by user.' };
          console.warn('Save dialog failed, falling back to download:', e);
        }
      }
    }

    try {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click();
      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1000);
      return { success: true, method: 'download', filename, message: `Downloaded: ${filename}` };
    } catch (e: any) { return { success: false, method: 'download', filename, message: `Failed: ${e?.message || 'Unknown'}` }; }
  }

  public static async syncDatabaseToDirectory(dbJsonStr: string): Promise<boolean> {
    const dirHandle = await this.getActiveDirectoryHandle(false);
    if (!dirHandle) return false;
    try {
      const fh = await dirHandle.getFileHandle('QuoteFlow_Database.json', { create: true });
      const w = await fh.createWritable(); await w.write(dbJsonStr); await w.close();
      return true;
    } catch { return false; }
  }
}