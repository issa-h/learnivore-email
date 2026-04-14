import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  let body: { tag?: string; sequence_id?: string }

  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.tag || !body.sequence_id) {
    return Response.json({ error: 'Missing required fields: tag, sequence_id' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('tag_rules')
    .insert({
      tag: body.tag,
      sequence_id: body.sequence_id,
      is_active: true,
    })
    .select('*')
    .single()

  if (error || !data) {
    return Response.json(
      { error: 'Failed to create tag rule', details: error?.message },
      { status: 500 }
    )
  }

  return Response.json(data, { status: 201 })
}
