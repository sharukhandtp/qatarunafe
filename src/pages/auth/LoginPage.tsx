import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Eye, EyeOff, Fingerprint, LogIn, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { ApiError, errorMessage } from '../../api/client'
import { authApi } from '../../api/endpoints'
import type { MfaChallenge, MfaEnrollment, NationalIdentityConfig, UserProfile } from '../../api/types'
import { useAuth } from '../../auth/AuthContext'
import { homePath, safeNext } from '../../auth/roles'
import { AuthLayout } from '../../components/layout/AuthLayout'
import { CodeInput, EnrollmentPanel } from '../../components/TwoStep'
import { Button } from '../../components/ui/Button'
import { Alert, ErrorAlert, Spinner } from '../../components/ui/Feedback'
import { Input } from '../../components/ui/Form'
import { useForm } from '../../hooks/useForm'
import { t, type MessageKey } from '../../i18n'
import { beginNationalIdentitySignIn } from '../../lib/oidc'
import { cleanCode, required, validCode } from '../../lib/validation'

// Accounts created by the development seeder (Database:SeedDemoData). The shared password is
// deliberately not here - it lives in `dotnet user-secrets` as Seed:DefaultPassword.
const DEMO_ACCOUNTS: { email: string; label: MessageKey; tier?: string }[] = [
  { email: 'citizen@example.qa', label: 'nativeStatus.NativeCitizen' },
  { email: 'resident@example.qa', label: 'nativeStatus.Resident' },
  { email: 'l1.water@qataruna.gov', label: 'auth.demo.water', tier: 'L1' },
  { email: 'l2.water@qataruna.gov', label: 'auth.demo.water', tier: 'L2' },
  { email: 'l3.water@qataruna.gov', label: 'auth.demo.water', tier: 'L3' },
  { email: 'l1.electricity@qataruna.gov', label: 'auth.demo.electricity', tier: 'L1' },
  { email: 'admin@qataruna.gov', label: 'userType.Administrator' },
]

// ---- National digital identity ---------------------------------------------------
//
// Whether the option exists is asked once per tab and remembered. The endpoint is under
// /auth/*, which shares one 10-a-minute rate limit with sign-in itself, so asking on every
// visit to this page would use up the attempts people have to sign in.

const NID_CACHE = 'qataruna.nationalIdentity'

function readNidCache(): NationalIdentityConfig | null | undefined {
  try {
    const raw = sessionStorage.getItem(NID_CACHE)
    return raw === null ? undefined : (JSON.parse(raw) as NationalIdentityConfig | null)
  } catch {
    return undefined
  }
}

function useNationalIdentity() {
  return useQuery({
    queryKey: ['national-identity-config'],
    queryFn: async () => {
      let config: NationalIdentityConfig | null
      try {
        config = await authApi.nationalIdentityConfig()
      } catch (error) {
        // 404 means not configured: hide the option and remember that. Any other failure
        // hides it for now without remembering, so a later visit asks again.
        if (!(error instanceof ApiError && error.status === 404)) return null
        config = null
      }
      try {
        sessionStorage.setItem(NID_CACHE, JSON.stringify(config))
      } catch {
        // Not cached; asked again next time.
      }
      return config
    },
    initialData: readNidCache,
    staleTime: Infinity,
    retry: false,
  })
}

function NationalIdentityButton({ next }: { next: string | null }) {
  const config = useNationalIdentity()
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<unknown>(null)
  if (!config.data) return null
  const provider = config.data

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-xs text-slate-400">
        <span className="h-px flex-1 bg-slate-200" />
        {t('nid.or')}
        <span className="h-px flex-1 bg-slate-200" />
      </div>
      <ErrorAlert error={error} />
      <Button
        variant="secondary"
        size="lg"
        block
        icon={Fingerprint}
        loading={starting}
        onClick={() => {
          setStarting(true)
          setError(null)
          beginNationalIdentitySignIn(provider, next).catch((e) => {
            setError(e)
            setStarting(false)
          })
        }}
      >
        {t('nid.signInWith', { provider: provider.displayName })}
      </Button>
      <p className="text-center text-xs text-slate-500">{t('nid.citizensOnly')}</p>
    </div>
  )
}

// ---- Second factor -----------------------------------------------------------------

