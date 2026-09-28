import { Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useDebouncedValue } from '../hooks/useUrlFilters'
import { t } from '../i18n'

/** A search box that reports its value only once typing pauses. */
export function SearchInput({
  value,
  onChange,
  placeholder = t('ui.search'),
  className,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}) {
  const [draft, setDraft] = useState(value)
  const debounced = useDebouncedValue(draft, 350)

  // Follow external resets (e.g. "Clear filters").
  useEffect(() => setDraft(value), [value])

  useEffect(() => {
    if (debounced !== value) onChange(debounced.trim())
    // Only the debounced draft should trigger a report.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])

  return (
    <div className={className}>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 start-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
        <input
          type="search"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="block h-10 w-full rounded-lg border-0 bg-white pe-3 ps-9 text-sm text-slate-900 shadow-sm ring-1 ring-slate-300 ring-inset placeholder:text-slate-400 focus:ring-2 focus:ring-brand-600 focus:outline-none"
        />
      </div>
    </div>
  )
}
