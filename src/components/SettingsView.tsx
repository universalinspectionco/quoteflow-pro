"use client"

import { motion, AnimatePresence } from 'motion/react'
import { useCallback, useEffect, useState } from 'react'
import {
  Building, FileText, PenTool, Palette, Hash, Shield, Database, Download, Upload, RotateCcw, Trash2, Save, Eye, Globe, Moon, Sun, Bell, Key, User, Plus, X, Folder, Check,
} from 'lucide-react'
import { useStore } from '@/services/store'
import { SignaturePad } from '@/components/SignaturePad'
import { CollapsibleSection } from '@/components/CollapsibleSection'
import {
  createBackup,
  listBackupFiles,
  openBackupFolder,
  parseBackup,
  pickBackupFile,
  pickBackupFolder,
  readBackupFromFolder,
  saveBackup,
  saveBackupToFolder,
} from '@/services/backup'
import { useTheme } from '@/hooks/useTheme'

const settingsSections = [
  { id: 'company', label: 'Company', icon: Building, description: 'Company information and details' },
  { id: 'letterhead', label: 'Letterhead', icon: FileText, description: 'Logo, header, footer, and background' },
  { id: 'signature', label: 'Signature', icon: PenTool, description: 'Authorized signatory details' },
  { id: 'branding', label: 'Branding', icon: Palette, description: 'Colors, fonts, theme, and appearance' },
  { id: 'numbering', label: 'Numbering', icon: Hash, description: 'Quotation numbering format' },
  { id: 'defaults', label: 'Defaults', icon: Shield, description: 'Default tax, currency, language, terms' },
  { id: 'storage', label: 'Local Storage', icon: Folder, description: 'Choose local folder for app data and exports' },
] as { id: string; label: string; description: string; icon: any }[]

