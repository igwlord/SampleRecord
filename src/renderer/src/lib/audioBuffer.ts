export function sliceAudioBuffer(
  buffer: AudioBuffer,
  startSec: number,
  endSec: number
): AudioBuffer {
  const sr = buffer.sampleRate
  const startSample = Math.floor(startSec * sr)
  const endSample = Math.floor(endSec * sr)
  const length = endSample - startSample

  const sliced = new AudioBuffer({
    numberOfChannels: buffer.numberOfChannels,
    length,
    sampleRate: sr
  })

  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    sliced.copyToChannel(buffer.getChannelData(ch).slice(startSample, endSample), ch)
  }
  return sliced
}

export function concatenateFloat32Arrays(arrays: Float32Array[]): Float32Array {
  const totalLength = arrays.reduce((sum, a) => sum + a.length, 0)
  const result = new Float32Array(totalLength)
  let offset = 0
  for (const arr of arrays) {
    result.set(arr, offset)
    offset += arr.length
  }
  return result
}

function cloneBuffer(buffer: AudioBuffer): AudioBuffer {
  const out = new AudioBuffer({
    numberOfChannels: buffer.numberOfChannels,
    length: buffer.length,
    sampleRate: buffer.sampleRate,
  })
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    out.copyToChannel(buffer.getChannelData(ch).slice(), ch)
  }
  return out
}

export function normalizeAudioBuffer(buffer: AudioBuffer): AudioBuffer {
  let peak = 0
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch)
    for (let i = 0; i < data.length; i++) {
      if (Math.abs(data[i]) > peak) peak = Math.abs(data[i])
    }
  }
  if (peak === 0 || peak >= 0.999) return buffer
  const gainFactor = 0.998 / peak
  const out = cloneBuffer(buffer)
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const dst = out.getChannelData(ch)
    for (let i = 0; i < dst.length; i++) dst[i] *= gainFactor
  }
  return out
}

export function fadeInAudioBuffer(buffer: AudioBuffer, durationSec = 0.15): AudioBuffer {
  const fadeSamples = Math.min(Math.floor(durationSec * buffer.sampleRate), buffer.length)
  const out = cloneBuffer(buffer)
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const dst = out.getChannelData(ch)
    for (let i = 0; i < fadeSamples; i++) dst[i] *= i / fadeSamples
  }
  return out
}

export function fadeOutAudioBuffer(buffer: AudioBuffer, durationSec = 0.15): AudioBuffer {
  const fadeSamples = Math.min(Math.floor(durationSec * buffer.sampleRate), buffer.length)
  const fadeStart = buffer.length - fadeSamples
  const out = cloneBuffer(buffer)
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const dst = out.getChannelData(ch)
    for (let i = fadeStart; i < buffer.length; i++) {
      dst[i] *= (buffer.length - 1 - i) / fadeSamples
    }
  }
  return out
}
