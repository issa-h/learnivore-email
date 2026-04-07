'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
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
        <Button
          onClick={handleGenerate}
          disabled={loading}
          className="gap-2"
        >
          <Sparkles size={16} />
          {loading ? 'Génération en cours...' : 'Générer de nouvelles suggestions'}
        </Button>
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
      </div>

      {/* Suggestions list */}
      {suggestions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 bg-white p-12 text-center">
          <Sparkles size={24} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">
            Aucune suggestion pour le moment. Clique sur le bouton ci-dessus pour en générer.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {suggestions.map((suggestion) => {
            const source = getSourceInfo(suggestion)
            return (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                sourceSubject={source?.subject ?? null}
                openRate={source?.openRate ?? null}
                onApprove={handleApprove}
                onDismiss={handleDismiss}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
