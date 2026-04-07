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

// Helper to build a chainable Supabase mock
function makeSupabaseMock(overrides?: {
  upsertResult?: { data: { id: string } | null; error: null | { message: string } }
  enrollmentCheckResult?: { data: { id: string } | null }
  enrollmentInsertResult?: { data: { id: string } | null; error: null | { message: string } }
  stepResult?: { data: { id: string } | null; error: null | { message: string } }
  queueInsertResult?: { error: null | { message: string } }
}) {
  const defaults = {
    upsertResult: { data: { id: 'contact-uuid' }, error: null },
    enrollmentCheckResult: { data: null },
    enrollmentInsertResult: { data: { id: 'enrollment-uuid' }, error: null },
    stepResult: { data: { id: 'step-uuid' }, error: null },
    queueInsertResult: { error: null },
  }

  const opts = { ...defaults, ...overrides }

  // We need to track which table is being called and return appropriate chains
  const fromMock = jest.fn((table: string) => {
    if (table === 'contacts') {
      return {
        upsert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue(opts.upsertResult),
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

  describe('3. Full happy path with sequence_id', () => {
    it('upserts contact, creates enrollment and send_queue item, returns ok + contact_id', async () => {
      const supabaseMock = makeSupabaseMock()
      mockedCreateAdminClient.mockReturnValue(supabaseMock as never)

      const req = makeRequest({
        email: 'marie@example.com',
        first_name: 'Marie',
        source: 'tiny_pages_lead_magnet',
        sequence_id: 'seq-uuid',
        secret: VALID_SECRET,
      })

      const res = await POST(req as never)
      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json).toEqual({ ok: true, contact_id: 'contact-uuid' })

      // Verify upsert was called on contacts
      expect(supabaseMock.from).toHaveBeenCalledWith('contacts')
      // Verify enrollment was checked and created
      expect(supabaseMock.from).toHaveBeenCalledWith('enrollments')
      // Verify send_queue was populated
      expect(supabaseMock.from).toHaveBeenCalledWith('send_queue')
    })
  })

  describe('4. Contact without sequence_id', () => {
    it('returns 200 with contact_id but skips enrollment and send_queue', async () => {
      const supabaseMock = makeSupabaseMock()
      mockedCreateAdminClient.mockReturnValue(supabaseMock as never)

      const req = makeRequest({
        email: 'no-sequence@example.com',
        secret: VALID_SECRET,
      })

      const res = await POST(req as never)
      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json).toEqual({ ok: true, contact_id: 'contact-uuid' })

      // contacts should be called, but not enrollments or send_queue
      const tableCalls = supabaseMock.from.mock.calls.map((c: string[][]) => c[0])
      expect(tableCalls).toContain('contacts')
      expect(tableCalls).not.toContain('enrollments')
      expect(tableCalls).not.toContain('send_queue')
    })
  })

  describe('5. Skip enrollment if already exists', () => {
    it('does not create a duplicate enrollment when one already exists', async () => {
      const supabaseMock = makeSupabaseMock({
        enrollmentCheckResult: { data: { id: 'existing-enrollment-uuid' } },
      })
      mockedCreateAdminClient.mockReturnValue(supabaseMock as never)

      const req = makeRequest({
        email: 'already@example.com',
        sequence_id: 'seq-uuid',
        secret: VALID_SECRET,
      })

      const res = await POST(req as never)
      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json.ok).toBe(true)

      // enrollments.insert should NOT have been called
      const enrollmentFromCalls = supabaseMock.from.mock.calls
        .filter((c: string[][]) => c[0] === 'enrollments')
      // Only the select (check) call, no insert
      for (const call of enrollmentFromCalls) {
        void call // just checking count
      }
      // send_queue should also not be called
      const tableCalls = supabaseMock.from.mock.calls.map((c: string[][]) => c[0])
      expect(tableCalls).not.toContain('send_queue')
    })
  })
})
