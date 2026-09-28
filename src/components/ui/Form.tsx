import clsx from 'clsx'
import { ChevronDown } from 'lucide-react'
import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'

const CONTROL =
  'block w-full rounded-lg border-0 bg-white text-sm text-slate-900 shadow-sm ring-1 ring-inset ' +
  'placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:outline-none ' +
  'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500'

function controlClasses(invalid: boolean) {
  return clsx(
    CONTROL,
    invalid ? 'ring-red-400 focus:ring-red-500' : 'ring-slate-300 focus:ring-brand-600',
  )
}

interface FieldProps {
  label?: ReactNode
  hint?: ReactNode
  error?: string
  required?: boolean
  className?: string
  children: (id: string, describedBy: string | undefined) => ReactNode
}

/** Label, control, and the hint or error beneath it - wired together for screen readers. */
export function Field({ label, hint, error, required, className, children }: FieldProps) {
  const id = useId()
  const messageId = `${id}-message`
  const hasMessage = Boolean(error || hint)

  return (
    <div className={clsx('space-y-1.5', className)}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-slate-700">
          {label}
          {required && <span className="ms-0.5 text-brand-700">*</span>}
        </label>
      )}
      {children(id, hasMessage ? messageId : undefined)}
      {error ? (
        <p id={messageId} className="text-xs text-red-600">
          {error}
        </p>
      ) : (
        hint && (
          <p id={messageId} className="text-xs text-slate-500">
            {hint}
          </p>
        )
      )}
    </div>
  )
}

type Base = { label?: ReactNode; hint?: ReactNode; error?: string; containerClassName?: string }

export function Input({
  label,
  hint,
  error,
  containerClassName,
  className,
  required,
  ...rest
}: Base & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Field label={label} hint={hint} error={error} required={required} className={containerClassName}>
      {(id, describedBy) => (
        <input
          id={id}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={describedBy}
          required={required}
          className={clsx(controlClasses(Boolean(error)), 'h-10 px-3', className)}
          {...rest}
        />
      )}
    </Field>
  )
}

export function Textarea({
  label,
  hint,
  error,
  containerClassName,
  className,
  required,
  rows = 4,
  ...rest
}: Base & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <Field label={label} hint={hint} error={error} required={required} className={containerClassName}>
      {(id, describedBy) => (
        <textarea
          id={id}
          rows={rows}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={describedBy}
          required={required}
          className={clsx(controlClasses(Boolean(error)), 'px-3 py-2', className)}
          {...rest}
        />
      )}
    </Field>
  )
}

export interface SelectOption {
  value: string
  label: string
}

export function Select({
  label,
  hint,
  error,
  containerClassName,
  className,
  required,
  options,
  placeholder,
  ...rest
}: Base &
  SelectHTMLAttributes<HTMLSelectElement> & { options: SelectOption[]; placeholder?: string }) {
  return (
    <Field label={label} hint={hint} error={error} required={required} className={containerClassName}>
      {(id, describedBy) => (
        <div className="relative">
          <select
            id={id}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={describedBy}
            required={required}
            className={clsx(controlClasses(Boolean(error)), 'h-10 appearance-none pe-9 ps-3', className)}
            {...rest}
          >
            {placeholder !== undefined && <option value="">{placeholder}</option>}
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute top-1/2 end-3 size-4 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
        </div>
      )}
    </Field>
  )
}

export function Checkbox({
  label,
  description,
  className,
  ...rest
}: { label: ReactNode; description?: ReactNode } & Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const id = useId()
  return (
    <div className={clsx('flex items-start gap-2.5', className)}>
      <input
        id={id}
        type="checkbox"
        className="mt-0.5 size-4 rounded border-slate-300 accent-brand-700"
        {...rest}
      />
      <label htmlFor={id} className="text-sm leading-5 text-slate-700 select-none">
        {label}
        {description && <span className="block text-xs text-slate-500">{description}</span>}
      </label>
    </div>
  )
}
