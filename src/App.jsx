import { useState } from 'react'
import { useData } from './hooks/useData'
import { ThemeProvider, useTheme } from './theme'
import HeatmapView from './components/HeatmapView'
import TableView from './components/TableView'
import { ChartScatter, Table, GraduationCap, Sun, Moon } from 'lucide-react'

const TABS = [
  { key: 'table', label: '数据表格', icon: Table },
  { key: 'heatmap', label: '热力图', icon: ChartScatter },
]

export default function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  )
}

function AppInner() {
  const { mergedData, heatmapPoints, loading, progress } = useData()
  const [tab, setTab] = useState('table')
  const [tabDir, setTabDir] = useState('right')
  const { theme, toggleTheme } = useTheme()

  const switchTab = (key) => {
    const idx = TABS.findIndex(t => t.key === key)
    const curIdx = TABS.findIndex(t => t.key === tab)
    setTabDir(idx > curIdx ? 'right' : 'left')
    setTab(key)
  }

  if (loading) {
    return <LoadingScreen progress={progress} />
  }

  return (
    <div className="h-dvh flex flex-col bg-[var(--bg-primary)] relative transition-colors">
      <div className="h-[env(safe-area-inset-top,44px)]" />

      <header className="ios-glass px-3 pb-1.5 border-b border-[var(--border-color)] shrink-0">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="ios-large-title text-[var(--text-primary)]">2026-ZJScoreDB (Unofficial)</h1>
            <p className="text-[11px] text-[var(--text-secondary)] -mt-0.5 mb-1">
              第一段平行投档分数线 · 2023–2025
              <span className="ml-1 text-[10px] opacity-60">仅供参考</span>
            </p>
          </div>
          <div className="flex items-center gap-0.5 mt-1.5">
            <a href="https://github.com/zcbyby/2026-ZJ_ScoreDB"
              target="_blank" rel="noopener noreferrer"
              className="w-7 h-7 flex items-center justify-center rounded-full text-[var(--text-quaternary)] hover:text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/10 transition-all"
              title="开源地址"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                <path d="M9 18c-4.51 2-5-2-7-2" />
              </svg>
            </a>
            <button onClick={toggleTheme}
              className="w-7 h-7 flex items-center justify-center rounded-full text-[var(--text-quaternary)] hover:text-[var(--text-secondary)] hover:bg-black/5 transition-all"
              title={theme === 'dark' ? '切换浅色' : '切换深色'}
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        <div className="h-full w-full relative">
          <div className={`absolute inset-0 ${tab === 'table' ? 'z-10 animate-tab-' + tabDir : 'z-0 hidden'}`}>
            <TableView mergedData={mergedData} />
          </div>
          <div className={`absolute inset-0 ${tab === 'heatmap' ? 'z-10 animate-tab-' + tabDir : 'z-0 hidden'}`}>
            <HeatmapView mergedData={mergedData} />
          </div>
        </div>
      </main>

      <footer className="ios-glass border-t border-[var(--border-medium)] px-2 pb-[env(safe-area-inset-bottom,0px)] shrink-0">
        <nav className="flex justify-around py-1">
          {TABS.map((t) => {
            const Icon = t.icon
            return (
              <button key={t.key} onClick={() => switchTab(t.key)}
                className={`flex flex-col items-center gap-0.5 px-6 py-1 rounded-lg transition-all duration-200 ease-spring ${
                  tab === t.key ? 'text-[#007aff] scale-105' : 'text-[var(--text-secondary)]'
                }`}
              >
                <Icon size={22} strokeWidth={1.5} />
                <span className="text-[10px] font-medium tracking-tight">{t.label}</span>
              </button>
            )
          })}
        </nav>
      </footer>
    </div>
  )
}

function LoadingScreen({ progress }) {
  return (
    <div className="h-dvh flex flex-col items-center justify-center bg-[var(--bg-primary)] gap-6 transition-colors">
      <GraduationCap size={56} strokeWidth={1.2} className="text-[#007aff] animate-bounce" />
      <div className="ios-card px-8 py-4 flex flex-col items-center gap-3 min-w-[200px]">
        <p className="text-[15px] text-[var(--text-primary)] font-medium transition-colors">加载数据中...</p>
        <div className="w-48 h-1.5 bg-[#e5e5ea] rounded-full overflow-hidden">
          <div className="h-full bg-[#007aff] rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }} />
        </div>
        <p className="text-[12px] text-[var(--text-secondary)] transition-colors">{progress}%</p>
      </div>
    </div>
  )
}
