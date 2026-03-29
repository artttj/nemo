import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextValue {
  theme: Theme
  resolvedTheme: 'light' | 'dark'
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

const THEME_STORAGE_KEY = 'nemo-theme'

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system')
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')
  const [mounted, setMounted] = useState(false)

  // Load theme from storage on mount
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const result = await chrome.storage.local.get(THEME_STORAGE_KEY)
        const savedTheme = result[THEME_STORAGE_KEY] as Theme | undefined
        if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
          setThemeState(savedTheme)
          const resolved = savedTheme === 'system' ? getSystemTheme() : savedTheme
          setResolvedTheme(resolved)
          document.documentElement.setAttribute('data-theme', resolved)
        } else {
          // Default to system
          const systemTheme = getSystemTheme()
          setResolvedTheme(systemTheme)
          document.documentElement.setAttribute('data-theme', systemTheme)
        }
      } catch {
        // Fallback to system
        const systemTheme = getSystemTheme()
        setResolvedTheme(systemTheme)
        document.documentElement.setAttribute('data-theme', systemTheme)
      }
      setMounted(true)
    }

    loadTheme()
  }, [])

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e: MediaQueryListEvent) => {
      const newTheme = e.matches ? 'dark' : 'light'
      setResolvedTheme(newTheme)
      document.documentElement.setAttribute('data-theme', newTheme)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  const setTheme = useCallback(async (newTheme: Theme) => {
    setThemeState(newTheme)

    const resolved = newTheme === 'system' ? getSystemTheme() : newTheme
    setResolvedTheme(resolved)
    document.documentElement.setAttribute('data-theme', resolved)

    try {
      await chrome.storage.local.set({ [THEME_STORAGE_KEY]: newTheme })
    } catch {
      // Ignore storage errors
    }
  }, [])

  const toggleTheme = useCallback(() => {
    const themes: Theme[] = ['light', 'dark', 'system']
    const currentIndex = themes.indexOf(theme)
    const nextTheme = themes[(currentIndex + 1) % themes.length]
    setTheme(nextTheme)
  }, [theme, setTheme])

  // Prevent flash of wrong theme
  if (!mounted) {
    return <div style={{ visibility: 'hidden' }}>{children}</div>
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, resolvedTheme, toggleTheme } = useTheme()

  const getIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun size={18} />
      case 'dark':
        return <Moon size={18} />
      case 'system':
        return <Monitor size={18} />
    }
  }

  const getLabel = () => {
    switch (theme) {
      case 'light':
        return 'Light'
      case 'dark':
        return 'Dark'
      case 'system':
        return 'Auto'
    }
  }

  return (
    <button
      onClick={toggleTheme}
      className={`nemo-button-ghost flex items-center gap-2 px-2 py-1.5 text-[13px] ${className}`}
      title={`Theme: ${getLabel()} (click to cycle)`}
      style={{ color: 'var(--text-tertiary)' }}
    >
      {getIcon()}
      <span className="hidden sm:inline">{getLabel()}</span>
    </button>
  )
}
