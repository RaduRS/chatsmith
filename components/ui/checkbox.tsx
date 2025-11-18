'use client'
export function Checkbox({ checked, onCheckedChange, className }: { checked?: boolean; onCheckedChange?: (v: boolean) => void; className?: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked ? 'true' : 'false'}
      onClick={() => onCheckedChange?.(!checked)}
      className={`inline-flex h-4 w-4 items-center justify-center rounded border ${checked ? 'bg-black border-black' : 'bg-white border-gray-300'} ${className ?? ''}`}
    >
      {checked && (
        <svg viewBox="0 0 24 24" className="h-3 w-3 text-white" aria-hidden>
          <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  )
}