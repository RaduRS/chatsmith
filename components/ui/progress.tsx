export function Progress({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value))
  return (
    <div className="w-full h-2 rounded bg-gray-200">
      <div style={{ width: `${v}%` }} className="h-2 rounded bg-black transition-[width]" />
    </div>
  )
}