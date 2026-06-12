import { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { getScoreColor, getScoreTier } from '../utils/data'
import { MousePointer2 } from 'lucide-react'

const TIER_COLORS = {
  '顶尖': '#ff2d55',
  '优秀': '#ff9500',
  '良好': '#ffcc02',
  '一本': '#34c759',
  '二本': '#5ac8fa',
  '本科': '#007aff',
  '其他': '#8e8e93',
}

function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

export default function MapView({ data, schools, schoolCompare, selectedYear, onSelectSchool }) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const [tooltip, setTooltip] = useState(null)
  const [dimensions, setDimensions] = useState({ w: 800, h: 600 })
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [selectedTier, setSelectedTier] = useState(null)
  const isPanning = useRef(false)
  const lastPos = useRef({ x: 0, y: 0 })
  const hoveredSchool = useRef(null)
  const animFrame = useRef(null)

  // Compute school positions
  const schoolPositions = useMemo(() => {
    if (!schoolCompare || !data) return []
    const yearData = {}
    for (const r of data) {
      if (!yearData[r[0]]) yearData[r[0]] = []
      yearData[r[0]].push({ score: r[5], major: r[3], plan: r[4] })
    }

    const positions = []
    for (const sc of schoolCompare) {
      const records = yearData[sc.code] || []
      if (records.length === 0) continue
      const scores = records.map(r => r.score).filter(s => s > 0)
      if (scores.length === 0) continue
      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length
      const variance = scores.reduce((sum, s) => sum + (s - avgScore) ** 2, 0) / scores.length
      const volatility = Math.sqrt(variance)
      const totalStudents = records.reduce((sum, r) => sum + (r.plan || 0), 0)

      positions.push({
        code: sc.code,
        name: sc.name || 'Unknown',
        avgScore,
        volatility,
        totalStudents,
        majorCount: records.length,
        scores,
      })
    }
    return positions
  }, [schoolCompare, data])

  // Filter by tier
  const filteredPositions = useMemo(() => {
    if (!selectedTier) return schoolPositions
    return schoolPositions.filter(p => {
      const tier = getScoreTier(p.avgScore)
      return tier.startsWith(selectedTier)
    })
  }, [schoolPositions, selectedTier])

  // Map coordinates
  const coordMap = useMemo(() => {
    if (filteredPositions.length === 0) return []
    const scores = filteredPositions.map(p => p.avgScore)
    const volats = filteredPositions.map(p => p.volatility)
    const minScore = Math.min(...scores)
    const maxScore = Math.max(...scores)
    const maxVolat = Math.max(...volats) || 1

    const pad = 80
    const w = dimensions.w - pad * 2
    const h = dimensions.h - pad * 2

    return filteredPositions.map(p => ({
      ...p,
      x: pad + (p.volatility / maxVolat) * w,
      y: pad + ((maxScore - p.avgScore) / (maxScore - minScore || 1)) * h,
      radius: Math.max(4, Math.min(20, Math.sqrt(p.majorCount) * 2.5)),
    }))
  }, [filteredPositions, dimensions])

  // Draw the map
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const { w, h } = dimensions
    const dpr = devicePixelRatio || 1

    canvas.width = w * dpr
    canvas.height = h * dpr
    ctx.scale(dpr, dpr)

    // Background
    const grad = ctx.createLinearGradient(0, 0, 0, h)
    grad.addColorStop(0, '#0d0d1a')
    grad.addColorStop(0.3, '#1a1a2e')
    grad.addColorStop(0.6, '#16213e')
    grad.addColorStop(1, '#1c2833')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.04)'
    ctx.lineWidth = 0.5
    for (let i = 0; i < 10; i++) {
      const y = (h / 10) * i
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
      ctx.stroke()
    }
    for (let i = 0; i < 10; i++) {
      const x = (w / 10) * i
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, h)
      ctx.stroke()
    }

    ctx.save()
    ctx.translate(pan.x, pan.y)
    ctx.scale(zoom, zoom)

    // Glow spots
    for (const p of coordMap) {
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 4)
      const c = getScoreColor(p.avgScore)
      grad.addColorStop(0, c + '60')
      grad.addColorStop(1, c + '00')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.radius * 4, 0, Math.PI * 2)
      ctx.fill()
    }

    // Schools
    for (const p of coordMap) {
      const isHovered = hoveredSchool.current === p.code
      const color = getScoreColor(p.avgScore)
      const r = isHovered ? p.radius * 1.4 : p.radius

      ctx.shadowColor = color + '80'
      ctx.shadowBlur = isHovered ? 24 : 10

      ctx.beginPath()
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.fill()

      ctx.strokeStyle = 'rgba(255,255,255,0.25)'
      ctx.lineWidth = 1.5
      ctx.stroke()
      ctx.shadowBlur = 0

      if (p.majorCount > 20 || isHovered) {
        ctx.fillStyle = isHovered ? '#fff' : 'rgba(255,255,255,0.7)'
        ctx.font = isHovered ? 'bold 11px -apple-system, sans-serif' : '10px -apple-system, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(p.name, p.x, p.y + r + 14)
        if (isHovered) {
          ctx.fillStyle = 'rgba(255,255,255,0.4)'
          ctx.font = '9px -apple-system, sans-serif'
          ctx.fillText(`${p.avgScore.toFixed(0)}分 · ${p.majorCount}专业`, p.x, p.y + r + 28)
        }
      }
    }

    ctx.restore()

    // Legend
    drawLegend(ctx, w, h)
    drawScale(ctx, w, h, coordMap)

  }, [coordMap, dimensions, zoom, pan])

  useEffect(() => {
    if (animFrame.current) cancelAnimationFrame(animFrame.current)
    animFrame.current = requestAnimationFrame(draw)
    return () => { if (animFrame.current) cancelAnimationFrame(animFrame.current) }
  }, [draw])

  // Resize
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        setDimensions({ w: width, h: height })
      }
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  const getCanvasPos = useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left - pan.x) / zoom,
      y: (e.clientY - rect.top - pan.y) / zoom,
    }
  }, [zoom, pan])

  const handleMouseMove = useCallback((e) => {
    if (isPanning.current) {
      setPan(p => ({
        x: p.x + e.clientX - lastPos.current.x,
        y: p.y + e.clientY - lastPos.current.y,
      }))
      lastPos.current = { x: e.clientX, y: e.clientY }
      return
    }

    const pos = getCanvasPos(e)
    let found = null
    for (const p of coordMap) {
      const dx = pos.x - p.x, dy = pos.y - p.y
      if (dx * dx + dy * dy < (p.radius + 6) * (p.radius + 6)) {
        found = p; break
      }
    }

    hoveredSchool.current = found ? found.code : null
    if (found) {
      const rect = containerRef.current.getBoundingClientRect()
      setTooltip({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top - 10,
        school: found,
      })
    } else {
      setTooltip(null)
    }
  }, [coordMap, getCanvasPos])

  const handleMouseDown = useCallback((e) => {
    isPanning.current = true
    lastPos.current = { x: e.clientX, y: e.clientY }
  }, [])

  const handleMouseUp = useCallback((e) => {
    if (isPanning.current) {
      isPanning.current = false
      return
    }
    const pos = getCanvasPos(e)
    for (const p of coordMap) {
      const dx = pos.x - p.x, dy = pos.y - p.y
      if (dx * dx + dy * dy < (p.radius + 6) * (p.radius + 6)) {
        onSelectSchool && onSelectSchool({ code: p.code, name: p.name })
        return
      }
    }
  }, [coordMap, getCanvasPos, onSelectSchool])

  const handleWheel = useCallback((e) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setZoom(z => Math.max(0.3, Math.min(8, z * delta)))
  }, [])

  // Touch support
  const touchRef = useRef({ startX: 0, startY: 0, dist: 0, isPan: false })

  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 1) {
      touchRef.current.startX = e.touches[0].clientX
      touchRef.current.startY = e.touches[0].clientY
      touchRef.current.isPan = false
    }
  }, [])

  const handleTouchMove = useCallback((e) => {
    if (e.touches.length === 1) {
      const dx = e.touches[0].clientX - touchRef.current.startX
      const dy = e.touches[0].clientY - touchRef.current.startY
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        touchRef.current.isPan = true
        setPan(p => ({ x: p.x + dx, y: p.y + dy }))
        touchRef.current.startX = e.touches[0].clientX
        touchRef.current.startY = e.touches[0].clientY
      }
    }
  }, [])

  const handleTouchEnd = useCallback((e) => {
    if (!touchRef.current.isPan) {
      // Handle as tap
      const touch = e.changedTouches[0]
      const rect = canvasRef.current.getBoundingClientRect()
      const pos = getCanvasPos({ clientX: touch.clientX, clientY: touch.clientY })
      for (const p of coordMap) {
        const dx = pos.x - p.x, dy = pos.y - p.y
        if (dx * dx + dy * dy < (p.radius + 10) * (p.radius + 10)) {
          onSelectSchool && onSelectSchool({ code: p.code, name: p.name })
          return
        }
      }
    }
  }, [coordMap, getCanvasPos, onSelectSchool])

  return (
    <div className="h-full flex flex-col">
      {/* Filter bar */}
      <div className="flex gap-1.5 px-4 py-2 overflow-x-auto shrink-0 scrollbar-none">
        <button
          onClick={() => setSelectedTier(null)}
          className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all duration-200 ${
            !selectedTier
              ? 'bg-[#007aff] text-white shadow-sm'
              : 'bg-white/80 text-[#3a3a3c] border border-[rgba(60,60,67,0.12)]'
          }`}
        >
          全部
        </button>
        {Object.entries(TIER_COLORS).map(([tier, color]) => (
          <button
            key={tier}
            onClick={() => setSelectedTier(tier === selectedTier ? null : tier)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all duration-200 flex items-center gap-1.5 ${
              selectedTier === tier
                ? 'text-white shadow-sm'
                : 'bg-white/80 text-[#3a3a3c] border border-[rgba(60,60,67,0.12)]'
            }`}
            style={selectedTier === tier ? { backgroundColor: color } : {}}
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
            {tier}
          </button>
        ))}
      </div>

      {/* Map container */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden rounded-xl mx-3 mb-2 select-none">
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-grab active:cursor-grabbing rounded-xl touch-none"
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => { setTooltip(null); isPanning.current = false }}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />
        {tooltip && (
          <div
            className="absolute pointer-events-none animate-fade-in z-10"
            style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%)' }}
          >
            <div className="bg-black/80 backdrop-blur-[10px] rounded-[10px] px-3 py-2 text-white text-[13px] min-w-[150px]">
              <p className="font-semibold text-[14px] mb-0.5">{tooltip.school.name}</p>
              <div className="flex justify-between text-[11px] text-white/70">
                <span>均分 {tooltip.school.avgScore.toFixed(0)}</span>
                <span>{tooltip.school.majorCount} 专业</span>
              </div>
              <div className="flex justify-between text-[11px] text-white/70">
                <span>{getScoreTier(tooltip.school.avgScore)}</span>
              </div>
            </div>
          </div>
        )}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none flex items-center gap-1.5 text-[11px] text-white/30 bg-black/40 px-3 py-1 rounded-full">
          <MousePointer2 size={12} strokeWidth={1.5} />
          <span>滚轮缩放 · 拖拽平移 · 点击详情</span>
        </div>
      </div>
    </div>
  )
}

