export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { Sequence, SequenceStep } from '@/types'
import SequenceEditor from '@/components/sequences/SequenceEditor'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('sequences')
    .select('name')
    .eq('id', id)
    .single()
  return { title: data ? `${data.name} — Learnivore Email` : 'Séquence' }
}

export default async function SequenceEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = createAdminClient()

  const [{ data: seqData, error: seqError }, { data: stepsData }] =
    await Promise.all([
      supabase.from('sequences').select('*').eq('id', id).single(),
      supabase
        .from('sequence_steps')
        .select('*')
        .eq('sequence_id', id)
        .order('position', { ascending: true }),
    ])

  if (seqError || !seqData) {
    notFound()
  }

  const sequence: Sequence = seqData
  const steps: SequenceStep[] = stepsData ?? []

  // Calculate per-step stats
  const stepStats: Record<string, { sent: number; openRate: number | null; clickRate: number | null }> = {}

  for (const step of steps) {
    // Sent count
    const { count: sentCount } = await supabase
      .from('send_queue')
      .select('id', { count: 'exact', head: true })
      .eq('sequence_step_id', step.id)
      .eq('status', 'sent')

    const sent = (sentCount ?? 0) + ((step as any).total_sent ?? 0)

    // Opens (unique per send_queue_id)
    const { data: openEvents } = await supabase
      .from('email_events')
      .select('send_queue_id')
      .eq('event_type', 'open')
      .eq('sequence_step_id', step.id)

    const uniqueOpens = new Set(openEvents?.map((e) => e.send_queue_id) ?? []).size
    const totalOpens = uniqueOpens + ((step as any).total_opens ?? 0)

    // Clicks (unique per send_queue_id)
    const { data: clickEvents } = await supabase
      .from('email_events')
      .select('send_queue_id')
      .eq('event_type', 'click')
      .eq('sequence_step_id', step.id)

    const uniqueClicks = new Set(clickEvents?.map((e) => e.send_queue_id) ?? []).size
    const totalClicks = uniqueClicks + ((step as any).total_clicks ?? 0)

    stepStats[step.id] = {
      sent,
      openRate: sent > 0 ? (totalOpens / sent) * 100 : null,
      clickRate: sent > 0 ? (totalClicks / sent) * 100 : null,
    }
  }

  return <SequenceEditor sequence={sequence} steps={steps} stepStats={stepStats} />
}
