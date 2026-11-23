import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface ThemeConfig {
  id: string
  label: string
  gradient: string
  cssVars: Record<string, string>
}

export const themes: ThemeConfig[] = [
  {
    id: 'glass',
    label: 'Glassmorphism',
    gradient: 'linear-gradient(135deg, rgba(99, 102, 241, 0.3), rgba(6, 182, 212, 0.3))',
    cssVars: {
      '--color-bg-primary': '#0f172a',
      '--color-bg-secondary': '#1e293b',
      '--color-bg-tertiary': '#334155',
      '--color-bg-glass': 'rgba(30, 41, 59, 0.7)',
      '--color-text-primary': '#f8fafc',
      '--color-text-secondary': '#cbd5e1',
      '--color-text-muted': '#94a3b8',
      '--color-border-subtle': 'rgba(148, 163, 184, 0.15)',
      '--color-border-default': 'rgba(148, 163, 184, 0.25)',
      '--color-primary': '#6366f1',
      '--color-primary-hover': '#4f46e5',
      '--color-primary-light': '#e0e7ff',
      '--color-secondary': '#06b6d4',
      '--color-accent': '#f43f5e',
      '--color-success': '#10b981',
      '--color-warning': '#f59e0b',
      '--color-error': '#ef4444',
    },
  },
  {
    id: 'arctic',
    label: 'Arctic Light',
    gradient: 'linear-gradient(135deg, #e0e7ff, #cffafe)',
    cssVars: {
      '--color-bg-primary': '#f8fafc',
      '--color-bg-secondary': '#ffffff',
      '--color-bg-tertiary': '#f1f5f9',
      '--color-bg-glass': 'rgba(255, 255, 255, 0.8)',
      '--color-text-primary': '#0f172a',
      '--color-text-secondary': '#334155',
      '--color-text-muted': '#64748b',
      '--color-border-subtle': 'rgba(148, 163, 184, 0.2)',
      '--color-border-default': 'rgba(148, 163, 184, 0.3)',
      '--color-primary': '#6366f1',
      '--color-primary-hover': '#4f46e5',
      '--color-primary-light': '#e0e7ff',
      '--color-secondary': '#06b6d4',
      '--color-accent': '#f43f5e',
      '--color-success': '#10b981',
      '--color-warning': '#f59e0b',
      '--color-error': '#ef4444',
    },
  },
  {
    id: 'snapchat',
    label: 'Snapchat Dark',
    gradient: 'linear-gradient(135deg, #fffc00, #ffd700)',
    cssVars: {
      '--color-bg-primary': '#000000',
      '--color-bg-secondary': '#121212',
      '--color-bg-tertiary': '#1e1e1e',
      '--color-bg-glass': 'rgba(18, 18, 18, 0.85)',
      '--color-text-primary': '#ffffff',
      '--color-text-secondary': '#e0e0e0',
      '--color-text-muted': '#a0a0a0',
      '--color-border-subtle': 'rgba(255, 252, 0, 0.15)',
      '--color-border-default': 'rgba(255, 252, 0, 0.3)',
      '--color-primary': '#fffc00',
      '--color-primary-hover': '#e6e400',
      '--color-primary-light': '#fff9c4',
      '--color-secondary': '#fffc00',
      '--color-accent': '#ff6b6b',
      '--color-success': '#4ade80',
      '--color-warning': '#fde047',
      '--color-error': '#f87171',
    },
  },
  {
    id: 'midnight',
    label: 'Midnight Blue',
    gradient: 'linear-gradient(135deg, #1e3a8a, #312e81)',
    cssVars: {
      '--color-bg-primary': '#080f1e',
      '--color-bg-secondary': '#0f172a',
      '--color-bg-tertiary': '#1e293b',
      '--color-bg-glass': 'rgba(15, 23, 42, 0.8)',
      '--color-text-primary': '#f1f5f9',
      '--color-text-secondary': '#cbd5e1',
      '--color-text-muted': '#94a3b8',
      '--color-border-subtle': 'rgba(59, 130, 246, 0.15)',
      '--color-border-default': 'rgba(59, 130, 246, 0.3)',
      '--color-primary': '#3b82f6',
      '--color-primary-hover': '#2563eb',
      '--color-primary-light': '#1e3a8a',
      '--color-secondary': '#6366f1',
      '--color-accent': '#f472b6',
      '--color-success': '#34d399',
      '--color-warning': '#fbbf24',
      '--color-error': '#f87171',
    },
  },
  {
    id: 'executive',
    label: 'Executive Gold',
    gradient: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
    cssVars: {
      '--color-bg-primary': '#1a160a',
      '--color-bg-secondary': '#2d2612',
      '--color-bg-tertiary': '#3d3218',
      '--color-bg-glass': 'rgba(29, 22, 10, 0.85)',
      '--color-text-primary': '#fefce8',
      '--color-text-secondary': '#fde68a',
      '--color-text-muted': '#d6b51e',
      '--color-border-subtle': 'rgba(251, 191, 36, 0.15)',
      '--color-border-default': 'rgba(251, 191, 36, 0.3)',
      '--color-primary': '#fbbf24',
      '--color-primary-hover': '#f59e0b',
      '--color-primary-light': '#fde68a',
      '--color-secondary': '#fbbf24',
      '--color-accent': '#f472b6',
      '--color-success': '#4ade80',
      '--color-warning': '#fde047',
      '--color-error': '#f87171',
    },
  },
  {
    id: 'corporate',
    label: 'Corporate Slate',
    gradient: 'linear-gradient(135deg, #475569, #334155)',
    cssVars: {
      '--color-bg-primary': '#020617',
      '--color-bg-secondary': '#0f172a',
      '--color-bg-tertiary': '#1e293b',
      '--color-bg-glass': 'rgba(15, 23, 42, 0.8)',
      '--color-text-primary': '#f8fafc',
      '--color-text-secondary': '#cbd5e1',
      '--color-text-muted': '#94a3b8',
      '--color-border-subtle': 'rgba(100, 116, 139, 0.15)',
      '--color-border-default': 'rgba(100, 116, 139, 0.3)',
      '--color-primary': '#64748b',
      '--color-primary-hover': '#475569',
      '--color-primary-light': '#1e293b',
      '--color-secondary': '#475569',
      '--color-accent': '#f43f5e',
      '--color-success': '#10b981',
      '--color-warning': '#f59e0b',
      '--color-error': '#ef4444',
    },
  },
]

interface ThemeState {
  theme: string
  setTheme: (theme: string) => void
  themes: ThemeConfig[]
  applyTheme: (themeId: string) => void
}

export const useTheme = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'glass',
      themes,
      setTheme: (themeId) => {
        get().applyTheme(themeId)
        set({ theme: themeId })
      },
      applyTheme: (themeId) => {
        const theme = themes.find((t) => t.id === themeId)
        if (theme) {
          const root = document.documentElement
          Object.entries(theme.cssVars).forEach(([key, value]) => {
            root.style.setProperty(key, value)
          })
        }
      },
    }),
    {
      name: 'quoteflow-theme',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
