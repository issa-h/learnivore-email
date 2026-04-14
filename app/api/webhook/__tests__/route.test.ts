import { POST } from '../route'

// Mock createAdminClient from lib/supabase/server
jest.mock('@/lib/supabase/server', () => ({
  createAdminClient: jest.fn(),
}))

import { createAdminClient } from '@/lib/supabase/server'

const mockedCreateAdminClient = createAdminClient as jest.MockedFunction<typeof createAdminClient>

// Helper to build a mock NextRequest
function makeRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost/api/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// Helper to build a chainable Supabase mock for the new tag-based flow
function makeSupabaseMock(overrides?: {
  existingContactResult?: { data: { id: string; tags: string[] } | null }
  upsertResult?: { data: { id: string } | null; error: null | { message: string } }
  tagRulesResult?: {
    data: { id: string; sequence_id: string; sequences: { name: string } }[] | null
    error: null | { message: string }
  }
  enrollmentCheckResult?: { data: { id: string } | null }
  enrollmentInsertResult?: { data: { id: string } | null; error: null | { message: string } }
  stepResult?: { data: { id: string } | null; error: null | { message: string } }
  queueInsertResult?: { error: null | { message: string } }
}) {
  const defaults = {
    existingContactResult: { data: null },
    upsertResult: { data: { id: 'contact-uuid' }, error: null },
    tagRulesResult: {
      data: [{ id: 'rule-uuid', sequence_id: 'seq-uuid', sequences: { name: 'Welcome' } }],
      error: null,
    },
    enrollmentCheckResult: { data: null },
    enrollmentInsertResult: { data: { id: 'enrollment-uuid' }, error: null },
    stepResult: { data: { id: 'step-uuid' }, error: null },
    queueInsertResult: { error: null },
  }

  const opts = { ...defaults, ...overrides }

  const fromMock = jest.fn((table: string) => {
    if (table === 'contacts') {
      return {
        // For the initial get-existing-contact query
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue(opts.existingContactResult),
          }),
        }),
        // For the upsert
        upsert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue(opts.upsertResult),
          }),
        }),
      }
    }
    if (table === 'tag_rules') {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue(opts.tagRulesResult),
          }),
        }),
      }
    }
    if (table === 'enrollments') {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue(opts.enrollmentCheckResult),
            }),
          }),
        }),
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue(opts.enrollmentInsertResult),
          }),
        }),
      }
    }
    if (table === 'sequence_steps') {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue(opts.stepResult),
            }),
          }),
        }),
      }
    }
    if (table === 'send_queue') {
      return {
        insert: jest.fn().mockResolvedValue(opts.queueInsertResult),
      }
    }
    return {}
  })

  return { from: fromMock }
}

// Set a valid WEBHOOK_SECRET env var for tests
const VALID_SECRET = 'test-secret-123'

beforeEach(() => {
  process.env.WEBHOOK_SECRET = VALID_SECRET
  jest.clearAllMocks()
})

