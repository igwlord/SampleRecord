import { useEffect, useRef, useState } from 'react'
import { AudioSource, useAudioDevices } from '../hooks/useAudioDevices'
import { WavFormat } from '../lib/wavEncoder'

interface Props {
  selectedSource: AudioSource | null
  onSelect: (src: AudioSource) => void
  onSourceGone?: () => void
  analyserNode: AnalyserNode | null
  disabled?: boolean
  gain: number
  onGainChange: (v: number) => void
  format: WavFormat
  onFormatChange: (f: WavFormat) => void
}

const FORMAT_LABELS: Record<WavFormat, string> = {
  '16bit': 'WAV 16-bit / 44.1kHz',
  '32float': 'WAV 32-bit / 44.1kHz',
}

// ── dBFS horizontal meter ─────────────────────────────────────────────────
function DbfsMeter({ analyserNode }: { analyserNode: AnalyserNode | null }) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const peakHoldRef = useRef<number>(0)       // 0..1
  const peakHoldTimerRef = useRef<number>(0)  // ms timestamp

  // Resize canvas with wrapper
  useEffect(() => {
    const wrapper = wrapperRef.current
    const canvas = canvasRef.current
    if (!wrapper || !canvas) return
    const ro = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(16 * dpr)
    })
    ro.observe(wrapper)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    function draw() {
      rafRef.current = requestAnimationFrame(draw)
      if (!ctx || !canvas) return

      const dpr = window.devicePixelRatio || 1
      const W = canvas.width / dpr
      const H = canvas.height / dpr

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.save()
      ctx.scale(dpr, dpr)

      // background track
      ctx.fillStyle = 'rgba(255,255,255,0.07)'
      ctx.beginPath()
      ctx.roundRect(0, 0, W, H, 3)
      ctx.fill()

      let peak = 0
      if (analyserNode) {
        const data = new Float32Array(analyserNode.fftSize)
        analyserNode.getFloatTimeDomainData(data)
        for (let i = 0; i < data.length; i++) if (Math.abs(data[i]) > peak) peak = Math.abs(data[i])
      }

      // dBFS: map peak (0..1) to -60..0 dB
      const db = peak > 0 ? Math.max(-60, 20 * Math.log10(peak)) : -60
      const pct = Math.max(0, (db + 60) / 60) // 0..1

      // Update peak hold
      const now = performance.now()
      if (pct > peakHoldRef.current) {
        peakHoldRef.current = pct
        peakHoldTimerRef.current = now
      } else if (now - peakHoldTimerRef.current > 1200) {
        peakHoldRef.current = Math.max(0, peakHoldRef.current - 0.003)
      }

      // Color gradient segments
      const segments = [
        { from: 0,    to: 0.55, color: '#22c55e' }, // green   -60..-7 dB
        { from: 0.55, to: 0.75, color: '#eab308' }, // yellow  -7..-3 dB
        { from: 0.75, to: 0.90, color: '#f97316' }, // orange  -3..-1 dB
        { from: 0.90, to: 1.00, color: '#ef4444' }, // red      0 dB
      ]

      const filled = pct * W
      for (const seg of segments) {
        const x0 = seg.from * W
        const x1 = Math.min(filled, seg.to * W)
        if (x1 <= x0) continue
        ctx.fillStyle = seg.color
        ctx.beginPath()
        ctx.roundRect(x0, 2, x1 - x0, H - 4, 2)
        ctx.fill()
      }

      // Peak hold tick
      if (peakHoldRef.current > 0.01) {
        const px = peakHoldRef.current * W
        ctx.fillStyle = '#fff'
        ctx.fillRect(Math.min(px, W - 2), 2, 2, H - 4)
      }

      ctx.restore()
    }

    draw()
    return () => cancelAnimationFrame(rafRef.current)
  }, [analyserNode])

  // dBFS labels
  const labels = [
    { label: '-60', pct: 0 },
    { label: '-36', pct: 0.4 },
    { label: '-18', pct: 0.7 },
    { label: '-9',  pct: 0.85 },
    { label: '-3',  pct: 0.95 },
    { label: '0',   pct: 1 },
  ]

  return (
    <div className="dbfs-meter-wrapper">
      <div className="dbfs-meter-track" ref={wrapperRef}>
        <canvas
          ref={canvasRef}
          className="dbfs-meter-canvas"
          style={{ width: '100%', height: 16 }}
          aria-label="Input level meter"
          aria-hidden="true"
        />
      </div>
      <div className="dbfs-meter-labels" aria-hidden="true">
        {labels.map((l) => (
          <span key={l.label} className="dbfs-label" style={{ left: `${l.pct * 100}%` }}>
            {l.label}
          </span>
        ))}
        <span className="dbfs-unit" style={{ right: 0 }}>dBFS</span>
      </div>
    </div>
  )
}

// ── Icons ─────────────────────────────────────────────────────────────────
function IconChevron() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function IconRefresh({ spinning }: { spinning: boolean }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      style={spinning ? { animation: 'spin 0.8s linear infinite' } : undefined}>
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  )
}

