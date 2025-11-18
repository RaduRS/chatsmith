'use client'
export function Spinner({ className = 'h-4 w-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin' }: { className?: string }) {
  return <span className={className} />
}