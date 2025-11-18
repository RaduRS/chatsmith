import { cn } from '@/lib/utils/cn'

type Props = React.InputHTMLAttributes<HTMLInputElement>

export function Input(props: Props) {
  const { className, ...rest } = props
  return (
    <input
      className={cn(
        'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-black focus:ring-2 focus:ring-black',
        className,
      )}
      {...rest}
    />
  )
}