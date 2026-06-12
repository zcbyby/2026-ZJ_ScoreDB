import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { getScoreColor, buildLocationMap } from '../utils/data'
import { ArrowUpDown, ListFilter, Download } from 'lucide-react'
import * as XLSX from 'xlsx'

const ROW_HEIGHT = 40
const HEADER_HEIGHT = 38
const OVERSCAN = 20

const COLUMN_DEFS = [
  { key: 'school_code', label: '院校代码', align: 'center', type: 'text', minW: 72, flex: 0.5 },
  { key: 'school_name', label: '院校名称', align: 'left', type: 'text', minW: 100, flex: 2 },
  { key: 'location', label: '所在省市', align: 'left', type: 'location', minW: 90, flex: 1.2 },
  { key: 'major_name', label: '专业名称', align: 'left', type: 'text', minW: 120, flex: 3 },
  { key: 'score_2025', label: '25分数', align: 'right', type: 'number', minW: 60, flex: 0.6 },
  { key: 'rank_2025', label: '25位次', align: 'right', type: 'number', minW: 76, flex: 0.8 },
  { key: 'plan_2025', label: '25计划', align: 'right', type: 'number', minW: 56, flex: 0.5 },
  { key: 'score_2024', label: '24分数', align: 'right', type: 'number', minW: 60, flex: 0.6 },
  { key: 'rank_2024', label: '24位次', align: 'right', type: 'number', minW: 76, flex: 0.8 },
  { key: 'plan_2024', label: '24计划', align: 'right', type: 'number', minW: 56, flex: 0.5 },
  { key: 'score_2023', label: '23分数', align: 'right', type: 'number', minW: 60, flex: 0.6 },
  { key: 'rank_2023', label: '23位次', align: 'right', type: 'number', minW: 76, flex: 0.8 },
  { key: 'plan_2023', label: '23计划', align: 'right', type: 'number', minW: 56, flex: 0.5 },
]

