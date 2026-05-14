import { test, expect } from '@playwright/test'
import {
  supabase,
  baseUrl,
  cleanupTestContact,
  createTestContactViaWebhook,
  getEventsForSendQueue,
} from './helpers'

const EMAIL = `e2e-track-${Date.now()}@test-learnivore.fr`
let sendQueueId: string

test.beforeAll(async () => {
  // Create a contact and get a send_queue item to test tracking against
  const result = await createTestContactViaWebhook({ email: EMAIL, tags: [] })

  // Insert a fake sent send_queue item for tracking tests
  const { data: contact } = await supabase
    .from('contacts')
    .select('id')
    .eq('email', EMAIL)
    .single()

  const { data: sq } = await supabase
    .from('send_queue')
    .insert({
      contact_id: contact!.id,
      sequence_step_id: null,
      enrollment_id: null,
      scheduled_for: new Date().toISOString(),
      sent_at: new Date().toISOString(),
      status: 'sent',
    })
    .select('id')
    .single()

  sendQueueId = sq!.id
})

test.afterAll(async () => {
  await supabase.from('email_events').delete().eq('send_queue_id', sendQueueId)
  await supabase.from('send_queue').delete().eq('id', sendQueueId)
  await cleanupTestContact(EMAIL)
})

// ── Open tracking ──

test('records a human open event', async ({ request }) => {
  const res = await request.get(`${baseUrl}/api/track/open?sid=${sendQueueId}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15',
    },
  })
  expect(res.status()).toBe(200)
  expect(res.headers()['content-type']).toContain('image/gif')

  // Wait a moment for insert
  await new Promise((r) => setTimeout(r, 500))

  const events = await getEventsForSendQueue(sendQueueId)
  const opens = events.filter((e) => e.event_type === 'open')
  expect(opens.length).toBe(1)
  expect(opens[0].user_agent).toContain('Safari')
})

test('ignores bot open events', async ({ request }) => {
  // Clear previous events
  await supabase.from('email_events').delete().eq('send_queue_id', sendQueueId)

  const res = await request.get(`${baseUrl}/api/track/open?sid=${sendQueueId}`, {
    headers: { 'User-Agent': 'Discordbot/2.0' },
  })
  expect(res.status()).toBe(200) // pixel still returned

  await new Promise((r) => setTimeout(r, 500))

  const events = await getEventsForSendQueue(sendQueueId)
  expect(events.filter((e) => e.event_type === 'open')).toHaveLength(0)
})

test('deduplicates rapid open events within 5s', async ({ request }) => {
  await supabase.from('email_events').delete().eq('send_queue_id', sendQueueId)

  const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7) Safari/604.1'

  // Fire 3 opens rapidly
  await request.get(`${baseUrl}/api/track/open?sid=${sendQueueId}`, { headers: { 'User-Agent': ua } })
  await request.get(`${baseUrl}/api/track/open?sid=${sendQueueId}`, { headers: { 'User-Agent': ua } })
  await request.get(`${baseUrl}/api/track/open?sid=${sendQueueId}`, { headers: { 'User-Agent': ua } })

  await new Promise((r) => setTimeout(r, 500))

  const events = await getEventsForSendQueue(sendQueueId)
  expect(events.filter((e) => e.event_type === 'open')).toHaveLength(1)
})

// ── Click tracking ──

test('records a human click and redirects', async ({ request }) => {
  await supabase.from('email_events').delete().eq('send_queue_id', sendQueueId)

  const res = await request.get(
    `${baseUrl}/api/track/click?sid=${sendQueueId}&url=${encodeURIComponent('https://learnivore.fr')}`,
    {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh) Chrome/147.0.0.0' },
      maxRedirects: 0,
    }
  )
  expect(res.status()).toBe(302)
  // Redirect may add trailing slash
  expect(res.headers()['location']).toMatch(/^https:\/\/learnivore\.fr\/?$/)

  await new Promise((r) => setTimeout(r, 500))

  const events = await getEventsForSendQueue(sendQueueId)
  const clicks = events.filter((e) => e.event_type === 'click')
  expect(clicks).toHaveLength(1)
  expect(clicks[0].url).toBe('https://learnivore.fr')
})

test('ignores bot click but still redirects', async ({ request }) => {
  await supabase.from('email_events').delete().eq('send_queue_id', sendQueueId)

  const res = await request.get(
    `${baseUrl}/api/track/click?sid=${sendQueueId}&url=${encodeURIComponent('https://learnivore.fr')}`,
    {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' },
      maxRedirects: 0,
    }
  )
  expect(res.status()).toBe(302) // redirect works

  await new Promise((r) => setTimeout(r, 500))

  const events = await getEventsForSendQueue(sendQueueId)
  expect(events.filter((e) => e.event_type === 'click')).toHaveLength(0)
})

test('deduplicates rapid clicks on same URL within 5s', async ({ request }) => {
  await supabase.from('email_events').delete().eq('send_queue_id', sendQueueId)

  const ua = 'Mozilla/5.0 (Windows NT 10.0) Chrome/147.0.0.0'
  const url = encodeURIComponent('https://learnivore.fr/test')

  await request.get(`${baseUrl}/api/track/click?sid=${sendQueueId}&url=${url}`, { headers: { 'User-Agent': ua }, maxRedirects: 0 })
  await request.get(`${baseUrl}/api/track/click?sid=${sendQueueId}&url=${url}`, { headers: { 'User-Agent': ua }, maxRedirects: 0 })
  await request.get(`${baseUrl}/api/track/click?sid=${sendQueueId}&url=${url}`, { headers: { 'User-Agent': ua }, maxRedirects: 0 })

  await new Promise((r) => setTimeout(r, 500))

  const events = await getEventsForSendQueue(sendQueueId)
  expect(events.filter((e) => e.event_type === 'click')).toHaveLength(1)
})
