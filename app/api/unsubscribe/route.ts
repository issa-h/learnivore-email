import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const sid = req.nextUrl.searchParams.get('sid')

  if (!sid) {
    return new Response(htmlPage('Lien invalide', 'Ce lien de désinscription est invalide.'), {
      status: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  const supabase = createAdminClient()

  // Lookup contact from send_queue
  const { data: queueItem } = await supabase
    .from('send_queue')
    .select('contact_id')
    .eq('id', sid)
    .single()

  if (!queueItem) {
    return new Response(htmlPage('Lien invalide', 'Ce lien de désinscription est invalide ou expiré.'), {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  // Insert global unsubscribe (ignore if already exists)
  await supabase
    .from('unsubscribes')
    .upsert(
      { contact_id: queueItem.contact_id, scope: 'global' },
      { onConflict: 'contact_id,scope,sequence_id' }
    )

  return new Response(
    htmlPage(
      'Désinscription confirmée',
      'Tu as été désinscrit(e) des emails de Learnivore. Tu ne recevras plus de messages de notre part.'
    ),
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  )
}

function htmlPage(title: string, message: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} — Learnivore</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #fafafa; color: #333; }
    .card { text-align: center; max-width: 400px; padding: 48px 32px; }
    h1 { font-size: 20px; margin-bottom: 12px; }
    p { font-size: 15px; color: #666; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    <p>${message}</p>
  </div>
</body>
</html>`
}
