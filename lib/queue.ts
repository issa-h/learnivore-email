import { createAdminClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/ses'
import { injectTrackingPixel, rewriteLinks } from '@/lib/tracking'
import type { Contact, SequenceStep, SendQueueItem, Enrollment } from '@/types'

export async function processQueue(): Promise<{ sent: number; failed: number }> {
  const supabase = createAdminClient()
  let sent = 0
  let failed = 0

  // 1. Fetch pending items scheduled for now or earlier
  const { data: items, error: fetchError } = await supabase
    .from('send_queue')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_for', new Date().toISOString())
    .limit(50)

  if (fetchError || !items) {
    console.error('Failed to fetch send_queue:', fetchError)
    return { sent, failed }
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

      // 2b. Fetch step
      const { data: step, error: stepError } = await supabase
        .from('sequence_steps')
        .select('*')
        .eq('id', item.sequence_step_id)
        .single()

      if (stepError || !step) {
        throw new Error(`Step not found: ${item.sequence_step_id}`)
      }

      const typedContact = contact as Contact
      const typedStep = step as SequenceStep

      // 2c. Replace {{first_name}} in subject and html_body
      const firstName = typedContact.first_name || ''
      const subject = typedStep.subject.replace(/\{\{first_name\}\}/g, firstName)
      let htmlBody = typedStep.html_body.replace(/\{\{first_name\}\}/g, firstName)

      // 2d. Apply tracking transformations
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

      // 2h. Advance enrollment
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

      // Update current_step
      await supabase
        .from('enrollments')
        .update({ current_step: nextStep })
        .eq('id', item.enrollment_id)

      // Check if next step exists
      const { data: nextStepData } = await supabase
        .from('sequence_steps')
        .select('*')
        .eq('sequence_id', typedStep.sequence_id)
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
        // No next step — mark enrollment as completed
        await supabase
          .from('enrollments')
          .update({ completed_at: new Date().toISOString() })
          .eq('id', item.enrollment_id)
      }
    } catch (err) {
      console.error(`Failed to process send_queue item ${item.id}:`, err)

      await supabase
        .from('send_queue')
        .update({ status: 'failed' })
        .eq('id', item.id)

      failed++
    }
  }

  return { sent, failed }
}
