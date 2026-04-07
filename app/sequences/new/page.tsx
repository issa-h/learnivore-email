'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid var(--border-default)',
    background: 'var(--bg-elevated)',
    color: 'var(--text-primary)',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
  }

  return (
    <div className="p-8 max-w-xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
        <Link
          href="/sequences"
          className="transition-colors hover:underline"
          style={{ color: 'var(--text-secondary)' }}
        >
          Séquences
        </Link>
        <ChevronRight size={14} style={{ color: 'var(--text-tertiary)' }} />
        <span style={{ color: 'var(--text-primary)' }}>Nouvelle séquence</span>
      </nav>

      <div>
        <h1
          className="font-semibold"
          style={{ fontSize: '24px', color: 'var(--text-primary)' }}
        >
          Nouvelle séquence
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Donne un nom à ta séquence pour commencer.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label
            htmlFor="name"
            className="text-sm font-medium"
            style={{ color: 'var(--text-secondary)' }}
          >
            Nom <span style={{ color: 'var(--red)' }}>*</span>
          </label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex : Bienvenue nouveaux inscrits"
            required
            autoFocus
            style={inputStyle}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent)'
              e.currentTarget.style.boxShadow = '0 0 0 2px var(--accent-subtle)'
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-default)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="description"
            className="text-sm font-medium"
            style={{ color: 'var(--text-secondary)' }}
          >
            Description{' '}
            <span className="font-normal" style={{ color: 'var(--text-tertiary)' }}>
              (optionnel)
            </span>
          </label>
          <input
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex : Séquence d'onboarding pour les nouveaux abonnés"
            style={inputStyle}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent)'
              e.currentTarget.style.boxShadow = '0 0 0 2px var(--accent-subtle)'
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-default)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          />
        </div>

        {error && (
          <p className="text-sm" style={{ color: 'var(--red)' }}>{error}</p>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: 'var(--accent)',
              color: '#ffffff',
            }}
          >
            {loading ? 'Création…' : 'Créer'}
          </button>
          <Link
            href="/sequences"
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              color: 'var(--text-secondary)',
              background: 'transparent',
            }}
          >
            Annuler
          </Link>
        </div>
      </form>
    </div>
  )
}
