'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Sequence, SequenceStep } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  ChevronUp,
  ChevronDown,
  Trash2,
  Pencil,
  Plus,
  ChevronRight,
} from 'lucide-react'

interface Props {
  sequence: Sequence
  steps: SequenceStep[]
}

export default function SequenceEditor({ sequence, steps: initialSteps }: Props) {
  const router = useRouter()
  const [name, setName] = useState(sequence.name)
  const [isActive, setIsActive] = useState(sequence.is_active)
  const [steps, setSteps] = useState<SequenceStep[]>(
    [...initialSteps].sort((a, b) => a.position - b.position)
  )
  const [nameEditing, setNameEditing] = useState(false)
  const [savingName, setSavingName] = useState(false)
  const [savingActive, setSavingActive] = useState(false)

  // Add step form
  const [showAddForm, setShowAddForm] = useState(false)
  const [newSubject, setNewSubject] = useState('')
  const [newDelay, setNewDelay] = useState(1)
  const [addingStep, setAddingStep] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  async function saveName() {
    if (!name.trim() || name.trim() === sequence.name) {
      setName(sequence.name)
      setNameEditing(false)
      return
    }
    setSavingName(true)
    try {
      await fetch(`/api/sequences/${sequence.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      setNameEditing(false)
    } finally {
      setSavingName(false)
    }
  }

  async function toggleActive(val: boolean) {
    setSavingActive(true)
    setIsActive(val)
    try {
      await fetch(`/api/sequences/${sequence.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: val }),
      })
    } catch {
      setIsActive(!val)
    } finally {
      setSavingActive(false)
    }
  }

  async function moveStep(stepId: string, direction: 'up' | 'down') {
    const index = steps.findIndex((s) => s.id === stepId)
    if (index === -1) return
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === steps.length - 1) return

    const newSteps = [...steps]
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    const temp = newSteps[index]
    newSteps[index] = newSteps[swapIndex]
    newSteps[swapIndex] = temp

    // Reassign positions
    const updated = newSteps.map((s, i) => ({ ...s, position: i + 1 }))
    setSteps(updated)

    // Persist both swapped steps
    await Promise.all([
      fetch(`/api/sequences/${sequence.id}/steps/${updated[index].id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ position: updated[index].position }),
      }),
      fetch(`/api/sequences/${sequence.id}/steps/${updated[swapIndex].id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ position: updated[swapIndex].position }),
      }),
    ])
  }

  async function deleteStep(stepId: string) {
    if (!confirm('Supprimer cette étape ?')) return
    const res = await fetch(`/api/sequences/${sequence.id}/steps/${stepId}`, {
      method: 'DELETE',
    })
    if (res.ok) {
      setSteps((prev) => prev.filter((s) => s.id !== stepId))
    }
  }

  async function addStep(e: React.FormEvent) {
    e.preventDefault()
    if (!newSubject.trim()) return
    setAddingStep(true)
    setAddError(null)
    try {
      const res = await fetch(`/api/sequences/${sequence.id}/steps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: newSubject.trim(), delay_days: newDelay }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Erreur lors de l\'ajout')
      }
      const step: SequenceStep = await res.json()
      setSteps((prev) => [...prev, step])
      setNewSubject('')
      setNewDelay(1)
      setShowAddForm(false)
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setAddingStep(false)
    }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-gray-400">
        <Link href="/sequences" className="hover:text-gray-700 transition-colors">
          Séquences
        </Link>
        <ChevronRight size={14} />
        <span className="text-gray-600 truncate max-w-xs">{name}</span>
      </nav>

      {/* Header: name + active toggle */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          {nameEditing ? (
            <div className="flex items-center gap-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={saveName}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveName()
                  if (e.key === 'Escape') {
                    setName(sequence.name)
                    setNameEditing(false)
                  }
                }}
                className="text-xl font-semibold h-auto py-1 px-2"
                autoFocus
                disabled={savingName}
              />
            </div>
          ) : (
            <button
              onClick={() => setNameEditing(true)}
              className="group flex items-center gap-2 text-xl font-semibold text-gray-900 hover:text-gray-700"
            >
              {name}
              <Pencil
                size={14}
                className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm text-gray-500">
            {isActive ? 'Actif' : 'Inactif'}
          </span>
          <Switch
            checked={isActive}
            onCheckedChange={toggleActive}
            disabled={savingActive}
          />
        </div>
      </div>

      <Separator />

      {/* Steps list */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-gray-700">
          Étapes{' '}
          <span className="text-gray-400 font-normal">
            ({steps.length})
          </span>
        </h2>

        {steps.length === 0 && (
          <div className="text-center py-10 border border-dashed border-gray-200 rounded-lg text-sm text-gray-400">
            Aucune étape. Ajoute ta première étape ci-dessous.
          </div>
        )}

        <div className="space-y-2">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className="flex items-start gap-3 p-4 bg-white border border-gray-200 rounded-lg"
            >
              {/* Position badge */}
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-xs font-medium text-gray-600 shrink-0 mt-0.5">
                {step.position}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {step.subject}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {step.position === 1
                    ? 'Email initial'
                    : `${step.delay_days} jour${step.delay_days !== 1 ? 's' : ''} après l'étape précédente`}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => router.push(`/emails/${step.id}/edit`)}
                >
                  <Pencil size={12} className="mr-1" />
                  Modifier l'email
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={index === 0}
                  onClick={() => moveStep(step.id, 'up')}
                  title="Monter"
                >
                  <ChevronUp size={14} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={index === steps.length - 1}
                  onClick={() => moveStep(step.id, 'down')}
                  title="Descendre"
                >
                  <ChevronDown size={14} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                  onClick={() => deleteStep(step.id)}
                  title="Supprimer"
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add step */}
      {showAddForm ? (
        <form
          onSubmit={addStep}
          className="p-4 border border-gray-200 rounded-lg bg-gray-50 space-y-3"
        >
          <p className="text-sm font-medium text-gray-700">Nouvelle étape</p>
          <div className="flex gap-3">
            <div className="flex-1 space-y-1">
              <label className="text-xs text-gray-500">Sujet de l'email</label>
              <Input
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                placeholder="Ex : Comment débloquer ton apprentissage"
                autoFocus
              />
            </div>
            <div className="w-32 space-y-1">
              <label className="text-xs text-gray-500">Délai (jours)</label>
              <Input
                type="number"
                min={0}
                value={newDelay}
                onChange={(e) => setNewDelay(Number(e.target.value))}
              />
            </div>
          </div>
          {addError && <p className="text-xs text-red-600">{addError}</p>}
          <div className="flex items-center gap-2">
            <Button type="submit" size="sm" disabled={addingStep || !newSubject.trim()}>
              {addingStep ? 'Ajout…' : 'Ajouter'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowAddForm(false)
                setNewSubject('')
                setNewDelay(1)
                setAddError(null)
              }}
            >
              Annuler
            </Button>
          </div>
        </form>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAddForm(true)}
          className="w-full border-dashed"
        >
          <Plus size={14} className="mr-1.5" />
          Ajouter une étape
        </Button>
      )}
    </div>
  )
}
