import { cn } from '@/lib/utils/cn'

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost'
}

export function Button({ children, className, variant = 'primary', type = 'button', ...props }: Props) {
  const base = 'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none'
  const styles = {
    primary: 'bg-black text-white hover:bg-gray-900 focus-visible:ring-black',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus-visible:ring-gray-300',
    destructive: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600',
    ghost: 'bg-transparent hover:bg-gray-100 text-gray-900',
  }[variant]
  return (
    <button type={type} className={cn(base, styles, 'px-4 py-2', className)} {...props}>
      {children}
    </button>
  )
}