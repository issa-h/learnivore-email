export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/server'
import { Contact } from '@/types'
import ContactsClient from '@/components/contacts/ContactsClient'

export const metadata = {
  title: 'Contacts — Learnivore Email',
}

export default async function ContactsPage() {
  const supabase = createAdminClient()

  // Fetch all contacts (Supabase default limit is 1000)
  const allContacts: Contact[] = []
  let from = 0
  const pageSize = 1000
  let hasMore = true

  while (hasMore) {
    const { data: batch, error: batchError } = await supabase
      .from('contacts')
      .select('id, email, first_name, source, tags, utms, created_at')
      .order('created_at', { ascending: false })
      .range(from, from + pageSize - 1)

    if (batchError) {
      return (
        <div className="p-8">
          <p className="text-sm" style={{ color: 'var(--red)' }}>
            Erreur lors du chargement des contacts : {batchError.message}
          </p>
        </div>
      )
    }

    allContacts.push(...(batch ?? []))
    hasMore = (batch?.length ?? 0) === pageSize
    from += pageSize
  }

  const contacts = allContacts

  // Collect all unique tags across all contacts, sorted alphabetically
  const allTags = Array.from(
    new Set(contacts.flatMap((c) => c.tags ?? []))
  ).sort((a, b) => a.localeCompare(b, 'fr'))

  const total = contacts.length

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-baseline gap-3">
        <h1
          className="font-semibold"
          style={{ fontSize: '24px', color: 'var(--text-primary)' }}
        >
          Contacts
        </h1>
        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {total.toLocaleString('fr-FR')} contact{total > 1 ? 's' : ''}
        </span>
      </div>

      <ContactsClient contacts={contacts} allTags={allTags} />
    </div>
  )
}
