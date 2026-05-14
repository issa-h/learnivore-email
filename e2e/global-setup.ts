import { readFileSync } from 'fs'
import { resolve } from 'path'

export default function globalSetup() {
  const envPath = resolve(__dirname, '../.env.local')
  try {
    const content = readFileSync(envPath, 'utf-8')
    for (const line of content.split('\n')) {
      if (!line || line.startsWith('#')) continue
      const eqIndex = line.indexOf('=')
      if (eqIndex === -1) continue
      const key = line.slice(0, eqIndex).trim()
      let value = line.slice(eqIndex + 1).trim()
      // Remove quotes and trailing \n
      value = value.replace(/^["']|["']$/g, '').replace(/\\n$/g, '').trim()
      if (key && value) {
        process.env[key] = value
      }
    }
  } catch {
    // .env.local not found, rely on existing env vars
  }
}
