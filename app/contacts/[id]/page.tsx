export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import { Contact, Enrollment, EmailEvent, Sequence } from '@/types'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Mail, MousePointerClick, ChevronRight } from 'lucide-react'

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

export default async function ContactDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = createAdminClient()

  // Fetch contact
  const { data: contactData, error: contactError } = await supabase
    .from('contacts')
    .select('id, email, first_name, source, tags, created_at')
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
      <nav className="flex items-center gap-1.5 text-sm text-gray-500">
        <Link href="/contacts" className="hover:text-gray-800 transition-colors">
          Contacts
        </Link>
        <ChevronRight size={14} className="text-gray-300" />
        <span className="text-gray-700 font-medium">{contact.email}</span>
      </nav>

      {/* Fiche contact */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {contact.first_name ? contact.first_name : contact.email}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-gray-400 text-xs uppercase tracking-wide mb-0.5">
                Email
              </dt>
              <dd className="text-gray-800">{contact.email}</dd>
            </div>
            {contact.first_name && (
              <div>
                <dt className="text-gray-400 text-xs uppercase tracking-wide mb-0.5">
                  Prénom
                </dt>
                <dd className="text-gray-800">{contact.first_name}</dd>
              </div>
            )}
            <div>
              <dt className="text-gray-400 text-xs uppercase tracking-wide mb-0.5">
                Source
              </dt>
              <dd className="text-gray-800">
                {contact.source ?? <span className="italic text-gray-400">—</span>}
              </dd>
            </div>
            <div>
              <dt className="text-gray-400 text-xs uppercase tracking-wide mb-0.5">
                Date d&apos;ajout
              </dt>
              <dd className="text-gray-800">{formatDate(contact.created_at)}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-gray-400 text-xs uppercase tracking-wide mb-1">
                Tags
              </dt>
              <dd>
                {contact.tags.length === 0 ? (
                  <span className="italic text-gray-400 text-xs">Aucun tag</span>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {contact.tags.map((tag) => (
                      <Badge
                        key={tag}
                        className={['border text-xs font-normal', tagColor(tag)].join(' ')}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Séquences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Séquences{' '}
            <span className="text-gray-400 font-normal text-sm">
              ({enrollments.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {enrollments.length === 0 ? (
            <p className="text-sm text-gray-400 italic">
              Ce contact n&apos;est inscrit à aucune séquence.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {enrollments.map((enrollment) => {
                const seq = sequencesMap[enrollment.sequence_id]
                return (
                  <li key={enrollment.id} className="py-3 text-sm flex items-start justify-between gap-4">
                    <div className="space-y-0.5">
                      <p className="font-medium text-gray-800">
                        {seq?.name ?? (
                          <span className="italic text-gray-400">
                            Séquence inconnue
                          </span>
                        )}
                      </p>
                      <p className="text-gray-500 text-xs">
                        Inscrit le {formatDate(enrollment.enrolled_at)} · Étape{' '}
                        {enrollment.current_step}
                      </p>
                    </div>
                    <Badge
                      className={
                        enrollment.completed_at
                          ? 'bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-normal shrink-0'
                          : 'bg-blue-100 text-blue-700 border border-blue-200 text-xs font-normal shrink-0'
                      }
                    >
                      {enrollment.completed_at ? 'Terminée' : 'En cours'}
                    </Badge>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Activité email */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Activité email{' '}
            <span className="text-gray-400 font-normal text-sm">
              (20 derniers événements)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <p className="text-sm text-gray-400 italic">
              Aucune activité enregistrée pour ce contact.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {events.map((event) => (
                <li key={event.id} className="py-3 flex items-start gap-3 text-sm">
                  <div className="mt-0.5 shrink-0">
                    {event.event_type === 'open' ? (
                      <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center">
                        <Mail size={13} className="text-blue-500" />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-violet-50 flex items-center justify-center">
                        <MousePointerClick size={13} className="text-violet-500" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-700">
                      {event.event_type === 'open' ? 'Email ouvert' : 'Lien cliqué'}
                    </p>
                    {event.url && (
                      <p className="text-xs text-gray-400 truncate mt-0.5">
                        {event.url}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 shrink-0 mt-0.5">
                    {formatDateTime(event.occurred_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
