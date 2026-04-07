'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChevronRight } from 'lucide-react'

export default function NewSequencePage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/sequences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Erreur lors de la création')
      }

      const { id } = await res.json()
      router.push(`/sequences/${id}/edit`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-gray-400">
        <Link href="/sequences" className="hover:text-gray-700 transition-colors">
          Séquences
        </Link>
        <ChevronRight size={14} />
        <span className="text-gray-600">Nouvelle séquence</span>
      </nav>

      <div>
        <h1 className="text-xl font-semibold text-gray-900">Nouvelle séquence</h1>
        <p className="text-sm text-gray-500 mt-1">
          Donne un nom à ta séquence pour commencer.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="name" className="text-sm font-medium text-gray-700">
            Nom <span className="text-red-500">*</span>
          </label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex : Bienvenue nouveaux inscrits"
            required
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="description" className="text-sm font-medium text-gray-700">
            Description{' '}
            <span className="text-gray-400 font-normal">(optionnel)</span>
          </label>
          <Input
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex : Séquence d'onboarding pour les nouveaux abonnés"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" disabled={loading || !name.trim()}>
            {loading ? 'Création…' : 'Créer'}
          </Button>
          <Button variant="ghost" type="button" asChild>
            <Link href="/sequences">Annuler</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}
