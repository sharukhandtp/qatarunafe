import { KeyRound, LogOut, MonitorSmartphone } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { authApi } from '../../api/endpoints'
import { session } from '../../api/session'
import { useAuth, useCurrentUser } from '../../auth/AuthContext'
import { isAdmin, isCitizen, isEmployee } from '../../auth/roles'
import { PasswordChecklist } from '../../components/PasswordChecklist'
import { AccountStatusBadge, Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, CardBody, CardHeader, DetailList } from '../../components/ui/Card'
import { Alert, ErrorAlert } from '../../components/ui/Feedback'
import { Input } from '../../components/ui/Form'
import { PageHeader } from '../../components/ui/Layout'
import { ConfirmDialog } from '../../components/ui/Modal'
import { useToast } from '../../components/ui/Toast'
import { useForm } from '../../hooks/useForm'
import { formatDateTime, initials } from '../../lib/format'
import { LEVEL, NATIVE_STATUS, USER_TYPE } from '../../lib/labels'
import { t } from '../../i18n'
import { required, strongPassword } from '../../lib/validation'

function ChangePasswordCard() {
  const toast = useToast()
  const navigate = useNavigate()

  const form = useForm({ currentPassword: '', newPassword: '', confirmPassword: '' }, (v) => ({
    currentPassword: required(v.currentPassword, t('shared.profile.currentPassword')),
    newPassword:
      strongPassword(v.newPassword) ??
      (v.newPassword === v.currentPassword ? t('shared.profile.mustDiffer') : undefined),
    confirmPassword: v.confirmPassword !== v.newPassword ? t('shared.profile.mismatch') : undefined,
  }))

  const onSubmit = form.handleSubmit(async (v) => {
    await authApi.changePassword({ currentPassword: v.currentPassword, newPassword: v.newPassword })
    // The change rotates the security stamp and revokes every refresh token, so this session
    // is already dead on the server. Say so and send the user to sign in again.
    // Calling /logout here would be refused and, worse, the client would then try the revoked
    // refresh token - which the API records as token reuse. Dropping the session locally is
    // all that is left to do.
    toast.success(t('shared.profile.changedTitle'), t('shared.profile.changedBody'))
    session.clear()
    navigate('/login', { replace: true })
  })

  return (
    <Card>
      <CardHeader
        title={
          <span className="inline-flex items-center gap-2">
            <KeyRound className="size-4 text-slate-400" aria-hidden /> {t('shared.profile.changePassword')}
          </span>
        }
        description={t('shared.profile.changeDescription')}
      />
      <CardBody>
        <form onSubmit={onSubmit} noValidate className="max-w-md space-y-4">
          <ErrorAlert error={form.formError} />
          <Input label={t('shared.profile.currentPassword')} type="password" dir="ltr" autoComplete="current-password" {...form.field('currentPassword')} />
          <div className="space-y-2">
            <Input label={t('shared.profile.newPassword')} type="password" dir="ltr" autoComplete="new-password" {...form.field('newPassword')} />
            <PasswordChecklist value={form.values.newPassword} />
          </div>
          <Input
            label={t('shared.profile.confirmPassword')}
            type="password"
            dir="ltr" autoComplete="new-password" {...form.field('confirmPassword')} />
          <Button type="submit" loading={form.submitting}>
            {t('shared.profile.updatePassword')}
          </Button>
        </form>
      </CardBody>
    </Card>
  )
}

export function ProfilePage() {
  const user = useCurrentUser()
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [confirmAll, setConfirmAll] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  const signOutEverywhere = async () => {
    setSigningOut(true)
    await logout({ allSessions: true })
    navigate('/login', { replace: true })
  }

  return (
    <>
      <PageHeader title={t('nav.profile')} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <Card>
            <CardBody className="flex flex-wrap items-center gap-4">
              <div className="flex size-14 items-center justify-center rounded-full bg-brand-700 text-lg font-semibold text-white">
                {initials(user.fullName)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-semibold text-slate-900">{user.fullName}</p>
                <p className="text-sm text-slate-500" dir="ltr">
                  {user.email}
                </p>
              </div>
              <div className="flex gap-2">
                <Badge tone={USER_TYPE[user.userType].tone}>{USER_TYPE[user.userType].label}</Badge>
                <AccountStatusBadge status={user.accountStatus} />
              </div>
            </CardBody>
            <div className="border-t border-slate-100 px-5 py-4">
              <DetailList
                items={[
                  { label: t('validation.nationalIdLabel'), value: <span className="font-mono">{user.nationalId}</span> },
                  { label: t('shared.profile.phone'), value: <span dir="ltr">{user.phoneNumber ?? '—'}</span> },
                  ...(isCitizen(user) ? [{ label: t('shared.profile.residency'), value: NATIVE_STATUS[user.nativeStatus] }] : []),
                  ...(isEmployee(user)
                    ? [
                        { label: t('shared.profile.ministry'), value: user.ministryName ?? '—' },
                        { label: t('shared.profile.tier'), value: LEVEL[user.employeeLevel] },
                        { label: t('shared.profile.jobTitle'), value: user.jobTitle ?? '—' },
                      ]
                    : []),
                  ...(isAdmin(user) ? [{ label: t('shared.profile.scope'), value: t('shared.profile.allMinistries') }] : []),
                  { label: t('shared.profile.previousSignIn'), value: formatDateTime(user.lastLoginAt) },
                ]}
              />
            </div>
          </Card>

          <ChangePasswordCard />
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader
              title={
                <span className="inline-flex items-center gap-2">
                  <MonitorSmartphone className="size-4 text-slate-400" aria-hidden /> {t('shared.profile.sessions')}
                </span>
              }
            />
            <CardBody className="space-y-3">
              <p className="text-sm text-slate-600">
                {t('shared.profile.sessionsBody')}
              </p>
              <Button variant="danger" icon={LogOut} onClick={() => setConfirmAll(true)}>
                {t('shared.profile.signOutEverywhere')}
              </Button>
            </CardBody>
          </Card>
          {!isCitizen(user) && (
            <Alert tone="info" title={t('shared.profile.centralTitle')}>
              {t('shared.profile.centralBody')}
            </Alert>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmAll}
        onClose={() => setConfirmAll(false)}
        onConfirm={signOutEverywhere}
        loading={signingOut}
        tone="danger"
        title={t('shared.profile.confirmTitle')}
        description={t('shared.profile.confirmDescription')}
        confirmLabel={t('shared.profile.signOutEverywhere')}
      />
    </>
  )
}
