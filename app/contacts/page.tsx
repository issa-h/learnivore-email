export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/server'
import { Contact } from '@/types'
import ContactsClient from '@/components/contacts/ContactsClient'

export const metadata = {
  title: 'Contacts — Learnivore Email',
}

export default async function ContactsPage() {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('contacts')
    .select('id, email, first_name, source, tags, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <div className="p-8">
        <p className="text-sm text-red-600">
          Erreur lors du chargement des contacts : {error.message}
        </p>
      </div>
    )
  }

  const contacts: Contact[] = data ?? []

  // Collect all unique tags across all contacts, sorted alphabetically
  const allTags = Array.from(
    new Set(contacts.flatMap((c) => c.tags ?? []))
  ).sort((a, b) => a.localeCompare(b, 'fr'))

  const total = contacts.length

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Contacts</h1>
        <span className="text-sm text-gray-400">
          {total.toLocaleString('fr-FR')} contact{total > 1 ? 's' : ''}
        </span>
      </div>

      <ContactsClient contacts={contacts} allTags={allTags} />
    </div>
  )
}
