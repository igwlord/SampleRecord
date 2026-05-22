import { RecorderState } from '../hooks/useRecorder'

interface Props {
  state: RecorderState
  disabled?: boolean
  onRecord: () => void
  onStop: () => void
  duration: number
  variant?: 'default' | 'circle'
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  const ms = Math.floor((sec % 1) * 10)
  return `${m}:${String(s).padStart(2, '0')}.${ms}`
}

function IconStop() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" />
    </svg>
  )
}

function IconMic({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  )
}

export function RecordButton({ state, disabled, onRecord, onStop, duration, variant = 'default' }: Props) {
  if (state === 'recording') {
    if (variant === 'circle') {
      return (
        <div className="record-btn-circle-area">
          <button
            className="btn-record-circle btn-record-circle--recording"
            onClick={onStop}
            aria-label="Stop recording"
          >
            <IconStop />
            <span className="record-circle-label">Stop</span>
          </button>
          <span className="record-circle-duration" aria-live="polite" aria-label={`Time: ${formatTime(duration)}`}>
            {formatTime(duration)}
          </span>
        </div>
      )
    }
    return (
      <div className="record-area">
        <button className="btn btn-stop" onClick={onStop} aria-label="Detener grabación">
          <IconStop />
          Detener
        </button>
        <span
          className="duration"
          aria-live="polite"
          aria-label={`Tiempo: ${formatTime(duration)}`}
        >
          {formatTime(duration)}
        </span>
      </div>
    )
  }

  if (variant === 'circle') {
    return (
      <div className="record-btn-circle-area">
        <button
          className="btn-record-circle"
          onClick={onRecord}
          disabled={disabled}
          aria-label="Start recording"
        >
          <IconMic size={48} />
          <span className="record-circle-label">Record</span>
        </button>
      </div>
    )
  }

  return (
    <button
      className="btn btn-record"
      onClick={onRecord}
      disabled={disabled}
      aria-label="Iniciar grabación"
    >
      <span className="rec-dot" aria-hidden="true" />
      <IconMic />
      Grabar
    </button>
  )
}
