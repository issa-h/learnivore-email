import { Mail, MousePointerClick } from 'lucide-react'

export interface ActivityEvent {
  id: string
  eventType: 'open' | 'click'
  contactFirstName: string | null
  contactEmail: string
  subject: string
  occurredAt: string
}

function relativeTime(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60_000)
  const diffHours = Math.floor(diffMs / 3_600_000)
  const diffDays = Math.floor(diffMs / 86_400_000)

  if (diffMins < 1) return "à l'instant"
  if (diffMins < 60) return `il y a ${diffMins} min`
  if (diffHours < 24) return `il y a ${diffHours}h`
  if (diffDays === 1) return 'hier'
  if (diffDays < 7) return `il y a ${diffDays} jours`
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

interface ActivityFeedProps {
  events: ActivityEvent[]
}

export default function ActivityFeed({ events }: ActivityFeedProps) {
  if (events.length === 0) {
    return (
      <p
        className="py-6 text-center text-sm"
        style={{ color: 'var(--text-tertiary)' }}
      >
        Aucune activité pour le moment
      </p>
    )
  }

  return (
    <ul>
      {events.map((event, i) => {
        const name = event.contactFirstName ?? event.contactEmail
        const isOpen = event.eventType === 'open'
        const isLast = i === events.length - 1

        return (
          <li
            key={event.id}
            className="flex items-start gap-3 py-3"
            style={{
              borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)',
            }}
          >
            <div
              className="mt-0.5 rounded-lg p-1.5 shrink-0"
              style={{
                background: isOpen ? 'rgba(99, 102, 241, 0.12)' : 'rgba(99, 102, 241, 0.08)',
              }}
            >
              {isOpen ? (
                <Mail size={14} style={{ color: 'var(--accent)' }} strokeWidth={1.75} />
              ) : (
                <MousePointerClick size={14} style={{ color: 'var(--accent-hover)' }} strokeWidth={1.75} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>
                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                  {name}
                </span>{' '}
                {isOpen ? (
                  <>
                    a ouvert{' '}
                    <span style={{ color: 'var(--text-secondary)' }}>
                      &ldquo;{event.subject}&rdquo;
                    </span>
                  </>
                ) : (
                  <>
                    a cliqué un lien dans{' '}
                    <span style={{ color: 'var(--text-secondary)' }}>
                      &ldquo;{event.subject}&rdquo;
                    </span>
                  </>
                )}
              </p>
            </div>
            <span
              className="text-xs shrink-0 mt-0.5"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {relativeTime(event.occurredAt)}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
