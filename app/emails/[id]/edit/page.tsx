export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { SequenceStep } from '@/types'
import EmailEditor from '@/components/emails/EmailEditor'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('sequence_steps')
    .select('subject')
    .eq('id', id)
    .single()
  return { title: data ? `${data.subject} — Learnivore Email` : 'Éditeur email' }
}

export default async function EmailEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = createAdminClient()

  const { data: stepData, error: stepError } = await supabase
    .from('sequence_steps')
    .select('*')
    .eq('id', id)
    .single()

  if (stepError || !stepData) {
    notFound()
  }

  const step: SequenceStep = stepData

  // Fetch parent sequence for breadcrumb
  const { data: seqData } = await supabase
    .from('sequences')
    .select('id, name')
    .eq('id', step.sequence_id)
    .single()

  const sequenceName = seqData?.name ?? 'Séquence'
  const sequenceId = step.sequence_id

  return (
    <EmailEditor
      step={step}
      sequenceName={sequenceName}
      sequenceId={sequenceId}
    />
  )
}
