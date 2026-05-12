import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const STRIPE_KEY = process.env.STRIPE_FR_KEY || ''

async function handle(req: NextRequest) {
  const supabase = createAdminClient()
  let markedPaid = 0

  // Fetch factures "impayé" payées sur Stripe
  const paidEmails = new Set<string>()
  const headers = { 'Authorization': `Bearer ${STRIPE_KEY}` }
  let hasMore = true
  let startingAfter: string | undefined

  while (hasMore) {
    const params = new URLSearchParams({ status: 'paid', limit: '100' })
    if (startingAfter) params.set('starting_after', startingAfter)

    const res = await fetch(`https://api.stripe.com/v1/invoices?${params}`, { headers })
    const data = await res.json()
    const invoices = data.data || []

    for (const inv of invoices) {
      const lines = inv.lines?.data || []
      const isImpaye = lines.some((l: { description?: string }) =>
        (l.description || '').toLowerCase().includes('impayé') ||
        (l.description || '').toLowerCase().includes('impaye')
      )
      if (isImpaye && inv.customer_email) {
        paidEmails.add(inv.customer_email.toLowerCase().trim())
      }
    }

    hasMore = data.has_more
    if (invoices.length > 0) startingAfter = invoices[invoices.length - 1].id
  }

  // Mettre à jour les impayés en base
  const { data: impayes } = await supabase
    .from('impayes')
    .select('id, email')
    .in('status', ['pending', 'in_progress'])

  if (impayes) {
    for (const imp of impayes) {
      if (paidEmails.has(imp.email.toLowerCase().trim())) {
        await supabase.from('impayes').update({ status: 'paid' }).eq('id', imp.id)
        markedPaid++
      }
    }
  }

  return NextResponse.json({ markedPaid, paidEmailsFound: paidEmails.size })
}

export const GET = handle
export const POST = handle
