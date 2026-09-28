import { Eye, EyeOff, LogIn } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { ApiError } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { homePath, safeNext } from '../../auth/roles'
import { AuthLayout } from '../../components/layout/AuthLayout'
import { Button } from '../../components/ui/Button'
import { Alert, ErrorAlert } from '../../components/ui/Feedback'
import { Input } from '../../components/ui/Form'
import { useForm } from '../../hooks/useForm'
import { t, type MessageKey } from '../../i18n'
import { required } from '../../lib/validation'

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

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [showPassword, setShowPassword] = useState(false)

  const form = useForm({ email: params.get('email') ?? '', password: '' }, (v) => ({
    email: required(v.email, t('validation.emailLabel')),
    password: required(v.password, t('validation.passwordLabel')),
  }))

  const onSubmit = form.handleSubmit(async ({ email, password }) => {
    const user = await login({ email: email.trim(), password })
    navigate(safeNext(params.get('next')) ?? homePath(user), { replace: true })
  })

  const unauthorized = form.formError instanceof ApiError && form.formError.status === 401

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
