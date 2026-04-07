export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import { Sequence } from '@/types'
import { Plus, Mail } from 'lucide-react'

export const metadata = {
  title: 'Séquences — Learnivore Email',
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default async function SequencesPage() {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('sequences')
    .select('id, name, description, is_active, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <div className="p-8">
        <p className="text-sm" style={{ color: 'var(--red)' }}>
          Erreur lors du chargement des séquences : {error.message}
        </p>
      </div>
    )
  }

  // Fetch step counts per sequence
  const { data: stepCounts } = await supabase
    .from('sequence_steps')
    .select('sequence_id')

  const countMap: Record<string, number> = {}
  for (const row of stepCounts ?? []) {
    countMap[row.sequence_id] = (countMap[row.sequence_id] ?? 0) + 1
  }

  const sequences: Sequence[] = data ?? []

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1
          className="font-semibold"
          style={{ fontSize: '24px', color: 'var(--text-primary)' }}
        >
          Séquences
        </h1>
        <Link
          href="/sequences/new"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
          style={{
            background: 'var(--accent)',
            color: '#ffffff',
          }}
        >
          <Plus size={14} />
          Nouvelle séquence
        </Link>
      </div>

      {sequences.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-20 text-center"
          style={{
            border: '1px dashed var(--border-default)',
            borderRadius: '12px',
            background: 'var(--bg-surface)',
          }}
        >
          <Mail size={32} className="mb-4" style={{ color: 'var(--text-tertiary)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            Aucune séquence
          </p>
          <p className="text-xs mt-1 mb-4" style={{ color: 'var(--text-tertiary)' }}>
            Crée ta première séquence d&apos;emails pour commencer.
          </p>
          <Link
            href="/sequences/new"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            style={{
              border: '1px solid var(--border-default)',
              background: 'var(--bg-elevated)',
              color: 'var(--text-secondary)',
            }}
          >
            <Plus size={14} />
            Nouvelle séquence
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sequences.map((seq, i) => {
            const stepCount = countMap[seq.id] ?? 0
            return (
              <Link
                key={seq.id}
                href={`/sequences/${seq.id}`}
                className="block card-dark h-full"
                style={{ animation: `fadeUp 0.3s ease ${i * 60}ms both` }}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p
                    className="text-sm font-medium leading-snug"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {seq.name}
                  </p>
                  <span
                    className="shrink-0 inline-flex items-center rounded-full px-2 py-0.5"
                    style={{
                      fontSize: '11px',
                      fontWeight: 500,
                      borderRadius: '20px',
                      background: seq.is_active ? 'var(--green-subtle)' : 'var(--bg-elevated)',
                      color: seq.is_active ? 'var(--green)' : 'var(--text-tertiary)',
                      border: `1px solid ${seq.is_active ? 'rgba(34,197,94,0.2)' : 'var(--border-default)'}`,
                    }}
                  >
                    {seq.is_active ? 'Actif' : 'Inactif'}
                  </span>
                </div>
                {seq.description && (
                  <p
                    className="text-xs line-clamp-2 mb-3"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    {seq.description}
                  </p>
                )}
                <div
                  className="flex items-center justify-between text-xs mt-auto pt-3"
                  style={{
                    color: 'var(--text-tertiary)',
                    borderTop: '1px solid var(--border-subtle)',
                  }}
                >
                  <span>{stepCount} étape{stepCount !== 1 ? 's' : ''}</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{formatDate(seq.created_at)}</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
