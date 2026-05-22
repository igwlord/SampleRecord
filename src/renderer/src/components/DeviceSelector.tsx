import { AudioSource, SourceCategory, useAudioDevices } from '../hooks/useAudioDevices'

// ── Lucide-style SVG icons (inline, no npm dependency) ────────────────────
function IconMonitor() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  )
}

function IconPlug() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 22v-5" />
      <path d="M9 8V2" />
      <path d="M15 8V2" />
      <path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z" />
    </svg>
  )
}

function IconGlobe() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  )
}

function IconTerminal() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  )
}

function IconMessageCircle() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function IconMusic() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  )
}

function IconLayout() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="9" y1="21" x2="9" y2="9" />
    </svg>
  )
}

// ── Category → icon lookup ────────────────────────────────────────────────
function CategoryIcon({ category }: { category: SourceCategory }) {
  switch (category) {
    case 'screen':
      return <IconMonitor />
    case 'browser':
      return <IconGlobe />
    case 'terminal':
      return <IconTerminal />
    case 'communication':
      return <IconMessageCircle />
    case 'media':
      return <IconMusic />
    case 'loopback':
      return <IconPlug />
    default:
      return <IconLayout />
  }
}

// ── App icon: real image or SVG fallback ──────────────────────────────────
function SourceIcon({ src }: { src: AudioSource }) {
  if (src.appIcon) {
    return (
      <img
        src={src.appIcon}
        alt=""
        aria-hidden="true"
        width={16}
        height={16}
        style={{ borderRadius: 3, objectFit: 'contain', flexShrink: 0 }}
      />
    )
  }
  return <CategoryIcon category={src.category} />
}

// ── Component ─────────────────────────────────────────────────────────────
interface Props {
  selected: AudioSource | null
  onSelect: (src: AudioSource) => void
  disabled?: boolean
}

export function DeviceSelector({ selected, onSelect, disabled }: Props) {
  const { sources, loading, error } = useAudioDevices()

  if (loading)
    return (
      <div className="device-selector">
        <span className="label">Fuente de audio</span>
        <p className="device-hint">Detectando fuentes de audio...</p>
      </div>
    )

  if (error)
    return (
      <div className="device-selector">
        <span className="label">Fuente de audio</span>
        <p className="device-hint error">Error al detectar dispositivos</p>
      </div>
    )

  if (sources.length === 0)
    return (
      <div className="device-selector">
        <span className="label">Fuente de audio</span>
        <p className="device-hint">
          No se detectaron fuentes. Instalá VB-Cable o BlackHole para loopback virtual.
        </p>
      </div>
    )

  return (
    <div className="device-selector">
      <span className="label">Fuente de audio</span>
      <div className="source-list">
        {sources.map((src) => {
          const isActive = selected?.id === src.id
          return (
            <button
              key={src.id}
              className={`source-btn ${isActive ? 'active' : ''}`}
              onClick={() => onSelect(src)}
              disabled={disabled}
              aria-label={`Seleccionar fuente: ${src.name}`}
              aria-pressed={isActive}
            >
              <span className={isActive ? 'source-icon' : 'source-icon-muted'}>
                <SourceIcon src={src} />
              </span>
              <span className="source-label">
                <span className="source-name">{src.appName}</span>
                {src.subtitle && <span className="source-subtitle">{src.subtitle}</span>}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
