import { useEffect, useRef, useState } from 'react'

interface Props {
  analyserNode: AnalyserNode | null
}

type PeakClass = 'peak-ok' | 'peak-warn' | 'peak-clip'

export function LiveWaveform({ analyserNode }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const [peakClass, setPeakClass] = useState<PeakClass>('peak-ok')

  // Keep canvas pixel dimensions in sync with its CSS layout size
  useEffect(() => {
    const wrapper = wrapperRef.current
    const canvas = canvasRef.current
    if (!wrapper || !canvas) return

    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      const ctx = canvas.getContext('2d')
      if (ctx) ctx.scale(dpr, dpr)
    })
    ro.observe(wrapper)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!analyserNode || !canvas) return

    const ctx2d = canvas.getContext('2d')
    if (!ctx2d) return

    const bufferLength = analyserNode.fftSize
    const data = new Float32Array(bufferLength)

    function draw() {
      animRef.current = requestAnimationFrame(draw)
      analyserNode!.getFloatTimeDomainData(data)

      const dpr = window.devicePixelRatio || 1
      const w = canvas!.width / dpr
      const h = canvas!.height / dpr

      ctx2d!.clearRect(0, 0, w, h)
      ctx2d!.beginPath()
      ctx2d!.strokeStyle = '#f97316'
      ctx2d!.lineWidth = 1.5
      ctx2d!.lineJoin = 'round'

      let peak = 0

      for (let i = 0; i < bufferLength; i++) {
        const v = data[i]
        if (Math.abs(v) > peak) peak = Math.abs(v)
        const x = (i / bufferLength) * w
        const y = ((1 - v) / 2) * h
        if (i === 0) ctx2d!.moveTo(x, y)
        else ctx2d!.lineTo(x, y)
      }

      ctx2d!.stroke()

      const pct = peak * 200
      setPeakClass(pct > 80 ? 'peak-clip' : pct > 50 ? 'peak-warn' : 'peak-ok')
    }

    animRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animRef.current)
  }, [analyserNode])

  return (
    <div ref={wrapperRef} className="live-waveform-wrapper">
      <canvas
        ref={canvasRef}
        className={`live-waveform-canvas ${peakClass}`}
        aria-hidden="true"
      />
    </div>
  )
}
