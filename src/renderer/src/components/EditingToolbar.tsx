interface Props {
  onNormalize: () => void
  onFadeIn: () => void
  onFadeOut: () => void
  onTrimReset: () => void
  isLooping: boolean
  onLoopToggle: () => void
  disabled?: boolean
}

export function EditingToolbar({ onNormalize, onFadeIn, onFadeOut, onTrimReset, isLooping, onLoopToggle, disabled }: Props) {
  return (
    <div className={`editing-toolbar ${disabled ? 'editing-toolbar--disabled' : ''}`}>
      <button className="edit-btn" onClick={onNormalize} disabled={disabled} title="Normalize to 0 dBFS">
        <IconNormalize />
        <span>Normalize</span>
      </button>
      <div className="edit-toolbar-divider" />
      <button className="edit-btn" onClick={onFadeIn} disabled={disabled} title="Fade In (150ms)">
        <IconFadeIn />
        <span>Fade In</span>
      </button>
      <button className="edit-btn" onClick={onFadeOut} disabled={disabled} title="Fade Out (150ms)">
        <IconFadeOut />
        <span>Fade Out</span>
      </button>
      <div className="edit-toolbar-divider" />
      <button
        className={`edit-btn ${isLooping ? 'edit-btn--active' : ''}`}
        onClick={onLoopToggle}
        disabled={disabled}
        title="Loop Preview"
        aria-pressed={isLooping}
      >
        <IconLoop />
        <span>Loop</span>
      </button>
      <div className="edit-toolbar-divider" />
      <button className="edit-btn" onClick={onTrimReset} disabled={disabled} title="Reset trim region to full length">
        <IconTrimReset />
        <span>Reset Trim</span>
      </button>
    </div>
  )
}

function IconNormalize() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="22 7 13 7 13 2" />
      <polyline points="22 17 13 17 13 22" />
      <path d="M2 12h11" />
      <path d="M13 2 22 7" />
      <path d="M13 22 22 17" />
    </svg>
  )
}

function IconFadeIn() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 20 L22 4" strokeWidth="2.5" />
      <line x1="2" y1="20" x2="22" y2="20" />
    </svg>
  )
}

function IconFadeOut() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 4 L22 20" strokeWidth="2.5" />
      <line x1="2" y1="20" x2="22" y2="20" />
    </svg>
  )
}

function IconLoop() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="17 1 21 5 17 9" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <polyline points="7 23 3 19 7 15" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  )
}

function IconTrimReset() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  )
}
