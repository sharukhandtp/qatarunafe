import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { FileText, Plus } from 'lucide-react'
import { useNavigate } from 'react-router'
import { myRequestsApi } from '../../api/endpoints'
import type { RequestStatus } from '../../api/types'
import { StatusBadge } from '../../components/ui/Badge'
import { Button, ButtonLink } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState, ErrorState, Spinner } from '../../components/ui/Feedback'
import { Checkbox, Select } from '../../components/ui/Form'
import { PageHeader, Pagination, Table, Td, Th } from '../../components/ui/Layout'
import { keys, useAllMinistries } from '../../hooks/queries'
import { flag, opt, useUrlFilters } from '../../hooks/useUrlFilters'
import { t } from '../../i18n'
import { formatDate, formatRelative } from '../../lib/format'
import { REQUEST_STATUS, REQUEST_STATUSES, isTerminal, options } from '../../lib/labels'

const FILTERS = ['status', 'ministryCode', 'openOnly'] as const

export function MyRequestsPage() {
  const navigate = useNavigate()
  const { filters, setFilters, page, setPage, clear, active } = useUrlFilters(FILTERS)
  const ministries = useAllMinistries()

  const query = {
    pageNumber: page,
    pageSize: 15,
    status: opt<RequestStatus>(filters.status),
    ministryCode: filters.ministryCode || undefined,
    openOnly: flag(filters.openOnly),
  }

  const list = useQuery({
    queryKey: keys.myRequestList(query),
    queryFn: () => myRequestsApi.list(query),
    placeholderData: keepPreviousData,
  })

  return (
    <>
      <PageHeader
        title={t('nav.myRequests')}
        description={t('citizen.requests.description')}
        actions={
          <ButtonLink to="/services" icon={Plus}>
            {t('citizen.newRequestButton')}
          </ButtonLink>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
          <Select
            aria-label={t('citizen.status')}
            containerClassName="w-full sm:w-56"
            value={filters.status}
            onChange={(e) => setFilters({ status: e.target.value })}
            placeholder={t('citizen.requests.anyStatus')}
            options={options(REQUEST_STATUSES, (s) => REQUEST_STATUS[s].label)}
          />
          <Select
            aria-label={t('citizen.ministry')}
            containerClassName="w-full sm:w-56"
            value={filters.ministryCode}
            onChange={(e) => setFilters({ ministryCode: e.target.value })}
            placeholder={t('citizen.requests.anyMinistry')}
            options={(ministries.data ?? []).map((m) => ({ value: m.code, label: m.name }))}
          />
          <Checkbox
            label={t('citizen.requests.openOnly')}
            checked={flag(filters.openOnly)}
            onChange={(e) => setFilters({ openOnly: e.target.checked ? 'true' : '' })}
          />
          {active && (
            <Button variant="ghost" size="sm" onClick={clear} className="ms-auto">
              {t('citizen.clearFilters')}
            </Button>
          )}
        </div>

        {list.isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : list.isError ? (
          <ErrorState error={list.error} onRetry={() => list.refetch()} />
        ) : !list.data?.items.length ? (
          <EmptyState
            icon={FileText}
            title={t(active ? 'citizen.requests.emptyFiltered' : 'citizen.requests.emptyNone')}
            description={active ? undefined : t('citizen.requests.emptyHint')}
            action={
              !active && (
                <ButtonLink to="/services" size="sm" icon={Plus}>
                  {t('citizen.newRequestButton')}
                </ButtonLink>
              )
            }
          />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>{t('citizen.reference')}</Th>
                  <Th>{t('citizen.request')}</Th>
                  <Th className="hidden md:table-cell">{t('citizen.ministry')}</Th>
                  <Th>{t('citizen.status')}</Th>
                  <Th className="hidden lg:table-cell">{t('status.Submitted')}</Th>
                  <Th className="hidden lg:table-cell">{t('citizen.targetDate')}</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.data.items.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => navigate(`/requests/${r.id}`)}
                    className="cursor-pointer hover:bg-slate-50"
                  >
                    <Td className="font-mono text-xs whitespace-nowrap">{r.referenceNumber}</Td>
                    <Td>
                      <p className="max-w-xs truncate font-medium text-slate-900">{r.title}</p>
                      <p className="max-w-xs truncate text-xs text-slate-500">{r.serviceName}</p>
                    </Td>
                    <Td className="hidden md:table-cell">{r.ministryCode}</Td>
                    <Td>
                      <StatusBadge status={r.status} />
                    </Td>
                    <Td className="hidden whitespace-nowrap lg:table-cell">{formatDate(r.submittedAt)}</Td>
                    <Td className="hidden whitespace-nowrap lg:table-cell">
                      {r.dueAt && !isTerminal(r.status) ? formatRelative(r.dueAt) : '—'}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Pagination page={list.data} onChange={setPage} />
          </>
        )}
      </Card>
    </>
  )
}
