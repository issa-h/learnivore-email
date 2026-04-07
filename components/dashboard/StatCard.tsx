import { Card, CardContent } from '@/components/ui/card'
import { type LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string
  icon: LucideIcon
}

export default function StatCard({ label, value, icon: Icon }: StatCardProps) {
  return (
    <Card className="border border-gray-200 shadow-none">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {label}
            </p>
            <p className="text-2xl font-semibold text-gray-900">{value}</p>
          </div>
          <div className="rounded-md bg-gray-100 p-2">
            <Icon size={18} className="text-gray-600" strokeWidth={1.75} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
