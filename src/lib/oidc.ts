import type { NationalIdentityConfig } from '../api/types'

// Sign-in with the national digital identity: OpenID Connect authorization code flow with PKCE.
// The browser only obtains the code; the API redeems it with the provider and checks the ID
// token, so no provider secret or token ever reaches this app.

const PENDING_KEY = 'qataruna.oidc'

interface Pending {
  state: string
  verifier: string
  nonce: string
  redirectUri: string
  next?: string
}

function random(bytes = 32) {
  const buffer = crypto.getRandomValues(new Uint8Array(bytes))
  return base64Url(buffer)
}

function base64Url(bytes: Uint8Array) {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function challengeFor(verifier: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return base64Url(new Uint8Array(digest))
}

export const callbackUri = () => `${window.location.origin}/auth/callback`

/** Sends the browser to the provider. Resolves only if navigation is blocked. */
export async function beginNationalIdentitySignIn(config: NationalIdentityConfig, next?: string | null) {
  const pending: Pending = {
    state: random(),
    verifier: random(48),
    nonce: random(),
    redirectUri: callbackUri(),
    next: next ?? undefined,
  }
  // sessionStorage: the callback lands in this same tab, and nothing outlives it.
  sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending))

  const url = new URL(config.authorizationEndpoint)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', config.clientId)
  url.searchParams.set('redirect_uri', pending.redirectUri)
  url.searchParams.set('scope', config.scope)
  url.searchParams.set('state', pending.state)
  url.searchParams.set('nonce', pending.nonce)
  url.searchParams.set('code_challenge', await challengeFor(pending.verifier))
  url.searchParams.set('code_challenge_method', 'S256')
  window.location.assign(url.toString())
}

/**
 * Takes the pending sign-in that matches the provider's `state`, once. A state that does not
 * match is someone else's response (or a replay) and must not be redeemed.
 */
export function takePendingSignIn(state: string | null): Pending | null {
  let pending: Pending | null = null
  try {
    const raw = sessionStorage.getItem(PENDING_KEY)
    pending = raw ? (JSON.parse(raw) as Pending) : null
  } catch {
    pending = null
  }
  sessionStorage.removeItem(PENDING_KEY)
  return pending && state && pending.state === state ? pending : null
}
