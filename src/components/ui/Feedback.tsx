import clsx from 'clsx'
import {
  CircleAlert,
  CircleCheck,
  Info,
  LoaderCircle,
  RefreshCw,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { errorMessage } from '../../api/client'
import { t } from '../../i18n'
import { Button } from './Button'

export function Spinner({ className }: { className?: string }) {
  return <LoaderCircle className={clsx('animate-spin text-brand-700', className ?? 'size-5')} aria-hidden />
}

export function PageLoader({ label = t('ui.loading') }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-sm text-slate-500" role="status">
      <Spinner className="size-7" />
      {label}
    </div>
  )
}

type AlertTone = 'info' | 'success' | 'warning' | 'error'

const ALERT: Record<AlertTone, { box: string; icon: LucideIcon; iconColor: string }> = {
  info: { box: 'bg-sky-50 text-sky-900 ring-sky-200', icon: Info, iconColor: 'text-sky-600' },
  success: { box: 'bg-emerald-50 text-emerald-900 ring-emerald-200', icon: CircleCheck, iconColor: 'text-emerald-600' },
  warning: { box: 'bg-amber-50 text-amber-900 ring-amber-200', icon: TriangleAlert, iconColor: 'text-amber-600' },
  error: { box: 'bg-red-50 text-red-900 ring-red-200', icon: CircleAlert, iconColor: 'text-red-600' },
}

export function Alert({
  tone = 'info',
  title,
  children,
  action,
  className,
}: {
  tone?: AlertTone
  title?: ReactNode
  children?: ReactNode
  action?: ReactNode
  className?: string
}) {
  const { box, icon: Icon, iconColor } = ALERT[tone]
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={clsx('flex gap-3 rounded-lg px-4 py-3 text-sm ring-1 ring-inset', box, className)}
    >
      <Icon className={clsx('mt-0.5 size-4 shrink-0', iconColor)} aria-hidden />
      <div className="min-w-0 flex-1">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className={clsx(title && 'mt-0.5', 'opacity-90')}>{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

export function ErrorAlert({ error, className }: { error: unknown; className?: string }) {
  if (!error) return null
  return (
    <Alert tone="error" className={className}>
      {errorMessage(error)}
    </Alert>
  )
}

/** Full-panel failure state for a query, with a retry. */
export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <div className="rounded-full bg-red-50 p-3">
        <CircleAlert className="size-6 text-red-600" aria-hidden />
      </div>
      <div>
        <p className="font-medium text-slate-900">{t('ui.couldNotLoad')}</p>
        <p className="mt-1 max-w-md text-sm text-slate-500">{errorMessage(error)}</p>
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" icon={RefreshCw} onClick={onRetry}>
          {t('ui.tryAgain')}
        </Button>
      )}
    </div>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <div className="rounded-full bg-slate-100 p-3">
        <Icon className="size-6 text-slate-500" aria-hidden />
      </div>
      <div>
        <p className="font-medium text-slate-900">{title}</p>
        {description && <p className="mt-1 max-w-md text-sm text-slate-500">{description}</p>}
      </div>
      {action}
    </div>
  )
}
