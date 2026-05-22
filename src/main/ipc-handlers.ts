import { ipcMain, desktopCapturer, dialog, nativeImage, BrowserWindow, app } from 'electron'
import path from 'path'
import fs from 'fs'
import os from 'os'
import { writeTempWav } from './audio-utils'
import { CHANNELS } from '../shared/constants'

interface RecordingEntry {
  id: string
  name: string
  path: string
  duration: number
  exportedAt: string
}

function recordingsFilePath(): string {
  return path.join(app.getPath('userData'), 'recordings.json')
}

async function readRecordings(): Promise<RecordingEntry[]> {
  try {
    const raw = await fs.promises.readFile(recordingsFilePath(), 'utf-8')
    return JSON.parse(raw) as RecordingEntry[]
  } catch {
    return []
  }
}

async function writeRecordings(entries: RecordingEntry[]): Promise<void> {
  await fs.promises.writeFile(recordingsFilePath(), JSON.stringify(entries, null, 2), 'utf-8')
}

export function registerIpcHandlers(mainWindow: BrowserWindow): void {
  ipcMain.handle(CHANNELS.ENUMERATE_DEVICES, async () => {
    const sources = await desktopCapturer.getSources({
      types: ['screen', 'window'],
      fetchWindowIcons: true,
      thumbnailSize: { width: 0, height: 0 } // skip screenshots for performance
    })
    return sources.map((s) => {
      let appIcon: string | null = null
      if (s.appIcon && !s.appIcon.isEmpty()) {
        const png = s.appIcon.toPNG()
        // Skip icons > 4 KB to keep IPC payload small
        if (png.byteLength <= 4096) {
          appIcon = `data:image/png;base64,${png.toString('base64')}`
        }
      }
      return {
        id: s.id,
        name: s.name,
        appIcon,
        isScreen: s.id.startsWith('screen:')
      }
    })
  })

  ipcMain.handle(CHANNELS.WRITE_WAV_TEMP, async (_event, pcmData: ArrayBuffer) => {
    const tempPath = await writeTempWav(pcmData)
    return { tempPath }
  })

  ipcMain.on(CHANNELS.START_DRAG, (event, tempFilePath: string) => {
    // SECURITY: only allow dragging files that live inside the system temp directory
    const resolvedTemp = fs.realpathSync.native(os.tmpdir())
    const resolvedFile = path.resolve(tempFilePath)
    if (!resolvedFile.startsWith(resolvedTemp)) {
      console.warn('[startDrag] Rejected path outside tmpdir:', tempFilePath)
      return
    }

    const iconPath = app.isPackaged
      ? path.join(process.resourcesPath, 'drag-icon.png')
      : path.join(__dirname, '../../resources/drag-icon.png')

    event.sender.startDrag({
      file: resolvedFile,
      icon: nativeImage.createFromPath(iconPath)
    })
  })

  ipcMain.handle(CHANNELS.OPEN_SAVE_DIALOG, async () => {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Guardar sample',
      defaultPath: `sample_${Date.now()}.wav`,
      filters: [{ name: 'WAV Audio', extensions: ['wav'] }]
    })
    return { filePath: result.filePath }
  })

  ipcMain.handle(CHANNELS.LIST_RECORDINGS, async () => {
    return readRecordings()
  })

  ipcMain.handle(CHANNELS.SAVE_RECORDING, async (_event, entry: RecordingEntry) => {
    const current = await readRecordings()
    current.push(entry)
    await writeRecordings(current)
  })

  ipcMain.handle(
    CHANNELS.SAVE_WAV_FINAL,
    async (_event, { tempPath, destPath }: { tempPath: string; destPath: string }) => {
      try {
        // SECURITY: destPath must have a .wav extension (dialog already enforces this,
        // but we validate here too to prevent path traversal from a compromised renderer)
        const ext = path.extname(destPath).toLowerCase()
        if (ext !== '.wav') {
          console.warn('[saveWavFinal] Rejected non-wav destination:', destPath)
          return { success: false }
        }

        // SECURITY: tempPath must be inside os.tmpdir()
        const resolvedTemp = fs.realpathSync.native(os.tmpdir())
        const resolvedSrc = path.resolve(tempPath)
        if (!resolvedSrc.startsWith(resolvedTemp)) {
          console.warn('[saveWavFinal] Rejected source outside tmpdir:', tempPath)
          return { success: false }
        }

        await fs.promises.copyFile(resolvedSrc, destPath)

        // CLEANUP: delete temp file after successful save — no more orphaned files
        fs.promises.unlink(resolvedSrc).catch(() => null)

        return { success: true }
      } catch {
        return { success: false }
      }
    }
  )
}
