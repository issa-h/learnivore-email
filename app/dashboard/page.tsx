export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/server'
import { Users, MailOpen, MousePointerClick } from 'lucide-react'
import StatCard from '@/components/dashboard/StatCard'
import SequenceStatsTable, {
  type SequenceStat,
} from '@/components/dashboard/SequenceStatsTable'
import ActivityFeed, {
  type ActivityEvent,
} from '@/components/dashboard/ActivityFeed'

export const metadata = {
  title: 'Tableau de bord — Learnivore Email',
}

function formatPercent(value: number): string {
  return value.toLocaleString('fr-FR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }) + '%'
}

export default async function DashboardPage() {
  const supabase = createAdminClient()

  // ── 1. Total contacts ──────────────────────────────────────────────────────
  const { count: totalContacts } = await supabase
    .from('contacts')
    .select('id', { count: 'exact', head: true })

  // ── 2. Stats globales (agrégées depuis sequence_steps + events réels) ────
  // Historique TinyPages (stocké sur les steps)
  const { data: allSteps } = await supabase
    .from('sequence_steps')
    .select('total_sent, total_opens, total_clicks')

  const histSent = (allSteps ?? []).reduce((s, r) => s + (r.total_sent ?? 0), 0)
  const histOpens = (allSteps ?? []).reduce((s, r) => s + (r.total_opens ?? 0), 0)
  const histClicks = (allSteps ?? []).reduce((s, r) => s + (r.total_clicks ?? 0), 0)

  // Events réels (envoyés depuis la plateforme)
  const { count: realSent } = await supabase
    .from('send_queue')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'sent')

  const { data: realOpenEvents } = await supabase
    .from('email_events')
    .select('send_queue_id')
    .eq('event_type', 'open')

  const { data: realClickEvents } = await supabase
    .from('email_events')
    .select('send_queue_id')
    .eq('event_type', 'click')

  const realOpens = new Set(realOpenEvents?.map((e) => e.send_queue_id) ?? []).size
  const realClicks = new Set(realClickEvents?.map((e) => e.send_queue_id) ?? []).size

  // Combiner historique + réel
  const totalSent = histSent + (realSent ?? 0)
  const totalOpens = histOpens + realOpens
  const totalClicks = histClicks + realClicks

  const openRate = totalSent > 0 ? (totalOpens / totalSent) * 100 : 0
  const clickRate = totalSent > 0 ? (totalClicks / totalSent) * 100 : 0

  // ── 3. Stats par séquence ─────────────────────────────────────────────────
  const { data: allSequences } = await supabase
    .from('sequences')
    .select('id, name')
    .order('created_at', { ascending: false })

  const sequenceStats: SequenceStat[] = []

  for (const seq of allSequences ?? []) {
    const { count: enrolled } = await supabase
      .from('enrollments')
      .select('id', { count: 'exact', head: true })
      .eq('sequence_id', seq.id)

    // Steps avec stats agrégées
    const { data: steps } = await supabase
      .from('sequence_steps')
      .select('id, total_sent, total_opens, total_clicks')
      .eq('sequence_id', seq.id)

    const stepIds = steps?.map((s) => s.id) ?? []

    // Stats historiques (agrégées sur les steps)
    const hSent = (steps ?? []).reduce((s, r) => s + (r.total_sent ?? 0), 0)
    const hOpens = (steps ?? []).reduce((s, r) => s + (r.total_opens ?? 0), 0)
    const hClicks = (steps ?? []).reduce((s, r) => s + (r.total_clicks ?? 0), 0)

    // Stats réelles (events dans la plateforme)
    let rSent = 0
    if (stepIds.length > 0) {
      const { count } = await supabase
        .from('send_queue')
        .select('id', { count: 'exact', head: true })
        .in('sequence_step_id', stepIds)
        .eq('status', 'sent')
      rSent = count ?? 0
    }

    // Opens et clics réels depuis email_events
    let rOpens = 0
    let rClicks = 0
    if (stepIds.length > 0) {
      const { data: seqOpenEvents } = await supabase
        .from('email_events')
        .select('send_queue_id')
        .eq('event_type', 'open')
        .in('sequence_step_id', stepIds)

      const { data: seqClickEvents } = await supabase
        .from('email_events')
        .select('send_queue_id')
        .eq('event_type', 'click')
        .in('sequence_step_id', stepIds)

      rOpens = new Set(seqOpenEvents?.map((e) => e.send_queue_id) ?? []).size
      rClicks = new Set(seqClickEvents?.map((e) => e.send_queue_id) ?? []).size
    }

    const seqTotalSent = hSent + rSent
    const seqTotalOpens = hOpens + rOpens
    const seqTotalClicks = hClicks + rClicks
    let seqOpenRate: number | null = null
    let seqClickRate: number | null = null

    if (seqTotalSent > 0) {
      seqOpenRate = (seqTotalOpens / seqTotalSent) * 100
      seqClickRate = (seqTotalClicks / seqTotalSent) * 100
    }

    sequenceStats.push({
      id: seq.id,
      name: seq.name,
      enrolled: enrolled ?? 0,
      sent: seqTotalSent,
      openRate: seqOpenRate,
      clickRate: seqClickRate,
    })
  }

  // ── 4. Activité récente ───────────────────────────────────────────────────
  const { data: recentEvents } = await supabase
    .from('email_events')
    .select(
      'id, event_type, occurred_at, contact_id, sequence_step_id'
    )
    .order('occurred_at', { ascending: false })
    .limit(15)

  const activityEvents: ActivityEvent[] = []

  for (const event of recentEvents ?? []) {
    // Fetch contact name
    const { data: contact } = await supabase
      .from('contacts')
      .select('first_name, email')
      .eq('id', event.contact_id)
      .single()

    // Fetch email subject
    const { data: step } = await supabase
      .from('sequence_steps')
      .select('subject')
      .eq('id', event.sequence_step_id)
      .single()

    activityEvents.push({
      id: event.id,
      eventType: event.event_type,
      contactFirstName: contact?.first_name ?? null,
      contactEmail: contact?.email ?? '',
      subject: step?.subject ?? '(sans objet)',
      occurredAt: event.occurred_at,
    })
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const contactCount = totalContacts ?? 0

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Header with data freshness indicator */}
      <div className="flex items-start justify-between">
        <div>
          <h1
            className="font-semibold"
            style={{ fontSize: '24px', color: 'var(--text-primary)' }}
          >
            Tableau de bord
          </h1>
          <p
            className="text-sm mt-0.5"
            style={{ color: 'var(--text-secondary)' }}
          >
            Vue d&rsquo;ensemble de vos campagnes email
          </p>
        </div>
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <span className="pulse-dot" />
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Actualisé à l&apos;instant
          </span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Total contacts"
          value={contactCount.toLocaleString('fr-FR')}
          icon={Users}
          animationDelay={0}
          accentColor="var(--accent)"
        />
        <StatCard
          label="Taux d'ouverture"
          value={totalSent > 0 ? formatPercent(openRate) : '—'}
          icon={MailOpen}
          animationDelay={60}
          accentColor="var(--green)"
        />
        <StatCard
          label="Taux de clic"
          value={totalSent > 0 ? formatPercent(clickRate) : '—'}
          icon={MousePointerClick}
          animationDelay={120}
          accentColor="#06b6d4"
        />
      </div>

      {/* Sequence stats */}
      <div className="space-y-3" style={{ animation: 'fadeUp 0.3s ease 180ms both' }}>
        <h2
          className="text-xs font-medium uppercase"
          style={{
            color: 'var(--text-secondary)',
            letterSpacing: '0.08em',
          }}
        >
          Stats par séquence
        </h2>
        <SequenceStatsTable sequences={sequenceStats} />
      </div>

      {/* Activity feed */}
      <div className="space-y-3" style={{ animation: 'fadeUp 0.3s ease 240ms both' }}>
        <h2
          className="text-xs font-medium uppercase"
          style={{
            color: 'var(--text-secondary)',
            letterSpacing: '0.08em',
          }}
        >
          Activité récente
        </h2>
        <div
          className="px-4"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
          }}
        >
          <ActivityFeed events={activityEvents} />
        </div>
      </div>
    </div>
  )
}
