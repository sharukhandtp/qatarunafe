import type { ReactNode } from 'react'
import { Navigate, useLocation, useSearchParams } from 'react-router'
import type { UserType } from '../api/types'
import { PageLoader } from '../components/ui/Feedback'
import { t } from '../i18n'
import { useAuth } from './AuthContext'
import { homePath, safeNext } from './roles'

/** Signed-in users only; optionally restricted to some user types. */
export function RequireAuth({ allow, children }: { allow?: UserType[]; children: ReactNode }) {
  const { status, user } = useAuth()
  const location = useLocation()

  if (status === 'restoring') return <PageLoader label={t('ui.restoringSession')} />

  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?next=${next}`} replace />
  }

  if (allow && !allow.includes(user.userType)) {
    return <Navigate to="/forbidden" replace />
  }

  return children
}

/** Sign-in and registration pages: send a signed-in user on to where they were going. */
export function GuestOnly({ children }: { children: ReactNode }) {
  const { status, user } = useAuth()
  const [params] = useSearchParams()
  if (status === 'restoring') return <PageLoader label={t('ui.restoringSession')} />
  if (user) return <Navigate to={safeNext(params.get('next')) ?? homePath(user)} replace />
  return children
}
