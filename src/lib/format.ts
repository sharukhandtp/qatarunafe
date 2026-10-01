import { getLang, getLocale, t, tn, type Lang } from '../i18n'

// Formatters are built per language on first use and cached, because constructing
// Intl objects is comparatively expensive and these run inside table rows.

interface Formatters {
  dateTime: Intl.DateTimeFormat
  dateOnly: Intl.DateTimeFormat
  relative: Intl.RelativeTimeFormat
  number: Intl.NumberFormat
}

const cache: Partial<Record<Lang, Formatters>> = {}

function formatters(): Formatters {
  const locale = getLocale()
  return (cache[getLang()] ??= {
    dateTime: new Intl.DateTimeFormat(locale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    dateOnly: new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric' }),
    relative: new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }),
    number: new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }),
  })
}

export function formatDateTime(value?: string | null) {
  return value ? formatters().dateTime.format(new Date(value)) : '—'
}

export function formatDate(value?: string | null) {
  return value ? formatters().dateOnly.format(new Date(value)) : '—'
}

/** "in 3 days", "2 hours ago". */
export function formatRelative(value?: string | null) {
  if (!value) return '—'
  const { relative } = formatters()
  const diffSeconds = (new Date(value).getTime() - Date.now()) / 1000
  const abs = Math.abs(diffSeconds)

  if (abs < 60) return relative.format(Math.round(diffSeconds), 'second')
  if (abs < 3600) return relative.format(Math.round(diffSeconds / 60), 'minute')
  if (abs < 86_400) return relative.format(Math.round(diffSeconds / 3600), 'hour')
  if (abs < 30 * 86_400) return relative.format(Math.round(diffSeconds / 86_400), 'day')
  return relative.format(Math.round(diffSeconds / (30 * 86_400)), 'month')
}

export function formatNumber(value: number) {
  return formatters().number.format(value)
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return t('format.bytes', { value: bytes })
  if (bytes < 1024 * 1024) return t('format.kilobytes', { value: (bytes / 1024).toFixed(1) })
  return t('format.megabytes', { value: (bytes / (1024 * 1024)).toFixed(1) })
}

/** SLA hours as a human duration: 48 → "2 days", 36 → "36 hours". */
export function formatSla(hours: number) {
  return hours % 24 === 0 ? tn('format.days', hours / 24) : tn('format.hours', hours)
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('')
}

const money: Partial<Record<Lang, Intl.NumberFormat>> = {}

/** Fees are in Qatari riyals, always with two decimals. */
export function formatMoney(amount: number, currency = 'QAR') {
  const format = (money[getLang()] ??= new Intl.NumberFormat(getLocale(), {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }))
  return format.format(amount)
}

/** 0.873 → "87%". */
export function formatPercent(rate?: number | null) {
  return rate === undefined || rate === null ? '—' : `${formatNumber(Math.round(rate * 1000) / 10)}%`
}

/** Hours as the most readable unit: 5.5 → "5.5 h", 50 → "2.1 d". */
export function formatHours(hours?: number | null) {
  if (hours === undefined || hours === null) return '—'
  return hours < 48 ? t('format.hoursShort', { value: formatNumber(hours) }) : t('format.daysShort', { value: formatNumber(hours / 24) })
}
