import { type LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string
  icon: LucideIcon
  delta?: string
  deltaPositive?: boolean
  animationDelay?: number
  accentColor?: string
}

export default function StatCard({
  label,
  value,
  icon: Icon,
  delta,
  deltaPositive,
  animationDelay = 0,
  accentColor,
}: StatCardProps) {
  return (
    <div
      className="card-dark space-y-3"
      style={{
        animation: `fadeUp 0.3s ease ${animationDelay}ms both`,
        borderTop: accentColor ? `2px solid ${accentColor}` : undefined,
      }}
    >
      <div className="flex items-center justify-between">
        <p
          className="text-xs font-medium uppercase tracking-widest"
          style={{ color: 'var(--text-secondary)', letterSpacing: '0.08em' }}
        >
          {label}
        </p>
        <div
          className="rounded-lg p-1.5"
          style={{ background: 'var(--accent-subtle)' }}
        >
          <Icon size={15} style={{ color: 'var(--accent)' }} strokeWidth={1.75} />
        </div>
      </div>
      <div className="flex items-end gap-2">
        <p
          className="leading-none"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '32px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {value}
        </p>
        {delta !== undefined && (
          <span
            className="text-xs font-medium mb-0.5"
            style={{ color: deltaPositive ? 'var(--green)' : 'var(--red)' }}
          >
            {delta}
          </span>
        )}
      </div>
    </div>
  )
}
