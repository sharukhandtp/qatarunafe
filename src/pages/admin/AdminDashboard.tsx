import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Briefcase, Building2, ShieldAlert, ShieldCheck, UserPlus, Users } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { adminApi, ministriesApi } from '../../api/endpoints'
import type { UserType } from '../../api/types'
import { Badge } from '../../components/ui/Badge'
import { ButtonLink } from '../../components/ui/Button'
import { Card, CardHeader } from '../../components/ui/Card'
import { EmptyState, ErrorState, Spinner } from '../../components/ui/Feedback'
import { PageHeader, StatCard, Table, Td, Th } from '../../components/ui/Layout'
import { keys } from '../../hooks/queries'
import { formatRelative } from '../../lib/format'
import { AUDIT_ACTION } from '../../lib/labels'
import { t, tn } from '../../i18n'

function useUserCount(userType: UserType) {
  return useQuery({
    queryKey: keys.userList({ userType, pageSize: 1 }),
    queryFn: () => adminApi.users({ userType, pageSize: 1 }),
    select: (p) => p.totalCount,
  })
}

export function AdminDashboard() {
  // Fixed at mount so the query key does not change on every render.
  const [since] = useState(() => new Date(Date.now() - 24 * 3600_000).toISOString())

  const ministries = useQuery({
    queryKey: keys.ministryList({ includeInactive: true, pageSize: 100 }),
    queryFn: () => ministriesApi.list({ includeInactive: true, pageSize: 100 }),
  })
  const citizens = useUserCount('PublicUser')
  const employees = useUserCount('GovernmentEmployee')

  const denied = useQuery({
    queryKey: keys.audit({ action: 'AccessDenied', from: since, pageSize: 1 }),
    queryFn: () => adminApi.auditLogs({ action: 'AccessDenied', from: since, pageSize: 1 }),
    select: (p) => p.totalCount,
  })

  const failures = useQuery({
    queryKey: keys.audit({ failuresOnly: true, pageSize: 8 }),
    queryFn: () => adminApi.auditLogs({ failuresOnly: true, pageSize: 8 }),
  })

  const show = (q: { data?: number; isLoading: boolean }) => (q.isLoading ? '…' : (q.data ?? 0))
  const activeMinistries = ministries.data?.items.filter((m) => m.isActive).length

  return (
    <>
      <PageHeader
        title={t('admin.dashboard.title')}
        description={t('admin.dashboard.description')}
        actions={
          <>
            <ButtonLink to="/admin/ministries" variant="secondary" icon={Building2}>
              {t('admin.ministries')}
            </ButtonLink>
            <ButtonLink to="/admin/users/new" icon={UserPlus}>
              {t('admin.newEmployee')}
            </ButtonLink>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t('admin.dashboard.activeMinistries')}
          value={ministries.isLoading ? '…' : t('admin.dashboard.ratio', { active: activeMinistries ?? 0, total: ministries.data?.totalCount ?? 0 })}
          icon={Building2}
          to="/admin/ministries"
        />
        <StatCard label={t('admin.dashboard.citizens')} value={show(citizens)} icon={Users} tone="sky" to="/admin/users?userType=PublicUser" />
        <StatCard
          label={t('admin.dashboard.employees')}
          value={show(employees)}
          icon={Briefcase}
          tone="violet"
          to="/admin/users?userType=GovernmentEmployee"
        />
        <StatCard
          label={t('admin.dashboard.accessDenied')}
          value={show(denied)}
          icon={ShieldAlert}
          tone="red"
          to="/audit?action=AccessDenied"
          hint={t('admin.dashboard.policyRefusals')}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card>
          <CardHeader
            title={t('admin.dashboard.recentFailures')}
            description={t('admin.dashboard.recentFailuresDescription')}
            actions={
              <Link to="/audit?failuresOnly=true" className="inline-flex items-center gap-1 text-sm font-medium text-brand-700">
                {t('admin.dashboard.auditTrail')} <ArrowRight className="size-4 rtl:rotate-180" />
              </Link>
            }
          />
          {failures.isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : failures.isError ? (
            <ErrorState error={failures.error} onRetry={() => failures.refetch()} />
          ) : !failures.data?.items.length ? (
            <EmptyState icon={ShieldCheck} title={t('admin.dashboard.noFailures')} />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>{t('admin.col.event')}</Th>
                  <Th>{t('admin.col.actor')}</Th>
                  <Th className="hidden md:table-cell">{t('admin.col.detail')}</Th>
                  <Th>{t('admin.col.when')}</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {failures.data.items.map((e) => (
                  <tr key={e.id}>
                    <Td>
                      <Badge tone={AUDIT_ACTION[e.action].tone}>{AUDIT_ACTION[e.action].label}</Badge>
                    </Td>
                    <Td className="whitespace-nowrap">{e.actorName ?? <span className="text-slate-400">{t('admin.dashboard.anonymous')}</span>}</Td>
                    <Td className="hidden text-xs text-slate-500 md:table-cell" title={e.failureReason}>
                      <span className="block max-w-[16rem] truncate">{e.failureReason ?? '—'}</span>
                    </Td>
                    <Td className="text-xs whitespace-nowrap text-slate-500">{formatRelative(e.occurredAt)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <Card>
          <CardHeader title={t('admin.ministries')} />
          {ministries.isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {ministries.data?.items.map((m) => (
                <li key={m.id}>
                  <Link to={`/admin/ministries/${m.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50">
                    <Badge tone={m.isActive ? 'brand' : 'neutral'}>{m.code}</Badge>
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-800">{m.name}</span>
                    <span className="text-xs text-slate-500">
                      {t('admin.dashboard.ministryCounts', {
                        services: tn('admin.dashboard.services', m.activeServiceCount),
                        staff: tn('admin.dashboard.staff', m.employeeCount),
                      })}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  )
}
