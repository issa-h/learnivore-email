'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Contact } from '@/types'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Search } from 'lucide-react'

// Stable palette for tags — deterministic based on tag string
const TAG_COLORS = [
  'bg-blue-100 text-blue-700 border-blue-200',
  'bg-violet-100 text-violet-700 border-violet-200',
  'bg-emerald-100 text-emerald-700 border-emerald-200',
  'bg-amber-100 text-amber-700 border-amber-200',
  'bg-rose-100 text-rose-700 border-rose-200',
  'bg-cyan-100 text-cyan-700 border-cyan-200',
  'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
  'bg-lime-100 text-lime-700 border-lime-200',
]

function tagColor(tag: string): string {
  let hash = 0
  for (let i = 0; i < tag.length; i++) {
    hash = (hash * 31 + tag.charCodeAt(i)) & 0xffffffff
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length]
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const PAGE_SIZE = 50

interface Props {
  contacts: Contact[]
  allTags: string[]
}

export default function ContactsClient({ contacts, allTags }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return contacts.filter((c) => {
      const matchesSearch =
        !q ||
        c.email.toLowerCase().includes(q) ||
        (c.first_name ?? '').toLowerCase().includes(q)
      const matchesTag = !activeTag || c.tags.includes(activeTag)
      return matchesSearch && matchesTag
    })
  }, [contacts, search, activeTag])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginated = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  )

  function handleTagClick(tag: string) {
    setActiveTag((prev) => (prev === tag ? null : tag))
    setPage(1)
  }

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value)
    setPage(1)
  }

  return (
    <div className="space-y-4">
      {/* Barre de recherche */}
      <div className="relative">
        <Search
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        />
        <Input
          value={search}
          onChange={handleSearchChange}
          placeholder="Rechercher par email ou prénom…"
          className="pl-9 bg-white"
        />
      </div>

      {/* Tag pills */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => handleTagClick(tag)}
              className={[
                'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all',
                tagColor(tag),
                activeTag === tag
                  ? 'ring-2 ring-offset-1 ring-gray-400 opacity-100'
                  : 'opacity-80 hover:opacity-100',
              ].join(' ')}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Tableau */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-400">
          {contacts.length === 0
            ? 'Aucun contact pour le moment.'
            : 'Aucun contact ne correspond à votre recherche.'}
        </div>
      ) : (
        <>
          <div className="rounded-md border border-gray-200 bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Prénom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead className="text-right">Date d&apos;ajout</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((contact) => (
                  <TableRow
                    key={contact.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/contacts/${contact.id}`)}
                  >
                    <TableCell className="font-medium text-gray-800">
                      {contact.first_name ?? (
                        <span className="text-gray-400 italic">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {contact.email}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {contact.tags.length === 0 ? (
                          <span className="text-gray-400 text-xs italic">—</span>
                        ) : (
                          contact.tags.map((tag) => (
                            <Badge
                              key={tag}
                              className={[
                                'border text-xs font-normal',
                                tagColor(tag),
                              ].join(' ')}
                            >
                              {tag}
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-gray-500 text-xs">
                      {formatDate(contact.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>
                {(currentPage - 1) * PAGE_SIZE + 1}–
                {Math.min(currentPage * PAGE_SIZE, filtered.length)} sur{' '}
                {filtered.length} contact{filtered.length > 1 ? 's' : ''}
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-1 rounded border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Précédent
                </button>
                <span className="text-xs text-gray-400">
                  Page {currentPage} / {totalPages}
                </span>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1 rounded border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Suivant
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
