/// <reference types="vite/client" />
/// <reference types="@vitejs/plugin-react" />

interface ImportMetaEnv {
  readonly VITE_APP_VERSION: string
  readonly VITE_APP_NAME: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.svg' {
  import React from 'react'
  export const ReactComponent: React.FC<React.SVGProps<SVGSVGElement>>
  const src: string
  export default src
}

declare module '*.png' {
  const src: string
  export default src
}

declare module '*.jpg' {
  const src: string
  export default src
}

declare module '*.ico' {
  const src: string
  export default src
}

/** Shape exposed by electron/preload.cjs via contextBridge. */
interface ElectronOpenDialogResult {
  canceled: boolean
  filePaths: string[]
}

interface ElectronSaveDialogResult {
  canceled: boolean
  filePath?: string
}

interface ElectronFileEntry {
  name: string
  isDirectory: boolean
  isFile: boolean
}

interface ElectronApi {
  getVersion: () => Promise<string>
  getName: () => Promise<string>
  quit: () => Promise<void>
  minimize: () => void
  maximize: () => void
  isMaximized: () => Promise<boolean>
  close: () => void
  showOpenDialog: (options: any) => Promise<ElectronOpenDialogResult>
  showOpenFolder: (options?: any) => Promise<ElectronOpenDialogResult>
  showSaveDialog: (options: any) => Promise<ElectronSaveDialogResult>
  showMessageBox: (options: any) => Promise<any>
  openExternal: (url: string) => Promise<void>
  openPath: (path: string) => Promise<void>
  readFile: (path: string) => Promise<string | null>
  readFileBase64: (path: string) => Promise<string | null>
  writeFile: (path: string, content: string) => Promise<boolean>
  exists: (path: string) => Promise<boolean>
  mkdir: (path: string) => Promise<boolean>
  listDir: (path: string) => Promise<ElectronFileEntry[]>
  onUpdateAvailable: (callback: () => void) => () => void
  onUpdateDownloaded: (callback: () => void) => () => void
}

interface Window {
  electronAPI?: ElectronApi
}