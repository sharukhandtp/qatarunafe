import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { ApiError, errorMessage } from '../../api/client'
import { authApi } from '../../api/endpoints'
import type { AuthenticationResponse } from '../../api/types'
import { useAuth } from '../../auth/AuthContext'
import { homePath, safeNext } from '../../auth/roles'
import { AuthLayout } from '../../components/layout/AuthLayout'
import { Alert, PageLoader } from '../../components/ui/Feedback'
import { t } from '../../i18n'
import { takePendingSignIn } from '../../lib/oidc'

// One redemption per authorization code. StrictMode runs effects twice in development, and a
// code can only be redeemed once, so the second run must reuse the first run's promise.
const redemptions = new Map<string, Promise<{ auth: AuthenticationResponse; next?: string }>>()

function redeem(code: string, state: string | null) {
  let pending = redemptions.get(code)
  if (!pending) {
    pending = (async () => {
      const started = takePendingSignIn(state)
      if (!started) throw new Error(t('nid.stateMismatch'))
      const auth = await authApi.nationalIdentitySignIn({
        code,
        redirectUri: started.redirectUri,
        codeVerifier: started.verifier,
        nonce: started.nonce,
      })
      return { auth, next: started.next }
    })()
    redemptions.set(code, pending)
  }
  return pending
}

/** Where the identity provider sends the browser back to, with `?code=&state=`. */
export function NationalIdentityCallbackPage() {
  const [params] = useSearchParams()
  const { establish } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<unknown>(null)

  const code = params.get('code')
  const state = params.get('state')
  const providerError = params.get('error')

  useEffect(() => {
    if (!code || providerError) return
    let live = true
    redeem(code, state)
      .then(({ auth, next }) => {
        if (!live) return
        const user = establish(auth)
        navigate(safeNext(next ?? null) ?? homePath(user), { replace: true })
      })
      .catch((e) => live && setError(e))
    return () => {
      live = false
    }
  }, [code, state, providerError, establish, navigate])

  const failure = providerError
    ? t('nid.providerError', { error: params.get('error_description') ?? providerError })
    : !code
      ? t('nid.noCode')
      : error
        ? error instanceof ApiError && error.status === 404
          ? t('nid.noAccount')
          : error instanceof ApiError && error.status === 401
            ? t('nid.rejected')
            : errorMessage(error)
        : null

  if (!failure) return <PageLoader label={t('nid.completing')} />

  return (
    <AuthLayout title={t('nid.failedTitle')}>
      <div className="space-y-5">
        <Alert tone="error">{failure}</Alert>
        <p className="text-sm text-slate-600">
          <Link to="/login" className="font-medium text-brand-700 hover:text-brand-800">
            {t('nid.backToSignIn')}
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}
