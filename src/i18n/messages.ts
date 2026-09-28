import { admin as arAdmin } from './locales/ar/admin'
import { auth as arAuth } from './locales/ar/auth'
import { citizen as arCitizen } from './locales/ar/citizen'
import { common as arCommon } from './locales/ar/common'
import { department as arDepartment } from './locales/ar/department'
import { shared as arShared } from './locales/ar/shared'
import { admin as enAdmin } from './locales/en/admin'
import { auth as enAuth } from './locales/en/auth'
import { citizen as enCitizen } from './locales/en/citizen'
import { common as enCommon } from './locales/en/common'
import { department as enDepartment } from './locales/en/department'
import { shared as enShared } from './locales/en/shared'

// One namespace per area of the app; keys are prefixed with the namespace so they never collide.
export const en = { ...enCommon, ...enAuth, ...enCitizen, ...enDepartment, ...enAdmin, ...enShared }

export type MessageKey = keyof typeof en

export const ar: Record<string, string> = {
  ...arCommon,
  ...arAuth,
  ...arCitizen,
  ...arDepartment,
  ...arAdmin,
  ...arShared,
}