describe('POST /api/webhook', () => {
  describe('1. Authentication', () => {
    it('returns 401 if secret is invalid', async () => {
      const req = makeRequest({
        email: 'test@example.com',
        secret: 'wrong-secret',
      })

      const res = await POST(req as never)
      expect(res.status).toBe(401)

      const json = await res.json()
      expect(json).toEqual({ error: 'Unauthorized' })
    })

    it('returns 401 if secret is missing', async () => {
      const req = makeRequest({ email: 'test@example.com' })

      const res = await POST(req as never)
      expect(res.status).toBe(401)

      const json = await res.json()
      expect(json.error).toBe('Unauthorized')
    })
  })

  describe('2. Validation', () => {
    it('returns 400 if email is absent', async () => {
      const req = makeRequest({ secret: VALID_SECRET })

      const res = await POST(req as never)
      expect(res.status).toBe(400)

      const json = await res.json()
      expect(json.error).toMatch(/email/i)
    })
  })

  describe('3. Full happy path with tag', () => {
    it('upserts contact, queries tag_rules, creates enrollment and send_queue item, returns ok + contact_id + sequences_enrolled', async () => {
      const supabaseMock = makeSupabaseMock()
      mockedCreateAdminClient.mockReturnValue(supabaseMock as never)

      const req = makeRequest({
        email: 'marie@example.com',
        first_name: 'Marie',
        tag: 'lead_magnet',
        secret: VALID_SECRET,
      })

      const res = await POST(req as never)
      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json.ok).toBe(true)
      expect(json.contact_id).toBe('contact-uuid')
      expect(json.sequences_enrolled).toEqual(['Welcome'])

      // Verify contacts was queried and upserted
      expect(supabaseMock.from).toHaveBeenCalledWith('contacts')
      // Verify tag_rules was queried
      expect(supabaseMock.from).toHaveBeenCalledWith('tag_rules')
      // Verify enrollment was checked and created
      expect(supabaseMock.from).toHaveBeenCalledWith('enrollments')
      // Verify send_queue was populated
      expect(supabaseMock.from).toHaveBeenCalledWith('send_queue')
    })
  })

  describe('4. Multiple tag_rules trigger multiple enrollments', () => {
    it('enrolls contact in all sequences matching the tag', async () => {
      const supabaseMock = makeSupabaseMock({
        tagRulesResult: {
          data: [
            { id: 'rule-1', sequence_id: 'seq-1', sequences: { name: 'Welcome' } },
            { id: 'rule-2', sequence_id: 'seq-2', sequences: { name: 'Onboarding' } },
          ],
          error: null,
        },
        enrollmentInsertResult: { data: { id: 'enrollment-uuid' }, error: null },
      })
      mockedCreateAdminClient.mockReturnValue(supabaseMock as never)

      const req = makeRequest({
        email: 'multi@example.com',
        tag: 'new_user',
        secret: VALID_SECRET,
      })

      const res = await POST(req as never)
      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json.ok).toBe(true)
      expect(json.sequences_enrolled).toEqual(['Welcome', 'Onboarding'])

      // Enrollment should have been created twice
      const enrollmentCalls = supabaseMock.from.mock.calls.filter(
        (c: string[][]) => c[0] === 'enrollments'
      )
      expect(enrollmentCalls.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('5. Contact without tag', () => {
    it('returns 200 with contact_id but skips tag_rules and enrollment', async () => {
      const supabaseMock = makeSupabaseMock()
      mockedCreateAdminClient.mockReturnValue(supabaseMock as never)

      const req = makeRequest({
        email: 'no-tag@example.com',
        secret: VALID_SECRET,
      })

      const res = await POST(req as never)
      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json.ok).toBe(true)
      expect(json.contact_id).toBe('contact-uuid')
      expect(json.sequences_enrolled).toEqual([])

      // contacts should be called, but not tag_rules or enrollments
      const tableCalls = supabaseMock.from.mock.calls.map((c: string[][]) => c[0])
      expect(tableCalls).toContain('contacts')
      expect(tableCalls).not.toContain('tag_rules')
      expect(tableCalls).not.toContain('enrollments')
      expect(tableCalls).not.toContain('send_queue')
    })
  })

  describe('6. Skip enrollment if already exists', () => {
    it('does not create a duplicate enrollment when one already exists', async () => {
      const supabaseMock = makeSupabaseMock({
        enrollmentCheckResult: { data: { id: 'existing-enrollment-uuid' } },
      })
      mockedCreateAdminClient.mockReturnValue(supabaseMock as never)

      const req = makeRequest({
        email: 'already@example.com',
        tag: 'lead_magnet',
        secret: VALID_SECRET,
      })

      const res = await POST(req as never)
      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json.ok).toBe(true)
      // No new enrollments since one already exists
      expect(json.sequences_enrolled).toEqual([])

      // send_queue should not be called
      const tableCalls = supabaseMock.from.mock.calls.map((c: string[][]) => c[0])
      expect(tableCalls).not.toContain('send_queue')
    })
  })
})
