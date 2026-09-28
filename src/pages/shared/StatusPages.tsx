import { Compass, ShieldX } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { homePath } from '../../auth/roles'
import { ButtonLink } from '../../components/ui/Button'
import { t } from '../../i18n'

function StatusScreen({
  icon: Icon,
  code,
  title,
  message,
}: {
  icon: typeof Compass
  code: string
  title: string
  message: string
}) {
  const { user } = useAuth()
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="rounded-full bg-brand-50 p-4">
        <Icon className="size-8 text-brand-700" aria-hidden />
      </div>
      <p className="mt-6 text-sm font-semibold tracking-wide text-brand-700">{code}</p>
      <h1 className="mt-1 text-2xl font-semibold text-slate-900">{title}</h1>
      <p className="mt-2 max-w-md text-sm text-slate-500">{message}</p>
      <ButtonLink to={user ? homePath(user) : '/login'} className="mt-8">
        {t(user ? 'shared.status.backHome' : 'shared.status.signIn')}
      </ButtonLink>
    </div>
  )
}

export function NotFoundPage() {
  return (
    <StatusScreen
      icon={Compass}
      code="404"
      title={t('shared.status.notFoundTitle')}
      message={t('shared.status.notFoundMessage')}
    />
  )
}

export function ForbiddenPage() {
  return (
    <StatusScreen
      icon={ShieldX}
      code="403"
      title={t('shared.status.forbiddenTitle')}
      message={t('shared.status.forbiddenMessage')}
    />
  )
}
