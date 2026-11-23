"use client"

import { motion, AnimatePresence } from 'motion/react'
import { useState, useRef, useEffect } from 'react'
import {
  Search,
  Sun,
  Moon,
  User,
  Menu,
  ChevronDown,
  Download,
  Upload,
  RotateCcw,
  Zap,
  Keyboard,
  Settings,
  Minimize,
  Maximize,
  X,
} from 'lucide-react'
import { useStore } from '@/services/store'
import { useTheme } from '@/hooks/useTheme'

declare global {
  interface Window {
    electronAPI?: {
      minimize: () => void
      maximize: () => void
      close: () => void
      showOpenDialog: (options: any) => Promise<any>
      showSaveDialog: (options: any) => Promise<any>
      readFile: (path: string) => Promise<string | null>
      writeFile: (path: string, content: string) => Promise<boolean>
      isMaximized: () => Promise<boolean>
    }
  }
}

export function Header() {
  const { currentView, setView, addToast } = useStore()
  const { theme, setTheme, themes } = useTheme()
  const [searchQuery, setSearchQuery] = useState('')
  const [showThemePicker, setShowThemePicker] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const themePickerRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
      }
      if (e.key === 'Escape') {
        setShowThemePicker(false)
        setShowUserMenu(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (themePickerRef.current && !themePickerRef.current.contains(e.target as Node)) {
        setShowThemePicker(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const viewLabels: Record<string, string> = {
    dashboard: 'Dashboard',
    quotes: 'Quotations',
    editor: 'Editor',
    pricebook: 'Price Book',
    reports: 'Reports',
    settings: 'Settings',
    'ai-studio': 'AI Studio',
    diagnostics: 'Diagnostics',
  }

  const toggleTheme = () => {
    const currentIndex = themes.findIndex((t) => t.id === theme)
    const nextIndex = (currentIndex + 1) % themes.length
    setTheme(themes[nextIndex].id)
  }

  const handleExport = async () => {
    addToast({ type: 'info', title: 'Export Started', message: 'Preparing data export...' })
  }

  const handleImport = async () => {
    addToast({ type: 'info', title: 'Import Ready', message: 'Select file to import...' })
  }

  const handleMinimize = () => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      window.electronAPI.minimize()
    }
  }

  const handleMaximize = () => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      window.electronAPI.maximize()
    }
  }

  const handleClose = () => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      window.electronAPI.close()
    }
  }

  return (
    <header className="glass-elevated h-16 flex items-center justify-between px-4 md:px-6 border-b border-border-subtle" style={{ paddingRight: 140 }}>
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        <motion.button
          onClick={() => setView('dashboard')}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="glass-hover p-2 rounded-xl md:hidden"
          aria-label="Menu"
        >
          <Menu className="w-5 h-5" />
        </motion.button>

        <div className="relative flex-1 max-w-md hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search quotes, clients, items... (⌘K)"
            className="w-full glass-hover pl-10 pr-4 py-2 rounded-xl text-sm focus-ring transition-all"
            aria-label="Search"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-1 px-2 py-0.5 rounded bg-bg-secondary text-xs text-text-muted font-mono">
            <Keyboard className="w-4 h-4" />K
          </kbd>
        </div>

        <motion.div
          animate={{ opacity: currentView !== 'dashboard' ? 1 : 0, width: currentView !== 'dashboard' ? 'auto' : 0 }}
          className="hidden md:flex items-center gap-2 overflow-hidden"
        >
          <span className="text-sm font-medium text-text-secondary">{viewLabels[currentView]}</span>
        </motion.div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative" ref={themePickerRef}>
          <motion.button
            onClick={() => setShowThemePicker(!showThemePicker)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="glass-hover p-2 rounded-xl focus-ring relative"
            aria-label="Change theme"
            aria-expanded={showThemePicker}
          >
            <Zap className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
          </motion.button>

          <AnimatePresence>
            {showThemePicker && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                className="absolute right-0 top-full mt-2 w-56 glass-elevated rounded-xl p-2 shadow-elevated border border-border-default z-[100]"
                role="menu"
              >
                <p className="px-2 py-1 text-xs font-medium text-text-muted uppercase tracking-wider">Themes</p>
                {themes.map((t) => (
                  <motion.button
                    key={t.id}
                    onClick={() => { setTheme(t.id); setShowThemePicker(false) }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full flex items-center gap-3 p-2 rounded-lg transition-all ${
                      theme === t.id ? 'bg-primary/15 text-primary' : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
                    }`}
                    role="menuitem"
                    aria-selected={theme === t.id}
                  >
                    <div className="w-3 h-3 rounded-full" style={{ background: t.gradient }} />
                    <span className="text-sm font-medium">{t.label}</span>
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="glass-hover p-2 rounded-xl focus-ring"
          onClick={handleExport}
          aria-label="Export data"
        >
          <Download className="w-5 h-5" />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="glass-hover p-2 rounded-xl focus-ring"
          onClick={handleImport}
          aria-label="Import data"
        >
          <Upload className="w-5 h-5" />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="glass-hover p-2 rounded-xl focus-ring"
          onClick={toggleTheme}
          aria-label="Toggle dark/light mode"
        >
          {theme === 'arctic' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </motion.button>

        <div className="relative" ref={userMenuRef}>
          <motion.button
            onClick={() => setShowUserMenu(!showUserMenu)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="glass-hover flex items-center gap-2 px-3 py-2 rounded-xl focus-ring"
            aria-label="User menu"
            aria-expanded={showUserMenu}
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <span className="hidden md:block text-sm font-medium">UIC User</span>
            <ChevronDown className="w-4 h-4 text-text-muted" />
          </motion.button>

          <AnimatePresence>
            {showUserMenu && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                className="absolute right-0 top-full mt-2 w-48 glass-elevated rounded-xl p-1 shadow-elevated border border-border-default z-[100]"
                role="menu"
              >
                <motion.button
                  onClick={() => { setView('settings'); setShowUserMenu(false) }}
                  whileHover={{ backgroundColor: 'var(--color-bg-tertiary)' }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary focus-ring"
                  role="menuitem"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </motion.button>
                <motion.button
                  onClick={() => { setView('diagnostics'); setShowUserMenu(false) }}
                  whileHover={{ backgroundColor: 'var(--color-bg-tertiary)' }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary focus-ring"
                  role="menuitem"
                >
                  <RotateCcw className="w-4 h-4" />
                  Diagnostics
                </motion.button>
                <hr className="border-border-subtle my-1" />
                <div className="px-3 py-2 text-xs text-text-muted">
                  QuoteFlow Pro v3.0.0
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Window Controls */}
        <div className="flex items-center gap-1 ml-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleMinimize}
            className="glass-hover p-1.5 rounded-lg focus-ring text-text-secondary hover:text-text-primary"
            aria-label="Minimize"
          >
            <Minimize className="w-4 h-4" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleMaximize}
            className="glass-hover p-1.5 rounded-lg focus-ring text-text-secondary hover:text-text-primary"
            aria-label="Maximize"
          >
            <Maximize className="w-4 h-4" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleClose}
            className="glass-hover p-1.5 rounded-lg focus-ring text-text-secondary hover:text-error"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </motion.button>
        </div>
      </div>
    </header>
  )
}
