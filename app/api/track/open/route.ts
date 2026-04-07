import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const sid = req.nextUrl.searchParams.get('sid')

  if (sid) {
    // Fire and forget — don't await
    void (async () => {
      try {
        const supabase = createAdminClient()

        const { data: queueItem } = await supabase
          .from('send_queue')
          .select('contact_id, sequence_step_id')
          .eq('id', sid)
          .single()

        if (queueItem) {
          await supabase.from('email_events').insert({
            send_queue_id: sid,
            contact_id: queueItem.contact_id,
            sequence_step_id: queueItem.sequence_step_id,
            event_type: 'open',
            url: null,
            occurred_at: new Date().toISOString(),
            ip: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip'),
            user_agent: req.headers.get('user-agent'),
          })
        }
      } catch (err) {
        console.error('Failed to track open event:', err)
      }
    })()
  }

  // Return 1x1 transparent GIF
  const pixel = Buffer.from(
    'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    'base64'
  )

  return new Response(pixel, {
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  })
}
