"use client"

import { motion, AnimatePresence } from 'motion/react'
import { useState, useEffect, useRef, useMemo } from 'react'
import { Command as CmdIcon, Search, ArrowUp, ArrowDown, Zap, FileText, Edit, Database, BarChart3, Settings, Sparkles, Stethoscope, Home, Plus, Download, Upload, RotateCcw, Moon, Sun, Keyboard } from 'lucide-react'
import { useStore } from '@/services/store'
import { useTheme } from '@/hooks/useTheme'

interface CommandItem {
  id: string
  label: string
  description: string
  icon: React.ReactNode
  shortcut?: string
  action: () => void
  keywords: string[]
  category: string
}

export function CommandPalette() {
  const { currentView, setView, addToast } = useStore()
  const { theme: currentTheme, setTheme, themes } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [items, setItems] = useState<CommandItem[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(true)
        setQuery('')
        setSelectedIndex(0)
      }
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  useEffect(() => {
    if (isOpen && listRef.current) {
      const selected = listRef.current.querySelector('[data-selected="true"]')
      selected?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [selectedIndex, isOpen])

  const filteredItems = useMemo(() => {
    if (!query) return items
    const q = query.toLowerCase()
    return items.filter((item) =>
      item.label.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.keywords.some((k) => k.toLowerCase().includes(q))
    )
  }, [items, query])

  useEffect(() => {
    const baseItems: CommandItem[] = [
      { id: 'new-quote', label: 'New Quotation', description: 'Create a new standard or valve quotation', icon: <Plus className="w-4 h-4" />, shortcut: '⌘N', action: () => setView('editor'), keywords: ['new', 'create', 'quote', 'quotation'], category: 'Quotations' },
      { id: 'view-quotes', label: 'View All Quotations', description: 'Browse and manage all quotations', icon: <FileText className="w-4 h-4" />, shortcut: '⌘1', action: () => setView('quotes'), keywords: ['view', 'list', 'quotes', 'quotations'], category: 'Quotations' },
      { id: 'edit-quote', label: 'Quote Editor', description: 'Open the quotation editor', icon: <Edit className="w-4 h-4" />, shortcut: '⌘3', action: () => setView('editor'), keywords: ['edit', 'editor', 'modify'], category: 'Quotations' },
      { id: 'price-book', label: 'Price Book', description: 'Manage price book items and history', icon: <Database className="w-4 h-4" />, shortcut: '⌘4', action: () => setView('pricebook'), keywords: ['price', 'book', 'rates', 'items'], category: 'Tools' },
      { id: 'dashboard', label: 'Dashboard', description: 'View analytics and overview', icon: <Home className="w-4 h-4" />, shortcut: '⌘D', action: () => setView('dashboard'), keywords: ['dashboard', 'home', 'overview', 'analytics'], category: 'Navigation' },
      { id: 'reports', label: 'Reports', description: 'Generate and view reports', icon: <BarChart3 className="w-4 h-4" />, shortcut: '⌘5', action: () => setView('reports'), keywords: ['reports', 'analytics', 'charts'], category: 'Navigation' },
      { id: 'ai-studio', label: 'AI Quote Studio', description: 'Generate quotations with AI', icon: <Sparkles className="w-4 h-4" />, shortcut: '⌘6', action: () => setView('ai-studio'), keywords: ['ai', 'artificial', 'intelligence', 'generate', 'smart'], category: 'AI' },
      { id: 'diagnostics', label: 'Diagnostics', description: 'Run system diagnostics and repairs', icon: <Stethoscope className="w-4 h-4" />, shortcut: '⌘7', action: () => setView('diagnostics'), keywords: ['diagnostics', 'health', 'repair', 'check'], category: 'Tools' },
      { id: 'settings', label: 'Settings', description: 'Configure application settings', icon: <Settings className="w-4 h-4" />, shortcut: '⌘8', action: () => setView('settings'), keywords: ['settings', 'preferences', 'config', 'options'], category: 'Settings' },
      { id: 'export', label: 'Export Data', description: 'Export all data as backup', icon: <Download className="w-4 h-4" />, shortcut: '⌘E', action: () => addToast({ type: 'info', title: 'Export Started', message: 'Preparing data export...' }), keywords: ['export', 'backup', 'download', 'save'], category: 'Data' },
      { id: 'import', label: 'Import Data', description: 'Import data from backup', icon: <Upload className="w-4 h-4" />, shortcut: '⌘I', action: () => addToast({ type: 'info', title: 'Import Ready', message: 'Select file to import...' }), keywords: ['import', 'restore', 'upload', 'load'], category: 'Data' },
      { id: 'toggle-theme', label: currentTheme === 'arctic' ? 'Switch to Dark Mode' : 'Switch to Light Mode', description: 'Toggle between light and dark theme', icon: currentTheme === 'arctic' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />, shortcut: '⌘T', action: () => { const next = themes.find((t) => t.id === 'arctic') ? 'glass' : 'arctic'; setTheme(next) }, keywords: ['theme', 'dark', 'light', 'mode', 'appearance'], category: 'Appearance' },
      { id: 'refresh', label: 'Refresh Data', description: 'Reload all data from storage', icon: <RotateCcw className="w-4 h-4" />, shortcut: '⌘R', action: () => addToast({ type: 'success', title: 'Refreshed', message: 'Data reloaded successfully' }), keywords: ['refresh', 'reload', 'sync', 'update'], category: 'Data' },
    ]
    setItems(baseItems)
    setSelectedIndex(0)
  }, [currentView, currentTheme, themes])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const filtered = filteredItems
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      filtered[selectedIndex]?.action()
      setIsOpen(false)
      setQuery('')
    } else if (e.key === 'Escape') {
      setIsOpen(false)
      setQuery('')
    }
  }

  const handleItemClick = (item: CommandItem) => {
    item.action()
    setIsOpen(false)
    setQuery('')
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-start justify-center pt-20"
        onClick={() => { setIsOpen(false); setQuery('') }}
        role="dialog"
        aria-modal="true"
        aria-label="Command Palette"
      >
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="glass-elevated w-full max-w-2xl mx-4 rounded-2xl shadow-elevated border border-border-default overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-3 p-4 border-b border-border-subtle">
            <div className="flex items-center gap-2 text-text-muted">
              <CmdIcon className="w-5 h-5" />
              <span className="text-sm font-mono text-text-muted px-2 py-0.5 rounded bg-bg-secondary">⌘K</span>
            </div>
            <motion.input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0) }}
              onKeyDown={handleKeyDown}
              placeholder="Type a command or search..."
              className="flex-1 bg-transparent border-none text-text-primary text-lg placeholder:text-text-muted focus:outline-none"
              autoFocus
              aria-label="Command input"
            />
            <kbd className="hidden sm:flex items-center gap-1 px-2 py-1 rounded bg-bg-secondary text-xs text-text-muted font-mono border border-border-subtle">
              <ArrowUp className="w-3 h-3" /> <ArrowDown className="w-3 h-3" /> Navigate &nbsp; <Keyboard className="w-3 h-3" /> Execute
            </kbd>
          </div>

          <div ref={listRef} className="max-h-96 overflow-y-auto">
            <AnimatePresence mode="popLayout">
              {filteredItems.length > 0 ? (
                <motion.ul
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="py-2"
                  role="listbox"
                >
                  {filteredItems.map((item, index) => (
                    <motion.li
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.02 }}
                    >
                      <motion.button
                        onClick={() => handleItemClick(item)}
                        whileHover={{ backgroundColor: 'var(--color-bg-tertiary)' }}
                        className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${
                          index === selectedIndex ? 'bg-primary/15 border-l-2 border-primary' : 'hover:bg-bg-tertiary'
                        }`}
                        data-selected={index === selectedIndex}
                        role="option"
                        aria-selected={index === selectedIndex}
                      >
                        <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-bg-secondary">
                          {item.icon}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="font-medium text-sm text-text-primary truncate">{item.label}</p>
                          <p className="text-xs text-text-muted truncate">{item.description}</p>
                        </div>
                        {item.shortcut && (
                          <kbd className="flex-shrink-0 px-2 py-0.5 rounded bg-bg-secondary text-xs text-text-muted font-mono border border-border-subtle">
                            {item.shortcut}
                          </kbd>
                        )}
                        {index === selectedIndex && (
                          <motion.div
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1 }}
                            className="w-2 h-2 rounded-full bg-primary"
                          />
                        )}
                      </motion.button>
                    </motion.li>
                  ))}
                </motion.ul>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-8 text-center text-text-muted"
                >
                  <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No commands found for "{query}"</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="px-4 py-3 border-t border-border-subtle flex items-center justify-between text-xs text-text-muted">
            <span>QuoteFlow Pro v3.0.0</span>
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3" />
              Powered by UIC
            </span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