function IconVolume() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  )
}

function toDb(linear: number): string {
  const db = 20 * Math.log10(linear)
  return `${db >= 0 ? '+' : ''}${db.toFixed(1)} dB`
}

// ── TopBar ────────────────────────────────────────────────────────────────
export function TopBar({
  selectedSource, onSelect, onSourceGone, analyserNode, disabled,
  gain, onGainChange, format, onFormatChange,
}: Props) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [formatOpen, setFormatOpen] = useState(false)
  const { sources, loading, refresh } = useAudioDevices()
  const dropdownRef = useRef<HTMLDivElement>(null)
  const formatRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!selectedSource || loading) return
    if (!sources.some((s) => s.id === selectedSource.id)) onSourceGone?.()
  }, [sources, selectedSource, loading, onSourceGone])

  // Close dropdowns on outside click
  useEffect(() => {
    if (!dropdownOpen && !formatOpen) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false)
      if (formatRef.current && !formatRef.current.contains(e.target as Node)) setFormatOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [dropdownOpen, formatOpen])

  const handleSelect = (src: AudioSource) => { onSelect(src); setDropdownOpen(false) }

  return (
    <header className="topbar" role="banner">
      {/* ── Capture From ── */}
      <div className="topbar-left" style={{ flexShrink: 0 }}>
        <div className="topbar-section-label">Capture From</div>
        <div className="topbar-source-dropdown" ref={dropdownRef}>
          <button
            className="topbar-source-btn"
            onClick={() => !disabled && setDropdownOpen((v) => !v)}
            disabled={disabled || loading}
            aria-haspopup="listbox"
            aria-expanded={dropdownOpen}
          >
            <span className="topbar-source-name">
              {loading ? 'Detecting…' : selectedSource ? (selectedSource.appName || selectedSource.name) : 'Select source'}
            </span>
            <span className="topbar-source-chevron"><IconChevron /></span>
          </button>

          {dropdownOpen && (
            <ul className="topbar-dropdown-menu" role="listbox" aria-label="Audio sources">
              <li className="topbar-dropdown-refresh">
                <button className="topbar-refresh-btn" onClick={(e) => { e.stopPropagation(); refresh() }} disabled={loading} aria-label="Refresh sources">
                  <IconRefresh spinning={loading} />
                  {loading ? 'Updating…' : 'Refresh sources'}
                </button>
              </li>
              {sources.map((src) => (
                <li key={src.id} role="option" aria-selected={selectedSource?.id === src.id}
                  className={`topbar-dropdown-item ${selectedSource?.id === src.id ? 'active' : ''}`}
                  onClick={() => handleSelect(src)}>
                  {src.appIcon && <img src={src.appIcon} width={14} height={14} alt="" style={{ borderRadius: 2, objectFit: 'contain', flexShrink: 0 }} />}
                  <span>{src.appName || src.name}</span>
                  {src.subtitle && <span className="topbar-dropdown-subtitle">{src.subtitle}</span>}
                </li>
              ))}
              {!loading && sources.length === 0 && (
                <li className="topbar-dropdown-item topbar-dropdown-empty">No app sources found</li>
              )}
            </ul>
          )}
        </div>
      </div>

      {/* ── Input Meter ── */}
      <div className="topbar-meter-area">
        <div className="topbar-section-label">Input Meter</div>
        <DbfsMeter analyserNode={analyserNode} />
      </div>

      {/* ── Right: Gain + Format + Avatar ── */}
      <div className="topbar-right">
        {/* Gain */}
        <div className="topbar-section-group">
          <div className="topbar-section-label">Gain</div>
          <div className="topbar-gain">
            <span className="topbar-gain-icon"><IconVolume /></span>
            <input
              type="range"
              className="topbar-gain-slider"
              min={0.5} max={4.0} step={0.1}
              value={gain}
              onChange={(e) => onGainChange(parseFloat(e.target.value))}
              aria-label={`Input gain: ${toDb(gain)}`}
            />
            <span className="topbar-gain-label">{toDb(gain)}</span>
          </div>
        </div>

        {/* Format */}
        <div className="topbar-section-group" ref={formatRef}>
          <div className="topbar-section-label">Format</div>
          <button className="topbar-format-btn" onClick={() => setFormatOpen((v) => !v)} aria-haspopup="listbox" aria-expanded={formatOpen}>
            <span>{FORMAT_LABELS[format]}</span>
            <IconChevron />
          </button>
          {formatOpen && (
            <ul className="topbar-dropdown-menu topbar-format-menu" role="listbox">
              {(Object.entries(FORMAT_LABELS) as [WavFormat, string][]).map(([key, label]) => (
                <li key={key} role="option" aria-selected={format === key}
                  className={`topbar-dropdown-item ${format === key ? 'active' : ''}`}
                  onClick={() => { onFormatChange(key); setFormatOpen(false) }}>
                  {label}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="topbar-avatar" aria-label="User profile">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
          </svg>
        </div>
      </div>
    </header>
  )
}
