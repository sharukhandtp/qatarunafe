import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BellRing, ShieldCheck, ShieldOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { authApi, notificationsApi } from '../../api/endpoints'
import { session } from '../../api/session'
import type { MfaEnrollment, NotificationPreferences } from '../../api/types'
import { useCurrentUser } from '../../auth/AuthContext'
import { CodeInput, EnrollmentPanel } from '../../components/TwoStep'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { ErrorAlert, ErrorState, Spinner } from '../../components/ui/Feedback'
import { Checkbox, Select } from '../../components/ui/Form'
import { useToast } from '../../components/ui/Toast'
import { keys } from '../../hooks/queries'
import { useForm } from '../../hooks/useForm'
import { LANGUAGES, t, type Lang } from '../../i18n'
import { cleanCode, validCode } from '../../lib/validation'

// The MFA endpoints are under /auth/* and so share its 10-a-minute rate limit. After a change
// the cached profile is patched locally rather than re-read from /auth/me.

/** Two-step sign-in: set up an authenticator app, or turn it off with a current code. */
export function TwoStepCard() {
  const user = useCurrentUser()
  const toast = useToast()
  const [enrollment, setEnrollment] = useState<MfaEnrollment | null>(null)
  const [disabling, setDisabling] = useState(false)

  const form = useForm({ code: '' }, (v) => ({ code: validCode(v.code) }))

  const start = useMutation({
    mutationFn: () => authApi.startMfaEnrollment(),
    onSuccess: (e) => {
      form.reset()
      setEnrollment(e)
    },
  })

  const confirm = form.handleSubmit(async ({ code }) => {
    await authApi.confirmMfaEnrollment(cleanCode(code))
    session.updateUser({ ...user, mfaEnabled: true })
    setEnrollment(null)
    form.reset()
    toast.success(t('mfa.enabledToast'), t('mfa.enabledToastBody'))
  })

  const disable = form.handleSubmit(async ({ code }) => {
    await authApi.disableMfa(cleanCode(code))
    session.updateUser({ ...user, mfaEnabled: false })
    setDisabling(false)
    form.reset()
    toast.success(t('mfa.disabledToast'))
  })

  const cancel = () => {
    setEnrollment(null)
    setDisabling(false)
    form.reset()
  }

  return (
    <Card>
      <CardHeader
        title={
          <span className="inline-flex items-center gap-2">
            <ShieldCheck className="size-4 text-slate-400" aria-hidden /> {t('mfa.cardTitle')}
          </span>
        }
        description={t('mfa.cardDescription')}
        actions={
          <Badge tone={user.mfaEnabled ? 'green' : 'neutral'} dot>
            {user.mfaEnabled ? t('mfa.on') : t('mfa.off')}
          </Badge>
        }
      />
      <CardBody className="space-y-4">
        <ErrorAlert error={start.error} />

        {enrollment ? (
          <form onSubmit={confirm} noValidate className="space-y-4">
            <EnrollmentPanel enrollment={enrollment} />
            <ErrorAlert error={form.formError} />
            <div className="max-w-xs">
              <CodeInput autoFocus hint={t('mfa.confirmHint')} {...form.field('code')} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" icon={ShieldCheck} loading={form.submitting}>
                {t('mfa.turnOn')}
              </Button>
              <Button variant="ghost" onClick={cancel} disabled={form.submitting}>
                {t('ui.cancel')}
              </Button>
            </div>
          </form>
        ) : disabling ? (
          <form onSubmit={disable} noValidate className="space-y-4">
            <p className="text-sm text-slate-600">{t('mfa.disableBody')}</p>
            <ErrorAlert error={form.formError} />
            <div className="max-w-xs">
              <CodeInput autoFocus {...form.field('code')} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" variant="danger" icon={ShieldOff} loading={form.submitting}>
                {t('mfa.turnOff')}
              </Button>
              <Button variant="ghost" onClick={cancel} disabled={form.submitting}>
                {t('ui.cancel')}
              </Button>
            </div>
          </form>
        ) : user.mfaEnabled ? (
          <>
            <p className="text-sm text-slate-600">{t('mfa.onBody')}</p>
            <Button variant="secondary" icon={ShieldOff} onClick={() => setDisabling(true)}>
              {t('mfa.turnOff')}
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-slate-600">{t('mfa.offBody')}</p>
            <Button icon={ShieldCheck} loading={start.isPending} onClick={() => start.mutate()}>
              {t('mfa.setUp')}
            </Button>
          </>
        )}
      </CardBody>
    </Card>
  )
}

function PreferencesForm({ prefs }: { prefs: NotificationPreferences }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const form = useForm({
    preferredLanguage: prefs.preferredLanguage,
    notifyByEmail: prefs.notifyByEmail,
    notifyBySms: prefs.notifyBySms,
  })

  const onSubmit = form.handleSubmit(async (v) => {
    const saved = await notificationsApi.updatePreferences(v)
    queryClient.setQueryData(keys.notificationPreferences, saved)
    toast.success(t('prefs.saved'))
  })

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <ErrorAlert error={form.formError} />
      <Select
        label={t('prefs.language')}
        hint={t('prefs.languageHint')}
        options={(Object.keys(LANGUAGES) as Lang[]).map((l) => ({ value: l, label: LANGUAGES[l].name }))}
        {...form.field('preferredLanguage')}
      />
      <Checkbox label={t('prefs.email')} description={t('prefs.emailHint')} {...form.checkbox('notifyByEmail')} />
      <Checkbox
        label={t('prefs.sms')}
        description={prefs.hasPhoneNumber ? t('prefs.smsHint') : t('prefs.smsNoPhone')}
        disabled={!prefs.hasPhoneNumber && !form.values.notifyBySms}
        {...form.checkbox('notifyBySms')}
      />
      <p className="text-xs text-slate-500">{t('prefs.inAppAlways')}</p>
      <Button type="submit" loading={form.submitting}>
        {t('prefs.save')}
      </Button>
    </form>
  )
}

/** Language and channels for notifications. The portal inbox always receives them. */
export function NotificationPreferencesCard() {
  const prefs = useQuery({ queryKey: keys.notificationPreferences, queryFn: notificationsApi.preferences })

  // Arriving from the inbox's "Preferences" link: bring this card into view once it renders.
  const ready = Boolean(prefs.data)
  useEffect(() => {
    if (ready && window.location.hash === '#notifications') {
      document.getElementById('notifications')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [ready])

  return (
    <Card id="notifications" className="scroll-mt-24">
      <CardHeader
        title={
          <span className="inline-flex items-center gap-2">
            <BellRing className="size-4 text-slate-400" aria-hidden /> {t('prefs.title')}
          </span>
        }
      />
      <CardBody>
        {prefs.isLoading ? (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        ) : prefs.isError || !prefs.data ? (
          <ErrorState error={prefs.error} onRetry={() => prefs.refetch()} />
        ) : (
          <PreferencesForm prefs={prefs.data} />
        )}
      </CardBody>
    </Card>
  )
}
