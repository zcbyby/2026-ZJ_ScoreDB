import { useState } from 'react'
import { useData } from './hooks/useData'
import HeatmapView from './components/HeatmapView'
import TableView from './components/TableView'
import { ChartScatter, Table, GraduationCap } from 'lucide-react'

const TABS = [
  { key: 'heatmap', label: '热力图', icon: ChartScatter },
  { key: 'table', label: '数据表格', icon: Table },
]

export default function App() {
  const { mergedData, heatmapPoints, loading, progress } = useData()
  const [tab, setTab] = useState('heatmap')

  if (loading) {
    return <LoadingScreen progress={progress} />
  }

  return (
    <div className="h-dvh flex flex-col bg-[#f2f2f7] relative">
      <div className="h-[env(safe-area-inset-top,44px)]" />

      <header className="ios-glass px-4 pb-2 border-b border-[rgba(60,60,67,0.08)] shrink-0">
        <h1 className="ios-large-title mt-1">2026-ZJScoreDB (Unofficial)</h1>
        <p className="text-[13px] text-[#8e8e93] -mt-1 mb-2">
          第一段平行投档分数线 · 2023–2025
        </p>
      </header>

      <main className="flex-1 overflow-hidden">
        {tab === 'heatmap' && <HeatmapView mergedData={mergedData} />}
        {tab === 'table' && <TableView mergedData={mergedData} />}
      </main>

      <footer className="ios-glass border-t border-[rgba(60,60,67,0.12)] px-2 pb-[env(safe-area-inset-bottom,0px)] shrink-0">
        <nav className="flex justify-around py-1">
          {TABS.map((t) => {
            const Icon = t.icon
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex flex-col items-center gap-0.5 px-6 py-1 rounded-lg transition-all duration-200 ease-spring ${
                  tab === t.key ? 'text-[#007aff] scale-105' : 'text-[#8e8e93]'
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
    <div className="h-dvh flex flex-col items-center justify-center bg-[#f2f2f7] gap-6">
      <GraduationCap size={56} strokeWidth={1.2} className="text-[#007aff] animate-bounce" />
      <div className="ios-card px-8 py-4 flex flex-col items-center gap-3 min-w-[200px]">
        <p className="text-[15px] text-[#1c1c1e] font-medium">加载数据中...</p>
        <div className="w-48 h-1.5 bg-[#e5e5ea] rounded-full overflow-hidden">
          <div className="h-full bg-[#007aff] rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }} />
        </div>
        <p className="text-[12px] text-[#8e8e93]">{progress}%</p>
      </div>
    </div>
  )
}
