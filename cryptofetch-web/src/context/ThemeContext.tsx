"use client"

import React, { createContext, useContext, useEffect, useRef, useState } from 'react'

type Theme = 'dark' | 'light'
interface ThemeContextType { theme: Theme; setTheme: (theme: Theme) => void; toggleTheme: () => void }
const ThemeContext = createContext<ThemeContextType | undefined>(undefined)
const portfolioOrigins = ['https://varshith.me', 'https://www.varshith.me']

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark')
  const inherited = useRef(false)
  const renderTheme = (next: Theme) => {
    document.documentElement.classList.toggle('dark', next === 'dark')
    document.documentElement.style.colorScheme = next
    setThemeState(next)
  }
  useEffect(() => {
    let parentOrigin = ''
    try { parentOrigin = new URL(document.referrer).origin } catch {}
    const embedded = window.parent !== window && portfolioOrigins.includes(parentOrigin)
    const requested = embedded ? new URLSearchParams(location.search).get('portfolioTheme') : null
    const saved = localStorage.getItem('theme')
    const system = window.matchMedia('(prefers-color-scheme: dark)')
    if (requested === 'light' || requested === 'dark') {
      inherited.current = true
      renderTheme(requested)
    } else {
      renderTheme(saved === 'light' || saved === 'dark' ? saved : system.matches ? 'dark' : 'light')
    }
    const receive = (event: MessageEvent) => {
      if (!embedded || event.source !== window.parent || event.origin !== parentOrigin) return
      if (event.data?.type !== 'portfolio:theme' || !['light', 'dark'].includes(event.data.theme)) return
      inherited.current = true
      renderTheme(event.data.theme)
    }
    const systemChanged = (event: MediaQueryListEvent) => {
      if (!inherited.current && !localStorage.getItem('theme')) renderTheme(event.matches ? 'dark' : 'light')
    }
    window.addEventListener('message', receive)
    system.addEventListener('change', systemChanged)
    if (embedded) window.parent.postMessage({ type: 'portfolio:theme-ready' }, parentOrigin)
    return () => {
      window.removeEventListener('message', receive)
      system.removeEventListener('change', systemChanged)
    }
  }, [])
  const setTheme = (next: Theme) => {
    // Embedded changes are temporary. Keep the standalone preference intact.
    if (!inherited.current) localStorage.setItem('theme', next)
    renderTheme(next)
  }
  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark')
  return <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>{children}</ThemeContext.Provider>
}
export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) throw new Error('useTheme must be used within a ThemeProvider')
  return context
}
