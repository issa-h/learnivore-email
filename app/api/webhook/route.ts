import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/ses'
import { injectTrackingPixel, rewriteLinks } from '@/lib/tracking'

export async function POST(req: NextRequest) {
  // 1. Parse body
  let body: {
    email?: string
    first_name?: string
    tag?: string
    tags?: string[]
    secret?: string
    utms?: string[]
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
      .select('id, tags, utms')
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

    // 5. Upsert contact with merged tags + UTMs
    const existingUtms: string[] = (existingContact as any)?.utms ?? []
    const incomingUtms: string[] = body.utms ?? []
    const mergedUtms = [...new Set([...existingUtms, ...incomingUtms])]

    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .upsert(
        {
          email: body.email,
          first_name: body.first_name ?? null,
          tags: mergedTags,
          utms: mergedUtms,
        },
        { onConflict: 'email' }
      )
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
            .select('id, delay_days, subject, html_body')
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
            if (firstStep.delay_days === 0) {
              // J+0 → envoi immédiat, pas de queue
              const firstName = body.first_name || ''
              const subject = firstStep.subject.replace(/\{\{first_name\}\}/g, firstName)
              let htmlBody = firstStep.html_body.replace(/\{\{first_name\}\}/g, firstName)

              // Create send_queue entry for tracking
              const { data: sqItem } = await supabase.from('send_queue').insert({
                contact_id: contactId,
                sequence_step_id: firstStep.id,
                enrollment_id: enrollment.id,
                scheduled_for: new Date().toISOString(),
                status: 'pending',
              }).select('id').single()

              if (sqItem) {
                htmlBody = rewriteLinks(htmlBody, sqItem.id)
                htmlBody = injectTrackingPixel(htmlBody, sqItem.id)

                try {
                  const messageId = await sendEmail({ to: body.email!, subject, htmlBody })
                  await supabase.from('send_queue').update({
                    status: 'sent',
                    sent_at: new Date().toISOString(),
                    ses_message_id: messageId,
                  }).eq('id', sqItem.id)
                } catch {
                  await supabase.from('send_queue').update({ status: 'failed' }).eq('id', sqItem.id)
                }
              }

              // Schedule next step if exists
              const { data: nextStep } = await supabase
                .from('sequence_steps')
                .select('id, delay_days')
                .eq('sequence_id', sequenceId)
                .eq('position', 2)
                .maybeSingle()

              if (nextStep) {
                const scheduledFor = new Date()
                scheduledFor.setDate(scheduledFor.getDate() + nextStep.delay_days)
                await supabase.from('send_queue').insert({
                  contact_id: contactId,
                  sequence_step_id: nextStep.id,
                  enrollment_id: enrollment.id,
                  scheduled_for: scheduledFor.toISOString(),
                  status: 'pending',
                })
                await supabase.from('enrollments').update({ current_step: 2 }).eq('id', enrollment.id)
              } else {
                await supabase.from('enrollments').update({ completed_at: new Date().toISOString() }).eq('id', enrollment.id)
              }
            } else {
              // J+1 ou plus → mettre en queue pour le cron
              const scheduledFor = new Date()
              scheduledFor.setDate(scheduledFor.getDate() + firstStep.delay_days)
              await supabase.from('send_queue').insert({
                contact_id: contactId,
                sequence_step_id: firstStep.id,
                enrollment_id: enrollment.id,
                scheduled_for: scheduledFor.toISOString(),
                status: 'pending',
              })
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
