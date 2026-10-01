import { describe, expect, it } from 'vitest'
import type { DepartmentRequestDetail, UserProfile } from '../api/types'
import { caseCapabilities, homePath, safeNext } from './roles'

const user = (overrides: Partial<UserProfile>) => ({ id: 'u1', ministryId: 'water', ...overrides }) as UserProfile
const officer = (level: 'L1' | 'L2' | 'L3') => user({ userType: 'GovernmentEmployee', employeeLevel: level })
const waterCase = (overrides: Partial<DepartmentRequestDetail>) =>
  ({
    ministryId: 'water',
    status: 'PendingL1Approval',
    currentStage: 'L1',
    requiredApprovalLevel: 'L2',
    assignedToUserId: null,
    ...overrides,
  }) as DepartmentRequestDetail

describe('safeNext', () => {
  it('keeps a same-origin path', () => {
    expect(safeNext('/requests/42')).toBe('/requests/42')
  })

  it.each(['https://evil.example', '//evil.example/path', 'javascript:alert(1)', '', null])(
    'refuses %s, so ?next= cannot become an open redirect',
    (value) => {
      expect(safeNext(value)).toBeNull()
    },
  )
})

describe('homePath', () => {
  it.each([
    ['Administrator', '/admin'],
    ['GovernmentEmployee', '/department'],
    ['PublicUser', '/dashboard'],
  ] as const)('sends a %s to %s', (userType, path) => {
    expect(homePath(user({ userType }))).toBe(path)
  })
})

describe('caseCapabilities', () => {
  it('lets the officer at the waiting tier decide', () => {
    const can = caseCapabilities(officer('L1'), waterCase({}))
    expect(can.canDecide).toBe(true)
    expect(can.isFinalStage).toBe(false)
  })

  it('does not let another tier decide', () => {
    expect(caseCapabilities(officer('L2'), waterCase({})).canDecide).toBe(false)
  })

  it('does not let another ministry do anything', () => {
    const can = caseCapabilities(officer('L1'), waterCase({ ministryId: 'electricity' }))
    expect(Object.entries(can).filter(([key, value]) => key !== 'isFinalStage' && value)).toEqual([])
  })

  it('only offers completion once the case is approved', () => {
    expect(caseCapabilities(officer('L1'), waterCase({})).canComplete).toBe(false)
    expect(caseCapabilities(officer('L1'), waterCase({ status: 'Approved' })).canComplete).toBe(true)
  })

  it('cannot escalate past L3', () => {
    const atL3 = waterCase({ status: 'PendingL3Approval', currentStage: 'L3', requiredApprovalLevel: 'L3' })
    expect(caseCapabilities(officer('L3'), atL3).canEscalate).toBe(false)
  })
})
