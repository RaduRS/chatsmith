import { cn } from '@/lib/utils/cn'

export function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <label className={cn('block text-sm font-medium text-gray-700', className)}>{children}</label>
}