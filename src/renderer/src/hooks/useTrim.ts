import { useState, useCallback } from 'react'

export function useTrim(duration: number) {
  const [trimStart, setTrimStart] = useState(0)
  const [trimEnd, setTrimEnd] = useState(duration)

  const updateDuration = useCallback((dur: number) => {
    setTrimStart(0)
    setTrimEnd(dur)
  }, [])

  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val))

  const setStart = useCallback(
    (val: number) => setTrimStart(clamp(val, 0, trimEnd - 0.01)),
    [trimEnd]
  )
  const setEnd = useCallback(
    (val: number) => setTrimEnd(clamp(val, trimStart + 0.01, duration)),
    [trimStart, duration]
  )

  return { trimStart, trimEnd, setStart, setEnd, updateDuration }
}
