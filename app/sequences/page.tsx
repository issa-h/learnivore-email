export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import { Sequence } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
        <p className="text-sm text-red-600">
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
        <h1 className="text-xl font-semibold text-gray-900">Séquences</h1>
        <Button asChild size="sm">
          <Link href="/sequences/new">
            <Plus size={14} className="mr-1.5" />
            Nouvelle séquence
          </Link>
        </Button>
      </div>

      {sequences.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-gray-200 rounded-lg bg-white">
          <Mail size={32} className="text-gray-300 mb-4" />
          <p className="text-sm font-medium text-gray-600">Aucune séquence</p>
          <p className="text-xs text-gray-400 mt-1 mb-4">
            Crée ta première séquence d'emails pour commencer.
          </p>
          <Button asChild size="sm" variant="outline">
            <Link href="/sequences/new">
              <Plus size={14} className="mr-1.5" />
              Nouvelle séquence
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sequences.map((seq) => {
            const stepCount = countMap[seq.id] ?? 0
            return (
              <Link key={seq.id} href={`/sequences/${seq.id}`}>
                <Card className="hover:shadow-sm transition-shadow cursor-pointer border-gray-200 bg-white h-full">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-sm font-medium text-gray-900 leading-snug">
                        {seq.name}
                      </CardTitle>
                      <Badge
                        variant="outline"
                        className={
                          seq.is_active
                            ? 'text-emerald-700 border-emerald-200 bg-emerald-50 text-xs shrink-0'
                            : 'text-gray-500 border-gray-200 bg-gray-50 text-xs shrink-0'
                        }
                      >
                        {seq.is_active ? 'Actif' : 'Inactif'}
                      </Badge>
                    </div>
                    {seq.description && (
                      <p className="text-xs text-gray-400 line-clamp-2 mt-1">
                        {seq.description}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>
                        {stepCount} étape{stepCount !== 1 ? 's' : ''}
                      </span>
                      <span>{formatDate(seq.created_at)}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
