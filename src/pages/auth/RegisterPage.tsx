import clsx from 'clsx'
import { UserPlus } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { authApi } from '../../api/endpoints'
import type { RegisterRequest } from '../../api/types'
import { AuthLayout } from '../../components/layout/AuthLayout'
import { PasswordChecklist } from '../../components/PasswordChecklist'
import { Button } from '../../components/ui/Button'
import { ErrorAlert } from '../../components/ui/Feedback'
import { Input } from '../../components/ui/Form'
import { useForm } from '../../hooks/useForm'
import { t, type MessageKey } from '../../i18n'
import { email, maxLength, nationalId, phone, required, strongPassword } from '../../lib/validation'

const RESIDENCY: { value: 'NativeCitizen' | 'Resident'; title: MessageKey; description: MessageKey }[] = [
  {
    value: 'NativeCitizen',
    title: 'nativeStatus.NativeCitizen',
    description: 'auth.register.nativeDescription',
  },
  {
    value: 'Resident',
    title: 'nativeStatus.Resident',
    description: 'auth.register.residentDescription',
  },
]

export function RegisterPage() {
  const navigate = useNavigate()

  const form = useForm(
    {
      fullName: '',
      email: '',
      nationalId: '',
      phoneNumber: '',
      nativeStatus: 'NativeCitizen',
      password: '',
      confirmPassword: '',
    },
    (v) => ({
      fullName: required(v.fullName, t('auth.fullName')) ?? maxLength(v.fullName, 200, t('auth.fullName')),
      email: email(v.email),
      nationalId: nationalId(v.nationalId),
      phoneNumber: phone(v.phoneNumber),
      password: strongPassword(v.password),
      confirmPassword: v.confirmPassword !== v.password ? t('auth.register.passwordMismatch') : undefined,
    }),
  )

  const onSubmit = form.handleSubmit(async (v) => {
    await authApi.register({
      fullName: v.fullName.trim(),
      email: v.email.trim(),
      nationalId: v.nationalId.trim(),
      phoneNumber: v.phoneNumber.trim() || undefined,
      nativeStatus: v.nativeStatus as RegisterRequest['nativeStatus'],
      password: v.password,
    })
    navigate(`/login?registered=1&email=${encodeURIComponent(v.email.trim())}`, { replace: true })
  })

  return (
    <AuthLayout
      title={t('auth.register.title')}
      subtitle={
        <>
          {t('auth.register.alreadyRegistered')}{' '}
          <Link to="/login" className="font-medium text-brand-700 hover:text-brand-800">
            {t('auth.signIn')}
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <ErrorAlert error={form.formError} />

        <Input label={t('auth.fullName')} autoComplete="name" required autoFocus {...form.field('fullName')} />
        <Input
          label={t('validation.emailLabel')}
          type="email"
          dir="ltr"
          autoComplete="email"
          required
          {...form.field('email')}
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            label={t('validation.nationalIdLabel')}
            dir="ltr"
            required
            hint={t('auth.register.nationalIdHint')}
            {...form.field('nationalId')}
          />
          <Input
            label={t('auth.mobileNumber')}
            type="tel"
            dir="ltr"
            autoComplete="tel"
            placeholder="+974 5000 0000"
            {...form.field('phoneNumber')}
          />
        </div>

        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-slate-700">{t('auth.register.residency')}</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {RESIDENCY.map((option) => {
              const selected = form.values.nativeStatus === option.value
              return (
                <label
                  key={option.value}
                  className={clsx(
                    'cursor-pointer rounded-lg p-3 ring-1 transition',
                    selected ? 'bg-brand-50 ring-2 ring-brand-600' : 'bg-white ring-slate-300 hover:ring-slate-400',
                  )}
                >
                  <input
                    type="radio"
                    name="nativeStatus"
                    value={option.value}
                    checked={selected}
                    onChange={() => form.setValue('nativeStatus', option.value)}
                    className="sr-only"
                  />
                  <span className="block text-sm font-medium text-slate-900">{t(option.title)}</span>
                  <span className="mt-0.5 block text-xs text-slate-500">{t(option.description)}</span>
                </label>
              )
            })}
          </div>
        </fieldset>

        <div className="space-y-2">
          <Input
            label={t('validation.passwordLabel')}
            type="password"
            autoComplete="new-password"
            required
            {...form.field('password')}
          />
          <PasswordChecklist value={form.values.password} />
        </div>
        <Input
          label={t('auth.register.confirmPassword')}
          type="password"
          autoComplete="new-password"
          required
          {...form.field('confirmPassword')}
        />

        <Button type="submit" size="lg" block icon={UserPlus} loading={form.submitting}>
          {t('auth.register.submit')}
        </Button>
      </form>
    </AuthLayout>
  )
}
