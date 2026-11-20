const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  isPackaged: () => ipcRenderer.sendSync('is-packaged'),
  // Auto-update
  checkForUpdates: () => ipcRenderer.invoke('check-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  onUpdateAvailable: (callback) => {
    const subscription = (_, data) => callback(data);
    ipcRenderer.on('update-available', subscription);
    return () => ipcRenderer.removeListener('update-available', subscription);
  },
  onDownloadProgress: (callback) => {
    const subscription = (_, data) => callback(data);
    ipcRenderer.on('download-progress', subscription);
    return () => ipcRenderer.removeListener('download-progress', subscription);
  },
  onUpdateDownloaded: (callback) => {
    const subscription = (_, data) => callback(data);
    ipcRenderer.on('update-downloaded', subscription);
    return () => ipcRenderer.removeListener('update-downloaded', subscription);
  },
  onError: (callback) => {
    const subscription = (_, data) => callback(data);
    ipcRenderer.on('update-error', subscription);
    return () => ipcRenderer.removeListener('update-error', subscription);
  },
  // Troubleshoot
  diagnoseSystem: () => ipcRenderer.invoke('diagnose-system'),
  clearCache: () => ipcRenderer.invoke('clear-cache'),
  resetAppData: () => ipcRenderer.invoke('reset-app-data'),
  openLogsFolder: () => ipcRenderer.invoke('open-logs-folder'),
  // Platform info
  getPlatform: () => process.platform,
  getProcessMemoryUsage: () => process.memoryUsage().heapUsed / 1024 / 1024,
});
