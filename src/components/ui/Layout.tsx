import clsx from 'clsx'
import { ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react'
import type { ReactNode, ThHTMLAttributes, TdHTMLAttributes } from 'react'
import { Link } from 'react-router'
import type { PagedResult } from '../../api/types'
import { t } from '../../i18n'

export function PageHeader({
  title,
  description,
  actions,
  back,
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  back?: { to: string; label: string }
}) {
  return (
    <div className="mb-6">
      {back && (
        <Link
          to={back.to}
          className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800"
        >
          <ChevronLeft className="size-4 rtl:rotate-180" aria-hidden />
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
          {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'brand',
  to,
  hint,
}: {
  label: string
  value: ReactNode
  icon: LucideIcon
  tone?: 'brand' | 'amber' | 'green' | 'red' | 'sky' | 'violet' | 'slate'
  to?: string
  hint?: string
}) {
  const tones = {
    brand: 'bg-brand-50 text-brand-700',
    amber: 'bg-amber-50 text-amber-600',
    green: 'bg-emerald-50 text-emerald-600',
    red: 'bg-red-50 text-red-600',
    sky: 'bg-sky-50 text-sky-600',
    violet: 'bg-violet-50 text-violet-600',
    slate: 'bg-slate-100 text-slate-600',
  }

  const content = (
    <div className="flex items-center gap-4">
      <div className={clsx('rounded-lg p-2.5', tones[tone])}>
        <Icon className="size-5" aria-hidden />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-2xl font-semibold text-slate-900 tabular-nums">{value}</p>
        {hint && <p className="text-xs text-slate-400">{hint}</p>}
      </div>
    </div>
  )

  const base = 'block rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200'
  return to ? (
    <Link to={to} className={clsx(base, 'transition hover:shadow-md hover:ring-brand-200')}>
      {content}
    </Link>
  ) : (
    <div className={base}>{content}</div>
  )
}

// ---- Tables ------------------------------------------------------------------

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm">{children}</table>
    </div>
  )
}

export function Th({ className, ...rest }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope="col"
      className={clsx(
        'bg-slate-50/80 px-4 py-2.5 text-start text-xs font-semibold tracking-wide whitespace-nowrap text-slate-500 uppercase',
        className,
      )}
      {...rest}
    />
  )
}

export function Td({ className, ...rest }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={clsx('px-4 py-3 align-middle text-slate-700', className)} {...rest} />
}

// ---- Paging ------------------------------------------------------------------

export function Pagination<T>({
  page,
  onChange,
}: {
  page: PagedResult<T> | undefined
  onChange: (pageNumber: number) => void
}) {
  if (!page || page.totalCount === 0) return null

  const first = (page.pageNumber - 1) * page.pageSize + 1
  const last = Math.min(page.pageNumber * page.pageSize, page.totalCount)

  return (
    <div className="flex items-center justify-between gap-4 border-t border-slate-100 px-4 py-3 text-sm">
      <p className="text-slate-500 tabular-nums">{t('ui.pageRange', { first, last, total: page.totalCount })}</p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(page.pageNumber - 1)}
          disabled={!page.hasPreviousPage}
          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent"
          aria-label={t('ui.previousPage')}
        >
          <ChevronLeft className="size-4 rtl:rotate-180" />
        </button>
        <span className="px-2 text-slate-600 tabular-nums">
          {page.pageNumber} / {Math.max(page.totalPages, 1)}
        </span>
        <button
          type="button"
          onClick={() => onChange(page.pageNumber + 1)}
          disabled={!page.hasNextPage}
          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent"
          aria-label={t('ui.nextPage')}
        >
          <ChevronRight className="size-4 rtl:rotate-180" />
        </button>
      </div>
    </div>
  )
}
