"use client"

import { motion, AnimatePresence } from 'motion/react'
import { useState } from 'react'
import {
  LayoutDashboard,
  FileText,
  Edit,
  Database,
  BarChart3,
  Settings,
  Sparkles,
  Stethoscope,
  ChevronLeft,
  ChevronRight,
  Home,
  Search,
  Plus,
  Sun,
  Moon,
  Globe,
  Palette,
} from 'lucide-react'
import { useStore } from '@/services/store'
import { useTheme } from '@/hooks/useTheme'

const navigation = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, shortcut: '1' },
  { id: 'quotes', label: 'Quotations', icon: FileText, shortcut: '2' },
  { id: 'editor', label: 'Editor', icon: Edit, shortcut: '3' },
  { id: 'pricebook', label: 'Price Book', icon: Database, shortcut: '4' },
  { id: 'reports', label: 'Reports', icon: BarChart3, shortcut: '5' },
  { id: 'ai-studio', label: 'AI Studio', icon: Sparkles, shortcut: '6' },
  { id: 'diagnostics', label: 'Diagnostics', icon: Stethoscope, shortcut: '7' },
  { id: 'settings', label: 'Settings', icon: Settings, shortcut: '8' },
] as const

export function Sidebar() {
  const { currentView, setView, preferences, updatePreferences } = useStore()
  const { theme, setTheme, themes } = useTheme()
  const [collapsed, setCollapsed] = useState(preferences.sidebarCollapsed)
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

  const handleToggleCollapse = () => {
    const newCollapsed = !collapsed
    setCollapsed(newCollapsed)
    updatePreferences({ sidebarCollapsed: newCollapsed })
  }

  return (
    <motion.aside
      initial={false}
      animate={{
        width: collapsed ? 72 : 280,
        transition: { type: 'spring', stiffness: 400, damping: 30 },
      }}
      className="glass-elevated flex flex-col h-full border-r border-border-subtle overflow-hidden relative"
      style={{ width: collapsed ? 72 : 280 }}
    >
      <div className="flex items-center justify-between h-16 px-4 border-b border-border-subtle">
        <motion.div
          animate={{ opacity: collapsed ? 0 : 1, width: collapsed ? 0 : 'auto' }}
          transition={{ duration: 0.15 }}
          className="flex items-center gap-3 overflow-hidden"
        >
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-secondary shadow-glow">
            <Home className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-lg text-gradient whitespace-nowrap">QuoteFlow Pro</span>
        </motion.div>
        <motion.button
          onClick={handleToggleCollapse}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="glass-hover p-2 rounded-xl focus-ring"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </motion.button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-1" role="navigation" aria-label="Main navigation">
        <AnimatePresence mode="popLayout">
          {!collapsed && (
            <motion.div
              key="theme-selector"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4"
            >
              <label className="block text-xs font-medium text-text-muted px-3 mb-2 uppercase tracking-wider">
                Theme
              </label>
              <div className="grid grid-cols-2 gap-2 px-2">
                {themes.map((t) => (
                  <motion.button
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`relative p-3 rounded-xl transition-all duration-200 ${
                      theme === t.id
                        ? 'ring-2 ring-primary shadow-glow'
                        : 'hover:bg-bg-tertiary hover:border-border-default'
                    } glass-hover`}
                  >
                    <div
                      className="w-full h-8 rounded-lg"
                      style={{ background: t.gradient }}
                    />
                    <span className="text-xs font-medium text-text-secondary mt-2 block text-center">{t.label}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {navigation.map((item) => (
          <motion.button
            key={item.id}
            onClick={() => setView(item.id)}
            whileHover={{ x: collapsed ? 0 : 4 }}
            whileTap={{ scale: 0.98 }}
            className={`relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group ${
              currentView === item.id
                ? 'bg-primary/15 border border-primary/30 text-primary shadow-glass'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary glass-hover'
            }`}
            style={{ minWidth: collapsed ? 48 : 'auto' }}
            aria-current={currentView === item.id ? 'page' : undefined}
            aria-label={collapsed ? item.label : undefined}
          >
            <div className="flex-shrink-0 w-9 h-9 flex items-center justify-center">
              <item.icon className="w-5 h-5" aria-hidden="true" />
            </div>
            <AnimatePresence mode="popLayout">
              {!collapsed && (
                <motion.span
                  key="label"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.15 }}
                  className="font-medium whitespace-nowrap"
                >
                  {item.label}
                </motion.span>
              )}
            </AnimatePresence>
            <AnimatePresence mode="popLayout">
              {!collapsed && (
                <motion.kbd
                  key="shortcut"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="ml-auto text-xs text-text-muted px-2 py-0.5 rounded bg-bg-secondary font-mono"
                >
                  {item.shortcut}
                </motion.kbd>
              )}
            </AnimatePresence>
            {currentView === item.id && (
              <motion.div
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                exit={{ scaleY: 0 }}
                className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full"
              />
            )}
          </motion.button>
        ))}
      </nav>

      <div className="p-4 border-t border-border-subtle">
        <AnimatePresence mode="popLayout">
          {!collapsed && (
            <motion.div
              key="user-section"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="space-y-3"
            >
              <div className="flex items-center gap-3 p-2 glass-hover rounded-xl">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-secondary to-accent flex items-center justify-center">
                  <Settings className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">Universal Inspection Co.</p>
                  <p className="text-xs text-text-muted truncate">UIC Quotation Manager</p>
                </div>
              </div>
              <div className="flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex-1 glass-hover py-2 px-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  New Quote
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="glass-hover py-2 px-3 rounded-xl text-sm"
                  onClick={() => setView('settings')}
                >
                  <Palette className="w-4 h-4" />
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {collapsed && (
          <div className="flex flex-col gap-2 items-center">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="glass-hover p-2 rounded-xl"
              onClick={() => setView('editor')}
              aria-label="New Quote"
            >
              <Plus className="w-5 h-5" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="glass-hover p-2 rounded-xl"
              onClick={() => setView('settings')}
              aria-label="Settings"
            >
              <Palette className="w-5 h-5" />
            </motion.button>
          </div>
        )}
      </div>
    </motion.aside>
  )
}
