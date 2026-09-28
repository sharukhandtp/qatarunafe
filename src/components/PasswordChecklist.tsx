import clsx from 'clsx'
import { Check } from 'lucide-react'
import { PASSWORD_RULES } from '../lib/validation'

export function PasswordChecklist({ value }: { value: string }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(value)
        return (
          <li key={rule.id} className={clsx('flex items-center gap-1.5', ok ? 'text-emerald-700' : 'text-slate-500')}>
            <Check className={clsx('size-3.5', ok ? 'opacity-100' : 'opacity-30')} aria-hidden />
            {rule.label()}
          </li>
        )
      })}
    </ul>
  )
}
