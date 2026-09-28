import type { EmployeeLevel, RequestStatus } from '../api/types'
import { t } from '../i18n'
import { REQUEST_STATUS } from './labels'

// A horizontal stepper for the request lifecycle. Staff see every approval tier the case
// needs; the applicant only sees "under review", because the tier structure is internal.

export type StepState = 'done' | 'current' | 'upcoming' | 'failed'

export interface Step {
  label: string
  state: StepState
}

const LEVEL_NUMBER: Record<EmployeeLevel, number> = { None: 0, L1: 1, L2: 2, L3: 3 }

function reviewReached(status: RequestStatus) {
  return !['Draft', 'Submitted'].includes(status)
}

export function buildSteps(
  status: RequestStatus,
  opts?: { currentStage?: EmployeeLevel; requiredLevel?: EmployeeLevel },
): Step[] {
  const decided = ['Approved', 'Completed'].includes(status)
  const failed = status === 'Rejected' || status === 'Cancelled'

  const steps: Step[] = [
    { label: REQUEST_STATUS.Draft.label, state: status === 'Draft' ? 'current' : 'done' },
    {
      label: REQUEST_STATUS.Submitted.label,
      state: status === 'Draft' ? 'upcoming' : status === 'Submitted' ? 'current' : 'done',
    },
  ]

  if (opts?.requiredLevel && opts.requiredLevel !== 'None') {
    const current = LEVEL_NUMBER[opts.currentStage ?? 'None']
    for (let tier = 1; tier <= LEVEL_NUMBER[opts.requiredLevel]; tier++) {
      let state: StepState = 'upcoming'
      if (decided) state = 'done'
      else if (failed) state = tier < current ? 'done' : tier === current ? 'failed' : 'upcoming'
      else if (status.startsWith('Pending') || status === 'ReturnedForInformation') {
        state = tier < current ? 'done' : tier === current ? 'current' : 'upcoming'
      }
      steps.push({ label: t('progress.levelReview', { tier }), state })
    }
  } else {
    steps.push({
      label: t(status === 'ReturnedForInformation' ? 'progress.infoRequested' : 'progress.underReview'),
      state: decided ? 'done' : failed ? (reviewReached(status) ? 'failed' : 'upcoming') : reviewReached(status) ? 'current' : 'upcoming',
    })
  }

  steps.push({
    label: REQUEST_STATUS[status === 'Rejected' || status === 'Cancelled' ? status : 'Approved'].label,
    state: decided ? 'done' : failed ? 'failed' : 'upcoming',
  })
  steps.push({
    label: REQUEST_STATUS.Completed.label,
    state: status === 'Completed' ? 'done' : status === 'Approved' ? 'current' : 'upcoming',
  })

  // A failed case stops at the failure; later steps would only be noise.
  if (failed) {
    const cut = steps.findIndex((s) => s.state === 'failed')
    return steps
      .slice(0, cut + 1)
      .map((s, i, all) => (i === all.length - 1 ? { label: REQUEST_STATUS[status].label, state: 'failed' as const } : s))
  }
  return steps
}
