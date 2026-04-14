'use client'

import { useState, useTransition } from 'react'
import { Plus, Zap, ArrowRight, Trash2 } from 'lucide-react'

interface TagRuleWithName {
  id: string
  tag: string
  sequence_id: string
  sequence_name: string
  is_active: boolean
  created_at: string
}

interface Props {
  rules: TagRuleWithName[]
  sequences: { id: string; name: string }[]
  existingTags: string[]
}

export function AutomationsClient({ rules: initialRules, sequences, existingTags }: Props) {
  const [rules, setRules] = useState<TagRuleWithName[]>(initialRules)
  const [showForm, setShowForm] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [sequenceId, setSequenceId] = useState(sequences[0]?.id ?? '')
  const [formError, setFormError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function handleCreate() {
    setFormError(null)
    if (!tagInput.trim()) {
      setFormError('Le tag est requis.')
      return
    }
    if (!sequenceId) {
      setFormError('Sélectionne une séquence.')
      return
    }

    startTransition(async () => {
      const res = await fetch('/api/automations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag: tagInput.trim(), sequence_id: sequenceId }),
      })

      if (!res.ok) {
        const json = await res.json()
        setFormError(json.error ?? 'Erreur lors de la création.')
        return
      }

      const created = await res.json()
      const seqName = sequences.find((s) => s.id === sequenceId)?.name ?? sequenceId
      setRules((prev) => [{ ...created, sequence_name: seqName }, ...prev])
      setTagInput('')
      setSequenceId(sequences[0]?.id ?? '')
      setShowForm(false)
    })
  }

  async function handleToggle(id: string, isActive: boolean) {
    const res = await fetch(`/api/automations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: isActive }),
    })

    if (res.ok) {
      setRules((prev) =>
        prev.map((r) => (r.id === id ? { ...r, is_active: isActive } : r))
      )
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette règle d\'automation ?')) return

    const res = await fetch(`/api/automations/${id}`, { method: 'DELETE' })

    if (res.ok) {
      setRules((prev) => prev.filter((r) => r.id !== id))
    }
  }

  return (
    <div style={{ padding: '32px 40px', maxWidth: 800 }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 24,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 600,
              color: 'var(--text-primary)',
              marginBottom: 4,
            }}
          >
            Automations
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            Enrôle automatiquement les contacts dans une séquence lorsqu&apos;un tag leur est attribué.
          </p>
        </div>

        <button
          onClick={() => setShowForm((v) => !v)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            borderRadius: 8,
            background: showForm ? 'var(--bg-elevated)' : 'var(--accent)',
            color: showForm ? 'var(--text-primary)' : '#ffffff',
            border: showForm ? '1px solid var(--border-default)' : 'none',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          <Plus size={14} />
          Nouvelle règle
        </button>
      </div>

      {/* Inline form */}
      {showForm && (
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: 10,
            padding: '20px 24px',
            marginBottom: 24,
          }}
        >
          <p
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text-primary)',
              marginBottom: 14,
            }}
          >
            Nouvelle règle d&apos;automation
          </p>

          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            {/* Tag input with datalist */}
            <div style={{ flex: 1, minWidth: 160 }}>
              <label
                style={{
                  display: 'block',
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  marginBottom: 6,
                  fontWeight: 500,
                }}
              >
                Tag déclencheur
              </label>
              <input
                list="existing-tags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="ex: lead_magnet"
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: 7,
                  border: '1px solid var(--border-default)',
                  background: 'var(--bg-elevated)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <datalist id="existing-tags">
                {existingTags.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </div>

            {/* Sequence dropdown */}
            <div style={{ flex: 1, minWidth: 160 }}>
              <label
                style={{
                  display: 'block',
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  marginBottom: 6,
                  fontWeight: 500,
                }}
              >
                Séquence cible
              </label>
              <select
                value={sequenceId}
                onChange={(e) => setSequenceId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: 7,
                  border: '1px solid var(--border-default)',
                  background: 'var(--bg-elevated)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  outline: 'none',
                  boxSizing: 'border-box',
                  cursor: 'pointer',
                }}
              >
                {sequences.length === 0 && (
                  <option value="" disabled>
                    Aucune séquence disponible
                  </option>
                )}
                {sequences.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Submit button */}
            <button
              onClick={handleCreate}
              disabled={isPending}
              style={{
                padding: '7px 18px',
                borderRadius: 7,
                background: 'var(--accent)',
                color: '#ffffff',
                border: 'none',
                fontSize: 13,
                fontWeight: 500,
                cursor: isPending ? 'not-allowed' : 'pointer',
                opacity: isPending ? 0.6 : 1,
                whiteSpace: 'nowrap',
                height: 36,
              }}
            >
              {isPending ? 'En cours…' : 'Ajouter'}
            </button>
          </div>

          {formError && (
            <p style={{ fontSize: 12, color: 'var(--red)', marginTop: 8 }}>{formError}</p>
          )}
        </div>
      )}

      {/* Rules list */}
      {rules.length === 0 ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '64px 24px',
            border: '1px dashed var(--border-default)',
            borderRadius: 12,
            background: 'var(--bg-surface)',
            textAlign: 'center',
          }}
        >
          <Zap size={32} style={{ color: 'var(--text-tertiary)', marginBottom: 12 }} />
          <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>
            Aucune règle d&apos;automation
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 4 }}>
            Crée une règle pour enrôler automatiquement des contacts dans une séquence.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rules.map((rule) => (
            <div
              key={rule.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
                padding: '14px 18px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 10,
                opacity: rule.is_active ? 1 : 0.6,
                transition: 'opacity 0.15s',
              }}
            >
              {/* Tag → Sequence */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '3px 10px',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 600,
                    background: 'var(--accent-subtle)',
                    color: 'var(--accent-hover)',
                    border: '1px solid rgba(99,102,241,0.2)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {rule.tag}
                </span>

                <ArrowRight size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />

                <span
                  style={{
                    fontSize: 13,
                    color: 'var(--text-primary)',
                    fontWeight: 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {rule.sequence_name}
                </span>
              </div>

              {/* Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                {/* Toggle switch */}
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {rule.is_active ? 'Actif' : 'Inactif'}
                  </span>
                  <div
                    role="switch"
                    aria-checked={rule.is_active}
                    onClick={() => handleToggle(rule.id, !rule.is_active)}
                    style={{
                      position: 'relative',
                      width: 36,
                      height: 20,
                      borderRadius: 10,
                      background: rule.is_active ? 'var(--accent)' : 'var(--border-default)',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        top: 2,
                        left: rule.is_active ? 18 : 2,
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        background: '#ffffff',
                        transition: 'left 0.2s',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                      }}
                    />
                  </div>
                </label>

                {/* Delete button */}
                <button
                  onClick={() => handleDelete(rule.id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 30,
                    height: 30,
                    borderRadius: 6,
                    border: '1px solid var(--border-subtle)',
                    background: 'transparent',
                    color: 'var(--text-tertiary)',
                    cursor: 'pointer',
                    transition: 'color 0.15s, border-color 0.15s, background 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--red)'
                    e.currentTarget.style.borderColor = 'var(--red)'
                    e.currentTarget.style.background = 'rgba(239,68,68,0.08)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--text-tertiary)'
                    e.currentTarget.style.borderColor = 'var(--border-subtle)'
                    e.currentTarget.style.background = 'transparent'
                  }}
                  title="Supprimer la règle"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
