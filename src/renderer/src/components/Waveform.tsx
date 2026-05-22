import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import WaveSurfer from 'wavesurfer.js'
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js'
import TimelinePlugin from 'wavesurfer.js/dist/plugins/timeline.esm.js'
import MinimapPlugin from 'wavesurfer.js/dist/plugins/minimap.esm.js'
import { encodeToWav } from '../lib/wavEncoder'
import { WavFormat } from '../lib/wavEncoder'

interface Props {
  audioBuffer: AudioBuffer | null
  trimStart: number
  trimEnd: number
  format?: WavFormat
  onRegionUpdate: (start: number, end: number) => void
  onPlaybackChange?: (isPlaying: boolean) => void
}

export interface WaveformHandle {
  togglePlay: () => void
  skipToStart: () => void
  skipToEnd: () => void
  setLoop: (enabled: boolean) => void
}

export const Waveform = forwardRef<WaveformHandle, Props>(function Waveform(
  { audioBuffer, trimStart, trimEnd, format = '16bit', onRegionUpdate, onPlaybackChange },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WaveSurfer | null>(null)
  const regionsRef = useRef<ReturnType<typeof RegionsPlugin.create> | null>(null)
  const regionRef = useRef<{ setOptions: (o: object) => void } | null>(null)
  const suppressUpdateRef = useRef(false)
  const blobUrlRef = useRef<string | null>(null)
  const loopRef = useRef(false)
  const trimStartRef = useRef(trimStart)
  const trimEndRef = useRef(trimEnd)

  useEffect(() => { trimStartRef.current = trimStart }, [trimStart])
  useEffect(() => { trimEndRef.current = trimEnd }, [trimEnd])

  useImperativeHandle(ref, () => ({
    togglePlay: () => {
      if (!wsRef.current) return
      if (wsRef.current.isPlaying()) {
        wsRef.current.pause()
      } else {
        const dur = wsRef.current.getDuration()
        if (dur > 0) wsRef.current.seekTo(trimStartRef.current / dur)
        wsRef.current.play()
      }
    },
    skipToStart: () => wsRef.current?.seekTo(0),
    skipToEnd: () => wsRef.current?.seekTo(1),
    setLoop: (enabled: boolean) => { loopRef.current = enabled },
  }))

  useEffect(() => {
    if (!containerRef.current) return

    const regions = RegionsPlugin.create()
    regionsRef.current = regions

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#f97316',
      progressColor: 'rgba(249,115,22,0.5)',
      cursorColor: 'rgba(255,255,255,0.35)',
      height: 110,
      normalize: false,
      plugins: [
        regions,
        TimelinePlugin.create({
          height: 20,
          timeInterval: 1,
          primaryLabelInterval: 5,
          style: { color: '#8a8f98', fontSize: '10px' },
        }),
        MinimapPlugin.create({
          height: 48,
          waveColor: 'rgba(249,115,22,0.45)',
          progressColor: 'rgba(249,115,22,0.25)',
          overlayColor: 'rgba(249,115,22,0.1)',
          barWidth: 1,
          barGap: 1,
        }),
      ],
    })
    wsRef.current = ws

    ws.on('play', () => onPlaybackChange?.(true))
    ws.on('pause', () => onPlaybackChange?.(false))
    ws.on('audioprocess', (currentTime: number) => {
      if (currentTime >= trimEndRef.current) {
        if (loopRef.current) {
          const dur = ws.getDuration()
          if (dur > 0) ws.seekTo(trimStartRef.current / dur)
          ws.play()
        } else {
          ws.pause()
          onPlaybackChange?.(false)
        }
      }
    })

    ws.on('finish', () => {
      if (loopRef.current) {
        const dur = ws.getDuration()
        if (dur > 0) ws.seekTo(trimStartRef.current / dur)
        ws.play()
      } else {
        onPlaybackChange?.(false)
      }
    })

    ws.on('ready', () => {
      const dur = ws.getDuration()
      regions.clearRegions()
      const s = Math.min(trimStartRef.current, dur)
      const e = Math.min(trimEndRef.current, dur) || dur
      const r = regions.addRegion({
        start: s,
        end: e,
        color: 'rgba(249,115,22,0.12)',
        drag: true,
        resize: true,
      })
      regionRef.current = r as unknown as { setOptions: (o: object) => void }
    })

    regions.on('region-updated', (region) => {
      if (!suppressUpdateRef.current) onRegionUpdate(region.start, region.end)
    })

    return () => {
      ws.destroy()
      wsRef.current = null
      regionsRef.current = null
      regionRef.current = null
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = null
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!wsRef.current || !audioBuffer) return
    const wav = encodeToWav(audioBuffer, format)
    const blob = new Blob([wav], { type: 'audio/wav' })
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
    const url = URL.createObjectURL(blob)
    blobUrlRef.current = url
    wsRef.current.load(url)
    onPlaybackChange?.(false)
  }, [audioBuffer, format]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!regionRef.current) return
    suppressUpdateRef.current = true
    regionRef.current.setOptions({ start: trimStart, end: trimEnd })
    suppressUpdateRef.current = false
  }, [trimStart, trimEnd])

  if (!audioBuffer) return null

  return (
    <div className="waveform-wrapper">
      <div className="waveform-container" ref={containerRef} />
    </div>
  )
})
