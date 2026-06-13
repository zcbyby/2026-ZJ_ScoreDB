import { useRef, useEffect, useMemo, useCallback, useState } from 'react'
import * as echarts from 'echarts'
import { getYearColor, buildLocationMap } from '../utils/data'
import { ListFilter, ChevronDown } from 'lucide-react'
import { useTheme } from '../theme'
import SchoolPopover from './SchoolPopover'

const COLUMNS = [
  { key: 'school_code', label: '院校代码', width: 72, align: 'center', type: 'text' },
  { key: 'school_name', label: '院校名称', width: 100, align: 'left', type: 'text' },
  { key: 'location', label: '所在省市', width: 100, align: 'left', type: 'location' },
  { key: 'subject_requirement', label: '选科要求', width: 100, align: 'left', type: 'text' },
  { key: 'major_name', label: '专业名称', width: 140, align: 'left', type: 'text' },
]

export default function HeatmapView({ mergedData }) {
  const { theme } = useTheme()
  const chartRef = useRef(null)
  const containerRef = useRef(null)
  const [selectedYears, setSelectedYears] = useState(['2023', '2024', '2025'])
  const instanceRef = useRef(null)
  const [columnFilters, setColumnFilters] = useState({})
  const [openFilterCol, setOpenFilterCol] = useState(null)
  const filterRef = useRef(null)
  const [popoverSchool, setPopoverSchool] = useState(null)
  const [popoverAnchor, setPopoverAnchor] = useState(null)

  const locationMap = useMemo(() => buildLocationMap(mergedData), [mergedData])

  const columnMeta = useMemo(() => {
    const meta = {}
    for (const col of COLUMNS) {
      if (col.key === 'location') {
        meta[col.key] = { type: 'location', locationMap }
      } else if (col.type === 'text') {
        const vals = new Set()
        for (const r of mergedData) {
          const v = r[col.key]
          if (v) vals.add(v)
        }
        meta[col.key] = { type: 'text', values: [...vals].sort() }
      }
    }
    return meta
  }, [mergedData, locationMap])

  const filtered = useMemo(() => {
    let data = mergedData
    const entries = Object.entries(columnFilters)
    if (entries.length > 0) {
      data = data.filter(row => {
        for (const [colKey, filter] of entries) {
          const col = COLUMNS.find(c => c.key === colKey)
          if (colKey === 'location') {
            const p = row.school_province
            const c = row.school_city
            if (filter.provinces?.length && (!p || !filter.provinces.includes(p))) return false
            if (filter.cities?.length && (!c || !filter.cities.includes(c))) return false
          } else if (col?.type === 'text') {
            const val = row[colKey]
            if (filter.selectedValues?.length && !filter.selectedValues.includes(val)) return false
            if (filter.textSearch && val && !val.toLowerCase().includes(filter.textSearch.toLowerCase())) return false
          }
        }
        return true
      })
    }
    return data
  }, [mergedData, columnFilters])

  const seriesData = useMemo(() => {
    return ['2023', '2024', '2025'].map(year => {
      const points = []
      for (const m of filtered) {
        const d = m[year]
        if (!d || d.score <= 0) continue
        points.push({
          value: [m.volatility, d.score, m.school_name, d.name, m.subject_requirement, d.rank, d.plan, year, m.school_province, m.school_city],
          name: `${m.school_name} · ${d.name} (${year})`,
        })
      }
      return { name: `${year}年`, data: points, color: getYearColor(year) }
    })
  }, [filtered])

  const isTouchDevice = useMemo(() =>
    typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0),
  [])

  useEffect(() => {
    if (!containerRef.current) return
    const chart = echarts.init(containerRef.current, null, { renderer: 'canvas' })
    instanceRef.current = chart
    const handleResize = () => chart.resize()
    window.addEventListener('resize', handleResize)

    chart.on('click', (params) => {
      const d = params.data
      if (d && d.value && d.value[2]) {
        const schoolName = d.value[2]
        const req = d.value[4]
        const rect = containerRef.current.getBoundingClientRect()
        const chartRect = chart.getDom().getBoundingClientRect()
        setPopoverSchool({ name: schoolName, requirement: req })
        setPopoverAnchor({
          left: params.event && params.event.event ? params.event.event.clientX : chartRect.left + chartRect.width / 2,
          top: params.event && params.event.event ? params.event.event.clientY : chartRect.top + chartRect.height / 2,
          width: 0,
          height: 0,
          bottom: params.event && params.event.event ? params.event.event.clientY + 10 : chartRect.top + chartRect.height / 2 + 10,
        })
      }
    })

    return () => { window.removeEventListener('resize', handleResize); chart.dispose() }
  }, [])

  useEffect(() => {
    const chart = instanceRef.current
    if (!chart) return

    const allScores = filtered.flatMap(m => [m['2023']?.score, m['2024']?.score, m['2025']?.score]).filter(s => s && s > 0)
    const allVols = filtered.map(m => m.volatility)
    const minScore = Math.min(...allScores) || 200
    const maxScore = Math.max(...allScores) || 700
    const maxVol = Math.max(...allVols) || 50
    const isDark = theme === 'dark'
    const axisColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'
    const splitColor = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)'
    const axisLineColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
    const nameColor = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)'

    const option = {
      backgroundColor: 'transparent',
      color: ['#007aff', '#34c759', '#ff3b30'],
      tooltip: {
        trigger: 'item',
        transitionDuration: 0,
        backgroundColor: 'rgba(0,0,0,0.85)',
        borderColor: 'transparent',
        textStyle: { color: '#fff', fontSize: 13 },
        formatter: (params) => {
          const d = params.data
          if (!d || !d.value) return ''
          const [vol, score, school, major, req, rank, plan, year, prov, city] = d.value
          return `
            <div style="font-weight:600;font-size:14px;margin-bottom:2px">${school}</div>
            <div style="font-size:11px;opacity:.6;margin-bottom:1px">${prov || ''}${city ? '/' + city : ''}</div>
            <div style="font-size:12px;opacity:.7;margin-bottom:4px">${major}</div>
            ${req && req !== '待确认' ? `<div style="font-size:11px;color:#ff9f0a;margin-bottom:4px">选科：${req}</div>` : ''}
            <div style="display:flex;justify-content:space-between;gap:12px;font-size:12px">
              <span style="color:${getYearColor(year)}">${year}年</span>
              <span style="font-weight:600">${score}分</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:11px;opacity:.6">
              <span>位次 ${rank}</span>
              <span>计划 ${plan}人</span>
            </div>
            <div style="font-size:10px;opacity:.4;margin-top:2px">波动性 ${vol.toFixed(1)}</div>
          `
        },
        extraCssText: 'border-radius:10px;padding:8px 12px;backdrop-filter:blur(10px)',
      },
      grid: { left: 55, right: 20, top: 15, bottom: 35 },
      xAxis: {
        name: '分数线波动性',
        nameTextStyle: { color: nameColor, fontSize: 10 },
        type: 'value',
        splitLine: { lineStyle: { color: splitColor } },
        axisLabel: { color: axisColor, fontSize: 10 },
        axisLine: { lineStyle: { color: axisLineColor } },
        min: 0, max: maxVol * 1.1,
      },
      yAxis: {
        name: '分数线',
        nameTextStyle: { color: nameColor, fontSize: 10 },
        type: 'value',
        splitLine: { lineStyle: { color: splitColor } },
        axisLabel: { color: axisColor, fontSize: 10 },
        axisLine: { lineStyle: { color: axisLineColor } },
        min: Math.floor((minScore - 10) / 20) * 20,
        max: Math.ceil((maxScore + 10) / 20) * 20,
      },
      dataZoom: [
        { type: 'inside', xAxisIndex: 0, filterMode: 'none', minSpan: 5 },
        { type: 'inside', yAxisIndex: 0, filterMode: 'none', minSpan: 5 },
      ],
      series: seriesData.filter(s => selectedYears.includes(s.name.replace('年', ''))).map(s => ({
        name: s.name,
        type: 'scatter',
        data: s.data,
        symbolSize: isTouchDevice ? 4 : 14,
        itemStyle: { color: s.color, opacity: 0.55 },
        emphasis: {
          itemStyle: { opacity: 1, borderColor: '#fff', borderWidth: 3, shadowBlur: 40, shadowColor: s.color },
          scale: isTouchDevice ? 1.5 : 3.5,
        },
        animation: false,
        large: isTouchDevice,
        largeThreshold: 2000,
      })),
      legend: {
        data: ['2023年', '2024年', '2025年'].filter(y => selectedYears.includes(y.replace('年', ''))),
        textStyle: { color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)', fontSize: 11 },
        top: 5, right: 10, icon: 'circle', itemWidth: 8, itemHeight: 8,
      },
    }

    chart.setOption(option, true)
    chart.resize()

    const ro = new ResizeObserver(() => chart.resize())
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [seriesData, filtered, selectedYears, theme])

  useEffect(() => {
    const handler = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target) && !e.target.closest('.filter-trigger')) {
        setOpenFilterCol(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const yearToggle = (y) => {
    setSelectedYears(prev => prev.includes(y) ? prev.filter(v => v !== y) : [...prev, y])
  }

  const hasFilter = (colKey) => {
    const f = columnFilters[colKey]
    if (!f) return false
    if (colKey === 'location') return f.provinces?.length > 0 || f.cities?.length > 0
    if (f.selectedValues?.length) return true
    if (f.textSearch) return true
    return false
  }

  const activeFilterCount = Object.keys(columnFilters).length
  const totalSchools = new Set(filtered.map(m => m.school_code)).size

  const getRowVal = (row, key) => {
    if (key === 'location') return `${row.school_province || ''}${row.school_city ? '/' + row.school_city : ''}`
    if (key === 'subject_requirement') return row.subject_requirement
    return row[key]
  }

  return (
    <div className="h-full flex flex-col relative overflow-hidden bg-[var(--bg-primary)] transition-colors">

      <div className="shrink-0 px-3 pt-2 pb-1.5 space-y-2 relative z-20">
        <div className="flex gap-2 items-center">
          {['2023', '2024', '2025'].map(y => (
            <button key={y} onClick={() => yearToggle(y)}
              className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-all ${
                selectedYears.includes(y) ? 'text-white shadow-sm' : 'bg-white/10 text-[var(--text-secondary)] border border-white/10'
              }`}
              style={selectedYears.includes(y) ? { backgroundColor: getYearColor(y) } : {}}
            >{y}年</button>
          ))}
          <div className="flex-1" />
          {activeFilterCount > 0 && (
            <button onClick={() => setColumnFilters({})}
              className="text-[11px] text-[#ff9500]">清除筛选</button>
          )}
        </div>

        <div className="flex gap-1.5 flex-wrap">
          {COLUMNS.map(col => (
            <button key={col.key}
              onClick={(e) => { e.stopPropagation(); setOpenFilterCol(openFilterCol === col.key ? null : col.key) }}
              className={`filter-trigger flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                hasFilter(col.key)
                  ? 'bg-[#007aff] text-white'
                  : 'bg-white/10 text-[var(--text-secondary)] hover:bg-white/20'
              }`}
            >
              <ListFilter size={12} />
              {col.label}
              {hasFilter(col.key) && <span className="text-[10px] opacity-70">●</span>}
            </button>
          ))}
        </div>

        {openFilterCol && (
          <div className="relative z-30" ref={filterRef}>
            <FilterDropdown
              column={COLUMNS.find(c => c.key === openFilterCol)}
              meta={columnMeta[openFilterCol]}
              currentFilter={columnFilters[openFilterCol] || {}}
              onApply={(f) => {
                setColumnFilters(prev => {
                  const next = { ...prev }
                  if (!f || (Object.keys(f).length === 0)) delete next[openFilterCol]
                  else next[openFilterCol] = f
                  return next
                })
                setOpenFilterCol(null)
              }}
            />
          </div>
        )}
      </div>

      <div className="shrink-0 px-3 pb-1 text-[11px] text-[var(--text-secondary)] flex gap-3 relative z-10 transition-colors">
        <span>{filtered.length.toLocaleString()} 个专业</span>
        <span>·</span>
        <span>{totalSchools} 所学校</span>
        {activeFilterCount > 0 && <span>· {activeFilterCount} 个筛选中</span>}
      </div>

      <div ref={containerRef} className="flex-1 w-full relative z-0" />

      {popoverSchool && popoverAnchor && (
        <SchoolPopover
          schoolName={popoverSchool.name}
          subjectRequirement={popoverSchool.requirement}
          anchorRect={popoverAnchor}
          onClose={() => { setPopoverSchool(null); setPopoverAnchor(null) }}
        />
      )}
    </div>
  )
}

function FilterDropdown({ column, meta, currentFilter, onApply }) {
  const isLocation = column.type === 'location'
  const isText = column.type === 'text'
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [selectedProvinces, setSelectedProvinces] = useState(currentFilter.provinces || [])
  const [selectedCities, setSelectedCities] = useState(currentFilter.cities || [])
  const [textSearch, setTextSearch] = useState(currentFilter.textSearch || '')
  const [selectedValues, setSelectedValues] = useState(currentFilter.selectedValues || [])
  const [dropdownDir, setDropdownDir] = useState('left')
  const dropdownRef = useRef(null)

  useEffect(() => {
    if (dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect()
      if (rect.right > window.innerWidth) {
        setDropdownDir('right')
      } else {
        setDropdownDir('left')
      }
    }
  }, [])

  const availableCities = useMemo(() => {
    if (!isLocation || !meta?.locationMap) return []
    const cities = new Set()
    const provs = selectedProvinces.length > 0 ? selectedProvinces : Object.keys(meta.locationMap)
    for (const p of provs) {
      const cs = meta.locationMap[p]
      if (cs) cs.forEach(c => cities.add(c))
    }
    return [...cities].sort()
  }, [isLocation, meta, selectedProvinces])

  const filteredValues = useMemo(() => {
    if (!isText || !meta?.values) return []
    const q = textSearch.toLowerCase()
    const matches = meta.values.filter(v => !q || v.toLowerCase().includes(q))
    return matches.length > 200 ? matches.slice(0, 200) : matches
  }, [isText, meta, textSearch])

  const apply = () => {
    if (isLocation) {
      const f = {}
      if (selectedProvinces.length > 0) f.provinces = selectedProvinces
      if (selectedCities.length > 0) f.cities = selectedCities
      onApply(f)
    } else if (isText) {
      const f = {}
      if (selectedValues.length > 0) f.selectedValues = selectedValues
      if (textSearch) f.textSearch = textSearch
      onApply(f)
    }
  }

  const clear = () => {
    setSelectedProvinces([]); setSelectedCities([])
    setTextSearch(''); setSelectedValues([])
  }

  const toggleProvince = (p) => {
    setSelectedProvinces(prev => {
      const next = prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
      return next
    })
  }

  const toggleCity = (c) => {
    setSelectedCities(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
  }

  const toggleValue = (v) => {
    setSelectedValues(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])
  }

  const allProvinces = meta?.locationMap ? Object.keys(meta.locationMap).sort() : []

  const bg = isDark ? '#1c1c1e' : '#ffffff'
  const chipBg = isDark ? '#2c2c2e' : '#f2f2f7'
  const chipText = isDark ? '#c7c7cc' : '#3a3a3c'
  const chipHover = isDark ? '#3a3a3c' : '#e5e5ea'
  const textPrimary = isDark ? '#ffffff' : '#1c1c1e'
  const borderClr = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(60,60,67,0.12)'

  return (
    <div ref={dropdownRef}
      className={`rounded-[10px] shadow-xl border flex flex-col animate-scale-in absolute top-1 ${
        dropdownDir === 'right' ? 'right-0' : 'left-0'
      }`}
      style={{
        width: isLocation ? 280 : 250,
        maxHeight: isLocation ? 420 : 380,
        backgroundColor: bg,
        borderColor: borderClr,
      }}
    >
      <div className="overflow-y-auto flex-1 p-3 pb-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[14px] font-semibold" style={{ color: textPrimary }}>{column.label}</span>
          <button onClick={clear} className="text-[12px] text-[#007aff]">清除</button>
        </div>

        {isLocation ? (
          <>
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] text-[#8e8e93] font-medium">省份</span>
                <div className="flex gap-2">
                  <button onClick={() => setSelectedProvinces(allProvinces)}
                    className="text-[10px] text-[#007aff]">全选</button>
                  <button onClick={() => setSelectedProvinces([])}
                    className="text-[10px] text-[#007aff]">清空</button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1 max-h-[120px] overflow-y-auto">
                {allProvinces.map(p => (
                  <button key={p} onClick={() => toggleProvince(p)}
                    className={`px-2 py-0.5 rounded-full text-[11px] font-medium transition-all duration-150 ${
                      selectedProvinces.includes(p)
                        ? 'bg-[#007aff] text-white'
                        : ''
                    }`}
                    style={!selectedProvinces.includes(p) ? { backgroundColor: chipBg, color: chipText } : {}}
                  >
                    {p}
                    {selectedProvinces.includes(p) && selectedProvinces.length > 0 &&
                      ` (${(meta.locationMap[p] || []).length})`}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] text-[#8e8e93] font-medium">城市</span>
                <div className="flex gap-2">
                  <button onClick={() => setSelectedCities(availableCities)}
                    className="text-[10px] text-[#007aff]">全选</button>
                  <button onClick={() => setSelectedCities([])}
                    className="text-[10px] text-[#007aff]">清空</button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1 max-h-[140px] overflow-y-auto">
                {availableCities.map(c => (
                  <button key={c} onClick={() => toggleCity(c)}
                    className={`px-2 py-0.5 rounded-full text-[11px] font-medium transition-all duration-150 ${
                      selectedCities.includes(c)
                        ? 'bg-[#007aff] text-white'
                        : ''
                    }`}
                    style={!selectedCities.includes(c) ? { backgroundColor: chipBg, color: chipText } : {}}
                  >
                    {c}
                  </button>
                ))}
                {availableCities.length === 0 && (
                  <span className="text-[11px] text-[#8e8e93]">请先选择省份</span>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            <input type="text" value={textSearch} onChange={e => setTextSearch(e.target.value)}
              placeholder="搜索..." autoFocus
              className="w-full rounded-[8px] px-3 py-2 text-[13px] outline-none mb-2 placeholder-[#8e8e93]"
              style={{ backgroundColor: chipBg, color: textPrimary }}
            />
            <div className="flex items-center gap-2 mb-2">
              <button onClick={() => setSelectedValues(filteredValues.map(v => v))}
                className="text-[11px] text-[#007aff]">全选</button>
              <button onClick={() => setSelectedValues([])}
                className="text-[11px] text-[#007aff]">清空</button>
              <span className="text-[11px] text-[#8e8e93] ml-auto">
                {selectedValues.length}/{meta?.values?.length || 0}
              </span>
            </div>
            <div className="max-h-[180px] overflow-y-auto space-y-0.5">
              {filteredValues.map(v => (
                <label key={v} className="flex items-center gap-2 px-1 py-1 rounded cursor-pointer transition-colors"
                  style={{ backgroundColor: 'transparent' }}
                >
                  <input type="checkbox" checked={selectedValues.includes(v)} onChange={() => toggleValue(v)}
                    className="accent-[#007aff]" />
                  <span className="text-[13px] truncate" style={{ color: textPrimary }}>{v}</span>
                </label>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="shrink-0 p-3 border-t rounded-b-[10px]"
        style={{ backgroundColor: bg, borderColor: borderClr }}>
        <div className="flex gap-2">
          <button onClick={() => onApply({})}
            className="flex-1 py-2.5 rounded-[10px] text-[13px] font-medium transition-colors"
            style={{ backgroundColor: chipBg, color: textPrimary }}>
            取消
          </button>
          <button onClick={apply}
            className="flex-1 py-2.5 rounded-[10px] text-[13px] font-medium bg-[#007aff] text-white active:bg-[#0066d6] transition-colors">
            确定
          </button>
        </div>
      </div>
    </div>
  )
}