function drawLegend(ctx, w, h) {
  const lx = w - 110, ly = 16, bw = 76, segH = 7
  const colors = ['#ff2d55', '#ff9500', '#ffcc02', '#34c759', '#5ac8fa', '#007aff', '#8e8e93']
  const labels = ['680+', '650+', '620+', '580+', '530+', '480+', '<480']

  roundRect(ctx, lx - 8, ly - 8, bw + 16, colors.length * (segH + 2) + 28, 8)
  ctx.fillStyle = 'rgba(0,0,0,0.55)'
  ctx.fill()

  colors.forEach((c, i) => {
    const y = ly + i * (segH + 2)
    ctx.fillStyle = c
    roundRect(ctx, lx, y, bw, segH, segH / 2)
    ctx.fill()

    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.font = '8px -apple-system, sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(labels[i], lx - 3, y + segH - 1)
  })

  ctx.fillStyle = 'rgba(255,255,255,0.4)'
  ctx.font = '8px -apple-system, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('分数线', lx + bw / 2, ly + colors.length * (segH + 2) + 14)
}

function drawScale(ctx, w, h, positions) {
  if (positions.length === 0) return
  const scores = positions.map(p => p.avgScore)
  const minScore = Math.floor(Math.min(...scores) / 10) * 10
  const maxScore = Math.ceil(Math.max(...scores) / 10) * 10
  const steps = 5

  const pad = 80
  const ah = h - pad * 2

  roundRect(ctx, 4, pad - 10, 44, ah + 20, 6)
  ctx.fillStyle = 'rgba(0,0,0,0.55)'
  ctx.fill()

  for (let i = 0; i <= steps; i++) {
    const score = minScore + i * Math.ceil((maxScore - minScore) / steps / 10) * 10
    if (score > maxScore) break
    const y = pad + ((maxScore - score) / (maxScore - minScore || 1)) * ah
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.fillRect(16, y, 20, 1)
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.font = '8px -apple-system, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(score.toString(), 25, y - 2)
  }

  ctx.fillStyle = 'rgba(255,255,255,0.3)'
  ctx.font = '8px -apple-system, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('分数', 25, h - pad + 16)
}
