import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  // 1. Parse body
  let body: {
    email?: string
    first_name?: string
    source?: string
    sequence_id?: string
    secret?: string
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
    // 4. Upsert contact
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .upsert(
        {
          email: body.email,
          first_name: body.first_name ?? null,
          source: body.source ?? null,
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

    // 5. If sequence_id provided: check enrollment, create enrollment + send_queue item
    if (body.sequence_id) {
      // Check if enrollment already exists
      const { data: existingEnrollment } = await supabase
        .from('enrollments')
        .select('id')
        .eq('contact_id', contactId)
        .eq('sequence_id', body.sequence_id)
        .maybeSingle()

      if (!existingEnrollment) {
        // Create enrollment
        const { data: enrollment, error: enrollmentError } = await supabase
          .from('enrollments')
          .insert({
            contact_id: contactId,
            sequence_id: body.sequence_id,
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
          .eq('sequence_id', body.sequence_id)
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
      }
    }

    // 6. Return response
    return Response.json({ ok: true, contact_id: contactId })
  } catch (err) {
    return Response.json(
      { error: 'Internal server error', details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
