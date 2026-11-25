import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface ThemeConfig {
  id: 'neumorphism' | 'maximalism' | 'minimalism'
  label: string
  gradient: string
  cssVars: Record<string, string>
}

export const themes: ThemeConfig[] = [
  {
    id: 'neumorphism',
    label: 'Neumorphism',
    gradient: 'linear-gradient(135deg, #e2e8f0, #f8fafc)',
    cssVars: {
      '--color-bg-primary': '#e6ebf2',
      '--color-bg-secondary': '#eef2f7',
      '--color-bg-tertiary': '#d9e1ec',
      '--color-bg-glass': 'rgba(238, 242, 247, 0.92)',
      '--color-text-primary': '#1e293b',
      '--color-text-secondary': '#334155',
      '--color-text-muted': '#64748b',
      '--color-border-subtle': 'rgba(255, 255, 255, 0.7)',
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
    id: 'maximalism',
    label: 'Maximalism',
    gradient: 'linear-gradient(135deg, #7c3aed, #db2777, #f59e0b)',
    cssVars: {
      '--color-bg-primary': '#160d2b',
      '--color-bg-secondary': '#241546',
      '--color-bg-tertiary': '#37205e',
      '--color-bg-glass': 'rgba(36, 21, 70, 0.86)',
      '--color-text-primary': '#fdf4ff',
      '--color-text-secondary': '#f0abfc',
      '--color-text-muted': '#d8b4fe',
      '--color-border-subtle': 'rgba(232, 121, 249, 0.22)',
      '--color-border-default': 'rgba(232, 121, 249, 0.4)',
      '--color-primary': '#e879f9',
      '--color-primary-hover': '#d946ef',
      '--color-primary-light': '#f5d0fe',
      '--color-secondary': '#f59e0b',
      '--color-accent': '#fb7185',
      '--color-success': '#34d399',
      '--color-warning': '#fbbf24',
      '--color-error': '#fb7185',
    },
  },
  {
    id: 'minimalism',
    label: 'Minimalism',
    gradient: 'linear-gradient(135deg, #f8fafc, #e2e8f0)',
    cssVars: {
      '--color-bg-primary': '#f8fafc',
      '--color-bg-secondary': '#ffffff',
      '--color-bg-tertiary': '#f1f5f9',
      '--color-bg-glass': 'rgba(255, 255, 255, 0.92)',
      '--color-text-primary': '#0f172a',
      '--color-text-secondary': '#334155',
      '--color-text-muted': '#64748b',
      '--color-border-subtle': 'rgba(148, 163, 184, 0.18)',
      '--color-border-default': 'rgba(148, 163, 184, 0.32)',
      '--color-primary': '#475569',
      '--color-primary-hover': '#334155',
      '--color-primary-light': '#e2e8f0',
      '--color-secondary': '#6366f1',
      '--color-accent': '#0f766e',
      '--color-success': '#059669',
      '--color-warning': '#d97706',
      '--color-error': '#dc2626',
    },
  },
]

interface ThemeState {
  theme: ThemeConfig['id']
  setTheme: (theme: ThemeConfig['id']) => void
  themes: ThemeConfig[]
  applyTheme: (themeId: string) => void
}

const normalizedTheme = (value: string): ThemeConfig['id'] =>
  themes.some((theme) => theme.id === value) ? (value as ThemeConfig['id']) : 'minimalism'

export const useTheme = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'minimalism',
      themes,
      setTheme: (themeId) => {
        get().applyTheme(themeId)
        set({ theme: normalizedTheme(themeId) })
      },
      applyTheme: (themeId) => {
        const theme = themes.find((item) => item.id === normalizedTheme(themeId)) || themes[2]
        const root = document.documentElement
        Object.entries(theme.cssVars).forEach(([key, value]) => {
          root.style.setProperty(key, value)
        })
      },
    }),
    {
      name: 'quoteflow-theme',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state?.setTheme) state.setTheme(normalizedTheme(state.theme))
      },
    }
  )
)
