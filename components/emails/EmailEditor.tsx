'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TiptapLink from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { SequenceStep } from '@/types'
import {
  Bold,
  Italic,
  Link as LinkIcon,
  Heading2,
  List,
  ChevronRight,
  Save,
  Send,
} from 'lucide-react'

interface Props {
  step: SequenceStep
  sequenceName: string
  sequenceId: string
}

export default function EmailEditor({ step, sequenceName, sequenceId }: Props) {
  const [subject, setSubject] = useState(step.subject)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const editor = useEditor({
    extensions: [
      StarterKit,
      TiptapLink.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: 'Écris ton email ici…' }),
    ],
    content: step.html_body || '',
    immediatelyRender: false,
  })

  const setLink = useCallback(() => {
    if (!editor) return
    const previousUrl = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('URL du lien', previousUrl ?? '')
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor
      .chain()
      .focus()
      .extendMarkRange('link')
      .setLink({ href: url })
      .run()
  }, [editor])

  async function handleSave() {
    if (!editor) return
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const res = await fetch(`/api/steps/${step.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: subject.trim(),
          html_body: editor.getHTML(),
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Erreur lors de la sauvegarde')
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setSaving(false)
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
  }

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm flex-wrap" style={{ color: 'var(--text-secondary)' }}>
        <Link
          href="/sequences"
          className="transition-colors hover:underline"
          style={{ color: 'var(--text-secondary)' }}
        >
          Séquences
        </Link>
        <ChevronRight size={14} style={{ color: 'var(--text-tertiary)' }} />
        <Link
          href={`/sequences/${sequenceId}/edit`}
          className="transition-colors hover:underline truncate max-w-xs"
          style={{ color: 'var(--text-secondary)' }}
        >
          {sequenceName}
        </Link>
        <ChevronRight size={14} style={{ color: 'var(--text-tertiary)' }} />
        <span style={{ color: 'var(--text-primary)' }}>Étape {step.position}</span>
      </nav>

      {/* Subject input */}
      <div className="space-y-1.5">
        <label
          htmlFor="subject"
          className="text-sm font-medium"
          style={{ color: 'var(--text-secondary)' }}
        >
          Sujet
        </label>
        <input
          id="subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Ex : Bienvenue dans la formation"
          style={{ ...inputStyle, fontSize: '15px' }}
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

      <div style={{ borderTop: '1px solid var(--border-subtle)' }} />

      {/* Tiptap editor */}
      <div className="space-y-2">
        <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Corps de l&apos;email
        </label>

        {/* Toolbar */}
        <div
          className="flex items-center gap-0.5 p-1.5 rounded-t-lg"
          style={{
            border: '1px solid var(--border-default)',
            borderBottom: 'none',
            background: 'var(--bg-elevated)',
          }}
        >
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleBold().run()}
            active={editor?.isActive('bold') ?? false}
            title="Gras"
          >
            <Bold size={14} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            active={editor?.isActive('italic') ?? false}
            title="Italique"
          >
            <Italic size={14} />
          </ToolbarButton>
          <ToolbarButton
            onClick={setLink}
            active={editor?.isActive('link') ?? false}
            title="Lien"
          >
            <LinkIcon size={14} />
          </ToolbarButton>
          <div
            className="w-px h-4 mx-1"
            style={{ background: 'var(--border-default)' }}
          />
          <ToolbarButton
            onClick={() =>
              editor?.chain().focus().toggleHeading({ level: 2 }).run()
            }
            active={editor?.isActive('heading', { level: 2 }) ?? false}
            title="Titre H2"
          >
            <Heading2 size={14} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            active={editor?.isActive('bulletList') ?? false}
            title="Liste à puces"
          >
            <List size={14} />
          </ToolbarButton>
        </div>

        {/* Editor area */}
        <div
          className="tiptap-dark"
          style={{
            border: '1px solid var(--border-default)',
            borderRadius: '0 0 10px 10px',
            background: 'var(--bg-elevated)',
            minHeight: '256px',
          }}
        >
          <EditorContent
            editor={editor}
            className="min-h-64 focus-within:outline-none"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: 'var(--accent)', color: '#ffffff', border: 'none', cursor: 'pointer' }}
        >
          <Save size={14} />
          {saving ? 'Sauvegarde…' : saved ? 'Sauvegardé !' : 'Sauvegarder'}
        </button>
        <button
          disabled
          title="Disponible prochainement"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium opacity-40 cursor-not-allowed"
          style={{
            border: '1px solid var(--border-default)',
            background: 'transparent',
            color: 'var(--text-secondary)',
          }}
        >
          <Send size={14} />
          Envoyer un test
        </button>
        {error && (
          <p className="text-sm" style={{ color: 'var(--red)' }}>{error}</p>
        )}
      </div>
    </div>
  )
}

function ToolbarButton({
  children,
  onClick,
  active,
  title,
}: {
  children: React.ReactNode
  onClick: () => void
  active: boolean
  title: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="p-1.5 rounded transition-colors"
      style={{
        background: active ? 'var(--accent-subtle)' : 'transparent',
        color: active ? 'var(--accent-hover)' : 'var(--text-secondary)',
        border: 'none',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background = 'var(--bg-overlay)'
          e.currentTarget.style.color = 'var(--text-primary)'
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = 'var(--text-secondary)'
        }
      }}
    >
      {children}
    </button>
  )
}
