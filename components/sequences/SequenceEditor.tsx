'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Sequence, SequenceStep } from '@/types'
import { Switch } from '@/components/ui/switch'
import {
  ChevronUp,
  ChevronDown,
  Trash2,
  Pencil,
  Plus,
  ChevronRight,
  MailOpen,
  MousePointerClick,
  Send,
} from 'lucide-react'

interface StepStat {
  sent: number
  openRate: number | null
  clickRate: number | null
}

interface Props {
  sequence: Sequence
  steps: SequenceStep[]
  stepStats?: Record<string, StepStat>
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
}

const btnGhost: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '4px',
  borderRadius: '6px',
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  color: 'var(--text-secondary)',
  transition: 'background 0.1s ease, color 0.1s ease',
}

function formatRate(rate: number | null): string {
  if (rate === null) return '—'
  return rate.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%'
}

export default function SequenceEditor({ sequence, steps: initialSteps, stepStats }: Props) {
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

    const updated = newSteps.map((s, i) => ({ ...s, position: i + 1 }))
    setSteps(updated)

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
        throw new Error(body.error ?? "Erreur lors de l'ajout")
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
      <nav className="flex items-center gap-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
        <Link
          href="/sequences"
          className="transition-colors hover:underline"
          style={{ color: 'var(--text-secondary)' }}
        >
          Séquences
        </Link>
        <ChevronRight size={14} style={{ color: 'var(--text-tertiary)' }} />
        <span className="truncate max-w-xs" style={{ color: 'var(--text-primary)' }}>{name}</span>
      </nav>

      {/* Header: name + active toggle */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          {nameEditing ? (
            <div className="flex items-center gap-2">
              <input
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
                className="flex-1 text-xl font-semibold py-1 px-2 rounded-lg"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--accent)',
                  color: 'var(--text-primary)',
                  boxShadow: '0 0 0 2px var(--accent-subtle)',
                  outline: 'none',
                }}
                autoFocus
                disabled={savingName}
              />
            </div>
          ) : (
            <button
              onClick={() => setNameEditing(true)}
              className="group flex items-center gap-2 text-xl font-semibold"
              style={{ color: 'var(--text-primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              {name}
              <Pencil
                size={14}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: 'var(--text-tertiary)' }}
              />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {isActive ? 'Actif' : 'Inactif'}
          </span>
          <Switch
            checked={isActive}
            onCheckedChange={toggleActive}
            disabled={savingActive}
          />
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--border-subtle)' }} />

      {/* Steps list */}
      <div className="space-y-3">
        <h2
          className="text-xs font-medium uppercase"
          style={{ color: 'var(--text-secondary)', letterSpacing: '0.08em' }}
        >
          Étapes{' '}
          <span className="font-normal" style={{ color: 'var(--text-tertiary)' }}>
            ({steps.length})
          </span>
        </h2>

        {steps.length === 0 && (
          <div
            className="text-center py-10 text-sm"
            style={{
              border: '1px dashed var(--border-default)',
              borderRadius: '12px',
              color: 'var(--text-tertiary)',
            }}
          >
            Aucune étape. Ajoute ta première étape ci-dessous.
          </div>
        )}

        <div className="space-y-2">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className="flex items-start gap-3 p-4"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '10px',
              }}
            >
              {/* Position badge */}
              <div
                className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium shrink-0 mt-0.5"
                style={{
                  background: 'var(--accent-subtle)',
                  color: 'var(--accent)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {step.position}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                  {step.subject}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                  {step.position === 1
                    ? 'Email initial'
                    : `${step.delay_days} jour${step.delay_days !== 1 ? 's' : ''} après l'étape précédente`}
                </p>
                {stepStats?.[step.id] && stepStats[step.id].sent > 0 && (
                  <div className="flex items-center gap-3 mt-2">
                    <span
                      className="inline-flex items-center gap-1 text-xs"
                      style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}
                    >
                      <Send size={11} style={{ color: 'var(--text-tertiary)' }} />
                      {stepStats[step.id].sent.toLocaleString('fr-FR')}
                    </span>
                    <span
                      className="inline-flex items-center gap-1 text-xs"
                      style={{ color: 'var(--green)', fontFamily: 'var(--font-mono)' }}
                    >
                      <MailOpen size={11} />
                      {formatRate(stepStats[step.id].openRate)}
                    </span>
                    <span
                      className="inline-flex items-center gap-1 text-xs"
                      style={{ color: 'var(--accent-hover)', fontFamily: 'var(--font-mono)' }}
                    >
                      <MousePointerClick size={11} />
                      {formatRate(stepStats[step.id].clickRate)}
                    </span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors"
                  style={{
                    color: 'var(--text-secondary)',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                  onClick={() => router.push(`/emails/${step.id}/edit`)}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-elevated)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                >
                  <Pencil size={12} />
                  Modifier l&apos;email
                </button>
                <button
                  style={btnGhost}
                  disabled={index === 0}
                  onClick={() => moveStep(step.id, 'up')}
                  title="Monter"
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-elevated)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  style={btnGhost}
                  disabled={index === steps.length - 1}
                  onClick={() => moveStep(step.id, 'down')}
                  title="Descendre"
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-elevated)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                >
                  <ChevronDown size={14} />
                </button>
                <button
                  style={{ ...btnGhost, color: 'var(--red)' }}
                  onClick={() => deleteStep(step.id)}
                  title="Supprimer"
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--red-subtle)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add step */}
      {showAddForm ? (
        <form
          onSubmit={addStep}
          className="p-4 space-y-3"
          style={{
            border: '1px solid var(--border-default)',
            borderRadius: '12px',
            background: 'var(--bg-elevated)',
          }}
        >
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Nouvelle étape
          </p>
          <div className="flex gap-3">
            <div className="flex-1 space-y-1">
              <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Sujet de l&apos;email
              </label>
              <input
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                placeholder="Ex : Comment débloquer ton apprentissage"
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
            <div className="w-32 space-y-1">
              <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Délai (jours)
              </label>
              <input
                type="number"
                min={0}
                value={newDelay}
                onChange={(e) => setNewDelay(Number(e.target.value))}
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
          </div>
          {addError && (
            <p className="text-xs" style={{ color: 'var(--red)' }}>{addError}</p>
          )}
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={addingStep || !newSubject.trim()}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: 'var(--accent)', color: '#ffffff', border: 'none', cursor: 'pointer' }}
            >
              {addingStep ? 'Ajout…' : 'Ajouter'}
            </button>
            <button
              type="button"
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={{ color: 'var(--text-secondary)', background: 'transparent', border: 'none', cursor: 'pointer' }}
              onClick={() => {
                setShowAddForm(false)
                setNewSubject('')
                setNewDelay(1)
                setAddError(null)
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-overlay)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              Annuler
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 transition-colors"
          style={{
            border: '1px dashed var(--border-default)',
            background: 'transparent',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent)'
            e.currentTarget.style.color = 'var(--accent)'
            e.currentTarget.style.background = 'var(--accent-subtle)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-default)'
            e.currentTarget.style.color = 'var(--text-secondary)'
            e.currentTarget.style.background = 'transparent'
          }}
        >
          <Plus size={14} />
          Ajouter une étape
        </button>
      )}
    </div>
  )
}
