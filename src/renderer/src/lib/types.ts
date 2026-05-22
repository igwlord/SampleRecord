export interface RecordingEntry {
  id: string
  name: string
  path: string
  duration: number
  exportedAt: string
}

export interface PeakEntry {
  time: number
  db: number
}
