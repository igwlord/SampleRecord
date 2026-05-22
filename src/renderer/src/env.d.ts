/// <reference types="vite/client" />

interface RecordingEntry {
  id: string
  name: string
  path: string
  duration: number
  exportedAt: string
}

interface ElectronAPI {
  enumerateDevices: () => Promise<
    {
      id: string
      name: string
      appIcon: string | null
      isScreen: boolean
    }[]
  >
  writeWavTemp: (pcmData: ArrayBuffer) => Promise<{ tempPath: string }>
  startDrag: (tempFilePath: string) => void
  openSaveDialog: () => Promise<{ filePath?: string }>
  saveWavFinal: (tempPath: string, destPath: string) => Promise<{ success: boolean }>
  saveRecording: (entry: RecordingEntry) => Promise<void>
  listRecordings: () => Promise<RecordingEntry[]>
}

declare interface Window {
  electronAPI: ElectronAPI
}
