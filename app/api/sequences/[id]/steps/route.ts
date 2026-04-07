import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sequence_id } = await params
  let body: { subject?: string; delay_days?: number }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.subject?.trim()) {
    return Response.json({ error: 'Le sujet est requis' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Get current max position
  const { data: existing } = await supabase
    .from('sequence_steps')
    .select('position')
    .eq('sequence_id', sequence_id)
    .order('position', { ascending: false })
    .limit(1)

  const nextPosition = existing && existing.length > 0 ? existing[0].position + 1 : 1

  const { data, error } = await supabase
    .from('sequence_steps')
    .insert({
      sequence_id,
      subject: body.subject.trim(),
      delay_days: body.delay_days ?? 1,
      position: nextPosition,
      html_body: '',
    })
    .select('id, sequence_id, position, delay_days, subject, html_body, created_at')
    .single()

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json(data, { status: 201 })
}
