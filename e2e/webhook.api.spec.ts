import { test, expect } from '@playwright/test'
import {
  supabase,
  baseUrl,
  webhookSecret,
  cleanupTestContact,
  getSendQueueForContact,
} from './helpers'

const EMAIL_1 = `e2e-webhook-1-${Date.now()}@test-learnivore.fr`
const EMAIL_2 = `e2e-webhook-2-${Date.now()}@test-learnivore.fr`
const EMAIL_3 = `e2e-webhook-3-${Date.now()}@test-learnivore.fr`

test.afterAll(async () => {
  await cleanupTestContact(EMAIL_1)
  await cleanupTestContact(EMAIL_2)
  await cleanupTestContact(EMAIL_3)
})

test('rejects invalid secret with 401', async ({ request }) => {
  const res = await request.post(`${baseUrl}/api/webhook`, {
    data: { email: 'x@x.com', secret: 'wrong' },
  })
  expect(res.status()).toBe(401)
})

test('rejects missing email with 400', async ({ request }) => {
  const res = await request.post(`${baseUrl}/api/webhook`, {
    data: { secret: webhookSecret },
  })
  expect(res.status()).toBe(400)
})

test('creates contact with correct tags', async ({ request }) => {
  const res = await request.post(`${baseUrl}/api/webhook`, {
    data: {
      email: EMAIL_1,
      first_name: 'E2E Test',
      tags: ['e2e-tag-a', 'e2e-tag-b'],
      secret: webhookSecret,
    },
  })
  expect(res.status()).toBe(200)
  const body = await res.json()
  expect(body.ok).toBe(true)
  expect(body.contact_id).toBeTruthy()

  const { data: contact } = await supabase
    .from('contacts')
    .select('*')
    .eq('email', EMAIL_1)
    .single()

  expect(contact).toBeTruthy()
  expect(contact!.first_name).toBe('E2E Test')
  expect(contact!.tags).toContain('e2e-tag-a')
  expect(contact!.tags).toContain('e2e-tag-b')
})

test('appends tags without overwriting existing ones', async ({ request }) => {
  // Second call with a new tag
  await request.post(`${baseUrl}/api/webhook`, {
    data: {
      email: EMAIL_1,
      first_name: 'E2E Test',
      tags: ['e2e-tag-c'],
      secret: webhookSecret,
    },
  })

  const { data: contact } = await supabase
    .from('contacts')
    .select('tags')
    .eq('email', EMAIL_1)
    .single()

  expect(contact!.tags).toContain('e2e-tag-a')
  expect(contact!.tags).toContain('e2e-tag-b')
  expect(contact!.tags).toContain('e2e-tag-c')
})

test('contact with unknown tag has no enrollment', async ({ request }) => {
  const res = await request.post(`${baseUrl}/api/webhook`, {
    data: {
      email: EMAIL_2,
      first_name: 'No Sequence',
      tags: ['e2e-no-rule-tag'],
      secret: webhookSecret,
    },
  })
  const body = await res.json()
  expect(body.ok).toBe(true)
  expect(body.sequences_enrolled).toHaveLength(0)

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('id')
    .eq('contact_id', body.contact_id)

  expect(enrollments).toHaveLength(0)
})

test('duplicate webhook call does not create duplicate enrollment', async ({ request }) => {
  // Create a tag rule for this test
  const { data: sequences } = await supabase
    .from('sequences')
    .select('id')
    .limit(1)

  if (!sequences || sequences.length === 0) {
    test.skip()
    return
  }

  const seqId = sequences[0].id
  await supabase.from('tag_rules').upsert(
    { tag: 'e2e-dedup-tag', sequence_id: seqId, is_active: true },
    { onConflict: 'tag,sequence_id' }
  )

  // Call webhook twice
  const res1 = await request.post(`${baseUrl}/api/webhook`, {
    data: { email: EMAIL_3, first_name: 'Dedup', tags: ['e2e-dedup-tag'], secret: webhookSecret },
  })
  const body1 = await res1.json()

  await request.post(`${baseUrl}/api/webhook`, {
    data: { email: EMAIL_3, first_name: 'Dedup', tags: ['e2e-dedup-tag'], secret: webhookSecret },
  })

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('id')
    .eq('contact_id', body1.contact_id)
    .eq('sequence_id', seqId)

  expect(enrollments).toHaveLength(1)

  // Cleanup tag rule
  await supabase.from('tag_rules').delete().eq('tag', 'e2e-dedup-tag')
})
