import { useState, useCallback, useEffect, useRef } from 'react'
import { useRecorder } from './hooks/useRecorder'
import { useTrim } from './hooks/useTrim'
import { encodeToWav, WavFormat } from './lib/wavEncoder'
import { normalizeAudioBuffer, fadeInAudioBuffer, fadeOutAudioBuffer } from './lib/audioBuffer'
import { RecordingEntry } from './lib/types'
import { AppSidebar } from './components/AppSidebar'
import { TopBar } from './components/TopBar'
import { BottomToolbar } from './components/BottomToolbar'
import { RecordButton } from './components/RecordButton'
import { LiveWaveform } from './components/LiveWaveform'
import { Waveform, WaveformHandle } from './components/Waveform'
import { ExportButtonHandle } from './components/ExportButton'
import { EditingToolbar } from './components/EditingToolbar'
import { TrimControls } from './components/TrimControls'
import { AudioAnalysisPanel } from './components/AudioAnalysisPanel'
import { WorkflowBreadcrumb, WorkflowStep } from './components/WorkflowBreadcrumb'
import { AudioSource } from './hooks/useAudioDevices'

function formatTimecode(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

let sessionTakeCount = 0

function loadFormat(): WavFormat {
  return (localStorage.getItem('swa-format') as WavFormat | null) ?? '16bit'
}

export default function App() {
  const [selectedSource, setSelectedSource] = useState<AudioSource | null>(null)
  const [tempFilePath, setTempFilePath] = useState<string | null>(null)
  const [isWavePlaying, setIsWavePlaying] = useState(false)
  const [isLooping, setIsLooping] = useState(false)
  const [recordings, setRecordings] = useState<RecordingEntry[]>([])
  const [sessionRecordings, setSessionRecordings] = useState<RecordingEntry[]>([])
  const [format, setFormat] = useState<WavFormat>(loadFormat)
  // processedBuffer: raw capture that can be modified by Normalize/Fade
  const [processedBuffer, setProcessedBuffer] = useState<AudioBuffer | null>(null)

  const waveformRef = useRef<WaveformHandle>(null)
  const exportButtonRef = useRef<ExportButtonHandle>(null)

  const { state, audioBuffer, duration, analyserNode, gain, setGain, start, stop, reset } =
    useRecorder(() => {})

  const { trimStart, trimEnd, setStart, setEnd, updateDuration } = useTrim(duration)

  // Load library on mount
  useEffect(() => {
    window.electronAPI.listRecordings().then(setRecordings).catch(() => {})
  }, [])

  // When new raw buffer arrives, reset processed buffer and trim bounds
  useEffect(() => {
    setProcessedBuffer(audioBuffer)
    if (audioBuffer) updateDuration(audioBuffer.duration)
  }, [audioBuffer, updateDuration])

  // Auto-encode to temp file when processedBuffer changes → DragHandle active immediately
  useEffect(() => {
    if (!processedBuffer) return
    const wav = encodeToWav(processedBuffer, format)
    window.electronAPI.writeWavTemp(wav).then(({ tempPath }) => setTempFilePath(tempPath))
  }, [processedBuffer, format])

  // Add to Recents as soon as recording finishes
  useEffect(() => {
    if (state !== 'stopped' || !audioBuffer) return
    sessionTakeCount++
    const entry: RecordingEntry = {
      id: `session-${Date.now()}`,
      name: `Take ${sessionTakeCount} · ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      path: '',
      duration: audioBuffer.duration,
      exportedAt: new Date().toISOString(),
    }
    setSessionRecordings((prev) => [...prev, entry])
  }, [state]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Audio processing (Normalize, Fade In, Fade Out) ─────────────────────
  const handleProcessAudio = useCallback((op: 'normalize' | 'fadeIn' | 'fadeOut') => {
    if (!processedBuffer) return
    let result: AudioBuffer
    if (op === 'normalize') result = normalizeAudioBuffer(processedBuffer)
    else if (op === 'fadeIn') result = fadeInAudioBuffer(processedBuffer, 0.15)
    else result = fadeOutAudioBuffer(processedBuffer, 0.15)
    setProcessedBuffer(result)
  }, [processedBuffer])

  // ── Format change ────────────────────────────────────────────────────────
  const handleFormatChange = useCallback((f: WavFormat) => {
    setFormat(f)
    localStorage.setItem('swa-format', f)
  }, [])

  // ── Loop toggle ──────────────────────────────────────────────────────────
  const handleLoopToggle = useCallback(() => {
    setIsLooping((prev) => {
      const next = !prev
      waveformRef.current?.setLoop(next)
      return next
    })
  }, [])

  // ── Record handlers ──────────────────────────────────────────────────────
  const handleRecord = useCallback(async () => {
    if (!selectedSource) return
    setTempFilePath(null)
    setIsLooping(false)
    await start(selectedSource)
  }, [selectedSource, start])

  const handleStop = useCallback(async () => { await stop() }, [stop])

  const handleReset = useCallback(() => {
    reset()
    setTempFilePath(null)
    setIsWavePlaying(false)
    setIsLooping(false)
    setProcessedBuffer(null)
  }, [reset])

  const handleRegionUpdate = useCallback(
    (s: number, e: number) => { setStart(s); setEnd(e) },
    [setStart, setEnd]
  )

  const handleTrimReset = useCallback(() => {
    if (!processedBuffer) return
    setStart(0)
    setEnd(processedBuffer.duration)
  }, [processedBuffer, setStart, setEnd])

  const handleExportSuccess = useCallback(async (filePath: string) => {
    const entry: RecordingEntry = {
      id: Date.now().toString(),
      name: `Recording ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      path: filePath,
      duration: processedBuffer?.duration ?? 0,
      exportedAt: new Date().toISOString(),
    }
    try { await window.electronAPI.saveRecording(entry) } catch { /* non-critical */ }
    setRecordings((prev) => [...prev, entry])
  }, [processedBuffer])

  const isRecording = state === 'recording'
  const hasSample = state === 'stopped' && processedBuffer !== null

  // Workflow breadcrumb step
  const workflowStep: WorkflowStep =
    tempFilePath ? 'drag' : hasSample ? 'trim' : 'capture'

  // ── Keyboard shortcuts ───────────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if (e.code === 'Space') {
        e.preventDefault()
        if (isRecording) handleStop()
        else if (hasSample) waveformRef.current?.togglePlay()
        else if (selectedSource && state === 'idle') handleRecord()
        return
      }
      if (e.ctrlKey && e.code === 'KeyE') {
        e.preventDefault()
        if (hasSample) exportButtonRef.current?.trigger()
        return
      }
      if (e.code === 'Escape' && isRecording) {
        e.preventDefault()
        handleStop()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [state, isRecording, hasSample, selectedSource, handleRecord, handleStop])

  return (
    <div className="app-layout">
      <div className="bg-blobs" aria-hidden="true">
        <div className="bg-blob bg-blob-1" />
        <div className="bg-blob bg-blob-2" />
      </div>

      <AppSidebar
        recordings={recordings}
        sessionRecordings={sessionRecordings}
        onNewProject={handleReset}
      />

      <div className="main-canvas">
        <TopBar
          selectedSource={selectedSource}
          onSelect={setSelectedSource}
          onSourceGone={() => setSelectedSource(null)}
          analyserNode={analyserNode}
          disabled={isRecording}
          gain={gain}
          onGainChange={setGain}
          format={format}
          onFormatChange={handleFormatChange}
        />

        <main className="central-deck">
          {/* IDLE STATE */}
          {state === 'idle' && (
            <div className="central-idle">
              <RecordButton
                variant="circle"
                state={state}
                disabled={!selectedSource}
                onRecord={handleRecord}
                onStop={handleStop}
                duration={duration}
              />
              <p className="ready-hint">
                {selectedSource
                  ? 'Ready to capture studio-quality audio from your selected source.'
                  : 'Select an audio source from the top bar to begin.'}
              </p>
            </div>
          )}

          {/* RECORDING STATE */}
          {isRecording && (
            <div className="central-recording">
              <div className="scanline-panel">
                <div className="rec-live-badge">
                  <span className="rec-dot" aria-hidden="true" />
                  RECORDING LIVE
                </div>
                <LiveWaveform analyserNode={analyserNode} />
                <div className="timecode-row">
                  <span
                    className="timecode-display"
                    aria-live="polite"
                    aria-label={`Recording time: ${formatTimecode(duration)}`}
                  >
                    {formatTimecode(duration)}
                  </span>
                </div>
              </div>
              <div className="recording-actions-row">
                <button className="btn btn-stop-recording" onClick={handleStop} aria-label="Stop recording">
                  ■&nbsp; STOP RECORDING
                </button>
              </div>
            </div>
          )}

          {/* STOPPED STATE */}
          {hasSample && (
            <div className="central-stopped">
              <EditingToolbar
                onNormalize={() => handleProcessAudio('normalize')}
                onFadeIn={() => handleProcessAudio('fadeIn')}
                onFadeOut={() => handleProcessAudio('fadeOut')}
                onTrimReset={handleTrimReset}
                isLooping={isLooping}
                onLoopToggle={handleLoopToggle}
              />
              <AudioAnalysisPanel audioBuffer={processedBuffer} />
              <Waveform
                ref={waveformRef}
                audioBuffer={processedBuffer}
                trimStart={trimStart}
                trimEnd={trimEnd}
                format={format}
                onRegionUpdate={handleRegionUpdate}
                onPlaybackChange={setIsWavePlaying}
              />
              <TrimControls
                trimStart={trimStart}
                trimEnd={trimEnd}
                duration={processedBuffer?.duration ?? 0}
                onStartChange={setStart}
                onEndChange={setEnd}
              />
            </div>
          )}
        </main>

        <BottomToolbar
          hasSample={hasSample}
          isPlaying={isWavePlaying}
          isLooping={isLooping}
          waveformRef={waveformRef}
          exportButtonRef={exportButtonRef}
          audioBuffer={processedBuffer}
          trimStart={trimStart}
          trimEnd={trimEnd}
          tempFilePath={tempFilePath}
          onTempFileReady={setTempFilePath}
          onNewRecording={handleReset}
          onExportSuccess={handleExportSuccess}
          onLoopToggle={handleLoopToggle}
        />

        <WorkflowBreadcrumb step={workflowStep} />
      </div>
    </div>
  )
}
