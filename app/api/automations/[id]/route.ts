import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  let body: { is_active?: boolean }

  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (typeof body.is_active !== 'boolean') {
    return Response.json({ error: 'Missing required field: is_active (boolean)' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('tag_rules')
    .update({ is_active: body.is_active })
    .eq('id', id)
    .select('*')
    .single()

  if (error || !data) {
    return Response.json(
      { error: 'Failed to update tag rule', details: error?.message },
      { status: 500 }
    )
  }

  return Response.json(data)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createAdminClient()

  const { error } = await supabase.from('tag_rules').delete().eq('id', id)

  if (error) {
    return Response.json(
      { error: 'Failed to delete tag rule', details: error.message },
      { status: 500 }
    )
  }

  return Response.json({ ok: true })
}
