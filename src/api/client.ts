import { getLang, t } from '../i18n'
import { session } from './session'
import type { AuthenticationResponse, ProblemDetails } from './types'

const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')
const API_PREFIX = '/api/v1'

/** A failed call, carrying the server's ProblemDetails when there was one. */
export class ApiError extends Error {
  readonly status: number
  readonly problem: ProblemDetails

  constructor(status: number, problem: ProblemDetails) {
    super(problem.detail || problem.title || t('api.requestFailed', { status }))
    this.name = 'ApiError'
    this.status = status
    this.problem = problem
  }

  /** Field errors from a 400, keyed by camel-cased property name. */
  get fieldErrors(): Record<string, string> {
    const out: Record<string, string> = {}
    for (const [key, messages] of Object.entries(this.problem.errors ?? {})) {
      if (!messages?.length) continue
      const field = key.charAt(0).toLowerCase() + key.slice(1)
      out[field] = messages[0]
    }
    return out
  }
}

/** Turns any thrown value into a sentence fit for the UI. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 0) return t('api.unreachable')
    if (error.status === 429) return t('api.tooManyAttempts')
    const fields = Object.values(error.fieldErrors)
    if (error.status === 400 && fields.length) return fields.join(' ')
    return error.message
  }
  if (error instanceof Error) return error.message
  return t('api.generic')
}

export type QueryParams = Record<string, string | number | boolean | undefined | null>

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  query?: QueryParams
  body?: unknown
  /** Send without a bearer token and never attempt a refresh. */
  anonymous?: boolean
  signal?: AbortSignal
}

function buildUrl(path: string, query?: QueryParams) {
  const url = `${BASE_URL}${API_PREFIX}${path}`
  if (!query) return url

  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    // `false` is the server-side default for every boolean filter, so it is left off the
    // query string rather than sent; the URL stays readable in the network tab.
    if (value === undefined || value === null || value === '' || value === false) continue
    params.set(key, String(value))
  }
  const qs = params.toString()
  return qs ? `${url}?${qs}` : url
}

function newCorrelationId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

async function readProblem(response: Response): Promise<ProblemDetails> {
  const type = response.headers.get('content-type') ?? ''
  if (type.includes('json')) {
    try {
      return (await response.json()) as ProblemDetails
    } catch {
      // fall through
    }
  }
  return { status: response.status, title: response.statusText || `HTTP ${response.status}` }
}

// ---- Token refresh ---------------------------------------------------------
//
// The API rotates refresh tokens and treats reuse of a spent one as theft: it revokes every
// session on the account. Two refreshes racing with the same token would therefore sign the
// user out everywhere. So refreshes are single-flight inside a tab, and serialised across
// tabs with the Web Locks API where the browser has it.

let refreshInFlight: Promise<boolean> | null = null

async function performRefresh(): Promise<boolean> {
  const attemptedWith = session.getRefreshToken()
  if (!attemptedWith) return false

  const run = async () => {
    // Another tab may have rotated the token while we waited for the lock. Its replacement
    // is unused, so refreshing with that is safe; refreshing with ours would be reuse.
    const token = session.getRefreshToken()
    if (!token) return false

    try {
      const response = await fetch(buildUrl('/auth/refresh'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Correlation-Id': newCorrelationId() },
        body: JSON.stringify({ refreshToken: token }),
      })
      if (!response.ok) {
        // Only a definitive rejection ends the session; a 5xx or 429 is not proof the token is bad.
        if (response.status === 401 || response.status === 400) session.clear()
        return false
      }
      session.store((await response.json()) as AuthenticationResponse)
      return true
    } catch {
      return false
    }
  }

  if (typeof navigator !== 'undefined' && navigator.locks) {
    return navigator.locks.request('qataruna-token-refresh', run)
  }
  return run()
}

export function refreshSession(): Promise<boolean> {
  refreshInFlight ??= performRefresh().finally(() => {
    refreshInFlight = null
  })
  return refreshInFlight
}

// ---- Core ------------------------------------------------------------------

async function send(path: string, options: RequestOptions, retried = false): Promise<Response> {
  const { method = 'GET', query, body, anonymous, signal } = options

  if (!anonymous && session.accessTokenIsStale() && session.getRefreshToken()) {
    await refreshSession()
  }

  const headers: Record<string, string> = { 'X-Correlation-Id': newCorrelationId(), 'Accept-Language': getLang() }
  const token = session.getAccessToken()
  if (!anonymous && token) headers.Authorization = `Bearer ${token}`

  let payload: BodyInit | undefined
  if (body instanceof FormData) {
    payload = body
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }

  let response: Response
  try {
    response = await fetch(buildUrl(path, query), { method, headers, body: payload, signal })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError(0, { title: t('api.networkError'), detail: t('api.networkDetail') })
  }

  if (response.status === 401 && !anonymous && !retried && session.getRefreshToken()) {
    // A security-stamp rotation (demotion, transfer, password change) invalidates the access
    // token early. One refresh picks up the new claims; a second 401 is final.
    if (await refreshSession()) return send(path, options, true)
  }

  if (response.status === 401 && !anonymous) {
    session.clear()
  }

  if (!response.ok) throw new ApiError(response.status, await readProblem(response))
  return response
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await send(path, options)
  if (response.status === 204) return undefined as T

  const type = response.headers.get('content-type') ?? ''
  if (!type.includes('json')) return undefined as T
  return (await response.json()) as T
}

/** Fetches an authenticated binary (attachments) and hands it to the browser as a download. */
export async function downloadFile(path: string, fallbackName: string) {
  const response = await send(path, {})
  const blob = await response.blob()

  const disposition = response.headers.get('content-disposition') ?? ''
  const match = /filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i.exec(disposition)
  const name = match ? decodeURIComponent(match[1] ?? match[2]) : fallbackName

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
