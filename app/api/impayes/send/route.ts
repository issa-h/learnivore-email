import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/ses'
import { buildEmail, getSteps } from '@/lib/impayes-templates'

export const dynamic = 'force-dynamic'

// J0 = 2026-04-27
// EB: J0 → J+7 → J+14
// RE: J0 → J+3 → J+7
const J0 = new Date('2026-04-27T08:00:00Z')

const STRIPE_KEY = process.env.STRIPE_FR_KEY || ''

function getScheduledDate(sequenceName: string, stepIndex: number): Date {
  const steps = getSteps(sequenceName)
  const delayDays = steps[stepIndex]?.delay_days ?? 0
  const date = new Date(J0)
  date.setDate(date.getDate() + delayDays)
  return date
}

// Vérifie sur Stripe quelles factures "Règlement d'impayé" ont été payées
async function fetchPaidInvoiceEmails(): Promise<Set<string>> {
  const paidEmails = new Set<string>()
  if (!STRIPE_KEY) return paidEmails

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

  return paidEmails
}

async function handle(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const supabase = createAdminClient()
  const now = new Date()
  let sent = 0
  let skipped = 0
  let failed = 0
  let markedPaid = 0

  // 1. Fetch all impayes that are pending or in_progress
  const { data: impayes, error } = await supabase
    .from('impayes')
    .select('*')
    .in('status', ['pending', 'in_progress'])

  if (error || !impayes) {
    return NextResponse.json({ error: error?.message || 'No data' }, { status: 500 })
  }

  // 2. Vérifier sur Stripe (appel séparé via /api/impayes/check-paid)
  // La vérification Stripe est trop lente pour le cron hobby (10s timeout)
  // On vérifie juste le statut en base

  for (const imp of impayes) {

    const stepIndex = imp.current_step
    const steps = getSteps(imp.sequence_name)

    // Séquence terminée
    if (stepIndex >= steps.length) {
      skipped++
      continue
    }

    // Vérifier si c'est le moment d'envoyer
    const scheduledDate = getScheduledDate(imp.sequence_name, stepIndex)
    if (now < scheduledDate) {
      skipped++
      continue
    }

    // Vérifier qu'on n'a pas déjà envoyé ce step (éviter doublons)
    if (imp.last_email_sent_at) {
      const lastSent = new Date(imp.last_email_sent_at)
      const hoursSinceLastSend = (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60)
      if (hoursSinceLastSend < 20) {
        skipped++
        continue
      }
    }

    // Construire l'email personnalisé
    const email = buildEmail(imp.sequence_name, stepIndex, {
      prenom: imp.first_name,
      date_inscription: imp.date_inscription || '',
      montant_paye: imp.montant_paye,
      montant_total: imp.prix_programme,
      montant_restant: imp.montant_du,
      lien_paiement: imp.lien_paiement || '',
    })

    if (!email) {
      skipped++
      continue
    }

    try {
      await sendEmail({
        to: imp.email,
        subject: email.subject,
        htmlBody: email.htmlBody,
        replyTo: 'contact@learnivore.fr',
      })

      const nextStep = stepIndex + 1
      const isComplete = nextStep >= steps.length

      await supabase
        .from('impayes')
        .update({
          current_step: nextStep,
          status: isComplete ? 'completed' : 'in_progress',
          last_email_sent_at: now.toISOString(),
        })
        .eq('id', imp.id)

      sent++
    } catch (err) {
      console.error(`Failed to send to ${imp.email}:`, err)
      failed++
    }
  }

  return NextResponse.json({ sent, skipped, failed, markedPaid, total: impayes.length })
}

export const GET = handle
export const POST = handle
