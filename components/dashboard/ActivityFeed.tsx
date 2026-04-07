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
      <p className="text-sm text-gray-400 py-6 text-center">
        Aucune activité pour le moment
      </p>
    )
  }

  return (
    <ul className="divide-y divide-gray-100">
      {events.map((event) => {
        const name = event.contactFirstName ?? event.contactEmail
        const isOpen = event.eventType === 'open'

        return (
          <li key={event.id} className="flex items-start gap-3 py-3">
            <div className="mt-0.5 rounded-md bg-gray-100 p-1.5 shrink-0">
              {isOpen ? (
                <Mail size={14} className="text-gray-500" strokeWidth={1.75} />
              ) : (
                <MousePointerClick size={14} className="text-gray-500" strokeWidth={1.75} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-700 truncate">
                <span className="font-medium text-gray-900">{name}</span>{' '}
                {isOpen ? (
                  <>
                    a ouvert{' '}
                    <span className="text-gray-600">
                      &ldquo;{event.subject}&rdquo;
                    </span>
                  </>
                ) : (
                  <>
                    a cliqué un lien dans{' '}
                    <span className="text-gray-600">
                      &ldquo;{event.subject}&rdquo;
                    </span>
                  </>
                )}
              </p>
            </div>
            <span className="text-xs text-gray-400 shrink-0 mt-0.5">
              {relativeTime(event.occurredAt)}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
