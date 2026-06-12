import { useEffect, useRef, useState } from 'react'
import { Book, MessageCircleMore, Globe, ExternalLink } from 'lucide-react'

const LINKS = [
  {
    label: '百度百科',
    buildUrl: (name) => `https://baike.baidu.com/item/${encodeURIComponent(name)}`,
    icon: Book,
    color: '#007aff',
  },
  {
    label: '百度贴吧',
    buildUrl: (name) => `https://tieba.baidu.com/f?kw=${encodeURIComponent(name)}`,
    icon: MessageCircleMore,
    color: '#34c759',
  },
  {
    label: 'Bing 搜索',
    buildUrl: (name) => `https://www.bing.com/search?q=${encodeURIComponent(name + ' 浙江 高考 录取')}`,
    icon: Globe,
    color: '#ff9500',
  },
]

export default function SchoolPopover({ schoolName, anchorRect, onClose }) {
  const popoverRef = useRef(null)
  const [flipY, setFlipY] = useState(false)
  const [popLeft, setPopLeft] = useState(12)

  useEffect(() => {
    const handler = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  useEffect(() => {
    if (!popoverRef.current) return
    const el = popoverRef.current
    const rect = el.getBoundingClientRect()
    const prefersAbove = rect.bottom > window.innerHeight - 8
    setFlipY(prefersAbove)
    const left = Math.min(
      Math.max(12, anchorRect.left + anchorRect.width / 2 - rect.width / 2),
      window.innerWidth - rect.width - 12
    )
    setPopLeft(left)
  }, [anchorRect])

  const arrowLeft = Math.max(
    16,
    Math.min(anchorRect.left + anchorRect.width / 2 - popLeft, 280)
  )

  return (
    <div ref={popoverRef}
      className="fixed z-50 animate-popover-in"
      style={{
        left: popLeft,
        top: flipY ? 'auto' : anchorRect.bottom + 10,
        bottom: flipY ? window.innerHeight - anchorRect.top + 10 : 'auto',
      }}
    >
      <div className="bg-[var(--dropdown-bg)] rounded-[14px] shadow-xl border border-[var(--border-medium)] overflow-hidden min-w-[220px] max-w-[280px]">
        <div className="px-4 py-3 border-b border-[var(--border-color)]">
          <p className="text-[13px] font-semibold text-[var(--text-primary)] truncate">{schoolName}</p>
          <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">以下内容来自网络，本项目与其中信息无关</p>
        </div>
        <div className="py-1.5">
          {LINKS.map((link, i) => {
            const Icon = link.icon
            return (
              <a key={i}
                href={link.buildUrl(schoolName)}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--filter-chip-bg)] active:bg-[var(--filter-chip-hover)] transition-colors no-underline"
              >
                <div className="w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0"
                  style={{ backgroundColor: link.color + '18' }}>
                  <Icon size={16} style={{ color: link.color }} />
                </div>
                <span className="flex-1 text-[14px] text-[var(--text-primary)] font-medium">{link.label}</span>
                <ExternalLink size={12} className="text-[var(--text-quaternary)] shrink-0" />
              </a>
            )
          })}
        </div>
      </div>
      <div className={`w-3 h-3 bg-[var(--dropdown-bg)] rotate-45 absolute ${flipY ? '-bottom-1.5 border-b border-r' : '-top-1.5 border-l border-t'} border-[var(--border-medium)]`}
        style={{ left: arrowLeft }}
      />
    </div>
  )
}
