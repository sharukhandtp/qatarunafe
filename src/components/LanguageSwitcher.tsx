import clsx from 'clsx'
import { Languages } from 'lucide-react'
import { LANGUAGES, t, useI18n } from '../i18n'

/** Offers the other language, labelled in that language so either reader can find it. */
export function LanguageSwitcher({ className, compact }: { className?: string; compact?: boolean }) {
  const { lang, toggle } = useI18n()
  const other = lang === 'ar' ? 'en' : 'ar'

  return (
    <button
      type="button"
      onClick={toggle}
      lang={other}
      title={t('lang.switch')}
      aria-label={`${t('lang.switch')}: ${LANGUAGES[other].name}`}
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900',
        className,
      )}
    >
      <Languages className="size-4" aria-hidden />
      <span className={clsx(compact && 'hidden sm:inline')}>{LANGUAGES[other].name}</span>
    </button>
  )
}
