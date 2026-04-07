'use client'

import { useState } from 'react'
import SuggestionCard from './SuggestionCard'
import { AiSuggestion } from '@/types'
import { Sparkles } from 'lucide-react'

interface SourceStepInfo {
  id: string
  subject: string
  openRate: number | null
}

interface AiClientProps {
  initialSuggestions: AiSuggestion[]
  sourceSteps: SourceStepInfo[]
}

export default function AiClient({ initialSuggestions, sourceSteps }: AiClientProps) {
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>(initialSuggestions)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ai/suggestions', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Une erreur est survenue.')
      } else {
        setSuggestions((prev) => [...(data.suggestions ?? []), ...prev].slice(0, 5))
      }
    } catch {
      setError('Impossible de contacter le serveur.')
    } finally {
      setLoading(false)
    }
  }

  function handleApprove(id: string) {
    setSuggestions((prev) => prev.filter((s) => s.id !== id))
  }

  function handleDismiss(id: string) {
    setSuggestions((prev) => prev.filter((s) => s.id !== id))
  }

  function getSourceInfo(suggestion: AiSuggestion): SourceStepInfo | undefined {
    return sourceSteps.find((s) => s.id === suggestion.source_step_id)
  }

  return (
    <div className="space-y-6">
      {/* Generate button */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: 'var(--accent)',
            color: '#ffffff',
            border: 'none',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            if (!loading) e.currentTarget.style.background = 'var(--accent-hover)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--accent)'
          }}
        >
          <Sparkles size={16} />
          {loading ? 'Génération en cours...' : 'Générer de nouvelles suggestions'}
        </button>
        {error && (
          <p className="text-sm" style={{ color: 'var(--red)' }}>{error}</p>
        )}
      </div>

      {/* Suggestions list */}
      {suggestions.length === 0 ? (
        <div
          className="p-12 text-center"
          style={{
            border: '1px dashed var(--border-default)',
            borderRadius: '12px',
            background: 'var(--bg-surface)',
          }}
        >
          <Sparkles
            size={24}
            className="mx-auto mb-3"
            style={{ color: 'var(--text-tertiary)' }}
          />
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Aucune suggestion pour le moment. Clique sur le bouton ci-dessus pour en générer.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {suggestions.map((suggestion, i) => {
            const source = getSourceInfo(suggestion)
            return (
              <div
                key={suggestion.id}
                style={{ animation: `fadeUp 0.3s ease ${i * 60}ms both` }}
              >
                <SuggestionCard
                  suggestion={suggestion}
                  sourceSubject={source?.subject ?? null}
                  openRate={source?.openRate ?? null}
                  onApprove={handleApprove}
                  onDismiss={handleDismiss}
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
