import { useMemo, useState } from 'react'
import { getScoreColor } from '../utils/data'
import { ArrowLeft } from 'lucide-react'

const YEARS = ['2023', '2024', '2025']

export default function SchoolDetail({ school, yearData, schoolCompare, onBack }) {
  const [view, setView] = useState('majors')

  // Get all major data for this school across years
  const majorData = useMemo(() => {
    const byMajor = {}
    for (const year of YEARS) {
      const data = yearData[year] || []
      for (const r of data) {
        if (r[0] === school.code) {
          const key = r[2]
          if (!byMajor[key]) byMajor[key] = { code: r[2], name: r[3], years: {} }
          byMajor[key].years[year] = {
            name: r[3],
            score: r[5],
            rank: r[6],
            plan: r[4],
          }
          // Update name to latest year
          if (year === '2025' || !byMajor[key].name) byMajor[key].name = r[3]
        }
      }
    }
    return Object.values(byMajor).sort((a, b) => {
      const sA = a.years['2025']?.score || a.years['2024']?.score || 0
      const sB = b.years['2025']?.score || b.years['2024']?.score || 0
      return sB - sA
    })
  }, [school, yearData])

  // Stats
  const stats = useMemo(() => {
    const s = {}
    for (const year of YEARS) {
      const data = yearData[year] || []
      const recs = data.filter(r => r[0] === school.code)
      const scores = recs.map(r => r[5]).filter(x => x > 0)
      s[year] = {
        count: recs.length,
        avg: scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '-',
        min: scores.length > 0 ? Math.min(...scores) : '-',
        max: scores.length > 0 ? Math.max(...scores) : '-',
        totalPlan: recs.reduce((sum, r) => sum + (r[4] || 0), 0),
      }
    }
    return s
  }, [school, yearData])

  // Name history
  const nameHistory = schoolCompare?.name_history
    ? Object.entries(schoolCompare.name_history).map(([name, yrs]) => ({ name, years: yrs }))
    : []

  return (
    <div className="h-dvh flex flex-col bg-[#f2f2f7]">
      <div className="h-[env(safe-area-inset-top,44px)]" />

      {/* Nav */}
      <header className="ios-glass px-4 pb-3 border-b border-[rgba(60,60,67,0.08)]">
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-[#007aff] text-[17px] font-normal shrink-0"
          >
            <ArrowLeft size={20} strokeWidth={2} />
            返回
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-[17px] font-semibold truncate">{school.name}</h1>
            <p className="text-[12px] text-[#8e8e93]">代码 {school.code}</p>
          </div>
        </div>
      </header>

      {/* Stats cards */}
      <div className="flex gap-2 px-3 py-3 overflow-x-auto shrink-0">
        {YEARS.map(year => {
          const st = stats[year]
          return (
            <div key={year} className="ios-card px-3 py-2.5 min-w-[100px] shrink-0">
              <p className="text-[13px] font-semibold text-[#007aff]">{year}年</p>
              <p className="text-[20px] font-bold mt-0.5">{st.avg}</p>
              <p className="text-[11px] text-[#8e8e93]">均分</p>
              <div className="flex gap-2 mt-1 text-[11px] text-[#8e8e93]">
                <span>最高 {st.max}</span>
                <span>最低 {st.min}</span>
              </div>
              <p className="text-[11px] text-[#8e8e93]">{st.count} 专业 · {st.totalPlan} 人</p>
            </div>
          )
        })}
      </div>

      {/* Name history */}
      {nameHistory.length > 1 && (
        <div className="mx-3 mb-2 ios-card px-3 py-2">
          <p className="text-[12px] font-semibold text-[#8e8e93] mb-1">曾用名称</p>
          {nameHistory.map((nh, i) => (
            <p key={i} className="text-[13px] text-[#1c1c1e]">
              {nh.name} <span className="text-[#8e8e93]">({nh.years.join(', ')})</span>
            </p>
          ))}
        </div>
      )}

      {/* Segmented control */}
      <div className="px-3 mb-2 shrink-0">
        <div className="ios-segment inline-flex">
          <button className={view === 'majors' ? 'active' : ''} onClick={() => setView('majors')}>
            专业详情
          </button>
          <button className={view === 'chart' ? 'active' : ''} onClick={() => setView('chart')}>
            趋势图
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {view === 'majors' && (
          <div className="ios-list">
            {majorData.map((m, i) => (
              <div key={m.code} className="ios-list-item">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-medium text-[#1c1c1e] truncate">{m.name}</p>
                    <p className="text-[11px] text-[#8e8e93]">代码 {m.code}</p>
                    {/* Show name history if changed */}
                    {Object.entries(m.years).length > 1 && (
                      <p className="text-[10px] text-[#ff9500] mt-0.5">
                        {YEARS.map(y => `${y}: ${m.years[y]?.name}`).filter(Boolean).join(' → ')}
                      </p>
                    )}
                  </div>
                  <div className="text-right ml-2">
                    {YEARS.map(y => m.years[y] && (
                      <p key={y} className="text-[13px]" style={{ color: getScoreColor(m.years[y].score) }}>
                        {y.slice(2)}: {m.years[y].score}
                        <span className="text-[10px] text-[#8e8e93] ml-1">({m.years[y].rank})</span>
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {view === 'chart' && (
          <div className="ios-card p-4">
            <p className="text-[15px] font-semibold mb-4">各专业三年分数线趋势</p>
            <MiniChart majors={majorData} />
          </div>
        )}
      </div>
    </div>
  )
}

function MiniChart({ majors }) {
  const topMajors = majors.slice(0, 10)
  const maxScore = Math.max(...topMajors.map(m =>
    Math.max(...Object.values(m.years).map(y => y.score).filter(Boolean))
  ), 700)
  const minScore = Math.min(...topMajors.map(m =>
    Math.min(...Object.values(m.years).map(y => y.score).filter(Boolean))
  ), 400)

  const chartH = 200
  const chartW = 300
  const padding = { top: 10, right: 10, bottom: 40, left: 40 }

  return (
    <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-auto" style={{ maxHeight: chartH }}>
      <defs>
        {['#ff2d55', '#ff9500', '#ffcc02'].map((c, i) => (
          <linearGradient key={i} id={`lineGrad${i}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={c} stopOpacity="0.3"/>
            <stop offset="100%" stopColor={c} stopOpacity="0.3"/>
          </linearGradient>
        ))}
      </defs>

      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map(p => {
        const y = padding.top + p * (chartH - padding.top - padding.bottom)
        return (
          <g key={p}>
            <line x1={padding.left} y1={y} x2={chartW - padding.right} y2={y}
              stroke="rgba(60,60,67,0.08)" strokeWidth="0.5" />
            <text x={padding.left - 4} y={y + 3} textAnchor="end"
              fill="#8e8e93" fontSize="8">
              {Math.round(minScore + (1 - p) * (maxScore - minScore))}
            </text>
          </g>
        )
      })}

      {/* Year labels */}
      {['2023', '2024', '2025'].map((y, i) => {
        const x = padding.left + (i + 0.5) * (chartW - padding.left - padding.right) / 3
        return (
          <text key={y} x={x} y={chartH - 8} textAnchor="middle"
            fill="#8e8e93" fontSize="9">{y.slice(2)}年</text>
        )
      })}

      {/* Major lines */}
      {topMajors.map((m, mi) => {
        const points = YEARS.map((y, i) => {
          const d = m.years[y]
          if (!d) return null
          const x = padding.left + (i + 0.5) * (chartW - padding.left - padding.right) / 3
          const yPos = padding.top + ((maxScore - d.score) / (maxScore - minScore || 1)) * (chartH - padding.top - padding.bottom)
          return { x, y: yPos, score: d.score }
        }).filter(Boolean)

        if (points.length < 2) return null
        const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
        const color = ['#ff2d55', '#ff9500', '#ffcc02', '#34c759', '#5ac8fa', '#007aff', '#5856d6'][mi % 7]

        return (
          <g key={m.code}>
            <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
            {points.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} stroke="white" strokeWidth="1" />
            ))}
          </g>
        )
      })}
    </svg>
  )
}
