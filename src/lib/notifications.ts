import type { Notification, UserProfile } from '../api/types'
import { isCitizen } from '../auth/roles'

/** Where a notification about a case leads: the citizen's own request, or the officer's case. */
export function notificationLink(user: UserProfile, n: Notification) {
  if (!n.requestId) return null
  return isCitizen(user) ? `/requests/${n.requestId}` : `/department/cases/${n.requestId}`
}
