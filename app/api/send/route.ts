import { NextRequest, NextResponse } from 'next/server'
import { processQueue } from '@/lib/queue'

export const dynamic = 'force-dynamic'

async function handle(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const result = await processQueue()
  return NextResponse.json(result)
}

export const GET = handle
export const POST = handle
