import clsx from 'clsx'
import { t } from '../../i18n'

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={clsx('shrink-0', className ?? 'size-8')} aria-hidden>
      <rect width="32" height="32" rx="7" fill="currentColor" />
      <path d="M9 23V9h2.6v5.6h8.8V9H23v14h-2.6v-6h-8.8v6z" fill="#fff" />
    </svg>
  )
}

export function BrandLockup({ inverted, className }: { inverted?: boolean; className?: string }) {
  return (
    <div className={clsx('flex items-center gap-2.5', className)}>
      <BrandMark className={clsx('size-8', inverted ? 'text-white/15' : 'text-brand-700')} />
      <div className="leading-tight">
        <p className={clsx('text-[15px] font-semibold tracking-tight', inverted ? 'text-white' : 'text-slate-900')}>
          {t('app.name')}
        </p>
        <p className={clsx('text-[11px]', inverted ? 'text-white/70' : 'text-slate-500')}>{t('app.tagline')}</p>
      </div>
    </div>
  )
}
