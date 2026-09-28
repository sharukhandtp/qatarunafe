import { keepPreviousData, useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { Inbox, RefreshCw } from 'lucide-react'
import { departmentApi } from '../../api/endpoints'
import type { EmployeeLevel, RequestPriority, RequestStatus, ServiceCategory } from '../../api/types'
import { useCurrentUser } from '../../auth/AuthContext'
import { isAdmin } from '../../auth/roles'
import { SearchInput } from '../../components/SearchInput'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState, ErrorState, Spinner } from '../../components/ui/Feedback'
import { Checkbox, Select } from '../../components/ui/Form'
import { PageHeader, Pagination } from '../../components/ui/Layout'
import { keys } from '../../hooks/queries'
import { flag, opt, useUrlFilters } from '../../hooks/useUrlFilters'
import {
  CATEGORIES,
  CATEGORY,
  EMPLOYEE_LEVELS,
  LEVEL_SHORT,
  PRIORITIES,
  PRIORITY,
  REQUEST_STATUS,
  REQUEST_STATUSES,
  options,
} from '../../lib/labels'
import { t, type MessageKey } from '../../i18n'
import { CaseTable } from './CaseTable'

const FILTERS = [
  'search',
  'status',
  'stage',
  'priority',
  'category',
  'myLevelOnly',
  'assignedToMeOnly',
  'unassignedOnly',
  'overdueOnly',
] as const

type FilterKey = (typeof FILTERS)[number]

const VIEWS: { label: MessageKey; patch: Partial<Record<FilterKey, string>> }[] = [
  { label: 'department.queue.view.myTier', patch: { myLevelOnly: 'true' } },
  { label: 'department.queue.view.assignedToMe', patch: { assignedToMeOnly: 'true' } },
  { label: 'department.queue.view.unassigned', patch: { myLevelOnly: 'true', unassignedOnly: 'true' } },
  { label: 'department.queue.view.overdue', patch: { overdueOnly: 'true' } },
  { label: 'department.queue.view.everything', patch: {} },
]

export function QueuePage() {
  const user = useCurrentUser()
  const admin = isAdmin(user)
  const { filters, setFilters, page, setPage, clear, active } = useUrlFilters(FILTERS)

  const query = {
    pageNumber: page,
    pageSize: 20,
    search: filters.search || undefined,
    status: opt<RequestStatus>(filters.status),
    stage: opt<EmployeeLevel>(filters.stage),
    priority: opt<RequestPriority>(filters.priority),
    category: opt<ServiceCategory>(filters.category),
    myLevelOnly: flag(filters.myLevelOnly),
    assignedToMeOnly: flag(filters.assignedToMeOnly),
    unassignedOnly: flag(filters.unassignedOnly),
    overdueOnly: flag(filters.overdueOnly),
  }

  const queue = useQuery({
    queryKey: keys.caseQueue(query),
    queryFn: () => departmentApi.queue(query),
    placeholderData: keepPreviousData,
  })

  const viewActive = (patch: Partial<Record<FilterKey, string>>) =>
    FILTERS.filter((k) => ['myLevelOnly', 'assignedToMeOnly', 'unassignedOnly', 'overdueOnly'].includes(k)).every(
      (k) => (patch[k] ?? '') === filters[k],
    )

  const applyView = (patch: Partial<Record<FilterKey, string>>) =>
    setFilters({ myLevelOnly: '', assignedToMeOnly: '', unassignedOnly: '', overdueOnly: '', ...patch })

  return (
    <>
      <PageHeader
        title={t(admin ? 'nav.allCases' : 'nav.caseQueue')}
        description={
          admin
            ? t('department.queue.descriptionAdmin')
            : t('department.queue.description', { ministry: user.ministryName ?? t('department.queue.yourMinistry') })
        }
        actions={
          <Button variant="secondary" icon={RefreshCw} onClick={() => queue.refetch()} loading={queue.isFetching}>
            {t('department.queue.refresh')}
          </Button>
        }
      />

      {!admin && (
        <div className="mb-4 flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1 sm:inline-flex">
          {VIEWS.map((view) => (
            <button
              key={view.label}
              type="button"
              onClick={() => applyView(view.patch)}
              className={clsx(
                'rounded-md px-3 py-1.5 text-sm font-medium transition',
                viewActive(view.patch) ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900',
              )}
            >
              {t(view.label)}
            </button>
          ))}
        </div>
      )}

      <Card>
        <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,1fr))]">
          <SearchInput
            value={filters.search}
            onChange={(search) => setFilters({ search })}
            placeholder={t('department.queue.searchPlaceholder')}
          />
          <Select
            aria-label={t('department.queue.status')}
            value={filters.status}
            onChange={(e) => setFilters({ status: e.target.value })}
            placeholder={t('department.queue.anyStatus')}
            options={options(REQUEST_STATUSES.filter((s) => s !== 'Draft'), (s) => REQUEST_STATUS[s].label)}
          />
          <Select
            aria-label={t('department.queue.stage')}
            value={filters.stage}
            onChange={(e) => setFilters({ stage: e.target.value })}
            placeholder={t('department.queue.anyStage')}
            options={options(EMPLOYEE_LEVELS, (l) => t('department.queue.waitingOn', { level: l === 'None' ? '—' : LEVEL_SHORT[l] }))}
          />
          <Select
            aria-label={t('department.queue.priority')}
            value={filters.priority}
            onChange={(e) => setFilters({ priority: e.target.value })}
            placeholder={t('department.queue.anyPriority')}
            options={options(PRIORITIES, (p) => PRIORITY[p].label)}
          />
          <Select
            aria-label={t('department.queue.category')}
            value={filters.category}
            onChange={(e) => setFilters({ category: e.target.value })}
            placeholder={t('department.queue.anyCategory')}
            options={options(CATEGORIES, (c) => CATEGORY[c])}
          />
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-slate-100 px-4 py-3">
          {!admin && (
            <>
              <Checkbox
                label={t('department.queue.myTierOnly')}
                checked={flag(filters.myLevelOnly)}
                onChange={(e) => setFilters({ myLevelOnly: e.target.checked ? 'true' : '' })}
              />
              <Checkbox
                label={t('department.queue.assignedToMe')}
                checked={flag(filters.assignedToMeOnly)}
                onChange={(e) => setFilters({ assignedToMeOnly: e.target.checked ? 'true' : '' })}
              />
            </>
          )}
          <Checkbox
            label={t('department.queue.unassigned')}
            checked={flag(filters.unassignedOnly)}
            onChange={(e) => setFilters({ unassignedOnly: e.target.checked ? 'true' : '' })}
          />
          <Checkbox
            label={t('department.queue.overdue')}
            checked={flag(filters.overdueOnly)}
            onChange={(e) => setFilters({ overdueOnly: e.target.checked ? 'true' : '' })}
          />
          {active && (
            <Button variant="ghost" size="sm" onClick={clear} className="ms-auto">
              {t('department.queue.clearFilters')}
            </Button>
          )}
        </div>

        {queue.isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : queue.isError ? (
          <ErrorState error={queue.error} onRetry={() => queue.refetch()} />
        ) : !queue.data?.items.length ? (
          <EmptyState
            icon={Inbox}
            title={t('department.queue.noCases')}
            description={t(active ? 'department.queue.noMatch' : 'department.queue.noneFiled')}
          />
        ) : (
          <>
            <CaseTable items={queue.data.items} />
            <Pagination page={queue.data} onChange={setPage} />
          </>
        )}
      </Card>
    </>
  )
}
