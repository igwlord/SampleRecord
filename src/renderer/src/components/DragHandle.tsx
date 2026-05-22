function IconWave() {
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
      <path d="M2 12h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2 2 2 0 0 0 2-2v-8a2 2 0 0 1 2-2 2 2 0 0 1 2 2v2a2 2 0 0 0 2 2h2" />
    </svg>
  )
}

interface Props {
  tempFilePath: string | null
}

export function DragHandle({ tempFilePath }: Props) {
  if (!tempFilePath) return null

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    window.electronAPI.startDrag(tempFilePath)
  }

  return (
    <div
      className="drag-handle"
      onMouseDown={handleMouseDown}
      role="button"
      tabIndex={0}
      aria-label="Arrastrá a tu DAW para importar el sample"
      title="Arrastrá a tu DAW"
    >
      <span className="drag-icon">
        <IconWave />
      </span>
      Arrastrar a DAW
    </div>
  )
}
