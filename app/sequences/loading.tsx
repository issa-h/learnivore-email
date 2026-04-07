import { SkeletonCard } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div style={{ padding: '32px 40px' }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="skeleton" style={{ width: 200, height: 28 }} />
        <div className="skeleton" style={{ width: 160, height: 36, borderRadius: 8 }} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  )
}
