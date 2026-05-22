import { useState, useEffect, useRef } from 'react'
import { analyzeNote, analyzeBpm, NoteResult, BpmResult } from '../lib/audioAnalysis'

interface Props {
  audioBuffer: AudioBuffer | null
}

export function AudioAnalysisPanel({ audioBuffer }: Props) {
  const [note, setNote]       = useState<NoteResult | null>(null)
  const [bpm, setBpm]         = useState<BpmResult  | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const abortRef = useRef(false)

  useEffect(() => {
    if (!audioBuffer) {
      setNote(null)
      setBpm(null)
      setAnalyzing(false)
      return
    }

    abortRef.current = false
    setAnalyzing(true)
    setNote(null)
    setBpm(null)

    // Defer to next tick so React can paint the "…" state first
    const id = setTimeout(() => {
      const noteResult = analyzeNote(audioBuffer)
      const bpmResult  = analyzeBpm(audioBuffer)
      if (abortRef.current) return
      setNote(noteResult)
      setBpm(bpmResult)
      setAnalyzing(false)
    }, 30)

    return () => {
      abortRef.current = true
      clearTimeout(id)
    }
  }, [audioBuffer])

  if (!audioBuffer) return null

  const centsStr = (c: number) =>
    c === 0 ? '±0¢' : c > 0 ? `+${c}¢` : `${c}¢`

  return (
    <div className="analysis-panel">
      {/* ── Note ─────────────────────────── */}
      <div className="analysis-pill">
        <IconNote />
        <span className="analysis-label">Note</span>
        {analyzing ? (
          <span className="analysis-dots"><span /><span /><span /></span>
        ) : note ? (
          <>
            <span className="analysis-value">{note.note}{note.octave}</span>
            <span className="analysis-sub">{centsStr(note.cents)}</span>
          </>
        ) : (
          <span className="analysis-na">—</span>
        )}
      </div>

      <div className="analysis-sep" />

      {/* ── BPM ──────────────────────────── */}
      <div className="analysis-pill">
        <IconTempo />
        <span className="analysis-label">BPM</span>
        {analyzing ? (
          <span className="analysis-dots"><span /><span /><span /></span>
        ) : bpm ? (
          <>
            <span className="analysis-value">{bpm.bpm.toFixed(1)}</span>
          </>
        ) : (
          <span className="analysis-na">—</span>
        )}
      </div>
    </div>
  )
}

function IconNote() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  )
}

function IconTempo() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="14" r="8" />
      <path d="M12 6V2" />
      <path d="M9 2h6" />
      <path d="m15.5 9.5-3.5 4" />
    </svg>
  )
}
