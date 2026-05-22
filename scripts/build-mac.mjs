/**
 * build-mac.mjs
 * Builds Sample Record Studio for macOS (x64 + arm64) from any OS.
 * Output: dist-mac/  with one zip per architecture.
 *
 * Run: node scripts/build-mac.mjs
 */

import { packager } from '@electron/packager'
import { ZipArchive } from 'archiver'
import fs          from 'fs'
import path        from 'path'
import { execSync } from 'child_process'

const ROOT    = path.resolve(import.meta.dirname, '..')
const STAGING = path.join(ROOT, '.mac-staging')
const OUT     = path.join(ROOT, 'dist-mac')

// ── 1. Build renderer + main ──────────────────────────────────────────────────
console.log('\n[1/4] Building renderer + main process…')
execSync('npm run build', { cwd: ROOT, stdio: 'inherit' })

// ── 2. Create staging directory (only compiled output, no node_modules) ──────
console.log('\n[2/4] Staging compiled output…')
if (fs.existsSync(STAGING)) fs.rmSync(STAGING, { recursive: true })
fs.mkdirSync(STAGING, { recursive: true })

// minimal package.json – electron-packager needs "main" + "name"
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))
fs.writeFileSync(
  path.join(STAGING, 'package.json'),
  JSON.stringify({ name: pkg.name, version: pkg.version, main: './out/main/index.js' }, null, 2)
)

// compiled main/preload/renderer
fs.cpSync(path.join(ROOT, 'out'), path.join(STAGING, 'out'), { recursive: true })

// resources (icons, drag icon)
const resDir = path.join(STAGING, 'resources')
fs.mkdirSync(resDir, { recursive: true })
for (const f of ['drag-icon.png', 'app.icns']) {
  const src = path.join(ROOT, 'resources', f)
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(resDir, f))
}

// ── 3. Package with @electron/packager for each arch ─────────────────────────
if (fs.existsSync(OUT)) fs.rmSync(OUT, { recursive: true })
fs.mkdirSync(OUT, { recursive: true })

for (const arch of ['x64', 'arm64']) {
  console.log(`\n[3/4] Packaging darwin-${arch}…  (downloading Electron if needed)`)

  const appPaths = await packager({
    dir:              STAGING,
    name:             'Sample Record Studio',
    platform:         'darwin',
    arch,
    electronVersion:  pkg.devDependencies?.electron?.replace(/[\^~]/, '') ?? '32.3.3',
    out:              OUT,
    overwrite:        true,
    icon:             path.join(ROOT, 'resources', 'app.icns'),
    appVersion:       pkg.version,
    buildVersion:     pkg.version,
    appBundleId:      'com.samplerecordstudio.app',
    appCategoryType:  'public.app-category.music',
    appCopyright:     'Copyright © 2025',
  })

  const appDir = appPaths[0]  // e.g. dist-mac/Sample Record Studio-darwin-x64
  console.log(`  → App bundle: ${appDir}`)

  // ── 4. Zip with Unix permissions preserved ──────────────────────────────
  console.log(`\n[4/4] Creating zip for darwin-${arch}…`)
  const archLabel = arch === 'arm64' ? 'Apple Silicon (M1+)' : 'Intel'
  const zipName   = `Sample.Record.Studio-${pkg.version}-mac-${arch}.zip`
  const zipPath   = path.join(OUT, zipName)

  await new Promise((resolve, reject) => {
    const output  = fs.createWriteStream(zipPath)
    const archive = new ZipArchive({ zlib: { level: 6 } })

    output.on('close', resolve)
    archive.on('error', reject)
    archive.pipe(output)

    // Walk the .app and add every file with correct Unix mode bits
    const appName = 'Sample Record Studio.app'
    const appSrc  = path.join(appDir, appName)

    addDirToZip(archive, appSrc, appName)

    // Include a short README so Mac users know what to do
    const readme = [
      `Sample Record Studio ${pkg.version} — macOS ${archLabel}`,
      '',
      'HOW TO OPEN',
      '───────────',
      '1. Unzip this archive.',
      '2. Drag "Sample Record Studio.app" to your Applications folder.',
      '3. First launch: right-click the app → Open → Open',
      '   (macOS blocks unsigned apps on first launch; right-click bypasses this).',
      '4. Alternatively run in Terminal:',
      '     xattr -cr "/Applications/Sample Record Studio.app"',
      '',
      'SYSTEM REQUIREMENTS',
      '───────────────────',
      `macOS 11 Big Sur or later · ${archLabel}`,
      '',
      '© 2025 Sample Record Studio',
    ].join('\n')

    archive.append(Buffer.from(readme), { name: 'READ ME FIRST.txt', mode: 0o644 })
    archive.finalize()
  })

  const sizeMB = (fs.statSync(zipPath).size / 1_048_576).toFixed(1)
  console.log(`  ✓ ${zipName}  (${sizeMB} MB)`)
}

// ── Cleanup staging ───────────────────────────────────────────────────────────
fs.rmSync(STAGING, { recursive: true })
console.log('\n✅  Done! Zips are in dist-mac/')
console.log(`   dist-mac/Sample.Record.Studio-${pkg.version}-mac-x64.zip   ← Intel Macs`)
console.log(`   dist-mac/Sample.Record.Studio-${pkg.version}-mac-arm64.zip ← M1/M2/M3 Macs`)

// ── Helper: walk directory and add to zip with proper Unix modes ──────────────
function addDirToZip(archive, srcDir, zipPrefix) {
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const srcPath = path.join(srcDir, entry.name)
    const zipPath = `${zipPrefix}/${entry.name}`

    if (entry.isDirectory()) {
      addDirToZip(archive, srcPath, zipPath)
    } else {
      // Determine executable bit: MacOS binary dir, helper binaries, .dylib, .so, .node
      const isExec = (
        zipPath.includes('.app/Contents/MacOS/') ||
        zipPath.includes('/Helpers/') ||
        entry.name.endsWith('.dylib') ||
        entry.name.endsWith('.so') ||
        entry.name.endsWith('.node') ||
        entry.name === 'electron' ||
        !entry.name.includes('.')   // likely a binary
      )
      archive.file(srcPath, {
        name: zipPath,
        mode: isExec ? 0o755 : 0o644,
      })
    }
  }
}
