import type {
  AccountStatus,
  ApprovalDecision,
  AuditAction,
  EmployeeLevel,
  NativeStatus,
  RequestPriority,
  RequestStatus,
  ServiceCategory,
  UserType,
} from '../api/types'
import { t, type MessageKey } from '../i18n'

export type Tone = 'neutral' | 'brand' | 'blue' | 'amber' | 'green' | 'red' | 'violet'

export interface EnumMeta {
  readonly label: string
  tone: Tone
}

// Labels are getters over the translation catalogue, so every read returns the text for the
// language currently in use while call sites keep reading `REQUEST_STATUS[s].label`.

function metas<K extends string>(prefix: string, tones: Record<K, Tone>): Record<K, EnumMeta> {
  const out = {} as Record<K, EnumMeta>
  for (const key of Object.keys(tones) as K[]) {
    out[key] = {
      get label() {
        return t(`${prefix}.${key}` as MessageKey)
      },
      tone: tones[key],
    }
  }
  return out
}

function labels<K extends string>(prefix: string, keys: readonly K[]): Record<K, string> {
  const out = {} as Record<K, string>
  for (const key of keys) {
    Object.defineProperty(out, key, { get: () => t(`${prefix}.${key}` as MessageKey), enumerable: true })
  }
  return out
}

// ---- Request lifecycle -------------------------------------------------------

export const REQUEST_STATUS = metas<RequestStatus>('status', {
  Draft: 'neutral',
  Submitted: 'blue',
  PendingL1Approval: 'amber',
  PendingL2Approval: 'amber',
  PendingL3Approval: 'amber',
  ReturnedForInformation: 'violet',
  Approved: 'green',
  Rejected: 'red',
  Cancelled: 'neutral',
  Completed: 'green',
})

export const REQUEST_STATUSES = Object.keys(REQUEST_STATUS) as RequestStatus[]

export const TERMINAL_STATUSES: RequestStatus[] = ['Approved', 'Rejected', 'Cancelled', 'Completed']
export const PENDING_STATUSES: RequestStatus[] = [
  'PendingL1Approval',
  'PendingL2Approval',
  'PendingL3Approval',
]

export const isTerminal = (s: RequestStatus) => TERMINAL_STATUSES.includes(s)
export const isAwaitingApproval = (s: RequestStatus) => PENDING_STATUSES.includes(s)

export const PRIORITY = metas<RequestPriority>('priority', {
  Low: 'neutral',
  Normal: 'blue',
  High: 'amber',
  Critical: 'red',
})

export const PRIORITIES = Object.keys(PRIORITY) as RequestPriority[]

export const CATEGORIES: ServiceCategory[] = [
  'NewConnection',
  'Disconnection',
  'TransferOfOwnership',
  'BillingDispute',
  'Maintenance',
  'Permit',
  'Inspection',
  'Complaint',
  'Subsidy',
  'CertificateIssuance',
  'Other',
]

export const CATEGORY = labels<ServiceCategory>('category', CATEGORIES)

export const DECISION = metas<ApprovalDecision>('decision', {
  Approved: 'green',
  Rejected: 'red',
  ReturnedForInformation: 'violet',
  Escalated: 'amber',
  Reassigned: 'blue',
})

// ---- Identity ----------------------------------------------------------------

export const USER_TYPE = metas<UserType>('userType', {
  PublicUser: 'blue',
  GovernmentEmployee: 'brand',
  Administrator: 'violet',
})

export const USER_TYPES = Object.keys(USER_TYPE) as UserType[]

export const NATIVE_STATUS = labels<NativeStatus>('nativeStatus', ['NotApplicable', 'Resident', 'NativeCitizen'])

/** "L1 · Intake" and so on. */
export const LEVEL = labels<EmployeeLevel>('level', ['None', 'L1', 'L2', 'L3'])

/** Just the tier name: "L1" / "المستوى 1". */
export const LEVEL_SHORT = labels<Exclude<EmployeeLevel, 'None'>>('level.short', ['L1', 'L2', 'L3'])

export const EMPLOYEE_LEVELS: EmployeeLevel[] = ['L1', 'L2', 'L3']

export const ACCOUNT_STATUS = metas<AccountStatus>('accountStatus', {
  PendingActivation: 'amber',
  Active: 'green',
  Suspended: 'red',
  Deactivated: 'neutral',
})

export const ACCOUNT_STATUSES = Object.keys(ACCOUNT_STATUS) as AccountStatus[]

// ---- Audit ---------------------------------------------------------------------

export const AUDIT_ACTION = metas<AuditAction>('audit', {
  Create: 'green',
  Update: 'blue',
  Delete: 'red',
  LoginSucceeded: 'green',
  LoginFailed: 'red',
  Logout: 'neutral',
  TokenRefreshed: 'neutral',
  TokenRefreshRejected: 'red',
  PasswordChanged: 'violet',
  AccessDenied: 'red',
  RequestSubmitted: 'blue',
  RequestApproved: 'green',
  RequestRejected: 'red',
  RequestReturned: 'violet',
  RequestEscalated: 'amber',
  RequestAssigned: 'blue',
  RequestCancelled: 'neutral',
  RequestCompleted: 'green',
})

export const AUDIT_ACTIONS = Object.keys(AUDIT_ACTION) as AuditAction[]

/** Turns a record of labels into <Select> options. */
export function options<K extends string>(
  keys: readonly K[],
  label: (key: K) => string,
): { value: K; label: string }[] {
  return keys.map((value) => ({ value, label: label(value) }))
}
