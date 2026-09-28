import clsx from 'clsx'
import { LoaderCircle, type LucideIcon } from 'lucide-react'
import type { ButtonHTMLAttributes } from 'react'
import { Link, type LinkProps } from 'react-router'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
type Size = 'sm' | 'md' | 'lg'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand-700 text-white shadow-sm hover:bg-brand-800 disabled:bg-brand-300',
  secondary:
    'bg-white text-slate-700 ring-1 ring-inset ring-slate-300 shadow-sm hover:bg-slate-50 disabled:text-slate-400',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:text-slate-300',
  danger: 'bg-red-600 text-white shadow-sm hover:bg-red-700 disabled:bg-red-300',
  success: 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 disabled:bg-emerald-300',
}

const SIZES: Record<Size, string> = {
  sm: 'h-8 gap-1.5 px-3 text-xs',
  md: 'h-10 gap-2 px-4 text-sm',
  lg: 'h-11 gap-2 px-5 text-sm',
}

const ICON_SIZES: Record<Size, string> = { sm: 'size-3.5', md: 'size-4', lg: 'size-4' }

interface CommonProps {
  variant?: Variant
  size?: Size
  icon?: LucideIcon
  block?: boolean
}

function buttonClasses({ variant = 'primary', size = 'md', block }: CommonProps = {}) {
  return clsx(
    'inline-flex shrink-0 items-center justify-center rounded-lg font-medium transition-colors',
    'disabled:cursor-not-allowed',
    VARIANTS[variant],
    SIZES[size],
    block && 'w-full',
  )
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, CommonProps {
  loading?: boolean
}

export function Button({
  variant,
  size = 'md',
  icon: Icon,
  block,
  loading,
  disabled,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={clsx(buttonClasses({ variant, size, block }), className)}
      {...rest}
    >
      {loading ? (
        <LoaderCircle className={clsx(ICON_SIZES[size], 'animate-spin')} aria-hidden />
      ) : (
        Icon && <Icon className={ICON_SIZES[size]} aria-hidden />
      )}
      {children}
    </button>
  )
}

interface ButtonLinkProps extends LinkProps, CommonProps {}

export function ButtonLink({ variant, size = 'md', icon: Icon, block, className, children, ...rest }: ButtonLinkProps) {
  return (
    <Link className={clsx(buttonClasses({ variant, size, block }), className)} {...rest}>
      {Icon && <Icon className={ICON_SIZES[size]} aria-hidden />}
      {children}
    </Link>
  )
}
