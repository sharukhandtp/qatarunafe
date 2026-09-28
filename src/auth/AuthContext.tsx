import { useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { refreshSession } from '../api/client'
import { authApi } from '../api/endpoints'
import { session } from '../api/session'
import type { LoginRequest, UserProfile } from '../api/types'

type Status = 'restoring' | 'authenticated' | 'anonymous'

interface AuthContextValue {
  status: Status
  user: UserProfile | null
  login: (credentials: LoginRequest) => Promise<UserProfile>
  logout: (options?: { allSessions?: boolean }) => Promise<void>
  /** Re-reads /auth/me, e.g. after an admin action changed the caller's own claims. */
  reloadProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  // A reload inside the access token's lifetime is restored with no network call at all: the
  // token is cached for the tab and the profile was cached when that token was issued. Every
  // /auth/* endpoint (including /me) shares a 10-a-minute rate limit, so calling one per
  // reload would lock a user out of signing in after a few presses of F5.
  const [user, setUser] = useState<UserProfile | null>(() =>
    session.getRefreshToken() && !session.accessTokenIsStale() ? session.getCachedUser() : null,
  )
  const [status, setStatus] = useState<Status>(() =>
    user ? 'authenticated' : session.getRefreshToken() ? 'restoring' : 'anonymous',
  )

  // The session module is the single source of truth; this component only mirrors it. That
  // way a refresh failing deep inside an API call signs the UI out without any plumbing.
  useEffect(
    () =>
      session.subscribe((next) => {
        setUser(next)
        setStatus(next ? 'authenticated' : 'anonymous')
        if (!next) queryClient.clear()
      }),
    [queryClient],
  )

  // Otherwise the access token has expired (or this is a new tab): spend one refresh.
  const needsRefresh = status === 'restoring'
  useEffect(() => {
    if (!needsRefresh) return
    let cancelled = false
    refreshSession().then((ok) => {
      if (!cancelled && !ok) {
        setStatus('anonymous')
      }
    })
    return () => {
      cancelled = true
    }
    // Only the initial status matters; later changes come through the subscription.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const login = useCallback(async (credentials: LoginRequest) => {
    const auth = await authApi.login(credentials)
    session.store(auth)
    return auth.user
  }, [])

  const logout = useCallback(async ({ allSessions = false } = {}) => {
    try {
      await authApi.logout(session.getRefreshToken(), allSessions)
    } catch {
      // Revocation is best effort: the local session is dropped regardless, and the refresh
      // token expires on its own schedule.
    }
    session.clear()
  }, [])

  const reloadProfile = useCallback(async () => {
    session.updateUser(await authApi.me())
  }, [])

  const value = useMemo(
    () => ({ status, user, login, logout, reloadProfile }),
    [status, user, login, logout, reloadProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>')
  return context
}

/** For components that only render inside an authenticated route. */
export function useCurrentUser(): UserProfile {
  const { user } = useAuth()
  if (!user) throw new Error('useCurrentUser called outside an authenticated route')
  return user
}
