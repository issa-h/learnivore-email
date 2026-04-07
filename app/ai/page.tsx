export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/server'
import { AiSuggestion } from '@/types'
import AiClient from '@/components/ai/AiClient'

export const metadata = {
  title: 'Suggestions IA — Learnivore Email',
}

export default async function AiPage() {
  const supabase = createAdminClient()

  // Fetch pending suggestions
  const { data: suggestions } = await supabase
    .from('ai_suggestions')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(5)

  const pendingSuggestions: AiSuggestion[] = suggestions ?? []

  // Fetch source step info for each suggestion
  const sourceStepIds = [
    ...new Set(
      pendingSuggestions
        .map((s) => s.source_step_id)
        .filter((id): id is string => id !== null)
    ),
  ]

  interface SourceStepInfo {
    id: string
    subject: string
    openRate: number | null
  }

  const sourceSteps: SourceStepInfo[] = []

  for (const stepId of sourceStepIds) {
    const { data: step } = await supabase
      .from('sequence_steps')
      .select('id, subject')
      .eq('id', stepId)
      .single()

    if (!step) continue

    // Calculate open rate for this step
    const { count: sent } = await supabase
      .from('send_queue')
      .select('id', { count: 'exact', head: true })
      .eq('sequence_step_id', stepId)
      .eq('status', 'sent')

    const { data: openEvents } = await supabase
      .from('email_events')
      .select('send_queue_id')
      .eq('event_type', 'open')
      .eq('sequence_step_id', stepId)

    const uniqueOpens = new Set(openEvents?.map((e) => e.send_queue_id) ?? []).size
    const sentCount = sent ?? 0
    const openRate = sentCount > 0 ? (uniqueOpens / sentCount) * 100 : null

    sourceSteps.push({ id: step.id, subject: step.subject, openRate })
  }

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1
          className="font-semibold"
          style={{ fontSize: '24px', color: 'var(--text-primary)' }}
        >
          Suggestions IA
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          Des suggestions d&rsquo;emails basées sur les performances de tes séquences.
        </p>
      </div>

      <AiClient
        initialSuggestions={pendingSuggestions}
        sourceSteps={sourceSteps}
      />
    </div>
  )
}
