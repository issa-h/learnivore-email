import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  let body: { subject?: string; html_body?: string }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  if (body.subject !== undefined) updates.subject = body.subject
  if (body.html_body !== undefined) updates.html_body = body.html_body

  if (Object.keys(updates).length === 0) {
    return Response.json({ error: 'Aucun champ à mettre à jour' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('sequence_steps')
    .update(updates)
    .eq('id', id)

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ ok: true })
}
