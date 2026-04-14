export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import { Contact, Enrollment, EmailEvent, Sequence } from '@/types'
import { Mail, MousePointerClick, ChevronRight } from 'lucide-react'

// Dark-mode palette for tags — deterministic based on tag string
const TAG_COLORS = [
  { bg: 'rgba(99, 102, 241, 0.15)', text: '#818cf8', border: 'rgba(99, 102, 241, 0.25)' },
  { bg: 'rgba(168, 85, 247, 0.15)', text: '#c084fc', border: 'rgba(168, 85, 247, 0.25)' },
  { bg: 'rgba(34, 197, 94, 0.12)', text: '#4ade80', border: 'rgba(34, 197, 94, 0.2)' },
  { bg: 'rgba(245, 158, 11, 0.12)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.2)' },
  { bg: 'rgba(239, 68, 68, 0.12)', text: '#f87171', border: 'rgba(239, 68, 68, 0.2)' },
  { bg: 'rgba(6, 182, 212, 0.12)', text: '#22d3ee', border: 'rgba(6, 182, 212, 0.2)' },
  { bg: 'rgba(236, 72, 153, 0.12)', text: '#f472b6', border: 'rgba(236, 72, 153, 0.2)' },
  { bg: 'rgba(132, 204, 22, 0.12)', text: '#a3e635', border: 'rgba(132, 204, 22, 0.2)' },
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

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface PageProps {
  params: Promise<{ id: string }>
}

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-surface)',
  border: '1px solid var(--border-subtle)',
  borderRadius: '12px',
  padding: '20px 24px',
}

