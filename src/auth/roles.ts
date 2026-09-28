import type { DepartmentRequestDetail, EmployeeLevel, UserProfile } from '../api/types'
import { isAwaitingApproval } from '../lib/labels'

// UI-side mirrors of the API's authorization policies. They decide what to *show*; the
// server still decides what is allowed, and every button here can still meet a 403.

export const isCitizen = (u: UserProfile) => u.userType === 'PublicUser'
export const isEmployee = (u: UserProfile) => u.userType === 'GovernmentEmployee'
export const isAdmin = (u: UserProfile) => u.userType === 'Administrator'

/** Policies.MinistryStaff - an employee that actually carries a ministry claim. */
export const isMinistryStaff = (u: UserProfile) => isEmployee(u) && Boolean(u.ministryId)

const RANK: Record<EmployeeLevel, number> = { None: 0, L1: 1, L2: 2, L3: 3 }

export const atLeast = (u: UserProfile, level: EmployeeLevel) =>
  isEmployee(u) && RANK[u.employeeLevel] >= RANK[level]

/** Only same-origin paths are honoured, so `?next=` cannot become an open redirect. */
export function safeNext(value: string | null) {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : null
}

export function homePath(u: UserProfile) {
  if (isAdmin(u)) return '/admin'
  if (isEmployee(u)) return '/department'
  return '/dashboard'
}

/** What the caller may do on one case, per CanActOnCurrentStage / SameMinistry. */
export function caseCapabilities(u: UserProfile, c: DepartmentRequestDetail) {
  const sameMinistry = isEmployee(u) && u.ministryId === c.ministryId
  const atMyStage = sameMinistry && isAwaitingApproval(c.status) && u.employeeLevel === c.currentStage

  return {
    /** Approve / reject / return / escalate / take. */
    canDecide: atMyStage,
    canEscalate: atMyStage && c.currentStage !== 'L3',
    canTake: atMyStage && c.assignedToUserId !== u.id,
    /** Hand to another officer at the same tier - L2 and above only. */
    canReassign: sameMinistry && isAwaitingApproval(c.status) && atLeast(u, 'L2'),
    canComplete: sameMinistry && c.status === 'Approved',
    /** This approval is the last one the service needs. */
    isFinalStage: c.currentStage === c.requiredApprovalLevel,
  }
}
