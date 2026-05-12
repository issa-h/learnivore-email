import { NextRequest } from 'next/server'
import { sendEmail } from '@/lib/ses'

const PREVIEW_EMAIL = 'contact@learnivore.fr'

export async function POST(req: NextRequest) {
  let body: {
    subject: string
    html_body: string
    first_name?: string
  }

  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.subject || !body.html_body) {
    return Response.json({ error: 'Missing required fields: subject, html_body' }, { status: 400 })
  }

  const firstName = body.first_name || ''
  const subject = `[PREVIEW] ${body.subject.replace(/\{\{first_name\}\}/g, firstName)}`
  const htmlBody = body.html_body.replace(/\{\{first_name\}\}/g, firstName)

  try {
    const messageId = await sendEmail({
      to: PREVIEW_EMAIL,
      subject,
      htmlBody,
    })

    return Response.json({ ok: true, message_id: messageId, sent_to: PREVIEW_EMAIL })
  } catch (err) {
    return Response.json(
      { error: 'Failed to send preview', details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
