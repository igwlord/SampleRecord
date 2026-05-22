import { useState } from 'react'
import { createPortal } from 'react-dom'
import { RecordingEntry } from '../lib/types'
import logoSrc from '../assets/logo.png'

type NavTab = 'captures' | 'favorites'

interface Props {
  recordings: RecordingEntry[]
  sessionRecordings: RecordingEntry[]
  onNewProject: () => void
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

function IconGraphicEq() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M7 18v-4H5v4H3V6h2v6h2V6h2v12H7zm6 0V8h-2V6h2V4h2v2h2v2h-2v10h-2zm6-4v-4h-2V8h2V6h2v2h2v2h-2v4h-2z" />
    </svg>
  )
}

function IconLibrary() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18M3 12h18M3 18h18" />
    </svg>
  )
}


function IconStar({ filled }: { filled?: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}

function IconHelp() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

function IconAdd() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function IconWav() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  )
}

function IconMic() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  )
}

interface RecordingListProps {
  items: RecordingEntry[]
  empty: string
  favoriteIds?: Set<string>
  onToggleFavorite?: (id: string) => void
  showFavBtn?: boolean
}

function RecordingList({ items, empty, favoriteIds, onToggleFavorite, showFavBtn }: RecordingListProps) {
  if (items.length === 0) {
    return <p className="sidebar-empty">{empty}</p>
  }
  return (
    <ul className="sidebar-recording-list">
      {items.map((r) => {
        const isExported = !!r.path
        const isFav = favoriteIds?.has(r.id) ?? false
        return (
          <li key={r.id} className="sidebar-recording-item" title={r.path || r.name}>
            <span className="sidebar-recording-icon" style={{ color: isExported ? undefined : 'var(--text-muted)' }}>
              {isExported ? <IconWav /> : <IconMic />}
            </span>
            <span className="sidebar-recording-info">
              <span className="sidebar-recording-name">{r.name}</span>
              <span className="sidebar-recording-meta">
                {formatDuration(r.duration)}
                {!isExported && <span className="sidebar-recording-tag">· not exported</span>}
              </span>
            </span>
            {showFavBtn && onToggleFavorite && (
              <button
                className={`sidebar-fav-btn ${isFav ? 'active' : ''}`}
                onClick={() => onToggleFavorite(r.id)}
                aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
                title={isFav ? 'Remove from favorites' : 'Add to favorites'}
              >
                <IconStar filled={isFav} />
              </button>
            )}
          </li>
        )
      })}
    </ul>
  )
}

// Persist favorites in localStorage
function loadFavs(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem('swa-favorites') ?? '[]')) }
  catch { return new Set() }
}

function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="help-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="About Sample Record Studio"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="help-modal">
        <div className="help-modal-header">
          <div className="help-modal-icon">
            <img src={logoSrc} alt="Sample Record Studio" className="sidebar-logo-img" />
          </div>
          <div>
            <h2 className="help-modal-title">Sample Record Studio</h2>
            <span className="help-modal-version">Version 1.0.1</span>
          </div>
          <button className="help-modal-close" onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="help-modal-body">
          <p>
            <strong>Sample Record Studio</strong> is a desktop audio capture tool designed for musicians and producers.
            It lets you record system audio from any app, process it in real time, and export studio-quality WAV files
            directly into your DAW via drag and drop.
          </p>
          <ul className="help-modal-features">
            <li>Capture audio from any running application</li>
            <li>Real-time input level metering (dBFS)</li>
            <li>Normalize, fade-in and fade-out processing</li>
            <li>Trim / region editing with waveform view</li>
            <li>Export to WAV 16-bit or 32-bit float</li>
            <li>Drag and drop directly into your DAW</li>
            <li>Recording library with session history</li>
          </ul>
          <div className="help-modal-footer-info">
            <span>© 2025 Sample Record Studio</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export function AppSidebar({ recordings, sessionRecordings, onNewProject }: Props) {
  const [activeTab, setActiveTab] = useState<NavTab>('captures')
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(loadFavs)
  const [helpOpen, setHelpOpen] = useState(false)

  const toggleFavorite = (id: string) => {
    setFavoriteIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      localStorage.setItem('swa-favorites', JSON.stringify([...next]))
      return next
    })
  }

  const workflowItems: { id: NavTab; label: string; icon: JSX.Element }[] = [
    { id: 'captures',  label: 'Captures',   icon: <IconLibrary /> },
    { id: 'favorites', label: 'Favorites',  icon: <IconStar /> },
  ]

  const favoriteRecordings = recordings.filter((r) => favoriteIds.has(r.id))

  return (
    <aside className="sidebar">
      <div className="sidebar-inner">
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <img src={logoSrc} alt="Sample Record Studio" className="sidebar-logo-img" />
          </div>
          <div>
            <h1 className="sidebar-app-name">Sample Record</h1>
            <p className="sidebar-subtitle">Studio</p>
          </div>
        </div>

        {/* Capture Audio */}
        <button className="sidebar-new-btn" onClick={onNewProject}>
          <IconAdd />
          Capture Audio
        </button>

        {/* Sample Workflow */}
        <div className="sidebar-section-label">SAMPLE WORKFLOW</div>
        <nav className="sidebar-nav" aria-label="Sample workflow">
          {workflowItems.map((item) => (
            <button
              key={item.id}
              className={`sidebar-nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
              aria-current={activeTab === item.id ? 'page' : undefined}
            >
              <span className="sidebar-nav-icon">{item.icon}</span>
              <span className="sidebar-nav-label">{item.label}</span>
              {item.id === 'captures' && recordings.length > 0 && (
                <span className="sidebar-badge">{recordings.length}</span>
              )}
              {item.id === 'favorites' && favoriteRecordings.length > 0 && (
                <span className="sidebar-badge">{favoriteRecordings.length}</span>
              )}
            </button>
          ))}
        </nav>

        {/* Recent Captures — always visible */}
        <div className="sidebar-section-label" style={{ marginTop: 4 }}>RECENT CAPTURES</div>
        <div className="sidebar-tab-content">
          {activeTab === 'captures' && (
            <RecordingList
              items={recordings}
              empty="No exported recordings yet."
              favoriteIds={favoriteIds}
              onToggleFavorite={toggleFavorite}
              showFavBtn
            />
          )}
          {activeTab === 'favorites' && (
            <RecordingList
              items={favoriteRecordings}
              empty="No favorites yet. Star a recording to add it here."
              favoriteIds={favoriteIds}
              onToggleFavorite={toggleFavorite}
              showFavBtn
            />
          )}
          {/* Session recent captures always shown below */}
          {sessionRecordings.length > 0 && (
            <RecordingList
              items={[...sessionRecordings].reverse()}
              empty=""
              favoriteIds={favoriteIds}
              onToggleFavorite={toggleFavorite}
              showFavBtn
            />
          )}
          {sessionRecordings.length === 0 && activeTab === 'captures' && recordings.length === 0 && (
            <p className="sidebar-empty">No recordings this session yet.</p>
          )}
        </div>

        {/* Footer */}
        <div className="sidebar-footer">
          <button className="sidebar-footer-item" onClick={() => setHelpOpen(true)}>
            <IconHelp />
            <span>Help</span>
          </button>
        </div>
      </div>

      {helpOpen && createPortal(
        <HelpModal onClose={() => setHelpOpen(false)} />,
        document.body
      )}
    </aside>
  )
}
