import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { UserPlus, Users } from 'lucide-react'
import { useNavigate } from 'react-router'
import { adminApi } from '../../api/endpoints'
import type { AccountStatus, EmployeeLevel, NativeStatus, UserType } from '../../api/types'
import { SearchInput } from '../../components/SearchInput'
import { AccountStatusBadge, Badge } from '../../components/ui/Badge'
import { Button, ButtonLink } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState, ErrorState, Spinner } from '../../components/ui/Feedback'
import { Select } from '../../components/ui/Form'
import { PageHeader, Pagination, Table, Td, Th } from '../../components/ui/Layout'
import { keys, useAllMinistries } from '../../hooks/queries'
import { opt, useUrlFilters } from '../../hooks/useUrlFilters'
import { t } from '../../i18n'
import { formatRelative } from '../../lib/format'
import {
  ACCOUNT_STATUS,
  ACCOUNT_STATUSES,
  EMPLOYEE_LEVELS,
  LEVEL,
  LEVEL_SHORT,
  NATIVE_STATUS,
  USER_TYPE,
  USER_TYPES,
  options,
} from '../../lib/labels'

const FILTERS = ['search', 'userType', 'ministryId', 'employeeLevel', 'accountStatus', 'nativeStatus'] as const

/**
 * `admin` - the full directory, with management links.
 * `directory` - what ministry staff see: the API already narrows it to their own ministry.
 */
export function UsersPage({ mode }: { mode: 'admin' | 'directory' }) {
  const navigate = useNavigate()
  const admin = mode === 'admin'
  const { filters, setFilters, page, setPage, clear, active } = useUrlFilters(FILTERS)
  const ministries = useAllMinistries(true)

  const query = {
    pageNumber: page,
    pageSize: 20,
    search: filters.search || undefined,
    userType: opt<UserType>(filters.userType),
    ministryId: filters.ministryId || undefined,
    employeeLevel: opt<EmployeeLevel>(filters.employeeLevel),
    accountStatus: opt<AccountStatus>(filters.accountStatus),
    nativeStatus: opt<NativeStatus>(filters.nativeStatus),
  }

  const list = useQuery({
    queryKey: keys.userList(query),
    queryFn: () => adminApi.users(query),
    placeholderData: keepPreviousData,
  })

  return (
    <>
      <PageHeader
        title={admin ? t('admin.users') : t('admin.users.colleagues')}
        description={admin ? t('admin.users.adminDescription') : t('admin.users.directoryDescription')}
        actions={
          admin && (
            <ButtonLink to="/admin/users/new" icon={UserPlus}>
              {t('admin.newEmployee')}
            </ButtonLink>
          )
        }
      />

      <Card>
        <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,1fr))]">
          <SearchInput value={filters.search} onChange={(search) => setFilters({ search })} placeholder={t('admin.users.search')} />
          {admin && (
            <Select
              aria-label={t('admin.users.userType')}
              value={filters.userType}
              onChange={(e) => setFilters({ userType: e.target.value })}
              placeholder={t('admin.users.allTypes')}
              options={options(USER_TYPES, (type) => USER_TYPE[type].label)}
            />
          )}
          {admin && (
            <Select
              aria-label={t('admin.field.ministry')}
              value={filters.ministryId}
              onChange={(e) => setFilters({ ministryId: e.target.value })}
              placeholder={t('admin.users.allMinistries')}
              options={(ministries.data ?? []).map((m) => ({ value: m.id, label: m.code }))}
            />
          )}
          <Select
            aria-label={t('admin.users.level')}
            value={filters.employeeLevel}
            onChange={(e) => setFilters({ employeeLevel: e.target.value })}
            placeholder={t('admin.users.anyLevel')}
            options={options(EMPLOYEE_LEVELS, (l) => LEVEL[l])}
          />
          <Select
            aria-label={t('admin.user.accountStatus')}
            value={filters.accountStatus}
            onChange={(e) => setFilters({ accountStatus: e.target.value })}
            placeholder={t('admin.users.anyStatus')}
            options={options(ACCOUNT_STATUSES, (s) => ACCOUNT_STATUS[s].label)}
          />
          {admin && filters.userType === 'PublicUser' && (
            <Select
              aria-label={t('admin.field.residency')}
              value={filters.nativeStatus}
              onChange={(e) => setFilters({ nativeStatus: e.target.value })}
              placeholder={t('admin.users.anyResidency')}
              options={options(['Resident', 'NativeCitizen'] as const, (s) => NATIVE_STATUS[s])}
            />
          )}
        </div>
        {active && (
          <div className="flex justify-end border-b border-slate-100 px-4 py-2">
            <Button variant="ghost" size="sm" onClick={clear}>
              {t('admin.users.clearFilters')}
            </Button>
          </div>
        )}

        {list.isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : list.isError ? (
          <ErrorState error={list.error} onRetry={() => list.refetch()} />
        ) : !list.data?.items.length ? (
          <EmptyState icon={Users} title={t('admin.users.empty')} />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>{t('admin.col.name')}</Th>
                  {admin && <Th>{t('admin.col.type')}</Th>}
                  <Th className="hidden md:table-cell">{t('admin.col.ministryLevel')}</Th>
                  <Th>{t('admin.col.status')}</Th>
                  <Th className="hidden lg:table-cell">{t('admin.col.lastSignIn')}</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.data.items.map((u) => (
                  <tr
                    key={u.id}
                    className={admin ? 'cursor-pointer hover:bg-slate-50' : undefined}
                    onClick={admin ? () => navigate(`/admin/users/${u.id}`) : undefined}
                  >
                    <Td>
                      <p className="font-medium text-slate-900">{u.fullName}</p>
                      <p className="text-xs text-slate-500" dir="ltr">{u.email}</p>
                    </Td>
                    {admin && (
                      <Td>
                        <Badge tone={USER_TYPE[u.userType].tone}>{USER_TYPE[u.userType].label}</Badge>
                      </Td>
                    )}
                    <Td className="hidden md:table-cell">
                      {u.userType === 'GovernmentEmployee' ? (
                        <>
                          <span className="font-medium">{u.ministryCode ?? '—'}</span>
                          <span className="text-slate-500"> · {u.employeeLevel === 'None' ? '—' : LEVEL_SHORT[u.employeeLevel]}</span>
                          {u.jobTitle && <p className="text-xs text-slate-500">{u.jobTitle}</p>}
                        </>
                      ) : u.userType === 'PublicUser' ? (
                        <span className="text-slate-500">{NATIVE_STATUS[u.nativeStatus]}</span>
                      ) : (
                        <span className="text-slate-500">{t('admin.users.platformWide')}</span>
                      )}
                    </Td>
                    <Td>
                      <AccountStatusBadge status={u.accountStatus} />
                    </Td>
                    <Td className="hidden text-xs whitespace-nowrap text-slate-500 lg:table-cell">
                      {u.lastLoginAt ? formatRelative(u.lastLoginAt) : t('admin.never')}
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
