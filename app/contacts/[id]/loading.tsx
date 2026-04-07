import { SkeletonCard } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div style={{ padding: '32px 40px' }} className="max-w-4xl mx-auto space-y-6">
      <div className="skeleton" style={{ width: 300, height: 20 }} />
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </div>
  )
}
