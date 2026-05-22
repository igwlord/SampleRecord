import { useRef, useState, useCallback, useEffect } from 'react'
import { AudioSource } from './useAudioDevices'
import { concatenateFloat32Arrays } from '../lib/audioBuffer'

export type RecorderState = 'idle' | 'recording' | 'stopped'

// Runs in a dedicated AudioWorkletGlobalScope thread — no main-thread JS interruptions.
// Each quantum (128 samples) posts left+right buffers via Transferable to avoid copying.
const RECORDER_WORKLET_CODE = `
class RecorderProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const ch = inputs[0]
    if (ch && ch[0] && ch[0].length > 0) {
      const left  = ch[0].slice()
      const right = (ch.length > 1 && ch[1] && ch[1].length > 0) ? ch[1].slice() : left.slice()
      this.port.postMessage({ left, right }, [left.buffer, right.buffer])
    }
    return true
  }
}
registerProcessor('recorder-processor', RecorderProcessor)
`

export function useRecorder(onLevelUpdate: (level: number) => void) {
  const [state, setState] = useState<RecorderState>('idle')
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null)
  const [duration, setDuration] = useState(0)
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null)
  const [gain, setGainState] = useState(1.0)
  const gainValueRef = useRef<number>(1.0)

  const contextRef    = useRef<AudioContext | null>(null)
  const streamRef     = useRef<MediaStream | null>(null)
  const workletRef    = useRef<AudioWorkletNode | null>(null)
  const gainRef       = useRef<GainNode | null>(null)
  const analyserRef   = useRef<AnalyserNode | null>(null)
  const chunksLeftRef = useRef<Float32Array[]>([])
  const chunksRightRef= useRef<Float32Array[]>([])
  const startTimeRef  = useRef<number>(0)
  const animFrameRef  = useRef<number>(0)

  useEffect(() => {
    return () => {
      cancelAnimationFrame(animFrameRef.current)
      workletRef.current?.disconnect()
      gainRef.current?.disconnect()
      streamRef.current?.getTracks().forEach((t) => t.stop())
      contextRef.current?.close()
    }
  }, [])

  const getStream = useCallback(async (source: AudioSource): Promise<MediaStream> => {
    if (source.type === 'loopback') {
      return navigator.mediaDevices.getUserMedia({
        audio: { deviceId: { exact: source.id } },
        video: false
      })
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: source.id
        }
      } as MediaTrackConstraints,
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: source.id
        }
      } as MediaTrackConstraints
    })
    stream.getVideoTracks().forEach((t) => t.stop())
    return stream
  }, [])

  // RAF loop: updates level meter AND duration — no audio callbacks involved
  const drawLevel = useCallback(() => {
    if (!analyserRef.current) return
    const data = new Float32Array(analyserRef.current.fftSize)
    analyserRef.current.getFloatTimeDomainData(data)
    let peak = 0
    for (const v of data) peak = Math.max(peak, Math.abs(v))
    onLevelUpdate(peak)
    setDuration((Date.now() - startTimeRef.current) / 1000)
    animFrameRef.current = requestAnimationFrame(drawLevel)
  }, [onLevelUpdate])

  const start = useCallback(
    async (source: AudioSource) => {
      chunksLeftRef.current  = []
      chunksRightRef.current = []
      setAudioBuffer(null)

      const stream = await getStream(source)
      streamRef.current = stream

      const ctx = new AudioContext({ sampleRate: 44100, latencyHint: 'interactive' })
      contextRef.current = ctx

      // Load AudioWorklet inline via blob URL — works in both dev and packaged builds
      const blob       = new Blob([RECORDER_WORKLET_CODE], { type: 'application/javascript' })
      const workletUrl = URL.createObjectURL(blob)
      await ctx.audioWorklet.addModule(workletUrl)
      URL.revokeObjectURL(workletUrl)

      const srcNode = ctx.createMediaStreamSource(stream)

      const gainNode = ctx.createGain()
      gainNode.gain.value = gainValueRef.current
      gainRef.current = gainNode

      const analyser = ctx.createAnalyser()
      analyser.fftSize = 2048
      analyserRef.current = analyser
      setAnalyserNode(analyser)

      // AudioWorkletNode: dedicated audio thread, no main-thread jitter
      const workletNode = new AudioWorkletNode(ctx, 'recorder-processor', {
        numberOfInputs:  1,
        numberOfOutputs: 1,   // 1 output required to stay active in the graph
        channelCount:    2,
        channelCountMode: 'explicit' as ChannelCountMode,
        channelInterpretation: 'discrete' as ChannelInterpretation,
      })
      workletRef.current = workletNode

      // Collect audio chunks from worklet thread (zero-copy via Transferable)
      workletNode.port.onmessage = (e: MessageEvent<{ left: Float32Array; right: Float32Array }>) => {
        chunksLeftRef.current.push(e.data.left)
        chunksRightRef.current.push(e.data.right)
      }

      // Muted output — keeps workletNode active in the graph without playing back
      const silentGain = ctx.createGain()
      silentGain.gain.value = 0
      workletNode.connect(silentGain)
      silentGain.connect(ctx.destination)

      // Signal graph: src → gain → analyser (metering)
      //               src → gain → workletNode → [silent] (recording)
      srcNode.connect(gainNode)
      gainNode.connect(analyser)
      gainNode.connect(workletNode)

      startTimeRef.current = Date.now()
      setState('recording')
      drawLevel()
    },
    [getStream, drawLevel]
  )

  const stop = useCallback(async () => {
    cancelAnimationFrame(animFrameRef.current)
    onLevelUpdate(0)

    workletRef.current?.disconnect()
    workletRef.current = null

    gainRef.current?.disconnect()
    gainRef.current = null

    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null

    setAnalyserNode(null)

    const ctx = contextRef.current
    if (!ctx) return
    contextRef.current = null

    const left  = concatenateFloat32Arrays(chunksLeftRef.current)
    const right = chunksRightRef.current.length > 0
      ? concatenateFloat32Arrays(chunksRightRef.current)
      : left

    const buffer = ctx.createBuffer(2, left.length, ctx.sampleRate)
    buffer.copyToChannel(left, 0)
    buffer.copyToChannel(right, 1)

    setAudioBuffer(buffer)
    setDuration(buffer.duration)
    setState('stopped')

    await ctx.close()
  }, [onLevelUpdate])

  const reset = useCallback(() => {
    setAudioBuffer(null)
    setDuration(0)
    setState('idle')
  }, [])

  const setGain = useCallback((value: number) => {
    gainValueRef.current = value
    setGainState(value)
    if (gainRef.current) gainRef.current.gain.value = value
  }, [])

  return { state, audioBuffer, duration, analyserNode, gain, setGain, start, stop, reset }
}
