import type {
  AppState,
  BackupPayload,
  Company,
  PriceBookItem,
  Quotation,
  Settings,
  UserPreferences,
} from '@/types'

/**
 * JSON backup / restore helpers shared by Settings and the Command Palette.
 * Every filesystem call goes through the Electron preload bridge; a browser
 * download/upload fallback keeps the workflows usable in `npm run dev`.
 */

const BACKUP_APP = 'QuoteFlow Pro'
const BACKUP_VERSION = 3

export interface BackupData {
  settings?: Settings
  preferences?: UserPreferences
  quotations?: Quotation[]
  priceBook?: PriceBookItem[]
  companies?: Company[]
  activeCompanyId?: string
}

type BackupSource = Pick<
  AppState,
  'settings' | 'preferences' | 'quotations' | 'priceBook' | 'companies' | 'activeCompanyId'
>

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const stamp = () => new Date().toISOString().slice(0, 10)

const defaultFileName = () => `QuoteFlow_Backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`

export function createBackup(state: BackupSource): BackupPayload {
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    settings: state.settings,
    preferences: state.preferences,
    quotations: state.quotations,
    priceBook: state.priceBook,
    companies: state.companies,
    activeCompanyId: state.activeCompanyId,
  }
}

export function serializeBackup(payload: BackupPayload): string {
  return JSON.stringify(payload, null, 2)
}

/** Parses a backup file and returns only well-formed sections. */
export function parseBackup(content: string): BackupData {
  const parsed: unknown = JSON.parse(content.replace(/^\uFEFF/, '').trim())
  if (!isRecord(parsed)) throw new Error('Backup file does not contain a JSON object')

  const root = isRecord(parsed.state) ? parsed.state : parsed
  const result: BackupData = {}

  if (isRecord(root.settings)) result.settings = root.settings as unknown as Settings
  if (isRecord(root.preferences)) result.preferences = root.preferences as unknown as UserPreferences
  if (Array.isArray(root.quotations)) result.quotations = root.quotations as Quotation[]
  if (Array.isArray(root.quotes)) result.quotations = root.quotes as Quotation[]
  if (Array.isArray(root.priceBook)) result.priceBook = root.priceBook as PriceBookItem[]
  if (Array.isArray(root.companies)) result.companies = root.companies as Company[]
  if (typeof root.activeCompanyId === 'string') result.activeCompanyId = root.activeCompanyId

  if (
    !result.settings &&
    !result.preferences &&
    !result.quotations &&
    !result.priceBook &&
    !result.companies
  ) {
    throw new Error('No recognizable data found in this backup file')
  }
  return result
}

function browserDownload(fileName: string, content: string): boolean {
  if (typeof document === 'undefined') return false
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
  return true
}

/** Saves a backup through Electron, or downloads it in a browser. */
export async function saveBackup(payload: BackupPayload): Promise<boolean> {
  const content = serializeBackup(payload)
  const api = window.electronAPI
  if (api?.showSaveDialog && api.writeFile) {
    const selected = await api.showSaveDialog({
      title: 'Save QuoteFlow Pro Backup',
      defaultPath: defaultFileName(),
      filters: [{ name: 'JSON Backup', extensions: ['json'] }],
    })
    if (selected.canceled || !selected.filePath) return false
    return api.writeFile(selected.filePath, content)
  }
  return browserDownload(defaultFileName(), content)
}

function browserPickFile(): Promise<string | null> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve(null)
      return
    }
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,application/json'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) {
        resolve(null)
        return
      }
      file.text().then(resolve).catch(() => resolve(null))
    }
    input.click()
  })
}

/** Reads a backup file through Electron, or via a browser file picker. */
export async function pickBackupFile(): Promise<string | null> {
  const api = window.electronAPI
  if (api?.showOpenDialog && api.readFile) {
    const selected = await api.showOpenDialog({
      title: 'Restore QuoteFlow Pro Backup',
      filters: [{ name: 'JSON Backup', extensions: ['json'] }],
      properties: ['openFile'],
    })
    if (selected.canceled || selected.filePaths.length === 0) return null
    return api.readFile(selected.filePaths[0])
  }
  return browserPickFile()
}

export async function pickBackupFolder(): Promise<string | null> {
  const api = window.electronAPI
  if (!api?.showOpenDialog) return null
  const selected = api.showOpenFolder
    ? await api.showOpenFolder({ title: 'Choose Local Backup Folder' })
    : await api.showOpenDialog({
        title: 'Choose Local Backup Folder',
        properties: ['openDirectory', 'createDirectory'],
      })
  if (selected.canceled || selected.filePaths.length === 0) return null
  return selected.filePaths[0]
}

export async function listBackupFiles(folder: string): Promise<string[]> {
  const api = window.electronAPI
  if (!api?.listDir || !folder) return []
  const entries = await api.listDir(folder)
  return entries
    .filter((entry) => entry.isFile && entry.name.toLowerCase().endsWith('.json'))
    .map((entry) => entry.name)
    .sort((a, b) => b.localeCompare(a))
}

function joinPath(folder: string, fileName: string): string {
  const separator = /^[a-zA-Z]:[\\/]/.test(folder) ? '\\' : '/'
  return `${folder.replace(/[\\/]+$/, '')}${separator}${fileName}`
}

export async function saveBackupToFolder(payload: BackupPayload, folder: string): Promise<string | null> {
  const api = window.electronAPI
  if (!api?.writeFile || !folder) return null
  const fileName = `QuoteFlow_Backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  const path = joinPath(folder, fileName)
  return (await api.writeFile(path, serializeBackup(payload))) ? path : null
}

export async function readBackupFromFolder(folder: string, fileName: string): Promise<string | null> {
  const api = window.electronAPI
  if (!api?.readFile || !folder || !fileName) return null
  return api.readFile(joinPath(folder, fileName))
}

export async function openBackupFolder(folder: string): Promise<boolean> {
  const api = window.electronAPI
  if (!api?.openPath || !folder) return false
  await api.openPath(folder)
  return true
}

export { defaultFileName, stamp }
