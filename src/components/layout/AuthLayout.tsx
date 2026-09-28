import { Building2, ShieldCheck, Workflow } from 'lucide-react'
import type { ReactNode } from 'react'
import { t, type MessageKey } from '../../i18n'
import { LanguageSwitcher } from '../LanguageSwitcher'
import { BrandLockup } from './Brand'

const POINTS: { icon: typeof Building2; text: MessageKey }[] = [
  { icon: Building2, text: 'authLayout.point.catalogue' },
  { icon: Workflow, text: 'authLayout.point.tracking' },
  { icon: ShieldCheck, text: 'authLayout.point.privacy' },
]

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <aside className="relative hidden overflow-hidden bg-brand-800 p-12 text-white lg:flex lg:flex-col">
        {/* Serrated edge, a nod to the flag. Mirrored in RTL so it stays on the inner edge. */}
        <svg
          className="absolute inset-y-0 end-0 h-full w-10 text-slate-50 rtl:-scale-x-100"
          viewBox="0 0 40 900"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            fill="currentColor"
            d={`M40 0 ${Array.from({ length: 9 }, (_, i) => `L0 ${i * 100 + 50} L40 ${(i + 1) * 100}`).join(' ')} Z`}
          />
        </svg>
        <div className="absolute -top-32 -start-32 size-96 rounded-full bg-brand-600/30 blur-3xl" aria-hidden />

        <BrandLockup inverted className="relative" />

        <div className="relative my-auto max-w-md pe-8">
          <h2 className="text-3xl leading-tight font-semibold tracking-tight">{t('authLayout.headline')}</h2>
          <p className="mt-4 text-white/75">{t('authLayout.intro')}</p>
          <ul className="mt-10 space-y-4">
            {POINTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-white/90">
                <span className="rounded-lg bg-white/10 p-2">
                  <Icon className="size-4" aria-hidden />
                </span>
                {t(text)}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/50">{t('app.copyright', { year: new Date().getFullYear() })}</p>
      </aside>

      <main className="relative flex items-center justify-center px-4 py-12 sm:px-8">
        <LanguageSwitcher className="absolute top-4 end-4" />
        <div className="w-full max-w-md">
          <BrandLockup className="mb-10 lg:hidden" />
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </div>
      </main>
    </div>
  )
}
