import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createAdminClient()

  let body: { action: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Corps de requête invalide.' }, { status: 400 })
  }

  const { action } = body

  if (action !== 'approve' && action !== 'dismiss') {
    return Response.json({ error: 'Action invalide. Valeurs acceptées : approve, dismiss.' }, { status: 400 })
  }

  if (action === 'dismiss') {
    const { error } = await supabase
      .from('ai_suggestions')
      .update({ status: 'dismissed' })
      .eq('id', id)

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true })
  }

  // action === 'approve'
  // Fetch the suggestion
  const { data: suggestion, error: fetchError } = await supabase
    .from('ai_suggestions')
    .select('id, source_step_id, suggested_subject, suggested_body')
    .eq('id', id)
    .single()

  if (fetchError || !suggestion) {
    return Response.json({ error: 'Suggestion introuvable.' }, { status: 404 })
  }

  // Get the source step to find the sequence_id
  const { data: sourceStep, error: stepError } = await supabase
    .from('sequence_steps')
    .select('sequence_id, delay_days')
    .eq('id', suggestion.source_step_id)
    .single()

  if (stepError || !sourceStep) {
    return Response.json({ error: 'Step source introuvable.' }, { status: 404 })
  }

  // Find the max position in that sequence to append at the end
  const { data: lastStep } = await supabase
    .from('sequence_steps')
    .select('position')
    .eq('sequence_id', sourceStep.sequence_id)
    .order('position', { ascending: false })
    .limit(1)
    .single()

  const nextPosition = lastStep ? lastStep.position + 1 : 1

  // Create new sequence_step
  const { error: createError } = await supabase
    .from('sequence_steps')
    .insert({
      sequence_id: sourceStep.sequence_id,
      position: nextPosition,
      delay_days: sourceStep.delay_days,
      subject: suggestion.suggested_subject ?? '',
      html_body: suggestion.suggested_body ?? '',
    })

  if (createError) {
    return Response.json({ error: createError.message }, { status: 500 })
  }

  // Mark suggestion as approved
  const { error: updateError } = await supabase
    .from('ai_suggestions')
    .update({ status: 'approved' })
    .eq('id', id)

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 })
  }

  return Response.json({ ok: true })
}