export default async function ContactDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = createAdminClient()

  // Fetch contact
  const { data: contactData, error: contactError } = await supabase
    .from('contacts')
    .select('id, email, first_name, source, tags, utms, created_at')
    .eq('id', id)
    .single()

  if (contactError || !contactData) {
    notFound()
  }

  const contact: Contact = contactData

  // Fetch enrollments with sequence info
  const { data: enrollmentsData } = await supabase
    .from('enrollments')
    .select('id, contact_id, sequence_id, current_step, enrolled_at, completed_at')
    .eq('contact_id', id)
    .order('enrolled_at', { ascending: false })

  const enrollments: Enrollment[] = enrollmentsData ?? []

  // Fetch sequences referenced by enrollments
  const sequenceIds = [...new Set(enrollments.map((e) => e.sequence_id))]
  let sequencesMap: Record<string, Sequence> = {}
  if (sequenceIds.length > 0) {
    const { data: seqData } = await supabase
      .from('sequences')
      .select('id, name, description, is_active, created_at')
      .in('id', sequenceIds)
    if (seqData) {
      sequencesMap = Object.fromEntries(seqData.map((s: Sequence) => [s.id, s]))
    }
  }

  // Fetch last 20 email events
  const { data: eventsData } = await supabase
    .from('email_events')
    .select('id, send_queue_id, contact_id, sequence_step_id, event_type, url, occurred_at, ip, user_agent')
    .eq('contact_id', id)
    .order('occurred_at', { ascending: false })
    .limit(20)

  const events: EmailEvent[] = eventsData ?? []

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
        <Link
          href="/contacts"
          className="transition-colors hover:underline"
          style={{ color: 'var(--text-secondary)' }}
        >
          Contacts
        </Link>
        <ChevronRight size={14} style={{ color: 'var(--text-tertiary)' }} />
        <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{contact.email}</span>
      </nav>

      {/* Contact card */}
      <div style={cardStyle} className="fade-up-0">
        <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          {contact.first_name ? contact.first_name : contact.email}
        </h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
          <div>
            <dt
              className="text-xs uppercase mb-1"
              style={{ color: 'var(--text-tertiary)', letterSpacing: '0.06em', fontWeight: 500 }}
            >
              Email
            </dt>
            <dd className="text-sm" style={{ color: 'var(--text-primary)' }}>{contact.email}</dd>
          </div>
          {contact.first_name && (
            <div>
              <dt
                className="text-xs uppercase mb-1"
                style={{ color: 'var(--text-tertiary)', letterSpacing: '0.06em', fontWeight: 500 }}
              >
                Prénom
              </dt>
              <dd className="text-sm" style={{ color: 'var(--text-primary)' }}>{contact.first_name}</dd>
            </div>
          )}
          <div>
            <dt
              className="text-xs uppercase mb-1"
              style={{ color: 'var(--text-tertiary)', letterSpacing: '0.06em', fontWeight: 500 }}
            >
              Source
            </dt>
            <dd className="text-sm" style={{ color: 'var(--text-primary)' }}>
              {contact.source ?? <span className="italic" style={{ color: 'var(--text-tertiary)' }}>—</span>}
            </dd>
          </div>
          <div>
            <dt
              className="text-xs uppercase mb-1"
              style={{ color: 'var(--text-tertiary)', letterSpacing: '0.06em', fontWeight: 500 }}
            >
              Date d&apos;ajout
            </dt>
            <dd
              className="text-sm"
              style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}
            >
              {formatDateTime(contact.created_at)}
            </dd>
          </div>
          {contact.utms && contact.utms.length > 0 && (
            <div className="col-span-2">
              <dt
                className="text-xs uppercase mb-2"
                style={{ color: 'var(--text-tertiary)', letterSpacing: '0.06em', fontWeight: 500 }}
              >
                UTMs
              </dt>
              <dd className="flex flex-wrap gap-2">
                {contact.utms.map((utm) => (
                  <span
                    key={utm}
                    className="inline-flex items-center rounded-full px-2.5 py-0.5"
                    style={{
                      fontSize: '11px',
                      fontWeight: 500,
                      background: 'var(--accent-subtle)',
                      color: 'var(--accent-hover)',
                      border: '1px solid rgba(124, 58, 237, 0.3)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {utm}
                  </span>
                ))}
              </dd>
            </div>
          )}
          <div className="col-span-2">
            <dt
              className="text-xs uppercase mb-2"
              style={{ color: 'var(--text-tertiary)', letterSpacing: '0.06em', fontWeight: 500 }}
            >
              Tags
            </dt>
            <dd>
              {contact.tags.length === 0 ? (
                <span className="text-xs italic" style={{ color: 'var(--text-tertiary)' }}>
                  Aucun tag
                </span>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {contact.tags.map((tag) => {
                    const colors = tagColor(tag)
                    return (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded-full px-2.5 py-0.5"
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
                  })}
                </div>
              )}
            </dd>
          </div>
        </dl>
      </div>

      {/* Séquences */}
      <div style={cardStyle} className="fade-up-1">
        <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Séquences{' '}
          <span className="text-sm font-normal" style={{ color: 'var(--text-tertiary)' }}>
            ({enrollments.length})
          </span>
        </h2>
        {enrollments.length === 0 ? (
          <p className="text-sm italic" style={{ color: 'var(--text-tertiary)' }}>
            Ce contact n&apos;est inscrit à aucune séquence.
          </p>
        ) : (
          <ul>
            {enrollments.map((enrollment, i) => {
              const seq = sequencesMap[enrollment.sequence_id]
              const isLast = i === enrollments.length - 1
              const completed = !!enrollment.completed_at
              return (
                <li
                  key={enrollment.id}
                  className="py-3 text-sm flex items-start justify-between gap-4"
                  style={{ borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)' }}
                >
                  <div className="space-y-0.5">
                    <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      {seq?.name ?? (
                        <span className="italic" style={{ color: 'var(--text-tertiary)' }}>
                          Séquence inconnue
                        </span>
                      )}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      Inscrit le {formatDate(enrollment.enrolled_at)} · Étape{' '}
                      {enrollment.current_step}
                    </p>
                  </div>
                  <span
                    className="shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5"
                    style={{
                      fontSize: '11px',
                      fontWeight: 500,
                      borderRadius: '20px',
                      background: completed ? 'var(--green-subtle)' : 'var(--accent-subtle)',
                      color: completed ? 'var(--green)' : 'var(--accent-hover)',
                      border: `1px solid ${completed ? 'rgba(34,197,94,0.2)' : 'rgba(99,102,241,0.2)'}`,
                    }}
                  >
                    {completed ? 'Terminée' : 'En cours'}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Activité email */}
      <div style={cardStyle} className="fade-up-2">
        <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Activité email{' '}
          <span className="text-sm font-normal" style={{ color: 'var(--text-tertiary)' }}>
            (20 derniers événements)
          </span>
        </h2>
        {events.length === 0 ? (
          <p className="text-sm italic" style={{ color: 'var(--text-tertiary)' }}>
            Aucune activité enregistrée pour ce contact.
          </p>
        ) : (
          <ul>
            {events.map((event, i) => {
              const isLast = i === events.length - 1
              const isOpen = event.event_type === 'open'
              return (
                <li
                  key={event.id}
                  className="py-3 flex items-start gap-3 text-sm"
                  style={{ borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)' }}
                >
                  <div className="mt-0.5 shrink-0">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center"
                      style={{
                        background: isOpen ? 'var(--accent-subtle)' : 'rgba(168, 85, 247, 0.12)',
                      }}
                    >
                      {isOpen ? (
                        <Mail size={13} style={{ color: 'var(--accent)' }} />
                      ) : (
                        <MousePointerClick size={13} style={{ color: '#c084fc' }} />
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p style={{ color: 'var(--text-primary)' }}>
                      {isOpen ? 'Email ouvert' : 'Lien cliqué'}
                    </p>
                    {event.url && (
                      <p
                        className="text-xs truncate mt-0.5"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        {event.url}
                      </p>
                    )}
                  </div>
                  <span
                    className="text-xs shrink-0 mt-0.5"
                    style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}
                  >
                    {formatDateTime(event.occurred_at)}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
