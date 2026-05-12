import { createAdminClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/ses'
import { injectTrackingPixel, rewriteLinks } from '@/lib/tracking'
import type { Contact, SequenceStep, SendQueueItem, Enrollment } from '@/types'

export async function processQueue(): Promise<{ sent: number; failed: number; skipped: number }> {
  const supabase = createAdminClient()
  let sent = 0
  let failed = 0
  let skipped = 0

  // 1. Fetch pending items scheduled for now or earlier
  const { data: items, error: fetchError } = await supabase
    .from('send_queue')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_for', new Date().toISOString())
    .limit(50)

  if (fetchError || !items) {
    console.error('Failed to fetch send_queue:', fetchError)
    return { sent, failed, skipped }
  }

  for (const item of items as SendQueueItem[]) {
    try {
      // 2a. Fetch contact
      const { data: contact, error: contactError } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', item.contact_id)
        .single()

      if (contactError || !contact) {
        throw new Error(`Contact not found: ${item.contact_id}`)
      }

      const typedContact = contact as Contact

      // 2b. Check unsubscribes
      const sequenceId = item.sequence_step_id
        ? (await supabase.from('sequence_steps').select('sequence_id').eq('id', item.sequence_step_id).single()).data?.sequence_id
        : null

      const { data: unsubs } = await supabase
        .from('unsubscribes')
        .select('id, scope')
        .eq('contact_id', item.contact_id)
        .or(
          sequenceId
            ? `scope.eq.global,and(scope.eq.sequence,sequence_id.eq.${sequenceId})`
            : 'scope.eq.global'
        )
        .limit(1)

      if (unsubs && unsubs.length > 0) {
        await supabase
          .from('send_queue')
          .update({ status: 'skipped', error_message: `Unsubscribed (${unsubs[0].scope})` })
          .eq('id', item.id)
        skipped++
        continue
      }

      // 2c. Determine subject and body (sequence step or broadcast)
      let subject: string
      let htmlBody: string

      if (item.broadcast_id) {
        // Broadcast send
        const { data: broadcast, error: broadcastError } = await supabase
          .from('broadcasts')
          .select('subject, html_body')
          .eq('id', item.broadcast_id)
          .single()

        if (broadcastError || !broadcast) {
          throw new Error(`Broadcast not found: ${item.broadcast_id}`)
        }

        const firstName = typedContact.first_name || ''
        subject = broadcast.subject.replace(/\{\{first_name\}\}/g, firstName)
        htmlBody = broadcast.html_body.replace(/\{\{first_name\}\}/g, firstName)
      } else {
        // Sequence step send
        const { data: step, error: stepError } = await supabase
          .from('sequence_steps')
          .select('*')
          .eq('id', item.sequence_step_id)
          .single()

        if (stepError || !step) {
          throw new Error(`Step not found: ${item.sequence_step_id}`)
        }

        const typedStep = step as SequenceStep
        const firstName = typedContact.first_name || ''
        subject = typedStep.subject.replace(/\{\{first_name\}\}/g, firstName)
        htmlBody = typedStep.html_body.replace(/\{\{first_name\}\}/g, firstName)
      }

      // 2d. Replace unsubscribe URL
      const appUrl = process.env.APP_URL || 'https://learnivore-email.vercel.app'
      const unsubscribeUrl = `${appUrl}/api/unsubscribe?sid=${item.id}`
      htmlBody = htmlBody.replace(/\{\{unsubscribe_url\}\}/g, unsubscribeUrl)

      // 2e. Apply tracking transformations
      htmlBody = rewriteLinks(htmlBody, item.id)
      htmlBody = injectTrackingPixel(htmlBody, item.id)

      // 2e. Send email
      const messageId = await sendEmail({
        to: typedContact.email,
        subject,
        htmlBody,
      })

      // 2f. Mark as sent
      await supabase
        .from('send_queue')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          ses_message_id: messageId,
        })
        .eq('id', item.id)

      sent++

      // 2g. Advance enrollment (only for sequence sends)
      if (item.enrollment_id) {
        const { data: enrollment, error: enrollmentError } = await supabase
          .from('enrollments')
          .select('*')
          .eq('id', item.enrollment_id)
          .single()

        if (enrollmentError || !enrollment) {
          console.error('Enrollment not found:', item.enrollment_id)
          continue
        }

        const typedEnrollment = enrollment as Enrollment
        const nextStep = typedEnrollment.current_step + 1

        await supabase
          .from('enrollments')
          .update({ current_step: nextStep })
          .eq('id', item.enrollment_id)

        // Fetch the step to get sequence_id for next step lookup
        const { data: currentStep } = await supabase
          .from('sequence_steps')
          .select('sequence_id')
          .eq('id', item.sequence_step_id)
          .single()

        if (currentStep) {
          const { data: nextStepData } = await supabase
            .from('sequence_steps')
            .select('*')
            .eq('sequence_id', currentStep.sequence_id)
            .eq('position', nextStep)
            .single()

          if (nextStepData) {
            const typedNextStep = nextStepData as SequenceStep
            const scheduledFor = new Date()
            scheduledFor.setDate(scheduledFor.getDate() + typedNextStep.delay_days)

            await supabase.from('send_queue').insert({
              contact_id: item.contact_id,
              sequence_step_id: typedNextStep.id,
              enrollment_id: item.enrollment_id,
              scheduled_for: scheduledFor.toISOString(),
              status: 'pending',
            })
          } else {
            await supabase
              .from('enrollments')
              .update({ completed_at: new Date().toISOString() })
              .eq('id', item.enrollment_id)
          }
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      console.error(`Failed to process send_queue item ${item.id}:`, err)

      await supabase
        .from('send_queue')
        .update({ status: 'failed', error_message: errorMessage })
        .eq('id', item.id)

      failed++
    }
  }

  return { sent, failed, skipped }
}