export default function TableView({ mergedData }) {
  const [sortKey, setSortKey] = useState('school_code')
  const [sortAsc, setSortAsc] = useState(true)
  const [scrollTop, setScrollTop] = useState(0)
  const [containerHeight, setContainerHeight] = useState(600)
  const [containerWidth, setContainerWidth] = useState(1000)
  const [filterGen, setFilterGen] = useState(0)
  const scrollRef = useRef(null)
  const bodyRef = useRef(null)
  const [columnFilters, setColumnFilters] = useState({})
  const [openFilterCol, setOpenFilterCol] = useState(null)
  const filterRef = useRef(null)
  const openFilterRef = useRef(null)
  openFilterRef.current = openFilterCol

  const locationMap = useMemo(() => buildLocationMap(mergedData), [mergedData])

  const COLUMNS = useMemo(() => {
    const totalFlex = COLUMN_DEFS.reduce((s, c) => s + c.flex, 0)
    const totalMinW = COLUMN_DEFS.reduce((s, c) => s + c.minW, 0)
    const extra = Math.max(0, containerWidth - totalMinW)
    return COLUMN_DEFS.map(c => ({
      ...c,
      width: Math.round(c.minW + (c.flex / totalFlex) * extra),
    }))
  }, [containerWidth])

  const columnMeta = useMemo(() => {
    const meta = {}
    for (const col of COLUMNS) {
      if (col.key === 'location') {
        meta[col.key] = { type: 'location', locationMap }
      } else if (col.type === 'text') {
        const vals = new Set()
        for (const r of mergedData) {
          const v = getColValue(r, col.key)
          if (v) vals.add(v)
        }
        meta[col.key] = { type: 'text', values: [...vals].sort() }
      } else {
        let min = Infinity, max = -Infinity
        for (const r of mergedData) {
          const v = getColValue(r, col.key)
          if (v != null && !isNaN(v)) { min = Math.min(min, v); max = Math.max(max, v) }
        }
        meta[col.key] = { type: 'number', min: min === Infinity ? 0 : min, max: max === -Infinity ? 0 : max }
      }
    }
    return meta
  }, [mergedData, COLUMNS, locationMap])

  const processed = useMemo(() => {
    let data = mergedData
    const entries = Object.entries(columnFilters)
    if (entries.length > 0) {
      data = data.filter(row => {
        for (const [colKey, filter] of entries) {
          if (colKey === 'location') {
            const p = row.school_province
            const c = row.school_city
            if (filter.provinces?.length && (!p || !filter.provinces.includes(p))) return false
            if (filter.cities?.length && (!c || !filter.cities.includes(c))) return false
          } else {
            const val = getColValue(row, colKey)
            const col = COLUMNS.find(c => c.key === colKey)
            if (col?.type === 'text') {
              if (filter.selectedValues?.length && !filter.selectedValues.includes(val)) return false
              if (filter.textSearch && val && !val.toLowerCase().includes(filter.textSearch.toLowerCase())) return false
            } else if (filter.min != null || filter.max != null) {
              if (filter.min != null && (val == null || val < filter.min)) return false
              if (filter.max != null && (val == null || val > filter.max)) return false
            }
          }
        }
        return true
      })
    }

    data.sort((a, b) => {
      let va = getColValue(a, sortKey)
      let vb = getColValue(b, sortKey)
      if (va == null) va = sortAsc ? Infinity : -Infinity
      if (vb == null) vb = sortAsc ? Infinity : -Infinity
      if (typeof va === 'string') va = va.toLowerCase()
      if (typeof vb === 'string') vb = vb.toLowerCase()
      if (va < vb) return sortAsc ? -1 : 1
      if (va > vb) return sortAsc ? 1 : -1
      return 0
    })
    return data
  }, [mergedData, sortKey, sortAsc, columnFilters, COLUMNS])

  const totalHeight = processed.length * ROW_HEIGHT
  const visibleRange = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN)
    const end = Math.min(processed.length, Math.ceil((scrollTop + containerHeight) / ROW_HEIGHT) + OVERSCAN)
    return { start, end }
  }, [scrollTop, containerHeight, processed.length])
  const visibleRows = useMemo(() => processed.slice(visibleRange.start, visibleRange.end), [processed, visibleRange])

  useEffect(() => {
    const el = bodyRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        setContainerHeight(e.contentRect.height)
        setContainerWidth(e.contentRect.width)
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const onScroll = useCallback(() => { if (scrollRef.current) setScrollTop(scrollRef.current.scrollTop) }, [])

  const handleSort = (key) => {
    if (sortKey === key) setSortAsc(!sortAsc)
    else { setSortKey(key); setSortAsc(true) }
  }

  useEffect(() => {
    const handler = (e) => {
      if (e.target.closest('.filter-trigger')) return
      if (filterRef.current && !filterRef.current.contains(e.target) && openFilterRef.current !== null) {
        setOpenFilterCol(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const activeFilterCount = Object.keys(columnFilters).length
  const hasFilter = (colKey) => {
    const f = columnFilters[colKey]
    if (!f) return false
    if (colKey === 'location') return f.provinces?.length > 0 || f.cities?.length > 0
    if (f.selectedValues?.length) return true
    if (f.textSearch) return true
    if (f.min != null || f.max != null) return true
    return false
  }

  const setFilter = (colKey, f) => {
    setColumnFilters(prev => {
      const next = { ...prev }
      if (!f || (Object.keys(f).length === 0)) delete next[colKey]
      else next[colKey] = f
      return next
    })
    setOpenFilterCol(null)
    setFilterGen(g => g + 1)
  }

  // Export FILTERED data with AutoFilter
  const exportXLSX = useCallback(() => {
    const headers = COLUMNS.map(c => c.label)
    const rows = processed.map(r => COLUMNS.map(c => {
      if (c.key === 'location') return `${r.school_province || ''}${r.school_city ? '/' + r.school_city : ''}`
      const v = getColValue(r, c.key)
      if (v == null || v === '') return ''
      if (c.type === 'number' && typeof v === 'number') return v
      return String(v)
    }))

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
    ws['!cols'] = COLUMNS.map(c => ({ wch: Math.max(10, Math.round(c.width / 7)) }))
    const lastCol = XLSX.utils.encode_col(COLUMNS.length - 1)
    ws['!autofilter'] = { ref: `A1:${lastCol}${rows.length + 1}` }

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '录取数据')

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([wbout], { type: 'application/octet-stream' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `浙江高考录取分数线_${new Date().toISOString().slice(0, 10)}.xlsx`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [processed, COLUMNS])

  const totalWidth = COLUMNS.reduce((s, c) => s + c.width, 0)
  const rowKey = useCallback((r, i) => r.school_code + '|' + r.major_name + '|' + i + '|g' + filterGen, [filterGen])

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="shrink-0 px-3 py-1.5 bg-[#f2f2f7] border-b border-[rgba(60,60,67,0.08)] flex items-center gap-2 text-[11px] text-[#8e8e93]">
        <span>{mergedData.length.toLocaleString()} 条</span>
        {activeFilterCount > 0 && (
          <>
            <span>·</span>
            <span className="text-[#007aff]">{processed.length.toLocaleString()} 筛出</span>
            <button onClick={() => { setColumnFilters({}); setFilterGen(g => g + 1) }} className="text-[#007aff]">清除筛选</button>
          </>
        )}
        <button onClick={exportXLSX}
          className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded-[8px] text-[12px] font-medium bg-[#007aff] text-white hover:bg-[#0066d6] transition-colors">
          <Download size={14} />
          导出 XLSX
        </button>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col relative" ref={bodyRef}>
        <div className="shrink-0 flex bg-[#f8f8fa] border-b border-[rgba(60,60,67,0.12)]" style={{ height: HEADER_HEIGHT, width: totalWidth, minWidth: '100%' }}>
          {COLUMNS.map(col => (
            <div key={col.key} className="shrink-0 relative group" style={{ width: col.width }}>
              <button
                onClick={() => handleSort(col.key)}
                className="flex items-center gap-1 w-full h-full pl-2 pr-6 text-[11px] font-semibold transition-colors"
                style={{ justifyContent: col.align === 'right' ? 'flex-end' : col.align === 'center' ? 'center' : 'flex-start', color: sortKey === col.key ? '#1c1c1e' : '#6c6c70' }}
              >
                <span className="truncate">{col.label}</span>
                {sortKey === col.key && <ArrowUpDown size={10} className="shrink-0" />}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setOpenFilterCol(openFilterCol === col.key ? null : col.key) }}
                className={`filter-trigger absolute right-0.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded text-[11px] transition-all ${
                  hasFilter(col.key) ? 'text-[#007aff]' : 'text-[#c7c7cc] group-hover:text-[#6c6c70]'
                }`}
              >
                <ListFilter size={14} />
              </button>
              {openFilterCol === col.key && (
                <div className="absolute left-0 top-full z-30" ref={filterRef}>
                  <ColumnFilterDropdown
                    column={col}
                    meta={columnMeta[col.key]}
                    currentFilter={columnFilters[col.key] || {}}
                    onApply={(f) => setFilter(col.key, f)}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-auto" onScroll={onScroll}>
          <div style={{ height: totalHeight, position: 'relative', width: totalWidth, minWidth: '100%' }}>
            <div style={{ position: 'absolute', top: visibleRange.start * ROW_HEIGHT, left: 0, right: 0 }}>
              {visibleRows.map((r, i) => (
                <div key={rowKey(r, i)}
                  className="flex items-center border-b border-[rgba(60,60,67,0.04)] hover:bg-[rgba(0,122,255,0.03)] animate-row-enter"
                  style={{ height: ROW_HEIGHT, animationDelay: `${Math.min(i * 15, 200)}ms` }}
                >
                  {COLUMNS.map(col => {
                    const val = col.key === 'location'
                      ? `${r.school_province || ''}${r.school_city ? '/' + r.school_city : ''}`
                      : getColValue(r, col.key)
                    const isScore = col.key.startsWith('score_')
                    const isRank = col.key.startsWith('rank_')
                    const isPlan = col.key.startsWith('plan_')
                    const isCode = col.key === 'school_code'

                    let color = '#1c1c1e'
                    if (isScore && val > 0) color = getScoreColor(val)
                    else if (isRank && val > 0) color = '#636366'
                    else if (isPlan) color = '#8e8e93'

                    return (
                      <div key={col.key}
                        className="px-2 text-[12px] truncate shrink-0"
                        style={{
                          width: col.width,
                          textAlign: col.align,
                          color,
                          fontWeight: isScore ? 600 : isCode ? 500 : 400,
                        }}
                      >
                        {col.key === 'location' ? val : fmtValue(val, col)}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function getColValue(row, key) {
  if (key === 'school_code') return row.school_code
  if (key === 'school_name') return row.school_name
  if (key === 'major_name') return row.major_name
  if (key === 'location') return `${row.school_province || ''}${row.school_city ? '/' + row.school_city : ''}`
  const [field, year] = key.split('_')
  const d = row[year]
  if (!d) return null
  return d[field]
}

function fmtValue(val, col) {
  if (val == null || val === '') return '-'
  if (col.type === 'number' && typeof val === 'number' && val > 0) {
    if (col.key.startsWith('rank_')) return val.toLocaleString()
    return val
  }
  return val
}

function ColumnFilterDropdown({ column, meta, currentFilter, onApply }) {
  const isLocation = column.type === 'location'
  const isText = column.type === 'text'

  const [selectedProvinces, setSelectedProvinces] = useState(currentFilter.provinces || [])
  const [selectedCities, setSelectedCities] = useState(currentFilter.cities || [])
  const [textSearch, setTextSearch] = useState(currentFilter.textSearch || '')
  const [selectedValues, setSelectedValues] = useState(currentFilter.selectedValues || [])
  const [minVal, setMinVal] = useState(currentFilter.min != null ? currentFilter.min : '')
  const [maxVal, setMaxVal] = useState(currentFilter.max != null ? currentFilter.max : '')

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
    } else {
      const f = {}
      if (minVal !== '') f.min = Number(minVal)
      if (maxVal !== '') f.max = Number(maxVal)
      onApply(f)
    }
  }

  const clear = () => {
    setSelectedProvinces([]); setSelectedCities([])
    setTextSearch(''); setSelectedValues([]); setMinVal(''); setMaxVal('')
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

  return (
    <div className="bg-white rounded-[12px] shadow-xl border border-[rgba(60,60,67,0.12)] flex flex-col animate-scale-in"
      style={{ width: isLocation ? 280 : 250, maxHeight: isLocation ? 420 : 380 }}>
      <div className="overflow-y-auto flex-1 p-3 pb-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[14px] font-semibold text-[#1c1c1e]">{column.label}</span>
          <button onClick={clear} className="text-[12px] text-[#007aff]">清除</button>
        </div>

        {isLocation ? (
          <>
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] text-[#8e8e93] font-medium">省份</span>
                <div className="flex gap-2">
                  <button onClick={() => setSelectedProvinces(allProvinces)} className="text-[10px] text-[#007aff]">全选</button>
                  <button onClick={() => setSelectedProvinces([])} className="text-[10px] text-[#007aff]">清空</button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1 max-h-[120px] overflow-y-auto">
                {allProvinces.map(p => (
                  <button key={p} onClick={() => toggleProvince(p)}
                    className={`px-2 py-0.5 rounded-full text-[11px] font-medium transition-all duration-150 ${
                      selectedProvinces.includes(p)
                        ? 'bg-[#007aff] text-white'
                        : 'bg-[#f2f2f7] text-[#3a3a3c] hover:bg-[#e5e5ea]'
                    }`}
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
                  <button onClick={() => setSelectedCities(availableCities)} className="text-[10px] text-[#007aff]">全选</button>
                  <button onClick={() => setSelectedCities([])} className="text-[10px] text-[#007aff]">清空</button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1 max-h-[140px] overflow-y-auto">
                {availableCities.map(c => (
                  <button key={c} onClick={() => toggleCity(c)}
                    className={`px-2 py-0.5 rounded-full text-[11px] font-medium transition-all duration-150 ${
                      selectedCities.includes(c)
                        ? 'bg-[#007aff] text-white'
                        : 'bg-[#f2f2f7] text-[#3a3a3c] hover:bg-[#e5e5ea]'
                    }`}
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
        ) : isText ? (
          <>
            <input type="text" value={textSearch} onChange={e => setTextSearch(e.target.value)}
              placeholder="搜索..." autoFocus
              className="w-full bg-[#f2f2f7] rounded-[8px] px-3 py-2 text-[13px] outline-none mb-2 placeholder-[#8e8e93]"
            />
            <div className="flex items-center gap-2 mb-2">
              <button onClick={() => setSelectedValues(filteredValues.map(v => v))} className="text-[11px] text-[#007aff]">全选</button>
              <button onClick={() => setSelectedValues([])} className="text-[11px] text-[#007aff]">清空</button>
              <span className="text-[11px] text-[#8e8e93] ml-auto">
                {selectedValues.length}/{meta?.values?.length || 0}
                {(filteredValues.length < (meta?.values?.length || 0)) && ` (显示${filteredValues.length})`}
              </span>
            </div>
            <div className="max-h-[200px] overflow-y-auto space-y-0.5">
              {filteredValues.map(v => (
                <label key={v} className="flex items-center gap-2 px-1 py-1.5 rounded hover:bg-[#f2f2f7] cursor-pointer">
                  <input type="checkbox" checked={selectedValues.includes(v)} onChange={() => toggleValue(v)} className="accent-[#007aff]" />
                  <span className="text-[13px] text-[#1c1c1e] truncate">{v}</span>
                </label>
              ))}
            </div>
          </>
        ) : (
          <div className="space-y-3 pb-2">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-[11px] text-[#8e8e93]">最小值</label>
                <input type="number" value={minVal} onChange={e => setMinVal(e.target.value)}
                  placeholder={meta?.min?.toString()}
                  className="w-full bg-[#f2f2f7] rounded-[8px] px-3 py-2 text-[13px] outline-none mt-1"
                />
              </div>
              <div className="flex-1">
                <label className="text-[11px] text-[#8e8e93]">最大值</label>
                <input type="number" value={maxVal} onChange={e => setMaxVal(e.target.value)}
                  placeholder={meta?.max?.toString()}
                  className="w-full bg-[#f2f2f7] rounded-[8px] px-3 py-2 text-[13px] outline-none mt-1"
                />
              </div>
            </div>
            <div className="text-[11px] text-[#8e8e93]">
              范围: {(meta?.min ?? 0).toLocaleString()} ~ {(meta?.max ?? 0).toLocaleString()}
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 p-3 border-t border-[rgba(60,60,67,0.08)] bg-white rounded-b-[12px]">
        <div className="flex gap-2">
          <button onClick={() => onApply({})}
            className="flex-1 py-2.5 rounded-[10px] text-[13px] font-medium bg-[#f2f2f7] text-[#1c1c1e] active:bg-[#e5e5ea] transition-colors">
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
