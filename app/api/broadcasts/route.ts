import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createAdminClient()

  let body: {
    subject: string
    html_body: string
    segment_tags_include?: string[]
    segment_tags_exclude?: string[]
    scheduled_for?: string
    spread_over_hours?: number
  }

  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.subject || !body.html_body) {
    return Response.json({ error: 'Missing required fields: subject, html_body' }, { status: 400 })
  }

  const tagsInclude = body.segment_tags_include ?? []
  const tagsExclude = body.segment_tags_exclude ?? []

  // 1. Create the broadcast record
  const { data: broadcast, error: broadcastError } = await supabase
    .from('broadcasts')
    .insert({
      subject: body.subject,
      html_body: body.html_body,
      segment_tags_include: tagsInclude,
      segment_tags_exclude: tagsExclude,
      status: 'scheduled',
      scheduled_for: body.scheduled_for ?? new Date().toISOString(),
    })
    .select()
    .single()

  if (broadcastError || !broadcast) {
    return Response.json(
      { error: 'Failed to create broadcast', details: broadcastError?.message },
      { status: 500 }
    )
  }

  // 2. Resolve segment: contacts matching include tags and NOT matching exclude tags
  let query = supabase.from('contacts').select('id')

  // Include: contact must have ALL include tags
  for (const tag of tagsInclude) {
    query = query.contains('tags', [tag])
  }

  // Exclude: filter out contacts with ANY exclude tag
  // Supabase doesn't have a native "not overlaps", so we fetch and filter
  const { data: candidates, error: segmentError } = await query

  if (segmentError) {
    return Response.json(
      { error: 'Failed to resolve segment', details: segmentError.message },
      { status: 500 }
    )
  }

  let contactIds = (candidates ?? []).map((c: { id: string }) => c.id)

  // Apply exclusion: remove contacts that have any excluded tag
  if (tagsExclude.length > 0 && contactIds.length > 0) {
    const { data: excluded } = await supabase
      .from('contacts')
      .select('id')
      .in('id', contactIds)
      .overlaps('tags', tagsExclude)

    const excludedIds = new Set((excluded ?? []).map((c: { id: string }) => c.id))
    contactIds = contactIds.filter((id: string) => !excludedIds.has(id))
  }

  // Also exclude globally unsubscribed contacts
  if (contactIds.length > 0) {
    const { data: unsubs } = await supabase
      .from('unsubscribes')
      .select('contact_id')
      .eq('scope', 'global')
      .in('contact_id', contactIds)

    const unsubIds = new Set((unsubs ?? []).map((u: { contact_id: string }) => u.contact_id))
    contactIds = contactIds.filter((id: string) => !unsubIds.has(id))
  }

  if (contactIds.length === 0) {
    await supabase
      .from('broadcasts')
      .update({ status: 'sent', total_recipients: 0, sent_at: new Date().toISOString() })
      .eq('id', broadcast.id)

    return Response.json({ broadcast_id: broadcast.id, recipients: 0 })
  }

  // 3. Insert send_queue items
  const baseTime = body.scheduled_for ? new Date(body.scheduled_for) : new Date()
  const spreadMs = (body.spread_over_hours ?? 0) * 60 * 60 * 1000

  const queueItems = contactIds.map((contactId: string, i: number) => {
    const offset = spreadMs > 0 ? (spreadMs / contactIds.length) * i : 0
    const scheduledFor = new Date(baseTime.getTime() + offset)

    return {
      contact_id: contactId,
      broadcast_id: broadcast.id,
      scheduled_for: scheduledFor.toISOString(),
      status: 'pending',
    }
  })

  // Insert in batches of 500
  for (let i = 0; i < queueItems.length; i += 500) {
    const batch = queueItems.slice(i, i + 500)
    const { error: insertError } = await supabase.from('send_queue').insert(batch)
    if (insertError) {
      return Response.json(
        { error: 'Failed to queue broadcast emails', details: insertError.message },
        { status: 500 }
      )
    }
  }

  // 4. Update broadcast with recipient count
  await supabase
    .from('broadcasts')
    .update({ total_recipients: contactIds.length, status: 'sending' })
    .eq('id', broadcast.id)

  return Response.json({
    broadcast_id: broadcast.id,
    recipients: contactIds.length,
    spread_over_hours: body.spread_over_hours ?? 0,
  })
}
