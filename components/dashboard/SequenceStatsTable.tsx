import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

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

export default function SequenceStatsTable({ sequences }: SequenceStatsTableProps) {
  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50 hover:bg-gray-50">
            <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wide py-3">
              Séquence
            </TableHead>
            <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wide py-3 text-right">
              Inscrits
            </TableHead>
            <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wide py-3 text-right">
              Envoyés
            </TableHead>
            <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wide py-3 text-right">
              Ouvertures
            </TableHead>
            <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wide py-3 text-right">
              Clics
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sequences.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5}
                className="text-center text-sm text-gray-400 py-8"
              >
                Aucune séquence active pour le moment
              </TableCell>
            </TableRow>
          ) : (
            sequences.map((seq) => (
              <TableRow key={seq.id} className="hover:bg-gray-50/50">
                <TableCell className="font-medium text-sm text-gray-900 py-3">
                  {seq.name}
                </TableCell>
                <TableCell className="text-sm text-gray-600 py-3 text-right">
                  {seq.enrolled.toLocaleString('fr-FR')}
                </TableCell>
                <TableCell className="text-sm text-gray-600 py-3 text-right">
                  {seq.sent.toLocaleString('fr-FR')}
                </TableCell>
                <TableCell className="text-sm text-gray-600 py-3 text-right">
                  {formatRate(seq.openRate, seq.sent)}
                </TableCell>
                <TableCell className="text-sm text-gray-600 py-3 text-right">
                  {formatRate(seq.clickRate, seq.sent)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
