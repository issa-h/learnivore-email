import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  // 1. Parse body
  let body: {
    email?: string
    first_name?: string
    tag?: string
    tags?: string[]
    secret?: string
    utm_source?: string
    utm_medium?: string
    utm_campaign?: string
    utm_content?: string
    utm_term?: string
  }

  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // 2. Validate secret
  if (body.secret !== process.env.WEBHOOK_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 3. Validate email
  if (!body.email) {
    return Response.json({ error: 'Missing required field: email' }, { status: 400 })
  }

  const supabase = createAdminClient()

  try {
    // 4. Get existing contact to merge tags
    const { data: existingContact } = await supabase
      .from('contacts')
      .select('id, tags')
      .eq('email', body.email)
      .maybeSingle()

    const existingTags: string[] = existingContact?.tags ?? []
    // Support both `tag` (string) and `tags` (string[])
    const incomingTags: string[] = body.tags
      ? body.tags
      : body.tag
        ? [body.tag]
        : []
    const mergedTags = [...new Set([...existingTags, ...incomingTags])]

    // 5. Upsert contact with merged tags + UTMs (only set UTMs on first insert, don't overwrite)
    const upsertData: Record<string, unknown> = {
      email: body.email,
      first_name: body.first_name ?? null,
      tags: mergedTags,
    }

    // Only set UTMs if contact is new (don't overwrite existing UTMs)
    if (!existingContact) {
      if (body.utm_source) upsertData.utm_source = body.utm_source
      if (body.utm_medium) upsertData.utm_medium = body.utm_medium
      if (body.utm_campaign) upsertData.utm_campaign = body.utm_campaign
      if (body.utm_content) upsertData.utm_content = body.utm_content
      if (body.utm_term) upsertData.utm_term = body.utm_term
    }

    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .upsert(upsertData, { onConflict: 'email' })
      .select('id')
      .single()

    if (contactError || !contact) {
      return Response.json(
        { error: 'Failed to upsert contact', details: contactError?.message },
        { status: 500 }
      )
    }

    const contactId: string = contact.id

    // 6. If tags provided: query matching tag_rules for ALL tags
    if (incomingTags.length > 0) {
      const { data: tagRules, error: rulesError } = await supabase
        .from('tag_rules')
        .select('id, sequence_id, sequences(name)')
        .in('tag', incomingTags)
        .eq('is_active', true)

      if (rulesError) {
        return Response.json(
          { error: 'Failed to query tag_rules', details: rulesError.message },
          { status: 500 }
        )
      }

      const sequencesEnrolled: string[] = []

      for (const rule of tagRules ?? []) {
        const sequenceId: string = rule.sequence_id
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sequenceName: string = (rule.sequences as any)?.name ?? sequenceId

        // Check if enrollment already exists
        const { data: existingEnrollment } = await supabase
          .from('enrollments')
          .select('id')
          .eq('contact_id', contactId)
          .eq('sequence_id', sequenceId)
          .maybeSingle()

        if (!existingEnrollment) {
          // Create enrollment
          const { data: enrollment, error: enrollmentError } = await supabase
            .from('enrollments')
            .insert({
              contact_id: contactId,
              sequence_id: sequenceId,
              current_step: 1,
            })
            .select('id')
            .single()

          if (enrollmentError || !enrollment) {
            return Response.json(
              { error: 'Failed to create enrollment', details: enrollmentError?.message },
              { status: 500 }
            )
          }

          // Fetch the first step of the sequence (position = 1)
          const { data: firstStep, error: stepError } = await supabase
            .from('sequence_steps')
            .select('id')
            .eq('sequence_id', sequenceId)
            .eq('position', 1)
            .maybeSingle()

          if (stepError) {
            return Response.json(
              { error: 'Failed to fetch sequence step', details: stepError.message },
              { status: 500 }
            )
          }

          if (firstStep) {
            // Insert send_queue item
            const { error: queueError } = await supabase.from('send_queue').insert({
              contact_id: contactId,
              sequence_step_id: firstStep.id,
              enrollment_id: enrollment.id,
              scheduled_for: new Date().toISOString(),
              status: 'pending',
            })

            if (queueError) {
              return Response.json(
                { error: 'Failed to insert into send_queue', details: queueError.message },
                { status: 500 }
              )
            }
          }

          sequencesEnrolled.push(sequenceName)
        }
      }

      return Response.json({ ok: true, contact_id: contactId, sequences_enrolled: sequencesEnrolled })
    }

    // 7. No tag: just return contact
    return Response.json({ ok: true, contact_id: contactId, sequences_enrolled: [] })
  } catch (err) {
    return Response.json(
      { error: 'Internal server error', details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