function SecondFactorStep({
  challenge,
  onDone,
  onBack,
}: {
  challenge: MfaChallenge
  onDone: (user: UserProfile) => void
  onBack: () => void
}) {
  const { completeMfa } = useAuth()
  const form = useForm({ code: '' }, (v) => ({ code: validCode(v.code) }))

  // An account that must have two-step sign-in but never set it up gets its authenticator
  // here; the challenge is the proof that the password was right.
  const enrollment = useQuery<MfaEnrollment>({
    queryKey: ['mfa-enrollment', challenge.challengeToken],
    queryFn: () => authApi.startMfaEnrollment(challenge.challengeToken),
    enabled: challenge.enrollmentRequired,
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
  })

  const onSubmit = form.handleSubmit(async ({ code }) => {
    onDone(await completeMfa(challenge.challengeToken, cleanCode(code)))
  })

  const rejected = form.formError instanceof ApiError && form.formError.status === 401

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <div className="flex items-start gap-3 rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-900">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand-700" aria-hidden />
        <p>{t(challenge.enrollmentRequired ? 'mfa.enrolRequiredBody' : 'mfa.enterCodeBody')}</p>
      </div>

      {challenge.enrollmentRequired &&
        (enrollment.isLoading ? (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        ) : enrollment.isError ? (
          <Alert tone="error">{errorMessage(enrollment.error)}</Alert>
        ) : (
          enrollment.data && <EnrollmentPanel enrollment={enrollment.data} />
        ))}

      {rejected ? (
        <Alert tone="error" title={t('mfa.rejectedTitle')}>
          {t('mfa.rejectedBody')}
        </Alert>
      ) : (
        <ErrorAlert error={form.formError} />
      )}

      <CodeInput autoFocus {...form.field('code')} />

      <Button type="submit" size="lg" block icon={ShieldCheck} loading={form.submitting} disabled={enrollment.isError}>
        {t('mfa.verify')}
      </Button>
      <button
        type="button"
        onClick={onBack}
        className="mx-auto flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
        {t('mfa.backToPassword')}
      </button>
    </form>
  )
}

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [showPassword, setShowPassword] = useState(false)
  const [challenge, setChallenge] = useState<MfaChallenge | null>(null)

  const finish = (user: UserProfile) => navigate(safeNext(params.get('next')) ?? homePath(user), { replace: true })

  const form = useForm({ email: params.get('email') ?? '', password: '' }, (v) => ({
    email: required(v.email, t('validation.emailLabel')),
    password: required(v.password, t('validation.passwordLabel')),
  }))

  const onSubmit = form.handleSubmit(async ({ email, password }) => {
    const result = await login({ email: email.trim(), password })
    if ('mfa' in result) {
      setChallenge(result.mfa)
      form.setValue('password', '')
    } else {
      finish(result.user)
    }
  })

  const unauthorized = form.formError instanceof ApiError && form.formError.status === 401

  if (challenge) {
    return (
      <AuthLayout title={t('mfa.title')} subtitle={t('mfa.subtitle')}>
        <SecondFactorStep challenge={challenge} onDone={finish} onBack={() => setChallenge(null)} />
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title={t('auth.signIn')}
      subtitle={
        <>
          {t('auth.login.newHere')}{' '}
          <Link to="/register" className="font-medium text-brand-700 hover:text-brand-800">
            {t('auth.login.createAccount')}
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {params.get('registered') && (
          <Alert tone="success" title={t('auth.login.registeredTitle')}>
            {t('auth.login.registeredBody')}
          </Alert>
        )}
        {unauthorized ? (
          <Alert tone="error" title={t('auth.login.invalidTitle')}>
            {t('auth.login.invalidBody')}
          </Alert>
        ) : (
          <ErrorAlert error={form.formError} />
        )}

        <Input
          label={t('validation.emailLabel')}
          type="email"
          dir="ltr"
          autoComplete="username"
          autoFocus
          {...form.field('email')}
        />

        <div className="relative">
          <Input
            label={t('validation.passwordLabel')}
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            className="pe-10"
            {...form.field('password')}
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="absolute top-[34px] end-2.5 rounded p-1 text-slate-400 hover:text-slate-600"
            aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>

        <Button type="submit" size="lg" block icon={LogIn} loading={form.submitting}>
          {t('auth.signIn')}
        </Button>
      </form>

      <div className="mt-5">
        <NationalIdentityButton next={params.get('next')} />
      </div>

      <p className="mt-6 text-center text-xs text-slate-500">
        <Link to="/verify" className="font-medium text-brand-700 hover:text-brand-800">
          {t('verify.link')}
        </Link>
      </p>

      {import.meta.env.DEV && (
        <div className="mt-10 rounded-xl border border-dashed border-slate-300 p-4">
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{t('auth.demo.title')}</p>
          <p className="mt-1 text-xs text-slate-500">
            {t('auth.demo.before')} <code className="rounded bg-slate-100 px-1">Seed:DefaultPassword</code>{' '}
            {t('auth.demo.after')}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => form.setValue('email', account.email)}
                className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-brand-50 hover:text-brand-800"
                title={account.email}
              >
                {t(account.label)}
                {account.tier && ` · ${t(`level.short.${account.tier}` as MessageKey)}`}
              </button>
            ))}
          </div>
        </div>
      )}
    </AuthLayout>
  )
}
