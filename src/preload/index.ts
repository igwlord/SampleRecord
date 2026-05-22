import { contextBridge, ipcRenderer } from 'electron'
import { CHANNELS } from '../shared/constants'

contextBridge.exposeInMainWorld('electronAPI', {
  enumerateDevices: () => ipcRenderer.invoke(CHANNELS.ENUMERATE_DEVICES),

  writeWavTemp: (pcmData: ArrayBuffer) => ipcRenderer.invoke(CHANNELS.WRITE_WAV_TEMP, pcmData),

  startDrag: (tempFilePath: string) => ipcRenderer.send(CHANNELS.START_DRAG, tempFilePath),

  openSaveDialog: () => ipcRenderer.invoke(CHANNELS.OPEN_SAVE_DIALOG),

  saveWavFinal: (tempPath: string, destPath: string) =>
    ipcRenderer.invoke(CHANNELS.SAVE_WAV_FINAL, { tempPath, destPath }),

  saveRecording: (entry: object) => ipcRenderer.invoke(CHANNELS.SAVE_RECORDING, entry),

  listRecordings: () => ipcRenderer.invoke(CHANNELS.LIST_RECORDINGS)
})
