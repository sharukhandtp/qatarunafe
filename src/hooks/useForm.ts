import { useCallback, useState, type ChangeEvent, type FormEvent } from 'react'
import { ApiError } from '../api/client'
import { compact, type Errors } from '../lib/validation'

type Values = Record<string, string | boolean | number>

/**
 * Minimal form state: values, client validation, and the server's 400 mapped back onto the
 * same fields. Anything that is not a field error lands in `formError` for an alert.
 */
export function useForm<T extends Values>(initial: T, validate?: (values: T) => Errors<T>) {
  const [values, setValues] = useState<T>(initial)
  const [errors, setErrors] = useState<Errors<T>>({})
  const [formError, setFormError] = useState<unknown>(null)
  const [submitting, setSubmitting] = useState(false)

  const setValue = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => (current[key as keyof T & string] ? { ...current, [key]: undefined } : current))
  }, [])

  /** Spread onto <Input>, <Textarea> or <Select>. */
  const field = <K extends keyof T & string>(key: K) => ({
    name: key,
    value: String(values[key] ?? ''),
    error: errors[key],
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setValue(key, event.target.value as T[K]),
  })

  /** Spread onto <Checkbox>. */
  const checkbox = <K extends keyof T & string>(key: K) => ({
    name: key,
    checked: Boolean(values[key]),
    onChange: (event: ChangeEvent<HTMLInputElement>) => setValue(key, event.target.checked as T[K]),
  })

  const handleSubmit = (action: (values: T) => Promise<unknown> | unknown) => async (event?: FormEvent) => {
    event?.preventDefault()
    setFormError(null)

    const clientErrors = compact(validate?.(values) ?? {})
    setErrors(clientErrors)
    if (Object.keys(clientErrors).length) return

    setSubmitting(true)
    try {
      await action(values)
    } catch (error) {
      if (error instanceof ApiError && error.status === 400 && Object.keys(error.fieldErrors).length) {
        const known = Object.fromEntries(
          Object.entries(error.fieldErrors).filter(([key]) => key in values),
        ) as Errors<T>
        setErrors(known)
        // Errors on fields this form does not render still need to be seen.
        if (Object.keys(known).length !== Object.keys(error.fieldErrors).length) setFormError(error)
      } else {
        setFormError(error)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const reset = useCallback((next?: T) => {
    setValues(next ?? initial)
    setErrors({})
    setFormError(null)
    // `initial` is only the fallback for a reset with no argument.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { values, setValue, setValues, errors, setErrors, formError, setFormError, submitting, field, checkbox, handleSubmit, reset }
}
