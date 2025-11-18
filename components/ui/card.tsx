import { cn } from '@/lib/utils/cn'

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('rounded-lg border bg-white p-4 shadow-sm', className)}>{children}</div>
}

export function CardTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-medium text-gray-700">{children}</h3>
}

export function CardValue({ children }: { children: React.ReactNode }) {
  return <div className="text-2xl font-semibold">{children}</div>
}