interface Props {
  trimStart: number
  trimEnd: number
  duration: number
  onStartChange: (val: number) => void
  onEndChange: (val: number) => void
  disabled?: boolean
}

function fmt(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = (sec % 60).toFixed(3).padStart(6, '0')
  return `${m}:${s}`
}

function fmtLen(sec: number): string {
  const s = sec.toFixed(3)
  return `${s}s`
}

export function TrimControls({
  trimStart,
  trimEnd,
  duration,
  onStartChange,
  onEndChange,
  disabled,
}: Props) {
  const length = trimEnd - trimStart

  return (
    <div className={`trim-bar ${disabled ? 'trim-controls--disabled' : ''}`}>
      <div className="trim-bar-field">
        <span className="trim-bar-label">Start</span>
        <input
          type="number"
          className="trim-bar-input"
          min={0}
          max={trimEnd - 0.001}
          step={0.001}
          value={trimStart.toFixed(3)}
          onChange={(e) => onStartChange(parseFloat(e.target.value))}
          aria-label="Trim start"
        />
        <span className="trim-bar-time">{fmt(trimStart)}</span>
      </div>

      <div className="trim-bar-field trim-bar-field--center">
        <span className="trim-bar-label">Length</span>
        <span className="trim-bar-length">{fmtLen(length)}</span>
        <span className="trim-bar-duration">of {fmt(duration)}</span>
      </div>

      <div className="trim-bar-field trim-bar-field--end">
        <span className="trim-bar-label">End</span>
        <input
          type="number"
          className="trim-bar-input"
          min={trimStart + 0.001}
          max={duration}
          step={0.001}
          value={trimEnd.toFixed(3)}
          onChange={(e) => onEndChange(parseFloat(e.target.value))}
          aria-label="Trim end"
        />
        <span className="trim-bar-time">{fmt(trimEnd)}</span>
      </div>
    </div>
  )
}
