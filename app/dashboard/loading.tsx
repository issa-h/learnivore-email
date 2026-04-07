import { SkeletonCard } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div style={{ padding: '32px 40px' }} className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="skeleton" style={{ width: 200, height: 28 }} />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <div className="skeleton" style={{ width: '100%', height: 300, borderRadius: 12 }} />
    </div>
  )
}
