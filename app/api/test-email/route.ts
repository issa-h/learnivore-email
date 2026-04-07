import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/ses'

export async function POST(req: NextRequest) {
  let body: unknown

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { to, subject, htmlBody } = body as {
    to?: string
    subject?: string
    htmlBody?: string
  }

  if (!to || typeof to !== 'string') {
    return NextResponse.json({ error: 'Missing or invalid "to" field' }, { status: 400 })
  }

  if (!subject || typeof subject !== 'string') {
    return NextResponse.json({ error: 'Missing or invalid "subject" field' }, { status: 400 })
  }

  if (!htmlBody || typeof htmlBody !== 'string') {
    return NextResponse.json({ error: 'Missing or invalid "htmlBody" field' }, { status: 400 })
  }

  // Basic email format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(to)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
  }

  try {
    const messageId = await sendEmail({ to, subject, htmlBody })
    return NextResponse.json({ success: true, messageId })
  } catch (err) {
    console.error('Test email send failed:', err)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