export function SettingsView() {
  const {
    settings,
    updateSettings,
    preferences,
    updatePreferences,
    addToast,
    quotations,
    priceBook,
    companies,
    activeCompanyId,
    restoreBackup,
    resetSettings,
    setQuotations,
    setPriceBook,
  } = useStore()
  const { theme: currentTheme, setTheme, themes } = useTheme()
  const [activeSection, setActiveSection] = useState<'company' | 'letterhead' | 'signature' | 'branding' | 'numbering' | 'defaults' | 'storage'>('company')
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [backups, setBackups] = useState<string[]>([])
  const folder = preferences.backupFolder || ''

  const refreshBackups = useCallback(async () => {
    setBackups(await listBackupFiles(folder))
  }, [folder])

  useEffect(() => {
    void refreshBackups()
  }, [refreshBackups])

  const currentBackup = useCallback(
    () => createBackup({ settings, preferences, quotations, priceBook, companies, activeCompanyId }),
    [settings, preferences, quotations, priceBook, companies, activeCompanyId],
  )

  const handleSave = () => {
    addToast({ type: 'success', title: 'Settings Saved', message: 'All changes have been applied' })
  }

  const handleReset = () => {
    setShowResetConfirm(true)
  }

  const confirmReset = () => {
    resetSettings()
    addToast({ type: 'success', title: 'Reset Complete', message: 'Settings restored to 15% VAT / SAR defaults' })
    setShowResetConfirm(false)
  }

  const handleExportData = async () => {
    const saved = await saveBackup(currentBackup())
    addToast(saved
      ? { type: 'success', title: 'Backup Saved', message: 'JSON backup written successfully' }
      : { type: 'error', title: 'Backup Cancelled', message: 'No file was written' })
  }

  const handleImportData = async () => {
    try {
      const content = await pickBackupFile()
      if (!content) return
      restoreBackup(parseBackup(content))
      addToast({ type: 'success', title: 'Restore Complete', message: 'Backup data restored' })
    } catch (err) {
      console.error('Backup restore failed:', err)
      addToast({
        type: 'error',
        title: 'Restore Failed',
        message: err instanceof Error ? err.message : 'Could not read the backup file',
      })
    }
  }

  const handleClearData = () => {
    if (!window.confirm('Delete all quotations and price book items? This cannot be undone.')) return
    setQuotations([])
    setPriceBook([])
    addToast({ type: 'success', title: 'Data Cleared', message: 'Quotations and price book are empty' })
  }

  const handleChooseFolder = async () => {
    const picked = await pickBackupFolder()
    if (!picked) {
      addToast({ type: 'info', title: 'No Folder Selected', message: 'Folder selection was cancelled' })
      return
    }
    updatePreferences({ backupFolder: picked })
    addToast({ type: 'success', title: 'Backup Folder Set', message: picked })
  }

  const handleOpenFolder = async () => {
    if (!(await openBackupFolder(folder))) {
      addToast({ type: 'info', title: 'Folder Unavailable', message: 'Choose a local backup folder first' })
    }
  }

  const handleSaveToFolder = async () => {
    if (!folder) {
      addToast({ type: 'warning', title: 'No Folder Selected', message: 'Choose a local backup folder first' })
      return
    }
    const path = await saveBackupToFolder(currentBackup(), folder)
    if (!path) {
      addToast({ type: 'error', title: 'Backup Failed', message: 'Could not write to the selected folder' })
      return
    }
    await refreshBackups()
    addToast({ type: 'success', title: 'Backup Saved', message: path })
  }

  const handleRestoreFromFolder = async (name: string) => {
    try {
      const content = await readBackupFromFolder(folder, name)
      if (!content) throw new Error('Could not read the selected backup')
      restoreBackup(parseBackup(content))
      addToast({ type: 'success', title: 'Restore Complete', message: `${name} restored` })
    } catch (err) {
      console.error('Folder restore failed:', err)
      addToast({
        type: 'error',
        title: 'Restore Failed',
        message: err instanceof Error ? err.message : 'Could not restore this backup',
      })
    }
  }

  return (
    <div className="h-full flex flex-col animate-in">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-text-primary to-text-secondary bg-clip-text text-transparent">
            Settings
          </h1>
          <p className="text-text-muted mt-1">Configure your quotation manager preferences</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSave}
            className="glass-hover px-4 py-2 rounded-xl font-medium flex items-center gap-2 bg-primary text-white hover:bg-primary-hover"
          >
            <Save className="w-4 h-4" />
            Save Changes
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleReset}
            className="glass-hover px-4 py-2 rounded-xl font-medium flex items-center gap-2 text-error hover:bg-error/10 hover:border-error/30"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Defaults
          </motion.button>
        </div>
      </motion.div>

      <div className="flex-1 flex overflow-hidden">
        <motion.aside
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-64 glass-elevated border-r border-border-subtle flex flex-col overflow-y-auto"
        >
          <nav className="p-4 space-y-1" role="navigation" aria-label="Settings sections">
            {settingsSections.map(section => (
              <motion.button
                key={section.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveSection(section.id as any)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all ${
                  activeSection === section.id
                    ? 'bg-primary/15 border border-primary/30 text-primary'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary glass-hover'
                }`}
                role="tab"
                aria-selected={activeSection === section.id}
              >
                <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-bg-tertiary">
                  {section.icon && <section.icon className="w-5 h-5" />}
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium">{section.label}</p>
                  <p className="text-xs text-text-muted truncate">{section.description}</p>
                </div>
              </motion.button>
            ))}
          </nav>
          <div className="mt-auto p-4 border-t border-border-subtle">
            <div className="glass-hover p-3 rounded-xl border border-border-subtle">
              <p className="text-xs text-text-muted text-center">QuoteFlow Pro v3.0.0</p>
            </div>
          </div>
        </motion.aside>

        <motion.main
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex-1 overflow-y-auto p-6"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="max-w-4xl"
            >
              {activeSection === 'company' && <CompanySettingsForm settings={settings.company} onChange={updateSettings} />}
              {activeSection === 'letterhead' && <LetterheadSettingsForm settings={settings.letterhead} onChange={updateSettings} />}
              {activeSection === 'signature' && <SignatureSettingsForm settings={settings.signature} onChange={updateSettings} />}
              {activeSection === 'branding' && <BrandingSettingsForm settings={settings.branding} onChange={updateSettings} themes={themes} currentTheme={currentTheme} setTheme={setTheme} />}
              {activeSection === 'numbering' && <NumberingSettingsForm settings={settings.numbering} onChange={updateSettings} />}
              {activeSection === 'defaults' && (
                <DefaultsSettingsForm
                  settings={settings.defaults}
                  onChange={updateSettings}
                  onExport={handleExportData}
                  onImport={handleImportData}
                  onClear={handleClearData}
                />
              )}
              {activeSection === 'storage' && (
                <StorageSettingsForm
                  folder={folder}
                  backups={backups}
                  onChooseFolder={handleChooseFolder}
                  onOpenFolder={handleOpenFolder}
                  onSaveNow={handleSaveToFolder}
                  onRefresh={() => void refreshBackups()}
                  onRestore={handleRestoreFromFolder}
                  isElectron={Boolean(window.electronAPI?.showOpenDialog)}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </motion.main>
      </div>

      <AnimatePresence>
        {showResetConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowResetConfirm(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Confirm Reset"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="glass-elevated w-full max-w-md rounded-2xl shadow-elevated border border-border-default overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-error/20 text-error flex items-center justify-center mx-auto mb-4">
                  <RotateCcw className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Reset All Settings?</h3>
                <p className="text-text-muted mb-6">This will restore all settings to their default values. This action cannot be undone.</p>
                <div className="flex gap-3 justify-center">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowResetConfirm(false)}
                    className="glass-hover px-6 py-2 rounded-xl font-medium"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={confirmReset}
                    className="px-6 py-2 rounded-xl font-medium bg-error text-white hover:bg-error-hover"
                  >
                    Reset Everything
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function CompanySettingsForm({ settings, onChange }: { settings: any; onChange: (partial: any) => void }) {
  const update = (field: string, value: string) => onChange({ company: { ...settings, [field]: value } })

  return (
    <div className="space-y-6">
      <div className="glass-elevated p-6 rounded-2xl border border-border-subtle">
        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
          <Building className="w-5 h-5" />
          Company Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Company Name *</label>
            <input type="text" value={settings.name} onChange={e => update('name', e.target.value)} className="w-full glass-hover px-3 py-2 rounded-lg text-sm focus-ring bg-transparent border-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Phone *</label>
            <input type="tel" value={settings.phone} onChange={e => update('phone', e.target.value)} className="w-full glass-hover px-3 py-2 rounded-lg text-sm focus-ring bg-transparent border-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Email *</label>
            <input type="email" value={settings.email} onChange={e => update('email', e.target.value)} className="w-full glass-hover px-3 py-2 rounded-lg text-sm focus-ring bg-transparent border-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Website</label>
            <input type="url" value={settings.website || ''} onChange={e => update('website', e.target.value)} className="w-full glass-hover px-3 py-2 rounded-lg text-sm focus-ring bg-transparent border-none" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-text-secondary mb-2">Address *</label>
            <textarea value={settings.address} onChange={e => update('address', e.target.value)} rows={3} className="w-full glass-hover px-3 py-2 rounded-lg text-sm focus-ring bg-transparent border-none resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">VAT Number *</label>
            <input type="text" value={settings.vatNumber || ''} onChange={e => update('vatNumber', e.target.value)} className="w-full glass-hover px-3 py-2 rounded-lg text-sm focus-ring bg-transparent border-none" />
          </div>
        </div>
      </div>
    </div>
  )
}

function LetterheadSettingsForm({ settings, onChange }: { settings: any; onChange: (partial: any) => void }) {
  const update = (field: string, value: any) => onChange({ letterhead: { ...settings, [field]: value } })

  return (
    <div className="space-y-6">
      <div className="glass-elevated p-6 rounded-2xl border border-border-subtle">
        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Letterhead Configuration
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Logo Position</label>
            <select value={settings.logoPosition} onChange={e => update('logoPosition', e.target.value)} className="w-full glass-hover px-3 py-2 rounded-lg text-sm focus-ring bg-transparent border-none">
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={settings.showLogo} onChange={e => update('showLogo', e.target.checked)} className="w-4 h-4 rounded border-border-default text-primary focus:ring-primary" />
              <span className="text-sm font-medium text-text-secondary">Show Logo</span>
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Header Text</label>
            <input type="text" value={settings.headerText || ''} onChange={e => update('headerText', e.target.value)} className="w-full glass-hover px-3 py-2 rounded-lg text-sm focus-ring bg-transparent border-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Footer Text</label>
            <input type="text" value={settings.footerText || ''} onChange={e => update('footerText', e.target.value)} className="w-full glass-hover px-3 py-2 rounded-lg text-sm focus-ring bg-transparent border-none" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-text-secondary mb-2">Background Image URL</label>
            <input type="url" value={settings.backgroundImage || ''} onChange={e => update('backgroundImage', e.target.value)} className="w-full glass-hover px-3 py-2 rounded-lg text-sm focus-ring bg-transparent border-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Background Opacity</label>
            <input type="range" min="0" max="1" step="0.05" value={settings.backgroundOpacity} onChange={e => update('backgroundOpacity', parseFloat(e.target.value))} className="w-full" />
            <p className="text-sm text-text-muted mt-1">{Math.round(settings.backgroundOpacity * 100)}%</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function SignatureSettingsForm({ settings, onChange }: { settings: any; onChange: (partial: any) => void }) {
  const update = (field: string, value: any) => onChange({ signature: { ...settings, [field]: value } })

  return (
    <div className="space-y-6">
      <div className="glass-elevated p-6 rounded-2xl border border-border-subtle">
        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
          <PenTool className="w-5 h-5" />
          Authorized Signatory
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Name *</label>
            <input type="text" value={settings.name} onChange={e => update('name', e.target.value)} className="w-full glass-hover px-3 py-2 rounded-lg text-sm focus-ring bg-transparent border-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Designation *</label>
            <input type="text" value={settings.designation} onChange={e => update('designation', e.target.value)} className="w-full glass-hover px-3 py-2 rounded-lg text-sm focus-ring bg-transparent border-none" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-text-secondary mb-2">Signature Image URL</label>
            <input type="url" value={settings.signatureImage || ''} onChange={e => update('signatureImage', e.target.value)} className="w-full glass-hover px-3 py-2 rounded-lg text-sm focus-ring bg-transparent border-none" />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={settings.showSignature} onChange={e => update('showSignature', e.target.checked)} className="w-4 h-4 rounded border-border-default text-primary focus:ring-primary" />
              <span className="text-sm font-medium text-text-secondary">Show Signature on Documents</span>
            </label>
          </div>
        </div>
        <div className="md:col-span-2 mt-2">
          <CollapsibleSection
            title="Upload or draw a signature"
            summary={settings.signatureImage ? 'Signature image saved' : 'PNG/JPG/SVG upload or draw on canvas'}
          >
            <SignaturePad
              value={settings.signatureImage || ''}
              onChange={(dataUrl) => update('signatureImage', dataUrl)}
              label="Digital Signature"
            />
          </CollapsibleSection>
        </div>
      </div>
    </div>
  )
}

function BrandingSettingsForm({ settings, onChange, themes, currentTheme, setTheme }: { settings: any; onChange: (partial: any) => void; themes: any[]; currentTheme: string; setTheme: (t: string) => void }) {
  const update = (field: string, value: any) => onChange({ branding: { ...settings, [field]: value } })

  return (
    <div className="space-y-6">
      <div className="glass-elevated p-6 rounded-2xl border border-border-subtle">
        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
          <Palette className="w-5 h-5" />
          Theme & Appearance
        </h3>
        <div className="mb-6">
          <label className="block text-sm font-medium text-text-secondary mb-3">Theme Preset</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {themes.map(t => (
              <motion.button
                key={t.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => { setTheme(t.id); update('theme', t.id) }}
                className={`relative p-4 rounded-xl transition-all ${
                  currentTheme === t.id
                    ? 'ring-2 ring-primary shadow-glow'
                    : 'hover:bg-bg-tertiary hover:border-border-default glass-hover'
                } border-2`}
                style={{ borderColor: currentTheme === t.id ? 'var(--color-primary)' : 'var(--color-border-subtle)' }}
              >
                <div className="w-full h-10 rounded-lg mb-2" style={{ background: t.gradient }} />
                <span className="text-sm font-medium text-text-primary">{t.label}</span>
                {currentTheme === t.id && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </motion.button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Primary Color</label>
            <input type="color" value={settings.primaryColor} onChange={e => update('primaryColor', e.target.value)} className="w-full h-10 rounded-lg border border-border-subtle cursor-pointer" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Secondary Color</label>
            <input type="color" value={settings.secondaryColor} onChange={e => update('secondaryColor', e.target.value)} className="w-full h-10 rounded-lg border border-border-subtle cursor-pointer" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Accent Color</label>
            <input type="color" value={settings.accentColor} onChange={e => update('accentColor', e.target.value)} className="w-full h-10 rounded-lg border border-border-subtle cursor-pointer" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Border Radius</label>
            <select value={settings.borderRadius} onChange={e => update('borderRadius', e.target.value)} className="w-full glass-hover px-3 py-2 rounded-lg text-sm focus-ring bg-transparent border-none">
              <option value="sm">Small (6px)</option>
              <option value="md">Medium (10px)</option>
              <option value="lg">Large (16px)</option>
              <option value="xl">Extra Large (24px)</option>
              <option value="full">Full (Pill)</option>
            </select>
          </div>
        </div>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={settings.animationsEnabled} onChange={e => update('animationsEnabled', e.target.checked)} className="w-4 h-4 rounded border-border-default text-primary focus:ring-primary" />
            <span className="text-sm font-medium text-text-secondary">Enable Animations</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={settings.reducedMotion} onChange={e => update('reducedMotion', e.target.checked)} className="w-4 h-4 rounded border-border-default text-primary focus:ring-primary" />
            <span className="text-sm font-medium text-text-secondary">Reduced Motion</span>
          </label>
        </div>
      </div>

      <div className="glass-elevated p-6 rounded-2xl border border-border-subtle">
        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
          <Globe className="w-5 h-5" />
          Language & Regional
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Language</label>
            <select value={settings.language} onChange={e => update('language', e.target.value)} className="w-full glass-hover px-3 py-2 rounded-lg text-sm focus-ring bg-transparent border-none">
              <option value="en">English</option>
              <option value="ar">Arabic (العربية)</option>
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={settings.rtlEnabled} onChange={e => update('rtlEnabled', e.target.checked)} className="w-4 h-4 rounded border-border-default text-primary focus:ring-primary" />
              <span className="text-sm font-medium text-text-secondary">Enable RTL Layout</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}

function NumberingSettingsForm({ settings, onChange }: { settings: any; onChange: (partial: any) => void }) {
  const update = (field: string, value: any) => onChange({ numbering: { ...settings, [field]: value } })

  const preview = `${settings.prefix}${String(settings.currentNumber).padStart(4, '0')}${settings.suffix}`

  return (
    <div className="space-y-6">
      <div className="glass-elevated p-6 rounded-2xl border border-border-subtle">
        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
          <Hash className="w-5 h-5" />
          Quotation Numbering Format
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Prefix</label>
            <input type="text" value={settings.prefix} onChange={e => update('prefix', e.target.value)} className="w-full glass-hover px-3 py-2 rounded-lg text-sm focus-ring bg-transparent border-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Start Number</label>
            <input type="number" value={settings.startNumber} onChange={e => update('startNumber', parseInt(e.target.value))} min="1" className="w-full glass-hover px-3 py-2 rounded-lg text-sm focus-ring bg-transparent border-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Suffix</label>
            <input type="text" value={settings.suffix} onChange={e => update('suffix', e.target.value)} className="w-full glass-hover px-3 py-2 rounded-lg text-sm focus-ring bg-transparent border-none" />
          </div>
        </div>
        <div className="mt-4 p-4 glass-hover rounded-xl border border-border-subtle">
          <label className="block text-sm font-medium text-text-secondary mb-2">Preview</label>
          <div className="font-mono text-xl text-text-primary bg-bg-secondary px-4 py-3 rounded-lg inline-block">{preview}</div>
        </div>
      </div>

      <div className="glass-elevated p-6 rounded-2xl border border-border-subtle">
        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Format Template
        </h3>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">Format String</label>
          <input type="text" value={settings.format} onChange={e => update('format', e.target.value)} className="w-full glass-hover px-3 py-2 rounded-lg text-sm focus-ring bg-transparent border-none font-mono" />
          <p className="text-xs text-text-muted mt-1">Available placeholders: {"{"}PREFIX{"}"}, {"{"}NUMBER:0000{"}"}, {"{"}SUFFIX{"}"}</p>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-text-secondary mb-2">Current Number</label>
          <input type="number" value={settings.currentNumber} onChange={e => update('currentNumber', parseInt(e.target.value))} min="1" className="w-full glass-hover px-3 py-2 rounded-lg text-sm focus-ring bg-transparent border-none" />
        </div>
      </div>
    </div>
  )
}

function DefaultsSettingsForm({
  settings,
  onChange,
  onExport,
  onImport,
  onClear,
}: {
  settings: any
  onChange: (partial: any) => void
  onExport: () => void
  onImport: () => void
  onClear: () => void
}) {
  const update = (field: string, value: any) => onChange({ defaults: { ...settings, [field]: value } })

  return (
    <div className="space-y-6">
      <div className="glass-elevated p-6 rounded-2xl border border-border-subtle">
        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Default Values
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Default Tax Rate (%)</label>
            <input type="number" value={settings.taxRate} onChange={e => update('taxRate', parseFloat(e.target.value))} min="0" max="100" step="0.5" className="w-full glass-hover px-3 py-2 rounded-lg text-sm focus-ring bg-transparent border-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Default Currency</label>
            <select value={settings.currency} onChange={e => update('currency', e.target.value)} className="w-full glass-hover px-3 py-2 rounded-lg text-sm focus-ring bg-transparent border-none">
              <option value="AED">AED (UAE Dirham)</option>
              <option value="USD">USD (US Dollar)</option>
              <option value="EUR">EUR (Euro)</option>
              <option value="GBP">GBP (British Pound)</option>
              <option value="SAR">SAR (Saudi Riyal)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Date Format</label>
            <select value={settings.dateFormat} onChange={e => update('dateFormat', e.target.value)} className="w-full glass-hover px-3 py-2 rounded-lg text-sm focus-ring bg-transparent border-none">
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Payment Terms</label>
            <input type="text" value={settings.paymentTerms} onChange={e => update('paymentTerms', e.target.value)} className="w-full glass-hover px-3 py-2 rounded-lg text-sm focus-ring bg-transparent border-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Validity (Days)</label>
            <input type="number" value={settings.validityDays} onChange={e => update('validityDays', parseInt(e.target.value))} min="1" max="365" className="w-full glass-hover px-3 py-2 rounded-lg text-sm focus-ring bg-transparent border-none" />
          </div>
        </div>
      </div>

      <div className="glass-elevated p-6 rounded-2xl border border-border-subtle">
        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
          <Database className="w-5 h-5" />
          Data Management
        </h3>
        <div className="flex flex-wrap gap-3">
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="glass-hover px-4 py-2 rounded-xl font-medium flex items-center gap-2" onClick={onExport}>
            <Download className="w-4 h-4" />
            Export All Data
          </motion.button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="glass-hover px-4 py-2 rounded-xl font-medium flex items-center gap-2" onClick={onImport}>
            <Upload className="w-4 h-4" />
            Import Data
          </motion.button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="glass-hover px-4 py-2 rounded-xl font-medium flex items-center gap-2 text-error hover:bg-error/10 hover:border-error/30" onClick={onClear}>
            <Trash2 className="w-4 h-4" />
            Clear All Data
          </motion.button>
        </div>
      </div>
    </div>
  )
}

function StorageSettingsForm({
  folder,
  backups,
  onChooseFolder,
  onOpenFolder,
  onSaveNow,
  onRefresh,
  onRestore,
  isElectron,
}: {
  folder: string
  backups: string[]
  onChooseFolder: () => void
  onOpenFolder: () => void
  onSaveNow: () => void
  onRefresh: () => void
  onRestore: (name: string) => void
  isElectron: boolean
}) {
  return (
    <div className="space-y-6">
      <div className="glass-elevated p-6 rounded-2xl border border-border-subtle">
        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <Folder className="w-5 h-5" />
          Local Backup Folder
        </h3>
        <p className="text-sm text-text-muted mb-6">
          Choose a folder for JSON backups of your quotations, price book and settings.
        </p>
        {!isElectron && (
          <p className="mb-4 text-sm text-warning">
            Folder selection is available in the Electron desktop app. In a browser, use Export / Import instead.
          </p>
        )}
        <div className="p-4 glass-hover rounded-xl border border-border-subtle mb-4">
          <p className="text-xs text-text-muted mb-1">Selected folder</p>
          <p className="font-mono text-sm text-text-primary break-all">{folder || 'No folder selected'}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onChooseFolder} className="glass-hover px-4 py-2 rounded-xl font-medium flex items-center gap-2">
            <Folder className="w-4 h-4" />
            Choose Folder
          </motion.button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onOpenFolder} className="glass-hover px-4 py-2 rounded-xl font-medium flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Open Folder
          </motion.button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onSaveNow} className="glass-hover px-4 py-2 rounded-xl font-medium flex items-center gap-2 bg-primary text-white hover:bg-primary-hover">
            <Save className="w-4 h-4" />
            Save Backup Here
          </motion.button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onRefresh} className="glass-hover px-4 py-2 rounded-xl font-medium flex items-center gap-2">
            <RotateCcw className="w-4 h-4" />
            Refresh List
          </motion.button>
        </div>
      </div>

      <div className="glass-elevated p-6 rounded-2xl border border-border-subtle">
        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
          <Database className="w-5 h-5" />
          Backups in This Folder
        </h3>
        {backups.length === 0 ? (
          <p className="text-sm text-text-muted">No JSON backups found. Save a backup to see it here.</p>
        ) : (
          <div className="divide-y divide-border-subtle rounded-xl border border-border-subtle">
            {backups.map((name) => (
              <div key={name} className="flex items-center justify-between gap-3 p-3">
                <span className="text-sm text-text-primary font-mono truncate">{name}</span>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => onRestore(name)}
                  className="glass-hover px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 shrink-0"
                  title={`Restore ${name}`}
                >
                  <Upload className="w-3 h-3" />
                  Restore
                </motion.button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="glass-elevated p-6 rounded-2xl border border-border-subtle">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Check className="w-5 h-5" />
          Defaults Reminder
        </h3>
        <p className="text-sm text-text-muted">
          New quotations use 15% Saudi VAT and SAR. Restoring a backup keeps these defaults unless the backup explicitly changes them.
        </p>
      </div>
    </div>
  )
}