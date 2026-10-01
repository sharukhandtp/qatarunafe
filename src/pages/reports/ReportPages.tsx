import { keepPreviousData, useQuery } from '@tanstack/react-query'
import {
  AlarmClock,
  BarChart3,
  CircleCheck,
  CircleX,
  Clock,
  Inbox,
  Receipt,
  Send,
  Timer,
  Undo2,
  Users,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { reportsApi } from '../../api/endpoints'
import type { DepartmentPerformance } from '../../api/types'
import { useCurrentUser } from '../../auth/AuthContext'
import { atLeast, isAdmin } from '../../auth/roles'
import { Card, CardHeader } from '../../components/ui/Card'
import { EmptyState, ErrorState, PageLoader } from '../../components/ui/Feedback'
import { Select } from '../../components/ui/Form'
import { PageHeader, StatCard, Table, Td, Th } from '../../components/ui/Layout'
import { keys } from '../../hooks/queries'
import { useUrlFilters } from '../../hooks/useUrlFilters'
import { t } from '../../i18n'
import { formatDate, formatHours, formatMoney, formatNumber, formatPercent } from '../../lib/format'
import { LEVEL_SHORT } from '../../lib/labels'

// Management reporting. Access follows the API: a department's figures for L2 and up (and
// administrators, per ministry), figures per named officer for L3 only, and the portal-wide
// overview for administrators.

const RANGES = ['7', '30', '90', '365'] as const
const FILTERS = ['days'] as const

/** The chosen window as API parameters; `to` is left open so it means "now". */
function useRange() {
  const { filters, setFilters } = useUrlFilters(FILTERS)
  const days = (RANGES as readonly string[]).includes(filters.days) ? filters.days : '30'
  // "Now" is fixed when the page opens, so the query key does not change on every render.
  const [now] = useState(() => Date.now())
  const from = useMemo(() => new Date(now - Number(days) * 86_400_000).toISOString(), [now, days])

  const picker = (
    <Select
      aria-label={t('reports.range')}
      containerClassName="w-48"
      value={days}
      onChange={(e) => setFilters({ days: e.target.value === '30' ? '' : e.target.value })}
      options={RANGES.map((d) => ({ value: d, label: t(`reports.last${d}`) }))}
    />
  )

  return { query: { from }, picker }
}

const rangeText = (r: { from: string; to: string }) =>
  t('reports.rangeText', { from: formatDate(r.from), to: formatDate(r.to) })

function DepartmentFigures({ report }: { report: DepartmentPerformance }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t('reports.submitted')} value={formatNumber(report.submitted)} icon={Send} tone="sky" />
        <StatCard label={t('reports.awaiting')} value={formatNumber(report.awaitingDecision)} icon={Inbox} tone="amber" />
        <StatCard label={t('reports.overdueNow')} value={formatNumber(report.overdueNow)} icon={AlarmClock} tone="red" />
        <StatCard
          label={t('reports.onTime')}
          value={formatPercent(report.onTimeRate)}
          icon={Timer}
          tone="green"
          hint={t('reports.decidedLate', { late: report.decidedLate, decided: report.decided })}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t('reports.approved')} value={formatNumber(report.approved)} icon={CircleCheck} tone="green" />
        <StatCard label={t('reports.rejected')} value={formatNumber(report.rejected)} icon={CircleX} tone="red" />
        <StatCard label={t('reports.returned')} value={formatNumber(report.returnedToApplicant)} icon={Undo2} tone="violet" />
        <StatCard
          label={t('reports.avgDecision')}
          value={formatHours(report.averageDecisionHours)}
          icon={Clock}
          tone="slate"
          hint={t('reports.completedCancelled', { completed: report.completed, cancelled: report.cancelled })}
        />
      </div>

      <Card>
        <CardHeader title={t('reports.stagesTitle')} description={t('reports.stagesDescription')} />
        {!report.stageTimings.length ? (
          <EmptyState icon={BarChart3} title={t('reports.noDecisions')} />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>{t('reports.stage')}</Th>
                <Th className="text-end">{t('reports.decisions')}</Th>
                <Th className="text-end">{t('reports.avgTime')}</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.stageTimings.map((s) => (
                <tr key={s.stage}>
                  <Td className="font-medium text-slate-900">{s.stage === 'None' ? '—' : LEVEL_SHORT[s.stage]}</Td>
                  <Td className="text-end tabular-nums">{formatNumber(s.decisions)}</Td>
                  <Td className="text-end tabular-nums">{formatHours(s.averageHours)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  )
}

function OfficersCard({ query }: { query: { from: string } }) {
  const officers = useQuery({
    queryKey: keys.reports('officers', query),
    queryFn: () => reportsApi.officers(query),
    placeholderData: keepPreviousData,
  })

  return (
    <Card>
      <CardHeader title={t('reports.officersTitle')} description={t('reports.officersDescription')} />
      {officers.isLoading ? (
        <PageLoader />
      ) : officers.isError ? (
        <ErrorState error={officers.error} onRetry={() => officers.refetch()} />
      ) : !officers.data?.length ? (
        <EmptyState icon={Users} title={t('reports.noDecisions')} />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>{t('reports.officer')}</Th>
              <Th className="text-end">{t('reports.decisions')}</Th>
              <Th className="hidden text-end md:table-cell">{t('reports.approved')}</Th>
              <Th className="hidden text-end md:table-cell">{t('reports.rejected')}</Th>
              <Th className="hidden text-end lg:table-cell">{t('reports.returned')}</Th>
              <Th className="hidden text-end lg:table-cell">{t('reports.escalated')}</Th>
              <Th className="text-end">{t('reports.avgTime')}</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {officers.data.map((o) => (
              <tr key={o.userId}>
                <Td>
                  <p className="font-medium text-slate-900">{o.fullName}</p>
                  <p className="text-xs text-slate-500">{o.level === 'None' ? '—' : LEVEL_SHORT[o.level]}</p>
                </Td>
                <Td className="text-end tabular-nums">{formatNumber(o.decisions)}</Td>
                <Td className="hidden text-end tabular-nums md:table-cell">{formatNumber(o.approved)}</Td>
                <Td className="hidden text-end tabular-nums md:table-cell">{formatNumber(o.rejected)}</Td>
                <Td className="hidden text-end tabular-nums lg:table-cell">{formatNumber(o.returned)}</Td>
                <Td className="hidden text-end tabular-nums lg:table-cell">{formatNumber(o.escalated)}</Td>
                <Td className="text-end tabular-nums">{formatHours(o.averageHoursToDecide)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  )
}

/**
 * One department's performance. Officers always see their own ministry; an administrator
 * reaches it from the overview, with the ministry in the URL.
 */
export function DepartmentReportPage() {
  const user = useCurrentUser()
  const { ministryId } = useParams()
  const admin = isAdmin(user)
  const { query, picker } = useRange()
  const reportQuery = admin ? { ...query, ministryId } : query

  const report = useQuery({
    queryKey: keys.reports('department', reportQuery),
    queryFn: () => reportsApi.department(reportQuery),
    placeholderData: keepPreviousData,
  })

  return (
    <>
      <PageHeader
        back={admin ? { to: '/admin/reports', label: t('reports.overviewTitle') } : undefined}
        title={report.data ? t('reports.departmentTitle', { ministry: report.data.ministryName }) : t('nav.reports')}
        description={report.data ? rangeText(report.data) : t('reports.departmentDescription')}
        actions={picker}
      />
      {report.isLoading ? (
        <PageLoader />
      ) : report.isError || !report.data ? (
        <Card>
          <ErrorState error={report.error} onRetry={() => report.refetch()} />
        </Card>
      ) : (
        <div className="space-y-6">
          <DepartmentFigures report={report.data} />
          {!admin && atLeast(user, 'L3') && <OfficersCard query={query} />}
        </div>
      )}
    </>
  )
}

/** Every ministry side by side, with the fees collected. Administrators only. */
export function PortalOverviewPage() {
  const { query, picker } = useRange()
  const overview = useQuery({
    queryKey: keys.reports('overview', query),
    queryFn: () => reportsApi.overview(query),
    placeholderData: keepPreviousData,
  })
  const o = overview.data

  return (
    <>
      <PageHeader
        title={t('reports.overviewTitle')}
        description={o ? rangeText(o) : t('reports.overviewDescription')}
        actions={picker}
      />
      {overview.isLoading ? (
        <PageLoader />
      ) : overview.isError || !o ? (
        <Card>
          <ErrorState error={overview.error} onRetry={() => overview.refetch()} />
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard label={t('reports.submitted')} value={formatNumber(o.submitted)} icon={Send} tone="sky" />
            <StatCard label={t('reports.awaiting')} value={formatNumber(o.awaitingDecision)} icon={Inbox} tone="amber" />
            <StatCard label={t('reports.overdueNow')} value={formatNumber(o.overdueNow)} icon={AlarmClock} tone="red" />
            <StatCard label={t('reports.onTime')} value={formatPercent(o.onTimeRate)} icon={Timer} tone="green" />
            <StatCard label={t('reports.fees')} value={formatMoney(o.feesCollected)} icon={Receipt} tone="brand" />
          </div>

          <Card>
            <CardHeader title={t('reports.byMinistry')} description={t('reports.byMinistryDescription')} />
            {!o.ministries.length ? (
              <EmptyState icon={BarChart3} title={t('reports.noDecisions')} />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>{t('reports.ministry')}</Th>
                    <Th className="text-end">{t('reports.submitted')}</Th>
                    <Th className="hidden text-end sm:table-cell">{t('reports.awaiting')}</Th>
                    <Th className="text-end">{t('reports.overdueNow')}</Th>
                    <Th className="hidden text-end md:table-cell">{t('reports.onTime')}</Th>
                    <Th className="hidden text-end lg:table-cell">{t('reports.avgDecision')}</Th>
                    <Th className="text-end">{t('reports.fees')}</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {o.ministries.map((m) => (
                    <tr key={m.ministryId}>
                      <Td>
                        <Link to={`/admin/reports/${m.ministryId}`} className="font-medium text-brand-700 hover:underline">
                          {m.ministryName}
                        </Link>
                        <p className="font-mono text-xs text-slate-500">{m.ministryCode}</p>
                      </Td>
                      <Td className="text-end tabular-nums">{formatNumber(m.submitted)}</Td>
                      <Td className="hidden text-end tabular-nums sm:table-cell">{formatNumber(m.awaitingDecision)}</Td>
                      <Td className={m.overdueNow ? 'text-end font-medium text-red-600 tabular-nums' : 'text-end tabular-nums'}>
                        {formatNumber(m.overdueNow)}
                      </Td>
                      <Td className="hidden text-end tabular-nums md:table-cell">{formatPercent(m.onTimeRate)}</Td>
                      <Td className="hidden text-end tabular-nums lg:table-cell">{formatHours(m.averageDecisionHours)}</Td>
                      <Td className="text-end whitespace-nowrap tabular-nums">{formatMoney(m.feesCollected)}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </div>
      )}
    </>
  )
}
