'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TiptapLink from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { SequenceStep } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
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

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-gray-400 flex-wrap">
        <Link href="/sequences" className="hover:text-gray-700 transition-colors">
          Séquences
        </Link>
        <ChevronRight size={14} />
        <Link
          href={`/sequences/${sequenceId}/edit`}
          className="hover:text-gray-700 transition-colors truncate max-w-xs"
        >
          {sequenceName}
        </Link>
        <ChevronRight size={14} />
        <span className="text-gray-600">Étape {step.position}</span>
      </nav>

      {/* Subject input */}
      <div className="space-y-1.5">
        <label htmlFor="subject" className="text-sm font-medium text-gray-700">
          Sujet
        </label>
        <Input
          id="subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Ex : Bienvenue dans la formation"
          className="text-base"
        />
      </div>

      <Separator />

      {/* Tiptap editor */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Corps de l'email</label>

        {/* Toolbar */}
        <div className="flex items-center gap-0.5 p-1.5 border border-gray-200 rounded-t-lg bg-gray-50">
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
          <div className="w-px h-4 bg-gray-200 mx-1" />
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
        <div className="border border-t-0 border-gray-200 rounded-b-lg bg-white min-h-64 prose prose-sm max-w-none">
          <EditorContent
            editor={editor}
            className="p-4 min-h-64 focus-within:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-56 [&_.tiptap_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.tiptap_p.is-editor-empty:first-child::before]:text-gray-400 [&_.tiptap_p.is-editor-empty:first-child::before]:pointer-events-none [&_.tiptap_p.is-editor-empty:first-child::before]:float-left [&_.tiptap_p.is-editor-empty:first-child::before]:h-0"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving}>
          <Save size={14} className="mr-1.5" />
          {saving ? 'Sauvegarde…' : saved ? 'Sauvegardé !' : 'Sauvegarder'}
        </Button>
        <Button variant="outline" disabled title="Disponible prochainement">
          <Send size={14} className="mr-1.5" />
          Envoyer un test
        </Button>
        {error && <p className="text-sm text-red-600">{error}</p>}
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
      className={`p-1.5 rounded transition-colors ${
        active
          ? 'bg-gray-200 text-gray-900'
          : 'text-gray-500 hover:bg-gray-200 hover:text-gray-900'
      }`}
    >
      {children}
    </button>
  )
}
