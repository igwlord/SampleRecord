import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react'
import { sliceAudioBuffer } from '../lib/audioBuffer'
import { encodeToWav } from '../lib/wavEncoder'

interface Props {
  audioBuffer: AudioBuffer | null
  trimStart: number
  trimEnd: number
  onTempFileReady: (path: string) => void
  onExportSuccess?: (filePath: string) => void
}

export interface ExportButtonHandle {
  trigger: () => void
}

type ExportStatus =
  | { type: 'idle' }
  | { type: 'encoding' }
  | { type: 'saving' }
  | { type: 'success' }
  | { type: 'cancelled' }
  | { type: 'error'; message: string }

export const ExportButton = forwardRef<ExportButtonHandle, Props>(function ExportButton(
  { audioBuffer, trimStart, trimEnd, onTempFileReady, onExportSuccess },
  ref
) {
  const [exporting, setExporting] = useState(false)
  const [status, setStatus] = useState<ExportStatus>({ type: 'idle' })
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scheduleStatusClear = (ms = 3500) => {
    if (clearTimerRef.current) clearTimeout(clearTimerRef.current)
    clearTimerRef.current = setTimeout(() => setStatus({ type: 'idle' }), ms)
  }

  const handleExport = useCallback(async () => {
    if (!audioBuffer || exporting) return
    setExporting(true)
    setStatus({ type: 'encoding' })

    try {
      const sliced = sliceAudioBuffer(audioBuffer, trimStart, trimEnd)
      const wav = encodeToWav(sliced)

      setStatus({ type: 'saving' })
      const { tempPath } = await window.electronAPI.writeWavTemp(wav)
      onTempFileReady(tempPath)

      const { filePath } = await window.electronAPI.openSaveDialog()
      if (filePath) {
        const { success } = await window.electronAPI.saveWavFinal(tempPath, filePath)
        if (success) {
          setStatus({ type: 'success' })
          scheduleStatusClear(4000)
          onExportSuccess?.(filePath)
        } else {
          setStatus({ type: 'error', message: 'Error al guardar el archivo.' })
        }
      } else {
        setStatus({ type: 'cancelled' })
        scheduleStatusClear(2500)
      }
    } catch (e) {
      setStatus({ type: 'error', message: String(e) })
    } finally {
      setExporting(false)
    }
  }, [audioBuffer, trimStart, trimEnd, onTempFileReady, onExportSuccess, exporting])

  // Expose trigger() so App.tsx can call it via Ctrl+E
  useImperativeHandle(ref, () => ({ trigger: handleExport }), [handleExport])

  const label = exporting
    ? status.type === 'encoding'
      ? 'Codificando...'
      : 'Guardando...'
    : 'Exportar WAV'

  const statusLabel =
    status.type === 'encoding'
      ? 'Codificando...'
      : status.type === 'saving'
        ? 'Guardando...'
        : status.type === 'success'
          ? '✓ Guardado'
          : status.type === 'cancelled'
            ? 'Cancelado'
            : status.type === 'error'
              ? `Error: ${status.message}`
              : ''

  const statusClass =
    status.type === 'success'
      ? 'export-status export-status--success'
      : status.type === 'error'
        ? 'export-status export-status--error'
        : status.type === 'encoding' || status.type === 'saving'
          ? 'export-status export-status--busy'
          : 'export-status'

  return (
    <div className="export-area">
      <button
        className="btn btn-export"
        onClick={handleExport}
        disabled={!audioBuffer || exporting}
        aria-label="Exportar sample como WAV (Ctrl+E)"
        title="Ctrl+E"
      >
        {label}
      </button>
      {status.type !== 'idle' && (
        <span className={statusClass} aria-live="polite">
          {statusLabel}
        </span>
      )}
    </div>
  )
})
