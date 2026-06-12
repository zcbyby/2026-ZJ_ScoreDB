import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'

const ThemeContext = createContext()

const TRANSITION_MS = 350

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme')
      if (saved) return saved
      return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return 'light'
  })
  const timerRef = useRef(null)

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(theme)
    localStorage.setItem('theme', theme)

    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) {
      meta.content = theme === 'dark' ? '#202024' : '#f2f2f7'
    }
  }, [theme])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e) => {
      if (!localStorage.getItem('theme')) {
        setTheme(e.matches ? 'dark' : 'light')
      }
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const toggleTheme = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    const root = document.documentElement
    root.classList.add('theme-transition')
    setTheme(t => t === 'dark' ? 'light' : 'dark')
    timerRef.current = setTimeout(() => {
      root.classList.remove('theme-transition')
    }, TRANSITION_MS)
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
