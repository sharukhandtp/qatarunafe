import { useQuery } from '@tanstack/react-query'
import { ArrowRight, CircleCheck, FilePen, FileText, Hourglass, LayoutGrid, MessageSquareWarning } from 'lucide-react'
import { Link } from 'react-router'
import { myRequestsApi } from '../../api/endpoints'
import { useCurrentUser } from '../../auth/AuthContext'
import { StatusBadge } from '../../components/ui/Badge'
import { ButtonLink } from '../../components/ui/Button'
import { Card, CardHeader } from '../../components/ui/Card'
import { Alert, EmptyState, ErrorState, Spinner } from '../../components/ui/Feedback'
import { PageHeader, StatCard } from '../../components/ui/Layout'
import { keys } from '../../hooks/queries'
import { t, tn } from '../../i18n'
import { formatRelative } from '../../lib/format'
import { NATIVE_STATUS } from '../../lib/labels'

/** One count, read as the totalCount of a one-row page. */
function useCount(query: Parameters<typeof myRequestsApi.list>[0]) {
  return useQuery({
    queryKey: keys.myRequestList({ ...query, pageSize: 1 }),
    queryFn: () => myRequestsApi.list({ ...query, pageSize: 1 }),
    select: (page) => page.totalCount,
  })
}

export function CitizenDashboard() {
  const user = useCurrentUser()
  const open = useCount({ openOnly: true })
  const drafts = useCount({ status: 'Draft' })
  const returned = useCount({ status: 'ReturnedForInformation' })
  const completed = useCount({ status: 'Completed' })

  const recent = useQuery({
    queryKey: keys.myRequestList({ pageSize: 6 }),
    queryFn: () => myRequestsApi.list({ pageSize: 6 }),
  })

  const count = (q: { data?: number; isLoading: boolean }) => (q.isLoading ? '…' : (q.data ?? 0))

  return (
    <>
      <PageHeader
        title={t('citizen.dashboard.welcome', { name: user.fullName.split(' ')[0] })}
        description={t('citizen.dashboard.signedInAs', { status: NATIVE_STATUS[user.nativeStatus] })}
        actions={
          <ButtonLink to="/services" icon={LayoutGrid}>
            {t('citizen.dashboard.browse')}
          </ButtonLink>
        }
      />

      {Boolean(returned.data) && (
        <Alert
          tone="warning"
          title={t('citizen.dashboard.returnedTitle')}
          className="mb-6"
          action={
            <Link to="/requests?status=ReturnedForInformation" className="text-sm font-medium underline">
              {t('citizen.dashboard.review')}
            </Link>
          }
        >
          {tn('citizen.dashboard.returnedBody', returned.data ?? 0)}
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t('citizen.dashboard.inProgress')} value={count(open)} icon={Hourglass} tone="amber" to="/requests?openOnly=true" />
        <StatCard label={t('citizen.dashboard.drafts')} value={count(drafts)} icon={FilePen} tone="slate" to="/requests?status=Draft" />
        <StatCard
          label={t('citizen.dashboard.needsAction')}
          value={count(returned)}
          icon={MessageSquareWarning}
          tone="violet"
          to="/requests?status=ReturnedForInformation"
        />
        <StatCard label={t('status.Completed')} value={count(completed)} icon={CircleCheck} tone="green" to="/requests?status=Completed" />
      </div>

      <Card className="mt-6">
        <CardHeader
          title={t('citizen.dashboard.recent')}
          actions={
            <Link to="/requests" className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-800">
              {t('citizen.dashboard.viewAll')} <ArrowRight className="size-4 rtl:rotate-180" />
            </Link>
          }
        />
        {recent.isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : recent.isError ? (
          <ErrorState error={recent.error} onRetry={() => recent.refetch()} />
        ) : !recent.data?.items.length ? (
          <EmptyState
            icon={FileText}
            title={t('citizen.dashboard.emptyTitle')}
            description={t('citizen.dashboard.emptyDescription')}
            action={
              <ButtonLink to="/services" size="sm" icon={LayoutGrid}>
                {t('citizen.dashboard.openCatalogue')}
              </ButtonLink>
            }
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {recent.data.items.map((r) => (
              <li key={r.id}>
                <Link to={`/requests/${r.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">{r.title}</p>
                    <p className="truncate text-xs text-slate-500">
                      <span className="font-mono">{r.referenceNumber}</span> · {r.serviceName} · {r.ministryName}
                    </p>
                  </div>
                  <div className="hidden text-end text-xs text-slate-500 sm:block">
                    {r.submittedAt
                      ? t('citizen.submittedRelative', { when: formatRelative(r.submittedAt) })
                      : t('citizen.notSubmitted')}
                  </div>
                  <StatusBadge status={r.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  )
}
