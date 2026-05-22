import fs from 'fs'
import path from 'path'
import os from 'os'

export async function writeTempWav(pcmData: ArrayBuffer): Promise<string> {
  const tmpPath = path.join(os.tmpdir(), `sample_${Date.now()}.wav`)
  await fs.promises.writeFile(tmpPath, Buffer.from(pcmData))
  return tmpPath
}
