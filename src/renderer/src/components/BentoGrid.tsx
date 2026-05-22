import { PeakEntry } from '../lib/types'

interface Props {
  peaks: PeakEntry[]
  isRecording: boolean
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function IconAnalytics() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  )
}

function IconSparkle() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.287 1.288L3 12l5.8 1.9a2 2 0 0 1 1.288 1.287L12 21l1.9-5.8a2 2 0 0 1 1.287-1.288L21 12l-5.8-1.9a2 2 0 0 1-1.288-1.287Z" />
    </svg>
  )
}

export function BentoGrid({ peaks, isRecording }: Props) {
  return (
    <div className={`bento-grid ${isRecording ? 'bento-grid--dimmed' : ''}`}>
      {/* Recent Peaks card */}
      <div className="bento-card">
        <div className="bento-card-header">
          <span className="bento-card-icon"><IconAnalytics /></span>
          <h3 className="bento-card-title">Recent Peaks</h3>
        </div>
        {peaks.length === 0 ? (
          <p className="bento-empty">
            {isRecording ? 'Monitoring…' : 'Peak data will appear during recording.'}
          </p>
        ) : (
          <ul className="bento-peak-list">
            {peaks.slice(-5).reverse().map((p, i) => (
              <li key={i} className="bento-peak-row">
                <span className="bento-peak-time">{formatTime(p.time)}</span>
                <span className="bento-peak-db">{p.db.toFixed(1)} dB</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Audio Enhancement card */}
      <div className="bento-card bento-card--wide">
        <div className="bento-card-header">
          <span className="bento-card-icon"><IconSparkle /></span>
          <h3 className="bento-card-title">Audio Enhancement</h3>
        </div>
        <p className="bento-card-body">
          {isRecording
            ? 'AI engine is actively optimizing your input for clarity and noise reduction.'
            : 'Ready to enhance your next recording with noise reduction and clarity processing.'}
        </p>
        <div className="bento-badges">
          <span className="bento-badge">Noiseless</span>
          <span className="bento-badge">High-Res 96kHz</span>
          <span className="bento-badge">Stereo</span>
        </div>
      </div>
    </div>
  )
}
