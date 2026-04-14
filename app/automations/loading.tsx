import { SkeletonCard } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div style={{ padding: '32px 40px' }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="skeleton" style={{ width: 180, height: 28, marginBottom: 8 }} />
          <div className="skeleton" style={{ width: 280, height: 18 }} />
        </div>
        <div className="skeleton" style={{ width: 140, height: 36, borderRadius: 8 }} />
      </div>
      <div className="space-y-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  )
}
