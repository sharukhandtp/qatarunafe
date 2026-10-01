import { useQuery } from '@tanstack/react-query'
import { ministriesApi } from '../api/endpoints'

// Query keys in one place, so a mutation can invalidate exactly what it changed.
export const keys = {
  catalogue: (q: object) => ['catalogue', q] as const,
  myRequests: ['my-requests'] as const,
  myRequestList: (q: object) => ['my-requests', 'list', q] as const,
  myRequest: (id: string) => ['my-requests', 'detail', id] as const,
  payments: (id: string) => ['my-requests', 'payments', id] as const,

  cases: ['cases'] as const,
  caseQueue: (q: object) => ['cases', 'queue', q] as const,
  case: (id: string) => ['cases', 'detail', id] as const,
  workload: ['cases', 'workload'] as const,

  ministries: ['ministries'] as const,
  ministryList: (q: object) => ['ministries', 'list', q] as const,
  ministry: (id: string) => ['ministries', 'detail', id] as const,
  ministryServices: (id: string) => ['ministries', 'services', id] as const,

  users: ['users'] as const,
  userList: (q: object) => ['users', 'list', q] as const,
  user: (id: string) => ['users', 'detail', id] as const,

  audit: (q: object) => ['audit', q] as const,

  notifications: ['notifications'] as const,
  notificationList: (q: object) => ['notifications', 'list', q] as const,
  unreadCount: ['notifications', 'unread'] as const,
  notificationPreferences: ['notification-preferences'] as const,

  reports: (kind: string, q: object) => ['reports', kind, q] as const,
}

/** Every ministry, for filter dropdowns. Four today; the page cap is the API maximum. */
export function useAllMinistries(includeInactive = false) {
  return useQuery({
    queryKey: keys.ministryList({ all: true, includeInactive }),
    queryFn: () => ministriesApi.list({ pageSize: 100, includeInactive }),
    staleTime: 5 * 60_000,
    select: (page) => page.items,
  })
}
