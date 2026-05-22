import { RefObject } from 'react'
import { WaveformHandle } from './Waveform'
import { ExportButton, ExportButtonHandle } from './ExportButton'
import { DragHandle } from './DragHandle'

interface Props {
  hasSample: boolean
  isPlaying: boolean
  isLooping: boolean
  waveformRef: RefObject<WaveformHandle>
  exportButtonRef: RefObject<ExportButtonHandle>
  audioBuffer: AudioBuffer | null
  trimStart: number
  trimEnd: number
  tempFilePath: string | null
  onTempFileReady: (path: string) => void
  onNewRecording: () => void
  onExportSuccess: (filePath: string) => void
  onLoopToggle: () => void
}

function IconSkipPrev() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <polygon points="19 20 9 12 19 4 19 20" />
      <line x1="5" y1="19" x2="5" y2="5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function IconSkipNext() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <polygon points="5 4 15 12 5 20 5 4" />
      <line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function IconPlay() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  )
}

function IconPause() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  )
}

function IconLoop() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="17 1 21 5 17 9" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <polyline points="7 23 3 19 7 15" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  )
}

function IconNew() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  )
}

export function BottomToolbar({
  hasSample, isPlaying, isLooping,
  waveformRef, exportButtonRef,
  audioBuffer, trimStart, trimEnd,
  tempFilePath, onTempFileReady,
  onNewRecording, onExportSuccess, onLoopToggle,
}: Props) {
  return (
    <footer className="bottom-toolbar" role="toolbar" aria-label="Playback and export controls">
      {/* Left: playback + new */}
      <div className="toolbar-left">
        <div className="playback-controls">
          <button className="playback-btn" onClick={() => waveformRef.current?.skipToStart()} disabled={!hasSample} aria-label="Skip to start">
            <IconSkipPrev />
          </button>
          <button className="playback-btn playback-btn--play" onClick={() => waveformRef.current?.togglePlay()} disabled={!hasSample} aria-label={isPlaying ? 'Pause' : 'Play'} title="Space">
            {isPlaying ? <IconPause /> : <IconPlay />}
          </button>
          <button className="playback-btn" onClick={() => waveformRef.current?.skipToEnd()} disabled={!hasSample} aria-label="Skip to end">
            <IconSkipNext />
          </button>
          <button
            className={`playback-btn playback-btn--loop ${isLooping ? 'playback-btn--loop-active' : ''}`}
            onClick={onLoopToggle}
            disabled={!hasSample}
            aria-label="Toggle loop"
            aria-pressed={isLooping}
            title="Loop"
          >
            <IconLoop />
          </button>
        </div>
        <button className="toolbar-new-btn" onClick={onNewRecording} aria-label="New recording">
          <IconNew />
          <span>New Recording</span>
        </button>
      </div>

      {/* Right: export + drag */}
      <div className="toolbar-right">
        <ExportButton
          ref={exportButtonRef}
          audioBuffer={audioBuffer}
          trimStart={trimStart}
          trimEnd={trimEnd}
          onTempFileReady={onTempFileReady}
          onExportSuccess={onExportSuccess}
        />
        <DragHandle tempFilePath={tempFilePath} />
      </div>
    </footer>
  )
}
