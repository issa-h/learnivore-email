import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/ses'
import { injectTrackingPixel, rewriteLinks } from '@/lib/tracking'

export async function POST(req: NextRequest) {
  let body: {
    email: string
    tunnel_slug: string
    source?: string
    first_name?: string
    timestamp?: string
    secret?: string
  }

  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Auth
  if (body.secret !== process.env.WEBHOOK_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!body.email || !body.tunnel_slug) {
    return Response.json({ error: 'Missing required fields: email, tunnel_slug' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // 1. Lookup handoff rule
  const { data: rule, error: ruleError } = await supabase
    .from('handoff_rules')
    .select('*')
    .eq('tunnel_slug', body.tunnel_slug)
    .eq('is_active', true)
    .single()

  if (ruleError || !rule) {
    return Response.json(
      { error: `No active handoff rule for tunnel: ${body.tunnel_slug}` },
      { status: 404 }
    )
  }

  // 2. Build tags: static tags from rule + dynamic source tag
  const tags: string[] = [...(rule.tags_to_apply ?? [])]
  if (body.source && rule.source_tag_prefix) {
    tags.push(`${rule.source_tag_prefix}-${body.source}`)
  }

  // 3. Upsert contact with merged tags
  const { data: existing } = await supabase
    .from('contacts')
    .select('id, tags')
    .eq('email', body.email)
    .maybeSingle()

  const existingTags: string[] = existing?.tags ?? []
  const mergedTags = [...new Set([...existingTags, ...tags])]

  const { data: contact, error: contactError } = await supabase
    .from('contacts')
    .upsert(
      {
        email: body.email,
        first_name: body.first_name ?? null,
        source: body.source ?? body.tunnel_slug,
        tags: mergedTags,
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
  let sequenceEnrolled: string | null = null

  // 4. Enroll in sequence if defined
  if (rule.sequence_id) {
    // Check unsubscribes
    const { data: unsubs } = await supabase
      .from('unsubscribes')
      .select('id')
      .eq('contact_id', contactId)
      .or(`scope.eq.global,and(scope.eq.sequence,sequence_id.eq.${rule.sequence_id})`)
      .limit(1)

    if (unsubs && unsubs.length > 0) {
      return Response.json({
        ok: true,
        contact_id: contactId,
        tags_applied: tags,
        sequence_enrolled: null,
        skipped_reason: 'unsubscribed',
      })
    }

    // Check existing enrollment
    const { data: existingEnrollment } = await supabase
      .from('enrollments')
      .select('id')
      .eq('contact_id', contactId)
      .eq('sequence_id', rule.sequence_id)
      .maybeSingle()

    if (!existingEnrollment) {
      // Create enrollment
      const { data: enrollment, error: enrollError } = await supabase
        .from('enrollments')
        .insert({
          contact_id: contactId,
          sequence_id: rule.sequence_id,
          current_step: 1,
        })
        .select('id')
        .single()

      if (enrollError || !enrollment) {
        return Response.json(
          { error: 'Failed to create enrollment', details: enrollError?.message },
          { status: 500 }
        )
      }

      // Fetch first step
      const { data: firstStep } = await supabase
        .from('sequence_steps')
        .select('id, delay_days, subject, html_body')
        .eq('sequence_id', rule.sequence_id)
        .eq('position', 1)
        .maybeSingle()

      if (firstStep) {
        if (firstStep.delay_days === 0) {
          // J+0: send immediately
          const firstName = body.first_name || ''
          const subject = firstStep.subject.replace(/\{\{first_name\}\}/g, firstName)
          let htmlBody = firstStep.html_body.replace(/\{\{first_name\}\}/g, firstName)

          const { data: sqItem } = await supabase
            .from('send_queue')
            .insert({
              contact_id: contactId,
              sequence_step_id: firstStep.id,
              enrollment_id: enrollment.id,
              scheduled_for: new Date().toISOString(),
              status: 'pending',
            })
            .select('id')
            .single()

          if (sqItem) {
            const appUrl = process.env.APP_URL || 'https://learnivore-email.vercel.app'
            htmlBody = htmlBody.replace(/\{\{unsubscribe_url\}\}/g, `${appUrl}/api/unsubscribe?sid=${sqItem.id}`)
            htmlBody = rewriteLinks(htmlBody, sqItem.id)
            htmlBody = injectTrackingPixel(htmlBody, sqItem.id)

            try {
              const messageId = await sendEmail({ to: body.email, subject, htmlBody })
              await supabase
                .from('send_queue')
                .update({ status: 'sent', sent_at: new Date().toISOString(), ses_message_id: messageId })
                .eq('id', sqItem.id)
            } catch (err) {
              const errorMessage = err instanceof Error ? err.message : String(err)
              await supabase
                .from('send_queue')
                .update({ status: 'failed', error_message: errorMessage })
                .eq('id', sqItem.id)
            }
          }

          // Schedule next step
          const { data: nextStep } = await supabase
            .from('sequence_steps')
            .select('id, delay_days')
            .eq('sequence_id', rule.sequence_id)
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
            await supabase
              .from('enrollments')
              .update({ completed_at: new Date().toISOString() })
              .eq('id', enrollment.id)
          }
        } else {
          // J+N: queue for cron
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

      // Get sequence name for response
      const { data: seq } = await supabase
        .from('sequences')
        .select('name')
        .eq('id', rule.sequence_id)
        .single()

      sequenceEnrolled = seq?.name ?? rule.sequence_id
    }
  }

  return Response.json({
    ok: true,
    contact_id: contactId,
    tags_applied: tags,
    sequence_enrolled: sequenceEnrolled,
  })
}
