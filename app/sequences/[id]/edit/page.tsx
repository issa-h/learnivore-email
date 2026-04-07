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

  return <SequenceEditor sequence={sequence} steps={steps} />
}
