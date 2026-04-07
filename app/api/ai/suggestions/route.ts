import { createAdminClient } from '@/lib/supabase/server'
import { generateSuggestions } from '@/lib/ai'

export async function POST() {
  const supabase = createAdminClient()

  // 1. Fetch all sent queue items with their step info
  const { data: sentItems } = await supabase
    .from('send_queue')
    .select('id, sequence_step_id')
    .eq('status', 'sent')

  if (!sentItems || sentItems.length === 0) {
    return Response.json({ error: 'Aucun email envoyé pour analyser.' }, { status: 400 })
  }

  // 2. Count opens per step
  const stepSentCounts: Record<string, number> = {}
  for (const item of sentItems) {
    stepSentCounts[item.sequence_step_id] = (stepSentCounts[item.sequence_step_id] ?? 0) + 1
  }

  const sentQueueIds = sentItems.map((i) => i.id)

  const { data: openEvents } = await supabase
    .from('email_events')
    .select('send_queue_id, sequence_step_id')
    .eq('event_type', 'open')
    .in('send_queue_id', sentQueueIds)

  // 3. Deduplicate opens per (send_queue_id)
  const uniqueOpens = new Set(openEvents?.map((e) => e.send_queue_id) ?? [])

  // Count unique opens per step
  const stepOpenCounts: Record<string, number> = {}
  for (const event of openEvents ?? []) {
    if (uniqueOpens.has(event.send_queue_id)) {
      const key = `${event.sequence_step_id}:${event.send_queue_id}`
      if (!stepOpenCounts[`_seen_${key}`]) {
        stepOpenCounts[event.sequence_step_id] = (stepOpenCounts[event.sequence_step_id] ?? 0) + 1
        stepOpenCounts[`_seen_${key}`] = 1
      }
    }
  }

  // 4. Find best performing step
  let bestStepId: string | null = null
  let bestOpenRate = 0

  for (const [stepId, sent] of Object.entries(stepSentCounts)) {
    if (stepId.startsWith('_seen_')) continue
    const opens = stepOpenCounts[stepId] ?? 0
    const rate = sent > 0 ? opens / sent : 0
    if (rate > bestOpenRate) {
      bestOpenRate = rate
      bestStepId = stepId
    }
  }

  if (!bestStepId) {
    return Response.json({ error: 'Impossible de trouver un step performant.' }, { status: 400 })
  }

  // 5. Fetch the step data
  const { data: step } = await supabase
    .from('sequence_steps')
    .select('id, sequence_id, subject, html_body')
    .eq('id', bestStepId)
    .single()

  if (!step) {
    return Response.json({ error: 'Step introuvable.' }, { status: 404 })
  }

  const openRatePercent = Math.round(bestOpenRate * 100)

  // 6. Build Claude prompt
  const prompt = `Tu es un expert en email marketing pour une audience d'étudiants francophones.

Voici un email qui a bien performé (taux d'ouverture : ${openRatePercent}%) :
Sujet : ${step.subject}
Contenu : ${step.html_body}

Génère 1 ou 2 variations de cet email qui pourraient performer encore mieux.
Pour chaque suggestion, donne :
- Un nouveau sujet
- Un nouveau contenu HTML (même style, même longueur)
- Une phrase d'explication de pourquoi cette variante pourrait mieux marcher

Réponds en JSON avec ce format :
[{ "subject": "...", "body": "...", "reasoning": "..." }]`

  // 7. Call Claude
  let rawResponse: string
  try {
    rawResponse = await generateSuggestions(prompt)
  } catch {
    return Response.json({ error: 'Erreur lors de la génération IA.' }, { status: 500 })
  }

  // 8. Parse JSON from response
  let suggestions: { subject: string; body: string; reasoning: string }[]
  try {
    const jsonMatch = rawResponse.match(/\[[\s\S]*\]/)
    if (!jsonMatch) throw new Error('No JSON array found')
    suggestions = JSON.parse(jsonMatch[0])
  } catch {
    return Response.json({ error: 'Réponse IA invalide.', raw: rawResponse }, { status: 500 })
  }

  // 9. Insert suggestions into ai_suggestions
  const insertPayload = suggestions.map((s) => ({
    suggestion_type: 'new_email' as const,
    source_step_id: step.id,
    suggested_subject: s.subject,
    suggested_body: s.body,
    reasoning: s.reasoning,
    status: 'pending' as const,
  }))

  const { data: created, error: insertError } = await supabase
    .from('ai_suggestions')
    .insert(insertPayload)
    .select()

  if (insertError) {
    return Response.json({ error: insertError.message }, { status: 500 })
  }

  return Response.json({ suggestions: created })
}
