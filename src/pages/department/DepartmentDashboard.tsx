import { useQuery } from '@tanstack/react-query'
import {
  AlarmClock,
  ArrowRight,
  CircleCheck,
  Inbox,
  Layers,
  MessageSquareWarning,
  UserCheck,
  UserRoundX,
} from 'lucide-react'
import { Link } from 'react-router'
import { departmentApi } from '../../api/endpoints'
import { useCurrentUser } from '../../auth/AuthContext'
import { isMinistryStaff } from '../../auth/roles'
import { ButtonLink } from '../../components/ui/Button'
import { Card, CardHeader } from '../../components/ui/Card'
import { Alert, EmptyState, ErrorState, Spinner } from '../../components/ui/Feedback'
import { PageHeader, StatCard } from '../../components/ui/Layout'
import { keys } from '../../hooks/queries'
import { t, tn } from '../../i18n'
import { LEVEL, LEVEL_SHORT } from '../../lib/labels'
import { CaseTable } from './CaseTable'

export function DepartmentDashboard() {
  const user = useCurrentUser()
  const staff = isMinistryStaff(user)

  const workload = useQuery({
    queryKey: keys.workload,
    queryFn: departmentApi.workload,
    enabled: staff,
    refetchInterval: 60_000,
  })

  const desk = useQuery({
    queryKey: keys.caseQueue({ myLevelOnly: true, pageSize: 8 }),
    queryFn: () => departmentApi.queue({ myLevelOnly: true, pageSize: 8 }),
    enabled: staff,
  })

  if (!staff) {
    return (
      <Alert tone="warning" title={t('department.dash.noMinistryTitle')}>
        {t('department.dash.noMinistryBody')}
      </Alert>
    )
  }

  const w = workload.data
  const value = (n: number | undefined) => (workload.isLoading ? '…' : (n ?? 0))
  const myStageKey = `awaiting${user.employeeLevel}` as 'awaitingL1' | 'awaitingL2' | 'awaitingL3'
  const myLevel = user.employeeLevel === 'None' ? '—' : LEVEL_SHORT[user.employeeLevel]

  return (
    <>
      <PageHeader
        title={user.ministryName ?? t('department.dash.defaultTitle')}
        description={t('department.dash.description', {
          jobTitle: user.jobTitle ?? t('department.dash.defaultJobTitle'),
          level: LEVEL[user.employeeLevel],
        })}
        actions={
          <ButtonLink to="/department/queue?myLevelOnly=true" icon={Inbox}>
            {t('department.dash.openQueue')}
          </ButtonLink>
        }
      />

      {workload.isError && (
        <Card className="mb-6">
          <ErrorState error={workload.error} onRetry={() => workload.refetch()} />
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t('department.dash.waitingAt', { level: myLevel })}
          value={value(w?.[myStageKey])}
          icon={Inbox}
          tone="brand"
          to="/department/queue?myLevelOnly=true"
          hint={t('department.dash.yourTier')}
        />
        <StatCard
          label={t('department.dash.assignedToMe')}
          value={value(w?.assignedToMe)}
          icon={UserCheck}
          tone="sky"
          to="/department/queue?assignedToMeOnly=true"
        />
        <StatCard
          label={t('department.dash.unassignedAtTier')}
          value={value(w?.unassignedAtMyLevel)}
          icon={UserRoundX}
          tone="amber"
          to="/department/queue?myLevelOnly=true&unassignedOnly=true"
        />
        <StatCard
          label={t('department.dash.overdue')}
          value={value(w?.overdue)}
          icon={AlarmClock}
          tone="red"
          to="/department/queue?overdueOnly=true"
          hint={t('department.dash.pastSla')}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {(['L1', 'L2', 'L3'] as const).map((level) => (
          <StatCard
            key={level}
            label={t('department.dash.awaiting', { level: LEVEL_SHORT[level] })}
            value={value(w?.[`awaiting${level}`])}
            icon={Layers}
            tone="slate"
            to={`/department/queue?stage=${level}`}
          />
        ))}
        <StatCard
          label={t('department.dash.returned')}
          value={value(w?.returnedForInformation)}
          icon={MessageSquareWarning}
          tone="violet"
          to="/department/queue?status=ReturnedForInformation"
        />
      </div>

      <Card className="mt-6">
        <CardHeader
          title={t('department.dash.onDesk')}
          description={t('department.dash.onDeskDescription', { level: myLevel, ministry: user.ministryCode ?? '' })}
          actions={
            <Link
              to="/department/queue?myLevelOnly=true"
              className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-800"
            >
              {t('department.dash.fullQueue')} <ArrowRight className="size-4 rtl:rotate-180" />
            </Link>
          }
        />
        {desk.isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : desk.isError ? (
          <ErrorState error={desk.error} onRetry={() => desk.refetch()} />
        ) : !desk.data?.items.length ? (
          <EmptyState icon={CircleCheck} title={t('department.dash.nothingTitle')}
            description={t('department.dash.nothingDescription')}
 />
        ) : (
          <CaseTable items={desk.data.items} compact />
        )}
      </Card>

      {w && (
        <p className="mt-4 text-end text-xs text-slate-500">
          {tn('department.dash.decided', w.decidedLast30Days)}
        </p>
      )}
    </>
  )
}
