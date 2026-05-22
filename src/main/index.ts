import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync } from 'fs'
import { registerIpcHandlers } from './ipc-handlers'

interface WindowState {
  width: number
  height: number
  x?: number
  y?: number
}

const STATE_FILE = () => join(app.getPath('userData'), 'window-state.json')
const DEFAULT_STATE: WindowState = { width: 1100, height: 720 }
const MIN_WIDTH = 820
const MIN_HEIGHT = 560

function loadWindowState(): WindowState {
  try {
    const raw = readFileSync(STATE_FILE(), 'utf-8')
    const saved = JSON.parse(raw) as Partial<WindowState>
    return {
      width: Math.max(MIN_WIDTH, saved.width ?? DEFAULT_STATE.width),
      height: Math.max(MIN_HEIGHT, saved.height ?? DEFAULT_STATE.height),
      x: saved.x,
      y: saved.y,
    }
  } catch {
    return DEFAULT_STATE
  }
}

function saveWindowState(win: BrowserWindow): void {
  try {
    writeFileSync(STATE_FILE(), JSON.stringify(win.getBounds()), 'utf-8')
  } catch { /* non-critical */ }
}

function createWindow(): void {
  const saved = loadWindowState()

  const iconPath = app.isPackaged
    ? join(process.resourcesPath, 'app.ico')
    : join(__dirname, '../../resources/logo.png')

  const mainWindow = new BrowserWindow({
    width: saved.width,
    height: saved.height,
    ...(saved.x !== undefined && saved.y !== undefined ? { x: saved.x, y: saved.y } : {}),
    minWidth: MIN_WIDTH,
    minHeight: MIN_HEIGHT,
    show: false,
    autoHideMenuBar: true,
    title: 'Sample Record Studio',
    icon: iconPath,
    backgroundColor: '#111827',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  registerIpcHandlers(mainWindow)

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  // Persist size/position on close and with a debounced resize handler
  let saveTimer: ReturnType<typeof setTimeout>
  const debouncedSave = () => {
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => saveWindowState(mainWindow), 400)
  }
  mainWindow.on('resize', debouncedSave)
  mainWindow.on('move', debouncedSave)
  mainWindow.on('close', () => saveWindowState(mainWindow))

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
