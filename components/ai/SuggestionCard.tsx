'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
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
  // Strip HTML tags
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  // Return first 3 lines (split by sentence-ending or line breaks)
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
  const borderColor = isResend ? 'border-l-blue-400' : 'border-l-green-400'
  const badgeClass = isResend
    ? 'bg-blue-50 text-blue-700 border-blue-200'
    : 'bg-green-50 text-green-700 border-green-200'
  const badgeLabel = isResend ? 'Re-send' : 'Nouvelle variante'

  const bodyPreview = getBodyPreview(suggestion.suggested_body)

  return (
    <Card className={`border-l-4 ${borderColor} shadow-none`}>
      <CardContent className="p-5 space-y-4">
        {/* Header row */}
        <div className="flex items-center gap-2">
          <Badge className={badgeClass} variant="outline">
            {badgeLabel}
          </Badge>
        </div>

        {/* Source email */}
        {sourceSubject && (
          <div className="text-xs text-gray-500 space-y-0.5">
            <span className="font-medium text-gray-600">Email source :</span>{' '}
            <span>{sourceSubject}</span>
            {openRate !== null && openRate !== undefined && (
              <span className="ml-2 text-gray-400">
                ({Math.round(openRate)}% d&apos;ouverture)
              </span>
            )}
          </div>
        )}

        <Separator />

        {/* Reasoning */}
        {suggestion.reasoning && (
          <p className="text-sm text-gray-600 italic">
            &ldquo;{suggestion.reasoning}&rdquo;
          </p>
        )}

        {/* Suggested subject */}
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
            Sujet suggéré
          </p>
          <p className="text-sm font-semibold text-gray-900">
            {suggestion.suggested_subject}
          </p>
        </div>

        {/* Body preview */}
        {bodyPreview && (
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Aperçu du contenu
            </p>
            <p className="text-sm text-gray-700 line-clamp-3">{bodyPreview}</p>
          </div>
        )}

        <Separator />

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            onClick={() => handleAction('approve')}
            disabled={loading !== null}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {loading === 'approve' ? 'En cours...' : 'Approuver'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleAction('dismiss')}
            disabled={loading !== null}
          >
            {loading === 'dismiss' ? 'En cours...' : 'Ignorer'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
