import { test, expect } from '@playwright/test'
import { supabase, baseUrl, cleanupTestContact } from './helpers'

const EMAIL = `e2e-cron-${Date.now()}@test-learnivore.fr`
let sendQueueId: string
let contactId: string

test.beforeAll(async () => {
  // Create a contact
  const { data: contact } = await supabase
    .from('contacts')
    .insert({ email: EMAIL, first_name: 'CronTest', tags: [], source: 'e2e' })
    .select('id')
    .single()

  contactId = contact!.id

  // Get any existing sequence step
  const { data: step } = await supabase
    .from('sequence_steps')
    .select('id')
    .limit(1)
    .single()

  // Insert a pending send_queue item scheduled in the past
  const { data: sq } = await supabase
    .from('send_queue')
    .insert({
      contact_id: contactId,
      sequence_step_id: step!.id,
      enrollment_id: null,
      scheduled_for: new Date(Date.now() - 3600000).toISOString(), // 1h ago
      status: 'pending',
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

test('GET /api/send processes overdue pending items', async ({ request }) => {
  const res = await request.get(`${baseUrl}/api/send`)
  expect(res.status()).toBe(200)

  const body = await res.json()
  expect(body.sent).toBeGreaterThanOrEqual(1)
  expect(body.failed).toBe(0)

  // Verify the item was sent
  const { data: item } = await supabase
    .from('send_queue')
    .select('status, sent_at')
    .eq('id', sendQueueId)
    .single()

  expect(item!.status).toBe('sent')
  expect(item!.sent_at).toBeTruthy()
})

test('POST /api/send also works (for pg_cron)', async ({ request }) => {
  const res = await request.post(`${baseUrl}/api/send`, { data: {} })
  expect(res.status()).toBe(200)

  const body = await res.json()
  expect(body).toHaveProperty('sent')
  expect(body).toHaveProperty('failed')
})
