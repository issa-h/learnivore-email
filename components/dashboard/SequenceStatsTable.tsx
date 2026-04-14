'use client'

export interface SequenceStat {
  id: string
  name: string
  enrolled: number
  sent: number
  openRate: number | null
  clickRate: number | null
}

interface SequenceStatsTableProps {
  sequences: SequenceStat[]
}

function formatRate(rate: number | null, sent: number): string {
  if (sent === 0 || rate === null) return '—'
  return rate.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%'
}

const thStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 500,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--text-tertiary)',
  padding: '12px 16px',
  textAlign: 'left',
  borderBottom: '1px solid var(--border-subtle)',
  whiteSpace: 'nowrap',
}

const thRightStyle: React.CSSProperties = { ...thStyle, textAlign: 'right' }

export default function SequenceStatsTable({ sequences }: SequenceStatsTableProps) {
  return (
    <div
      style={{
        borderRadius: '12px',
        border: '1px solid var(--border-subtle)',
        overflow: 'hidden',
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr style={{ background: 'var(--bg-surface)' }}>
            <th style={thStyle}>Séquence</th>
            <th style={thRightStyle}>Inscrits</th>
            <th style={thRightStyle}>Envoyés</th>
            <th style={thRightStyle}>Ouvertures</th>
            <th style={thRightStyle}>Clics</th>
          </tr>
        </thead>
        <tbody>
          {sequences.length === 0 ? (
            <tr>
              <td
                colSpan={5}
                style={{
                  textAlign: 'center',
                  padding: '32px 16px',
                  color: 'var(--text-tertiary)',
                  fontSize: '13px',
                }}
              >
                Aucune séquence active pour le moment
              </td>
            </tr>
          ) : (
            sequences.map((seq, i) => (
              <TableRow key={seq.id} seq={seq} isLast={i === sequences.length - 1} />
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

function TableRow({ seq, isLast }: { seq: SequenceStat; isLast: boolean }) {
  const cellStyle: React.CSSProperties = {
    padding: '12px 16px',
    borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)',
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font-mono)',
    fontWeight: 500,
  }
  const nameCellStyle: React.CSSProperties = {
    ...cellStyle,
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-sans)',
    fontWeight: 500,
  }

  return (
    <tr
      style={{ background: 'var(--bg-surface)', transition: 'background 0.1s ease' }}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLTableRowElement).style.background = 'var(--bg-elevated)'
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLTableRowElement).style.background = 'var(--bg-surface)'
      }}
    >
      <td style={nameCellStyle}>{seq.name}</td>
      <td style={{ ...cellStyle, textAlign: 'right' }}>
        {seq.enrolled.toLocaleString('fr-FR')}
      </td>
      <td style={{ ...cellStyle, textAlign: 'right' }}>
        {seq.sent.toLocaleString('fr-FR')}
      </td>
      <td style={{ ...cellStyle, textAlign: 'right' }}>
        {formatRate(seq.openRate, seq.sent)}
      </td>
      <td style={{ ...cellStyle, textAlign: 'right' }}>
        {formatRate(seq.clickRate, seq.sent)}
      </td>
    </tr>
  )
}
