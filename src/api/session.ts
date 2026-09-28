import type { AuthenticationResponse, UserProfile } from './types'

// Where the tokens live.
//
// The refresh token goes to localStorage: it must survive a reload, and sharing it is what
// lets several tabs use one session. The access token is cached per tab in sessionStorage so
// that a reload does not cost a refresh - the API rate-limits /auth/* to 10 calls a minute,
// and restoring by refresh on every F5 exhausted that within a few reloads. It adds no
// exposure the refresh token does not already carry, and it dies with the tab.

const REFRESH_KEY = 'qataruna.refreshToken'
const USER_KEY = 'qataruna.user'
const ACCESS_KEY = 'qataruna.accessToken'

function readAccess(): { token: string; expiresAt: number } | null {
  try {
    const raw = sessionStorage.getItem(ACCESS_KEY)
    return raw ? (JSON.parse(raw) as { token: string; expiresAt: number }) : null
  } catch {
    return null
  }
}

function writeAccess(value: { token: string; expiresAt: number } | null) {
  try {
    if (value) sessionStorage.setItem(ACCESS_KEY, JSON.stringify(value))
    else sessionStorage.removeItem(ACCESS_KEY)
  } catch {
    // Storage blocked: the next reload simply refreshes instead.
  }
}

const cached = readAccess()
let accessToken: string | null = cached?.token ?? null
let accessTokenExpiresAt = cached?.expiresAt ?? 0

type Listener = (user: UserProfile | null) => void
const listeners = new Set<Listener>()

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeSet(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    // Storage blocked (private mode, policy). The session then lasts as long as the tab.
  }
}

export const session = {
  getAccessToken: () => accessToken,

  /** True when the access token is missing or inside the last 30 seconds of its life. */
  accessTokenIsStale: () => !accessToken || Date.now() > accessTokenExpiresAt - 30_000,

  getRefreshToken: () => safeGet(REFRESH_KEY),

  /** The profile cached from the last sign-in, used to paint the shell before /me returns. */
  getCachedUser: (): UserProfile | null => {
    const raw = safeGet(USER_KEY)
    if (!raw) return null
    try {
      return JSON.parse(raw) as UserProfile
    } catch {
      return null
    }
  },

  store(auth: AuthenticationResponse) {
    accessToken = auth.accessToken
    accessTokenExpiresAt = Date.parse(auth.accessTokenExpiresAt)
    writeAccess({ token: accessToken, expiresAt: accessTokenExpiresAt })
    safeSet(REFRESH_KEY, auth.refreshToken)
    safeSet(USER_KEY, JSON.stringify(auth.user))
    listeners.forEach((l) => l(auth.user))
  },

  updateUser(user: UserProfile) {
    safeSet(USER_KEY, JSON.stringify(user))
    listeners.forEach((l) => l(user))
  },

  clear() {
    accessToken = null
    accessTokenExpiresAt = 0
    writeAccess(null)
    safeSet(REFRESH_KEY, null)
    safeSet(USER_KEY, null)
    listeners.forEach((l) => l(null))
  },

  subscribe(listener: Listener) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}

// Another tab signing out removes the refresh token; follow it so this tab does not keep
// acting on a session the user believes is closed.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === REFRESH_KEY && event.newValue === null && accessToken) {
      accessToken = null
      accessTokenExpiresAt = 0
      writeAccess(null)
      listeners.forEach((l) => l(null))
    }
  })
}
