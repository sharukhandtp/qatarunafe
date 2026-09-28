import { keepPreviousData, useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { ChevronDown, ScrollText } from 'lucide-react'
import { Fragment, useState } from 'react'
import { adminApi } from '../../api/endpoints'
import type { AuditAction, AuditLogEntry } from '../../api/types'
import { useCurrentUser } from '../../auth/AuthContext'
import { isAdmin } from '../../auth/roles'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, DetailList } from '../../components/ui/Card'
import { EmptyState, ErrorState, Spinner } from '../../components/ui/Feedback'
import { Checkbox, Input, Select } from '../../components/ui/Form'
import { PageHeader, Pagination, Table, Td, Th } from '../../components/ui/Layout'
import { keys, useAllMinistries } from '../../hooks/queries'
import { flag, opt, useUrlFilters } from '../../hooks/useUrlFilters'
import { formatDateTime } from '../../lib/format'
import { t } from '../../i18n'
import { AUDIT_ACTION, AUDIT_ACTIONS, LEVEL, USER_TYPE, options } from '../../lib/labels'

const FILTERS = [
  'action',
  'failuresOnly',
  'ministryId',
  'entityName',
  'entityId',
  'actorUserId',
  'correlationId',
  'from',
  'to',
] as const

/** A `yyyy-mm-dd` date input value as the start (or end) of that local day, in ISO form. */
function dayBoundary(value: string, end: boolean) {
  if (!value) return undefined
  const date = new Date(`${value}T${end ? '23:59:59.999' : '00:00:00'}`)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

/** "Name (Employee, L2 · Supervisory)", or just the name when the actor type is unknown. */
function actorLabel(entry: AuditLogEntry) {
  if (!entry.actorName) return t('shared.audit.anonymous')
  if (!entry.actorUserType) return entry.actorName
  const type = USER_TYPE[entry.actorUserType].label
  return entry.actorEmployeeLevel && entry.actorEmployeeLevel !== 'None'
    ? t('shared.audit.actorWithTypeLevel', { name: entry.actorName, type, level: LEVEL[entry.actorEmployeeLevel] })
    : t('shared.audit.actorWithType', { name: entry.actorName, type })
}

function EntryDetails({ entry }: { entry: AuditLogEntry }) {
  return (
    <div className="bg-slate-50/70 px-4 py-4">
      <DetailList
        columns={3}
        items={[
          { label: t('shared.audit.entity'), value: `${entry.entityName}${entry.entityId ? ` · ${entry.entityId}` : ''}` },
          {
            label: t('shared.audit.actor'),
            value: actorLabel(entry),
          },
          { label: t('shared.audit.request'), value: entry.httpMethod ? `${entry.httpMethod} ${entry.requestPath ?? ''}` : '—' },
          { label: t('shared.audit.ipAddress'), value: entry.ipAddress ?? '—' },
          { label: t('shared.audit.correlationId'), value: <span className="font-mono text-xs">{entry.correlationId ?? '—'}</span> },
          { label: t('shared.audit.changedColumns'), value: entry.affectedColumns ?? '—' },
          ...(entry.failureReason ? [{ label: t('shared.audit.failureReason'), value: entry.failureReason, wide: true }] : []),
        ]}
      />
    </div>
  )
}

export function AuditLogPage() {
  const user = useCurrentUser()
  const admin = isAdmin(user)
  const ministries = useAllMinistries(true)
  const { filters, setFilters, page, setPage, clear, active } = useUrlFilters(FILTERS)
  const [expanded, setExpanded] = useState<string | null>(null)

  const query = {
    pageNumber: page,
    pageSize: 25,
    action: opt<AuditAction>(filters.action),
    failuresOnly: flag(filters.failuresOnly),
    ministryId: filters.ministryId || undefined,
    entityName: filters.entityName || undefined,
    entityId: filters.entityId || undefined,
    actorUserId: filters.actorUserId || undefined,
    correlationId: filters.correlationId || undefined,
    from: dayBoundary(filters.from, false),
    to: dayBoundary(filters.to, true),
  }

  const list = useQuery({
    queryKey: keys.audit(query),
    queryFn: () => adminApi.auditLogs(query),
    placeholderData: keepPreviousData,
  })

  return (
    <>
      <PageHeader
        title={t('nav.auditTrail')}
        description={
          admin
            ? t('shared.audit.descriptionAdmin')
            : t('shared.audit.descriptionMinistry', { ministry: user.ministryName ?? t('shared.audit.yourMinistry') })
        }
      />

      <Card>
        <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <Select
            aria-label={t('shared.audit.event')}
            value={filters.action}
            onChange={(e) => setFilters({ action: e.target.value })}
            placeholder={t('shared.audit.anyEvent')}
            options={options(AUDIT_ACTIONS, (a) => AUDIT_ACTION[a].label)}
          />
          {admin && (
            <Select
              aria-label={t('shared.audit.ministry')}
              value={filters.ministryId}
              onChange={(e) => setFilters({ ministryId: e.target.value })}
              placeholder={t('shared.audit.anyMinistry')}
              options={(ministries.data ?? []).map((m) => ({ value: m.id, label: m.code }))}
            />
          )}
          <Input
            aria-label={t('shared.audit.fromDate')}
            type="date"
            value={filters.from}
            onChange={(e) => setFilters({ from: e.target.value })}
          />
          <Input aria-label={t('shared.audit.toDate')} type="date" value={filters.to} onChange={(e) => setFilters({ to: e.target.value })} />
          <Input
            aria-label={t('shared.audit.entity')}
            placeholder={t('shared.audit.entityPlaceholder')}
            value={filters.entityName}
            onChange={(e) => setFilters({ entityName: e.target.value.trim() })}
          />
          <Input
            aria-label={t('shared.audit.entityId')}
            placeholder={t('shared.audit.entityIdPlaceholder')}
            value={filters.entityId}
            onChange={(e) => setFilters({ entityId: e.target.value.trim() })}
          />
          <Input
            aria-label={t('shared.audit.correlationId')}
            placeholder={t('shared.audit.correlationId')}
            value={filters.correlationId}
            onChange={(e) => setFilters({ correlationId: e.target.value.trim() })}
          />
          <div className="flex items-center justify-between gap-3">
            <Checkbox
              label={t('shared.audit.failuresOnly')}
              checked={flag(filters.failuresOnly)}
              onChange={(e) => setFilters({ failuresOnly: e.target.checked ? 'true' : '' })}
            />
            {active && (
              <Button variant="ghost" size="sm" onClick={clear}>
                {t('shared.audit.clear')}
              </Button>
            )}
          </div>
        </div>
        {filters.actorUserId && (
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2 text-sm text-slate-600">
            {t('shared.audit.byOneUser')}
            <button type="button" onClick={() => setFilters({ actorUserId: '' })} className="font-medium text-brand-700">
              {t('shared.audit.showEveryone')}
            </button>
          </div>
        )}

        {list.isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : list.isError ? (
          <ErrorState error={list.error} onRetry={() => list.refetch()} />
        ) : !list.data?.items.length ? (
          <EmptyState icon={ScrollText} title={t('shared.audit.noEvents')}
            description={active ? t('shared.audit.noMatch') : undefined}
 />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>{t('shared.audit.when')}</Th>
                  <Th>{t('shared.audit.event')}</Th>
                  <Th className="hidden md:table-cell">{t('shared.audit.entity')}</Th>
                  <Th>{t('shared.audit.actor')}</Th>
                  <Th className="hidden lg:table-cell">{t('shared.audit.result')}</Th>
                  <Th>
                    <span className="sr-only">{t('shared.audit.details')}</span>
                  </Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.data.items.map((e) => {
                  const open = expanded === e.id
                  return (
                    <Fragment key={e.id}>
                      <tr className="cursor-pointer hover:bg-slate-50" onClick={() => setExpanded(open ? null : e.id)}>
                        <Td className="text-xs whitespace-nowrap text-slate-500">{formatDateTime(e.occurredAt)}</Td>
                        <Td>
                          <Badge tone={AUDIT_ACTION[e.action].tone}>{AUDIT_ACTION[e.action].label}</Badge>
                        </Td>
                        <Td className="hidden text-xs md:table-cell">
                          <span className="font-medium text-slate-700">{e.entityName}</span>
                          {e.entityId && <span className="block max-w-[14rem] truncate font-mono text-slate-500">{e.entityId}</span>}
                        </Td>
                        <Td className="whitespace-nowrap">{e.actorName ?? <span className="text-slate-400">{t('shared.audit.anonymous')}</span>}</Td>
                        <Td className="hidden lg:table-cell">
                          <Badge tone={e.succeeded ? 'green' : 'red'} dot>
                            {t(e.succeeded ? 'shared.audit.succeeded' : 'shared.audit.failed')}
                          </Badge>
                        </Td>
                        <Td className="w-8">
                          <ChevronDown
                            className={clsx('size-4 text-slate-400 transition-transform', open && 'rotate-180')}
                            aria-label={t(open ? 'shared.audit.hideDetails' : 'shared.audit.showDetails')}
                          />
                        </Td>
                      </tr>
                      {open && (
                        <tr>
                          <td colSpan={6}>
                            <EntryDetails entry={e} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </Table>
            <Pagination page={list.data} onChange={setPage} />
          </>
        )}
      </Card>
    </>
  )
}
