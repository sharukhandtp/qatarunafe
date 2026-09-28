import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { ar, en, type MessageKey } from './messages'

// A deliberately small i18n layer: two languages, typed keys, `{name}` interpolation and
// CLDR plural selection. `t()` reads the module-level language so it also works outside
// components (labels, validation, formatters); the provider remounts the routed tree when
// the language changes so nothing keeps rendering stale strings.

export type Lang = 'en' | 'ar'

export const LANGUAGES: Record<Lang, { name: string; dir: 'ltr' | 'rtl'; locale: string }> = {
  en: { name: 'English', dir: 'ltr', locale: 'en-GB' },
  // Latin digits keep reference numbers, IDs and amounts identical across both languages.
  ar: { name: 'العربية', dir: 'rtl', locale: 'ar-QA-u-nu-latn' },
}

const STORAGE_KEY = 'qataruna.lang'
const DICTIONARIES: Record<Lang, Record<string, string>> = { en, ar }

function detect(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'en' || stored === 'ar') return stored
  } catch {
    // Storage can be unavailable (private mode); fall through to the browser language.
  }
  return typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('ar') ? 'ar' : 'en'
}

let current: Lang = detect()

export const getLang = () => current
export const getLocale = () => LANGUAGES[current].locale
export const isRtl = () => LANGUAGES[current].dir === 'rtl'

type Vars = Record<string, string | number>

function interpolate(template: string, vars?: Vars) {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match))
}

/** Translates a key in the current language, falling back to English. */
export function t(key: MessageKey, vars?: Vars): string {
  return interpolate(DICTIONARIES[current][key] ?? en[key] ?? key, vars)
}

/** Keys that exist as `<base>.other`, i.e. messages with plural forms. */
export type PluralKey = { [K in MessageKey]: K extends `${infer Base}.other` ? Base : never }[MessageKey]

const pluralRules: Partial<Record<Lang, Intl.PluralRules>> = {}

/** Plural-aware translation; `{count}` is available in every form. */
export function tn(base: PluralKey, count: number, vars?: Vars): string {
  const rules = (pluralRules[current] ??= new Intl.PluralRules(LANGUAGES[current].locale))
  const form = rules.select(count)
  const dict = DICTIONARIES[current]
  const template = dict[`${base}.${form}`] ?? dict[`${base}.other`] ?? en[`${base}.other` as MessageKey]
  return interpolate(template, { count, ...vars })
}

function applyToDocument(lang: Lang) {
  const root = document.documentElement
  root.lang = lang
  root.dir = LANGUAGES[lang].dir
  document.title = t('app.documentTitle')
}

// Before the first render, so an Arabic visitor never sees a left-to-right flash.
if (typeof document !== 'undefined') applyToDocument(current)

interface I18nApi {
  lang: Lang
  dir: 'ltr' | 'rtl'
  setLang: (lang: Lang) => void
  toggle: () => void
}

const I18nContext = createContext<I18nApi | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(current)

  const setLang = useCallback((next: Lang) => {
    current = next
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Not persisted; the choice still applies for this visit.
    }
    applyToDocument(next)
    setLangState(next)
  }, [])

  const api = useMemo<I18nApi>(
    () => ({
      lang,
      dir: LANGUAGES[lang].dir,
      setLang,
      toggle: () => setLang(lang === 'ar' ? 'en' : 'ar'),
    }),
    [lang, setLang],
  )

  return <I18nContext.Provider value={api}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) throw new Error('useI18n must be used inside <I18nProvider>')
  return context
}

export type { MessageKey }
