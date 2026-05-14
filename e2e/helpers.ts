import { createClient } from '@supabase/supabase-js'

function clean(val: string | undefined): string {
  return (val ?? '').replace(/\\n/g, '').replace(/[\n\r]/g, '').replace(/^["']|["']$/g, '').trim()
}

const SUPABASE_URL = clean(process.env.NEXT_PUBLIC_SUPABASE_URL)
const SUPABASE_KEY = clean(process.env.SUPABASE_SERVICE_ROLE_KEY)
const WEBHOOK_SECRET = clean(process.env.WEBHOOK_SECRET)
const BASE_URL = clean(process.env.E2E_BASE_URL) || 'https://learnivore-email.vercel.app'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
export const baseUrl = BASE_URL
export const webhookSecret = WEBHOOK_SECRET

export const TEST_EMAIL = `e2e-test-${Date.now()}@test-learnivore.fr`

export async function cleanupTestContact(email: string) {
  await supabase.from('contacts').delete().eq('email', email)
}

export async function createTestContactViaWebhook(opts: {
  email: string
  firstName?: string
  tags?: string[]
}) {
  const res = await fetch(`${BASE_URL}/api/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: opts.email,
      first_name: opts.firstName ?? 'E2E Test',
      tags: opts.tags ?? [],
      secret: WEBHOOK_SECRET,
    }),
  })
  return res.json()
}

export async function getSendQueueForContact(contactId: string) {
  const { data } = await supabase
    .from('send_queue')
    .select('*')
    .eq('contact_id', contactId)
    .order('scheduled_for', { ascending: true })
  return data ?? []
}

export async function getEventsForSendQueue(sendQueueId: string) {
  const { data } = await supabase
    .from('email_events')
    .select('*')
    .eq('send_queue_id', sendQueueId)
    .order('occurred_at', { ascending: true })
  return data ?? []
}
