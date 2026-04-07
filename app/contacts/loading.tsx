export default function Loading() {
  return (
    <div style={{ padding: '32px 40px' }} className="space-y-6">
      <div className="skeleton" style={{ width: 200, height: 28 }} />
      <div className="skeleton" style={{ width: '100%', height: 44, borderRadius: 8 }} />
      <div className="skeleton" style={{ width: '100%', height: 500, borderRadius: 12 }} />
    </div>
  )
}
