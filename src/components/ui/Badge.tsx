import clsx from 'clsx'
import type { ReactNode } from 'react'
import type { AccountStatus, RequestPriority, RequestStatus } from '../../api/types'
import { ACCOUNT_STATUS, PRIORITY, REQUEST_STATUS, type Tone } from '../../lib/labels'

const TONES: Record<Tone, string> = {
  neutral: 'bg-slate-100 text-slate-700 ring-slate-500/15',
  brand: 'bg-brand-50 text-brand-800 ring-brand-700/15',
  blue: 'bg-sky-50 text-sky-800 ring-sky-600/20',
  amber: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  green: 'bg-emerald-50 text-emerald-800 ring-emerald-600/20',
  red: 'bg-red-50 text-red-700 ring-red-600/15',
  violet: 'bg-violet-50 text-violet-800 ring-violet-600/20',
}

const DOTS: Record<Tone, string> = {
  neutral: 'bg-slate-400',
  brand: 'bg-brand-600',
  blue: 'bg-sky-500',
  amber: 'bg-amber-500',
  green: 'bg-emerald-500',
  red: 'bg-red-500',
  violet: 'bg-violet-500',
}

export function Badge({
  tone = 'neutral',
  dot,
  className,
  children,
}: {
  tone?: Tone
  dot?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset',
        TONES[tone],
        className,
      )}
    >
      {dot && <span className={clsx('size-1.5 rounded-full', DOTS[tone])} aria-hidden />}
      {children}
    </span>
  )
}

export function StatusBadge({ status }: { status: RequestStatus }) {
  const meta = REQUEST_STATUS[status]
  return (
    <Badge tone={meta.tone} dot>
      {meta.label}
    </Badge>
  )
}

export function PriorityBadge({ priority }: { priority: RequestPriority }) {
  const meta = PRIORITY[priority]
  return <Badge tone={meta.tone}>{meta.label}</Badge>
}

export function AccountStatusBadge({ status }: { status: AccountStatus }) {
  const meta = ACCOUNT_STATUS[status]
  return (
    <Badge tone={meta.tone} dot>
      {meta.label}
    </Badge>
  )
}
