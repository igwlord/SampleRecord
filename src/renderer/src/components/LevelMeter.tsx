interface Props {
  level: number
}

export function LevelMeter({ level }: Props) {
  const pct = Math.min(100, level * 200)
  const color = pct > 80 ? '#ef4444' : pct > 50 ? '#f59e0b' : '#22c55e'
  return (
    <div className="level-meter">
      <div className="level-track">
        <div
          className="level-fill"
          style={{ width: `${pct}%`, backgroundColor: color, transition: 'width 50ms linear' }}
        />
      </div>
    </div>
  )
}
