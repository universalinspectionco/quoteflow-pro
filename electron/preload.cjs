const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  getName: () => ipcRenderer.invoke('app:getName'),
  quit: () => ipcRenderer.invoke('app:quit'),
  minimize: () => ipcRenderer.invoke('app:minimize'),
  maximize: () => ipcRenderer.invoke('app:maximize'),
  isMaximized: () => ipcRenderer.invoke('app:isMaximized'),
  close: () => ipcRenderer.invoke('app:close'),

  showOpenDialog: (options) => ipcRenderer.invoke('dialog:showOpen', options),
  showSaveDialog: (options) => ipcRenderer.invoke('dialog:showSave', options),
  showMessageBox: (options) => ipcRenderer.invoke('dialog:showMessage', options),

  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
  openPath: (path) => ipcRenderer.invoke('shell:openPath', path),

  readFile: (path) => ipcRenderer.invoke('fs:readFile', path),
  writeFile: (path, content) => ipcRenderer.invoke('fs:writeFile', path, content),
  exists: (path) => ipcRenderer.invoke('fs:exists', path),
  mkdir: (path) => ipcRenderer.invoke('fs:mkdir', path),
  listDir: (path) => ipcRenderer.invoke('fs:listDir', path),

  onUpdateAvailable: (callback) => {
    ipcRenderer.on('update:available', callback)
    return () => ipcRenderer.off('update:available', callback)
  },
  onUpdateDownloaded: (callback) => {
    ipcRenderer.on('update:downloaded', callback)
    return () => ipcRenderer.off('update:downloaded', callback)
  },
})

contextBridge.exposeInMainWorld('nodeAPI', {
  platform: process.platform,
  versions: process.versions,
})