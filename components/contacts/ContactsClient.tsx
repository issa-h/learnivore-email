'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Contact } from '@/types'
import { Search } from 'lucide-react'

// Dark-mode palette for tags — deterministic based on tag string
const TAG_COLORS = [
  { bg: 'rgba(124, 58, 237, 0.22)', text: '#a78bfa', border: 'rgba(124, 58, 237, 0.4)' },
  { bg: 'rgba(168, 85, 247, 0.22)', text: '#d8b4fe', border: 'rgba(168, 85, 247, 0.4)' },
  { bg: 'rgba(34, 197, 94, 0.18)', text: '#4ade80', border: 'rgba(34, 197, 94, 0.35)' },
  { bg: 'rgba(245, 158, 11, 0.18)', text: '#fcd34d', border: 'rgba(245, 158, 11, 0.35)' },
  { bg: 'rgba(239, 68, 68, 0.18)', text: '#fca5a5', border: 'rgba(239, 68, 68, 0.35)' },
  { bg: 'rgba(6, 182, 212, 0.18)', text: '#67e8f9', border: 'rgba(6, 182, 212, 0.35)' },
  { bg: 'rgba(236, 72, 153, 0.18)', text: '#f9a8d4', border: 'rgba(236, 72, 153, 0.35)' },
  { bg: 'rgba(132, 204, 22, 0.18)', text: '#bef264', border: 'rgba(132, 204, 22, 0.35)' },
]

function tagColor(tag: string) {
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

  const thStyle: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: 'var(--text-tertiary)',
    padding: '12px 16px',
    textAlign: 'left',
    borderBottom: '1px solid var(--border-subtle)',
    whiteSpace: 'nowrap',
  }

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative">
        <Search
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: 'var(--text-tertiary)' }}
        />
        <input
          value={search}
          onChange={handleSearchChange}
          placeholder="Rechercher par email ou prénom…"
          className="w-full pl-9 pr-4 py-2 rounded-lg text-sm transition-colors"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-primary)',
            outline: 'none',
          }}
        />
      </div>

      {/* Tag pills */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeTag && (
            <button
              onClick={() => { setActiveTag(null); setPage(1) }}
              className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium transition-all"
              style={{
                background: 'var(--bg-elevated)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-default)',
              }}
            >
              ✕
            </button>
          )}
          {allTags.map((tag) => {
            const colors = tagColor(tag)
            const isActive = activeTag === tag
            return (
              <button
                key={tag}
                onClick={() => handleTagClick(tag)}
                className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-all"
                style={{
                  background: colors.bg,
                  color: colors.text,
                  border: `1px solid ${colors.border}`,
                  opacity: isActive ? 1 : 0.9,
                  boxShadow: isActive ? `0 0 0 2px ${colors.border}` : 'none',
                }}
              >
                {tag}
              </button>
            )
          })}
        </div>
      )}

      {/* Table or empty */}
      {filtered.length === 0 ? (
        <div
          className="py-16 text-center text-sm"
          style={{ color: 'var(--text-tertiary)' }}
        >
          {contacts.length === 0
            ? 'Aucun contact pour le moment.'
            : 'Aucun contact ne correspond à votre recherche.'}
        </div>
      ) : (
        <>
          <div
            style={{
              borderRadius: '12px',
              border: '1px solid var(--border-subtle)',
              overflow: 'hidden',
              background: 'var(--bg-surface)',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-surface)' }}>
                  <th style={thStyle}>Prénom</th>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>Tags</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Date d&apos;ajout</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((contact, i) => {
                  const isLast = i === paginated.length - 1
                  const cellStyle: React.CSSProperties = {
                    padding: '12px 16px',
                    borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)',
                    color: 'var(--text-secondary)',
                  }
                  return (
                    <tr
                      key={contact.id}
                      className="cursor-pointer"
                      style={{ background: 'var(--bg-surface)', transition: 'background 0.1s ease' }}
                      onClick={() => router.push(`/contacts/${contact.id}`)}
                      onMouseEnter={(e) => {
                        ;(e.currentTarget as HTMLTableRowElement).style.background = 'var(--bg-elevated)'
                      }}
                      onMouseLeave={(e) => {
                        ;(e.currentTarget as HTMLTableRowElement).style.background = 'var(--bg-surface)'
                      }}
                    >
                      <td style={{ ...cellStyle, color: 'var(--text-primary)', fontWeight: 500 }}>
                        {contact.first_name ?? (
                          <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>—</span>
                        )}
                      </td>
                      <td style={cellStyle}>{contact.email}</td>
                      <td style={cellStyle}>
                        <div className="flex flex-wrap gap-1">
                          {contact.tags.length === 0 ? (
                            <span style={{ color: 'var(--text-tertiary)', fontSize: '12px', fontStyle: 'italic' }}>—</span>
                          ) : (
                            contact.tags.map((tag) => {
                              const colors = tagColor(tag)
                              return (
                                <span
                                  key={tag}
                                  className="inline-flex items-center rounded-full px-2 py-0.5"
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 500,
                                    background: colors.bg,
                                    color: colors.text,
                                    border: `1px solid ${colors.border}`,
                                    borderRadius: '20px',
                                  }}
                                >
                                  {tag}
                                </span>
                              )
                            })
                          )}
                        </div>
                      </td>
                      <td style={{ ...cellStyle, textAlign: 'right', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
                        {formatDate(contact.created_at)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              className="flex items-center justify-between text-sm"
              style={{ color: 'var(--text-secondary)' }}
            >
              <span>
                {(currentPage - 1) * PAGE_SIZE + 1}–
                {Math.min(currentPage * PAGE_SIZE, filtered.length)} sur{' '}
                {filtered.length} contact{filtered.length > 1 ? 's' : ''}
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-1 rounded-lg text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    border: '1px solid var(--border-default)',
                    background: 'var(--bg-elevated)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  Précédent
                </button>
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  Page {currentPage} / {totalPages}
                </span>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1 rounded-lg text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    border: '1px solid var(--border-default)',
                    background: 'var(--bg-elevated)',
                    color: 'var(--text-secondary)',
                  }}
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
