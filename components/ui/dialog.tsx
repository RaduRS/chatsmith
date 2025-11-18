'use client'
import { useEffect } from 'react'
import { Button } from './button'

export function Dialog({ open, onOpenChange, children }: { open: boolean; onOpenChange: (v: boolean) => void; children: React.ReactNode }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onOpenChange(false)
    }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onOpenChange])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={() => onOpenChange(false)} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        {children}
      </div>
    </div>
  )
}

export function DialogContent({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-md rounded-xl bg-white shadow-lg">
      {children}
    </div>
  )
}

export function DialogHeader({ children }: { children: React.ReactNode }) {
  return <div className="px-6 pt-6">{children}</div>
}

export function DialogTitle({ children }: { children: React.ReactNode }) {
  return <div className="text-lg font-semibold">{children}</div>
}

export function DialogDescription({ children }: { children: React.ReactNode }) {
  return <div className="mt-1 text-sm text-gray-600">{children}</div>
}

export function DialogFooter({ children }: { children: React.ReactNode }) {
  return <div className="px-6 pb-6 pt-4 flex justify-end gap-3">{children}</div>
}

export function DialogClose({ onClick }: { onClick?: () => void }) {
  return <Button variant="secondary" onClick={onClick}>Cancel</Button>
}