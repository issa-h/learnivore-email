export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/server'
import { AutomationsClient } from '@/components/automations/AutomationsClient'

export const metadata = {
  title: 'Automations — Learnivore Email',
}

export default async function AutomationsPage() {
  const supabase = createAdminClient()

  // Fetch all tag_rules joined with sequence names
  const { data: tagRules } = await supabase
    .from('tag_rules')
    .select('id, tag, sequence_id, is_active, created_at, sequences(name)')
    .order('created_at', { ascending: false })

  // Fetch all sequences for the dropdown
  const { data: sequences } = await supabase
    .from('sequences')
    .select('id, name')
    .eq('is_active', true)
    .order('name', { ascending: true })

  // Fetch all existing tags from contacts for the datalist
  const { data: contacts } = await supabase
    .from('contacts')
    .select('tags')

  const allTagsSet = new Set<string>()
  for (const c of contacts ?? []) {
    for (const t of c.tags ?? []) {
      if (t) allTagsSet.add(t)
    }
  }
  const existingTags = Array.from(allTagsSet).sort()

  // Normalize tag_rules to include sequence name
  const rules = (tagRules ?? []).map((r) => ({
    id: r.id as string,
    tag: r.tag as string,
    sequence_id: r.sequence_id as string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sequence_name: ((r.sequences as any)?.name ?? r.sequence_id) as string,
    is_active: r.is_active as boolean,
    created_at: r.created_at as string,
  }))

  return (
    <AutomationsClient
      rules={rules}
      sequences={(sequences ?? []) as { id: string; name: string }[]}
      existingTags={existingTags}
    />
  )
}
