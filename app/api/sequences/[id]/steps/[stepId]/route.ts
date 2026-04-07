import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  const { stepId } = await params
  let body: { subject?: string; delay_days?: number; position?: number }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  if (body.subject !== undefined) updates.subject = body.subject
  if (body.delay_days !== undefined) updates.delay_days = body.delay_days
  if (body.position !== undefined) updates.position = body.position

  if (Object.keys(updates).length === 0) {
    return Response.json({ error: 'Aucun champ à mettre à jour' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('sequence_steps')
    .update(updates)
    .eq('id', stepId)

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ ok: true })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  const { stepId } = await params
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('sequence_steps')
    .delete()
    .eq('id', stepId)

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ ok: true })
}
