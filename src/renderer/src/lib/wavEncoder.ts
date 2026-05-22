import audioBufferToWav from 'audiobuffer-to-wav'

export type WavFormat = '16bit' | '32float'

export function encodeToWav(buffer: AudioBuffer, format: WavFormat = '16bit'): ArrayBuffer {
  return audioBufferToWav(buffer, format === '32float' ? { float32: true } : undefined)
}
