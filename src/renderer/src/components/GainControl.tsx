interface Props {
  gain: number
  onChange: (value: number) => void
  disabled?: boolean
}

function toDb(linear: number): string {
  const db = 20 * Math.log10(linear)
  const sign = db >= 0 ? '+' : ''
  return `${sign}${db.toFixed(0)} dB`
}

export function GainControl({ gain, onChange, disabled }: Props) {
  return (
    <div className="gain-control" title="Ganancia de entrada">
      <svg
        className="gain-icon"
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
      </svg>
      <input
        id="gain-slider"
        className="gain-slider"
        type="range"
        min={0.5}
        max={4.0}
        step={0.1}
        value={gain}
        disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        aria-label={`Ganancia: ${toDb(gain)}`}
        aria-valuemin={0.5}
        aria-valuemax={4.0}
        aria-valuenow={gain}
        aria-valuetext={toDb(gain)}
      />
      <span className="gain-label" aria-live="polite">
        {toDb(gain)}
      </span>
    </div>
  )
}
