const BOT_PATTERNS = [
  'bot', 'crawler', 'spider', 'slurp', 'mediapartners',
  'facebookexternalhit', 'linkedinbot', 'twitterbot',
  'discordbot', 'telegrambot', 'whatsapp', 'preview',
  'scanner', 'check', 'monitor', 'fetch', 'curl', 'wget',
  'python-requests', 'go-http-client', 'java/', 'okhttp',
]

export function isBot(userAgent: string | null): boolean {
  if (!userAgent) return false
  const ua = userAgent.toLowerCase()
  return BOT_PATTERNS.some((p) => ua.includes(p))
}

// Debounce window: ignore duplicate events within this many milliseconds
const DEDUP_WINDOW_MS = 5000
