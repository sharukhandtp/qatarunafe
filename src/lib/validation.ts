// Client-side mirrors of the FluentValidation rules in QatarUna.Application.
//
// These exist for immediate feedback only. The server re-validates everything and its 400
// response is mapped back onto the same fields, so a rule missing here is a slower message,
// never a bypass.

import { t, tn } from '../i18n'

export type Errors<T> = Partial<Record<keyof T & string, string>>

export const ATTACHMENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/tiff']
export const ATTACHMENT_ACCEPT = '.pdf,.jpg,.jpeg,.png,.tif,.tiff'
export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024
export const ATTACHMENT_MAX_COUNT = 20

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const tooLong = (label: string, max: number) =>
  t('validation.maxLength', { label, chars: tn('validation.chars', max) })

/** `label` is the already-translated field name. */
export function required(value: string | undefined, label: string) {
  return value?.trim() ? undefined : t('validation.required', { label })
}

export function maxLength(value: string | undefined, max: number, label: string) {
  return value && value.length > max ? tooLong(label, max) : undefined
}

export function email(value: string | undefined) {
  const label = t('validation.emailLabel')
  if (!value?.trim()) return t('validation.required', { label })
  if (!EMAIL.test(value.trim())) return t('validation.emailInvalid')
  return maxLength(value, 256, label)
}

export function optionalEmail(value: string | undefined) {
  if (!value?.trim()) return undefined
  return EMAIL.test(value.trim()) ? undefined : t('validation.emailInvalid')
}

/** The registration / change-password / initial-password policy. */
export function strongPassword(value: string | undefined) {
  const label = t('validation.passwordLabel')
  if (!value) return t('validation.required', { label })
  if (value.length < 12) return t('validation.passwordMin')
  if (value.length > 128) return tooLong(label, 128)
  if (!/[A-Z]/.test(value)) return t('validation.passwordUpper')
  if (!/[a-z]/.test(value)) return t('validation.passwordLower')
  if (!/[0-9]/.test(value)) return t('validation.passwordDigit')
  return undefined
}

export const PASSWORD_RULES = [
  { id: 'length', test: (v: string) => v.length >= 12, label: () => t('validation.rule.length') },
  { id: 'upper', test: (v: string) => /[A-Z]/.test(v), label: () => t('validation.rule.upper') },
  { id: 'lower', test: (v: string) => /[a-z]/.test(v), label: () => t('validation.rule.lower') },
  { id: 'digit', test: (v: string) => /[0-9]/.test(v), label: () => t('validation.rule.digit') },
]

export function nationalId(value: string | undefined) {
  const label = t('validation.nationalIdLabel')
  if (!value?.trim()) return t('validation.required', { label })
  if (value.length > 32) return tooLong(label, 32)
  if (!/^[A-Za-z0-9-]+$/.test(value)) return t('validation.nationalIdChars')
  return undefined
}

export function phone(value: string | undefined) {
  if (!value?.trim()) return undefined
  if (value.length > 32) return tooLong(t('validation.phoneLabel'), 32)
  if (!/^\+?[0-9\s-]+$/.test(value)) return t('validation.phoneChars')
  return undefined
}

export function code(value: string | undefined, label: string) {
  if (!value?.trim()) return t('validation.required', { label })
  if (value.length > 32) return tooLong(label, 32)
  if (!/^[A-Za-z][A-Za-z0-9 _-]*$/.test(value)) return t('validation.codeChars', { label })
  return undefined
}

/** Reasons that reach the applicant or justify an escalation: 10–2000 characters. */
export function reason(value: string | undefined) {
  const trimmed = value?.trim() ?? ''
  if (!trimmed) return t('validation.reasonRequired')
  if (trimmed.length < 10) return t('validation.reasonMin')
  if (trimmed.length > 2000) return t('validation.reasonMax')
  return undefined
}

export function attachment(file: File) {
  if (file.size === 0) return t('validation.fileEmpty', { name: file.name })
  if (file.size > ATTACHMENT_MAX_BYTES) return t('validation.fileTooLarge', { name: file.name })
  if (!ATTACHMENT_TYPES.includes(file.type)) return t('validation.fileType', { name: file.name })
  return undefined
}

/** Drops undefined entries so `Object.keys(errors).length` means "has errors". */
export function compact<T>(errors: Errors<T>): Errors<T> {
  const out: Errors<T> = {}
  for (const [key, value] of Object.entries(errors) as [keyof T & string, string | undefined][]) {
    if (value) out[key] = value
  }
  return out
}
