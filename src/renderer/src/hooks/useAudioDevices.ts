import { useState, useEffect, useCallback } from 'react'

export type SourceCategory =
  | 'screen'
  | 'browser'
  | 'terminal'
  | 'communication'
  | 'media'
  | 'app'
  | 'loopback'

export interface AudioSource {
  id: string
  name: string // raw name (for aria-label / debugging)
  appName: string // primary display text
  subtitle?: string // page / document title
  appIcon?: string // base64 data URL
  category: SourceCategory
  type: 'desktop' | 'loopback'
}

// ── Category keyword lists ────────────────────────────────────────────────
const BROWSERS = ['chrome', 'firefox', 'edge', 'opera', 'brave', 'arc', 'safari']
const TERMINALS = ['terminal', 'cmd', 'powershell', 'bash', 'iterm', 'warp', 'hyper', 'conhost', 'console']
const COMM_APPS = ['whatsapp', 'telegram', 'discord', 'slack', 'teams', 'zoom', 'meet', 'skype']
const MEDIA_APPS = ['spotify', 'vlc', 'itunes', 'music', 'video', 'netflix', 'youtube', 'twitch']
const LOOPBACK_KW = ['cable', 'blackhole', 'voicemeeter', 'loopback', 'virtual', 'mix']

// Processes that never produce useful audio and should be hidden
const BLOCKED = [
  // System / Windows shell
  'explorer', 'searchhost', 'searchapp', 'shellexperiencehost', 'startmenuexperiencehost',
  'textinputhost', 'applicationframehost', 'systemsettings', 'winstore', 'windowsstore',
  'runtimebroker', 'sihost', 'taskmgr', 'taskmanager', 'ctfmon', 'dwm', 'lockapp',
  'logonui', 'fontdrvhost', 'winlogon', 'svchost', 'services', 'lsass', 'csrss',
  // GPU / drivers
  'nvidia', 'nvdisplay', 'nvcontainer', 'nvcplui', 'nvspcaps',
  'amd', 'radeon', 'amdow', 'igcc', 'igfxem',
  // IDEs / dev tools — usually not the capture target
  'code', 'devenv', 'rider', 'idea', 'webstorm', 'fleet',
  // This app itself
  'samplewebapp', 'electron',
  // Common system utilities
  'snippingtool', 'mspaint', 'notepad', 'calculator', 'eventvwr',
  'perfmon', 'regedit', 'mmc', 'wmiprvse', 'wuauclt',
]

function isBlocked(name: string): boolean {
  const l = name.toLowerCase().replace(/[\s\-_.]/g, '')
  return BLOCKED.some((k) => l.includes(k))
}

function detectCategory(appName: string): SourceCategory {
  const l = appName.toLowerCase()
  if (BROWSERS.some((k) => l.includes(k))) return 'browser'
  if (TERMINALS.some((k) => l.includes(k))) return 'terminal'
  if (COMM_APPS.some((k) => l.includes(k))) return 'communication'
  if (MEDIA_APPS.some((k) => l.includes(k))) return 'media'
  return 'app'
}

function parseSourceName(
  rawName: string,
  isScreen: boolean
): { appName: string; subtitle?: string; category: SourceCategory } {
  if (isScreen) {
    return { appName: 'Pantalla completa', category: 'screen' }
  }

  const parts = rawName.split(' - ')
  const appName = parts[0].trim()
  // Keep all remaining parts joined — page titles may contain " - " too
  const subtitle = parts.length > 1 ? parts.slice(1).join(' - ').trim() : undefined

  return {
    appName,
    subtitle: subtitle || undefined,
    category: detectCategory(appName)
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────
export function useAudioDevices(): {
  sources: AudioSource[]
  loading: boolean
  error: string | null
  refresh: () => void
} {
  const [sources, setSources] = useState<AudioSource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result: AudioSource[] = []

      // Strategy A: desktopCapturer sources (WASAPI loopback via Chromium)
      const desktopSources = await window.electronAPI.enumerateDevices()
      for (const src of desktopSources) {
        const { appName, subtitle, category } = parseSourceName(src.name, src.isScreen)

        // Skip screen captures and system/terminal processes
        if (src.isScreen) continue
        if (category === 'terminal') continue
        if (isBlocked(appName)) continue

        result.push({
          id: src.id,
          name: src.name,
          appName,
          subtitle,
          appIcon: src.appIcon ?? undefined,
          category,
          type: 'desktop'
        })
      }

      // Strategy B: virtual loopback devices (VB-Cable, BlackHole, etc.)
      const permStream = await navigator.mediaDevices
        .getUserMedia({ audio: true })
        .catch(() => null)
      if (permStream) permStream.getTracks().forEach((t) => t.stop())

      const devices = await navigator.mediaDevices.enumerateDevices()
      const loopbackDevices = devices.filter(
        (d) =>
          d.kind === 'audioinput' && LOOPBACK_KW.some((kw) => d.label.toLowerCase().includes(kw))
      )
      for (const d of loopbackDevices) {
        result.push({
          id: d.deviceId,
          name: d.label,
          appName: d.label,
          category: 'loopback',
          type: 'loopback'
        })
      }

      setSources(result)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return { sources, loading, error, refresh: load }
}
