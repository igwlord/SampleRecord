import { PitchDetector } from 'pitchy'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — music-tempo has no type declarations
import MusicTempo from 'music-tempo'

// ── Constants ────────────────────────────────────────────────────────────────
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

// ── Helpers ──────────────────────────────────────────────────────────────────
function hzToMidi(hz: number): number {
  return 69 + 12 * Math.log2(hz / 440)
}

function midiToNoteParts(midi: number): { note: string; octave: number; cents: number } {
  const rounded = Math.round(midi)
  const cents = Math.round((midi - rounded) * 100)
  const note = NOTE_NAMES[((rounded % 12) + 12) % 12]
  const octave = Math.floor(rounded / 12) - 1
  return { note, octave, cents }
}

/** Returns a mono Float32Array from any AudioBuffer (averages L+R if stereo) */
function toMono(buffer: AudioBuffer): Float32Array {
  const ch0 = buffer.getChannelData(0)
  if (buffer.numberOfChannels === 1) return ch0
  const ch1 = buffer.getChannelData(1)
  const mono = new Float32Array(ch0.length)
  for (let i = 0; i < ch0.length; i++) mono[i] = (ch0[i] + ch1[i]) * 0.5
  return mono
}

// ── Public result types ───────────────────────────────────────────────────────
export interface NoteResult {
  note: string      // e.g. "A"
  octave: number    // e.g. 4
  cents: number     // deviation from exact semitone, -50..+50
  confidence: number // 0-1
}

export interface BpmResult {
  bpm: number       // e.g. 128.4
}

// ── Note / Pitch detection ────────────────────────────────────────────────────
/**
 * Analyzes the audio buffer and returns the dominant pitch.
 * Works best on monophonic material (bass, lead, vocal).
 * Returns null for percussion or polyphonic/noisy content.
 */
export function analyzeNote(buffer: AudioBuffer): NoteResult | null {
  const mono = toMono(buffer)
  const { sampleRate } = buffer

  const FRAME = 2048
  const HOP   = 1024
  const CLARITY_THRESHOLD = 0.88
  const RMS_THRESHOLD     = 0.008  // skip near-silent frames

  const detector = PitchDetector.forFloat32Array(FRAME)
  const frame    = new Float32Array(FRAME)

  // MIDI note → hit count
  const votes = new Map<number, number>()
  let validFrames = 0

  for (let offset = 0; offset + FRAME <= mono.length; offset += HOP) {
    frame.set(mono.subarray(offset, offset + FRAME))

    // RMS gate — skip silence
    let rms = 0
    for (let i = 0; i < FRAME; i++) rms += frame[i] * frame[i]
    if (Math.sqrt(rms / FRAME) < RMS_THRESHOLD) continue

    const [pitch, clarity] = detector.findPitch(frame, sampleRate)

    // Frequency range: roughly B0 (31 Hz) to B8 (7902 Hz)
    if (clarity < CLARITY_THRESHOLD || pitch < 30 || pitch > 8000) continue

    const midi = Math.round(hzToMidi(pitch))
    votes.set(midi, (votes.get(midi) ?? 0) + 1)
    validFrames++
  }

  if (validFrames < 3) return null

  // Most-voted MIDI note
  let bestMidi = 0, bestCount = 0
  for (const [midi, count] of votes) {
    if (count > bestCount) { bestMidi = midi; bestCount = count }
  }

  const confidence = bestCount / validFrames
  if (confidence < 0.25) return null   // too spread out → probably not monophonic

  return { ...midiToNoteParts(bestMidi), confidence }
}

// ── BPM detection ─────────────────────────────────────────────────────────────
/**
 * Analyzes the audio buffer and returns the detected BPM.
 * Works on any rhythmic content. Returns null for static/atonal material.
 */
export function analyzeBpm(buffer: AudioBuffer): BpmResult | null {
  try {
    const mono = toMono(buffer)
    // music-tempo expects a plain Array or TypedArray of samples
    const mt = new MusicTempo(mono)
    const bpm = mt.tempo as number
    if (!bpm || bpm < 40 || bpm > 320) return null
    return { bpm }
  } catch {
    return null
  }
}
