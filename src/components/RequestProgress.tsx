import clsx from 'clsx'
import { Check, X } from 'lucide-react'
import type { Step } from '../lib/progress'

export function RequestProgress({ steps }: { steps: Step[] }) {
  return (
    <ol className="flex items-start overflow-x-auto pb-1">
      {steps.map((step, index) => (
        <li key={step.label + index} className="flex min-w-[88px] flex-1 flex-col items-center text-center">
          <div className="flex w-full items-center">
            <div className={clsx('h-0.5 flex-1', index === 0 ? 'invisible' : step.state === 'upcoming' ? 'bg-slate-200' : 'bg-brand-600')} />
            <div
              className={clsx(
                'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                step.state === 'done' && 'bg-brand-700 text-white',
                step.state === 'current' && 'bg-white text-brand-700 ring-2 ring-brand-600',
                step.state === 'upcoming' && 'bg-slate-100 text-slate-400',
                step.state === 'failed' && 'bg-red-600 text-white',
              )}
            >
              {step.state === 'done' ? (
                <Check className="size-4" aria-hidden />
              ) : step.state === 'failed' ? (
                <X className="size-4" aria-hidden />
              ) : (
                index + 1
              )}
            </div>
            <div
              className={clsx(
                'h-0.5 flex-1',
                index === steps.length - 1 ? 'invisible' : steps[index + 1].state === 'upcoming' ? 'bg-slate-200' : 'bg-brand-600',
              )}
            />
          </div>
          <span
            className={clsx(
              'mt-2 px-1 text-xs',
              step.state === 'current' ? 'font-semibold text-brand-800' : step.state === 'failed' ? 'font-medium text-red-700' : 'text-slate-500',
            )}
          >
            {step.label}
          </span>
        </li>
      ))}
    </ol>
  )
}
