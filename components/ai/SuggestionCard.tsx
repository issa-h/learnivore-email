'use client'

import { useState } from 'react'
import { AiSuggestion } from '@/types'

interface SuggestionCardProps {
  suggestion: AiSuggestion
  sourceSubject?: string | null
  openRate?: number | null
  onApprove: (id: string) => void
  onDismiss: (id: string) => void
}

function getBodyPreview(html: string | null): string {
  if (!html) return ''
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  const lines = text.split(/[.!?]\s+/)
  return lines.slice(0, 3).join('. ') + (lines.length > 3 ? '...' : '')
}

export default function SuggestionCard({
  suggestion,
  sourceSubject,
  openRate,
  onApprove,
  onDismiss,
}: SuggestionCardProps) {
  const [loading, setLoading] = useState<'approve' | 'dismiss' | null>(null)

  async function handleAction(action: 'approve' | 'dismiss') {
    setLoading(action)
    try {
      const res = await fetch(`/api/ai/suggestions/${suggestion.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) throw new Error('Erreur')
      if (action === 'approve') onApprove(suggestion.id)
      else onDismiss(suggestion.id)
    } catch {
      // silently handle
    } finally {
      setLoading(null)
    }
  }

  const isResend = suggestion.suggestion_type === 'resend'
  const bodyPreview = getBodyPreview(suggestion.suggested_body)

  const accentColor = isResend ? '#818cf8' : 'var(--green)'
  const accentBg = isResend ? 'var(--accent-subtle)' : 'var(--green-subtle)'
  const accentBorder = isResend ? 'rgba(99, 102, 241, 0.3)' : 'rgba(34, 197, 94, 0.25)'
  const badgeLabel = isResend ? 'Re-send' : 'Nouvelle variante'

  return (
    <div
      className="space-y-4 p-5"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderLeft: `3px solid ${accentColor}`,
        borderRadius: '12px',
      }}
    >
      {/* Badge */}
      <div className="flex items-center gap-2">
        <span
          className="inline-flex items-center rounded-full px-2.5 py-0.5"
          style={{
            fontSize: '11px',
            fontWeight: 500,
            borderRadius: '20px',
            background: accentBg,
            color: accentColor,
            border: `1px solid ${accentBorder}`,
          }}
        >
          {badgeLabel}
        </span>
      </div>

      {/* Source email */}
      {sourceSubject && (
        <div className="text-xs space-y-0.5" style={{ color: 'var(--text-secondary)' }}>
          <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>
            Email source :
          </span>{' '}
          <span>{sourceSubject}</span>
          {openRate !== null && openRate !== undefined && (
            <span className="ml-2" style={{ color: 'var(--text-tertiary)' }}>
              ({Math.round(openRate)}% d&apos;ouverture)
            </span>
          )}
        </div>
      )}

      <div style={{ borderTop: '1px solid var(--border-subtle)' }} />

      {/* Reasoning */}
      {suggestion.reasoning && (
        <p className="text-sm italic" style={{ color: 'var(--text-secondary)' }}>
          &ldquo;{suggestion.reasoning}&rdquo;
        </p>
      )}

      {/* Suggested subject */}
      <div>
        <p
          className="text-xs font-medium uppercase mb-1"
          style={{ color: 'var(--text-tertiary)', letterSpacing: '0.08em' }}
        >
          Sujet suggéré
        </p>
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {suggestion.suggested_subject}
        </p>
      </div>

      {/* Body preview */}
      {bodyPreview && (
        <div>
          <p
            className="text-xs font-medium uppercase mb-1"
            style={{ color: 'var(--text-tertiary)', letterSpacing: '0.08em' }}
          >
            Aperçu du contenu
          </p>
          <p className="text-sm line-clamp-3" style={{ color: 'var(--text-secondary)' }}>
            {bodyPreview}
          </p>
        </div>
      )}

      <div style={{ borderTop: '1px solid var(--border-subtle)' }} />

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => handleAction('approve')}
          disabled={loading !== null}
          className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: 'var(--green-subtle)',
            color: 'var(--green)',
            border: '1px solid rgba(34, 197, 94, 0.2)',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            if (loading === null) {
              e.currentTarget.style.background = 'rgba(34, 197, 94, 0.2)'
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--green-subtle)'
          }}
        >
          {loading === 'approve' ? 'En cours...' : 'Approuver'}
        </button>
        <button
          onClick={() => handleAction('dismiss')}
          disabled={loading !== null}
          className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: 'transparent',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-default)',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            if (loading === null) {
              e.currentTarget.style.background = 'var(--bg-elevated)'
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
          }}
        >
          {loading === 'dismiss' ? 'En cours...' : 'Ignorer'}
        </button>
      </div>
    </div>
  )
}
