import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { isBot } from '@/lib/tracking-filter'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const sid = req.nextUrl.searchParams.get('sid')

  if (sid) {
    const userAgent = req.headers.get('user-agent')

    // Skip bots
    if (!isBot(userAgent)) {
      try {
        const supabase = createAdminClient()

        const { data: queueItem } = await supabase
          .from('send_queue')
          .select('contact_id, sequence_step_id')
          .eq('id', sid)
          .single()

        if (queueItem) {
          // Check for duplicate open within 5 seconds
          const { data: recent } = await supabase
            .from('email_events')
            .select('id')
            .eq('send_queue_id', sid)
            .eq('event_type', 'open')
            .gte('occurred_at', new Date(Date.now() - 5000).toISOString())
            .limit(1)

          if (!recent || recent.length === 0) {
            await supabase.from('email_events').insert({
              send_queue_id: sid,
              contact_id: queueItem.contact_id,
              sequence_step_id: queueItem.sequence_step_id,
              event_type: 'open',
              url: null,
              occurred_at: new Date().toISOString(),
              ip: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip'),
              user_agent: userAgent,
            })
          }
        }
      } catch (err) {
        console.error('Failed to track open event:', err)
      }
    }
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
