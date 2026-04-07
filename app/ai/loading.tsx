import { SkeletonCard } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div style={{ padding: '32px 40px' }} className="space-y-6">
      <div className="skeleton" style={{ width: 250, height: 28 }} />
      <div className="skeleton" style={{ width: 400, height: 16 }} />
      <SkeletonCard />
      <SkeletonCard />
    </div>
  )
}
