import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'

/**
 * List filters held in the URL, so a filtered queue can be bookmarked, shared and survives
 * the back button. Every value is a string ('' meaning unset); `page` is kept separately and
 * resets to 1 whenever a filter changes.
 */
export function useUrlFilters<K extends string>(keys: readonly K[]) {
  const [params, setParams] = useSearchParams()

  const filters = useMemo(() => {
    const out = {} as Record<K, string>
    for (const key of keys) out[key] = params.get(key) ?? ''
    return out
  }, [params, keys])

  const page = Math.max(1, Number(params.get('page')) || 1)

  const setFilters = useCallback(
    (patch: Partial<Record<K, string>>) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current)
          for (const [key, value] of Object.entries(patch) as [K, string | undefined][]) {
            if (value) next.set(key, value)
            else next.delete(key)
          }
          next.delete('page')
          return next
        },
        { replace: true },
      )
    },
    [setParams],
  )

  const setPage = useCallback(
    (value: number) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current)
          if (value > 1) next.set('page', String(value))
          else next.delete('page')
          return next
        },
        { replace: false },
      )
    },
    [setParams],
  )

  const clear = useCallback(() => setParams(new URLSearchParams(), { replace: true }), [setParams])

  const active = keys.some((key) => filters[key] !== '')

  return { filters, setFilters, page, setPage, clear, active }
}

export function useDebouncedValue<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

/** Converts a filter string to a boolean query param. */
export const flag = (value: string) => value === 'true'

/** Converts a filter string to an optional enum/string param. */
export function opt<T extends string>(value: string): T | undefined {
  return value ? (value as T) : undefined
}
