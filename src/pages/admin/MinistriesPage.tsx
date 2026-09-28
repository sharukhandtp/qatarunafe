import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Building2, Plus } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { ministriesApi } from '../../api/endpoints'
import { SearchInput } from '../../components/SearchInput'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState, ErrorState, Spinner } from '../../components/ui/Feedback'
import { Checkbox } from '../../components/ui/Form'
import { PageHeader, Pagination, Table, Td, Th } from '../../components/ui/Layout'
import { keys } from '../../hooks/queries'
import { flag, useUrlFilters } from '../../hooks/useUrlFilters'
import { t } from '../../i18n'
import { MinistryFormDialog } from './MinistryForm'

const FILTERS = ['search', 'includeInactive'] as const

export function MinistriesPage() {
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)
  const { filters, setFilters, page, setPage } = useUrlFilters(FILTERS)

  const query = {
    pageNumber: page,
    pageSize: 20,
    search: filters.search || undefined,
    includeInactive: flag(filters.includeInactive),
  }
  const list = useQuery({
    queryKey: keys.ministryList(query),
    queryFn: () => ministriesApi.list(query),
    placeholderData: keepPreviousData,
  })

  return (
    <>
      <PageHeader
        title={t('admin.ministries.title')}
        description={t('admin.ministries.description')}
        actions={
          <Button icon={Plus} onClick={() => setCreating(true)}>
            {t('admin.ministries.new')}
          </Button>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-4 border-b border-slate-100 p-4">
          <SearchInput
            className="w-full sm:w-80"
            value={filters.search}
            onChange={(search) => setFilters({ search })}
            placeholder={t('admin.ministries.search')}
          />
          <Checkbox
            label={t('admin.ministries.includeInactive')}
            checked={flag(filters.includeInactive)}
            onChange={(e) => setFilters({ includeInactive: e.target.checked ? 'true' : '' })}
          />
        </div>

        {list.isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : list.isError ? (
          <ErrorState error={list.error} onRetry={() => list.refetch()} />
        ) : !list.data?.items.length ? (
          <EmptyState icon={Building2} title={t('admin.ministries.empty')} />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>{t('admin.col.code')}</Th>
                  <Th>{t('admin.col.name')}</Th>
                  <Th className="hidden md:table-cell">{t('admin.col.contact')}</Th>
                  <Th className="text-end">{t('admin.col.services')}</Th>
                  <Th className="text-end">{t('admin.col.staff')}</Th>
                  <Th>{t('admin.col.status')}</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.data.items.map((m) => (
                  <tr key={m.id} className="cursor-pointer hover:bg-slate-50" onClick={() => navigate(`/admin/ministries/${m.id}`)}>
                    <Td>
                      <Badge tone="brand">{m.code}</Badge>
                    </Td>
                    <Td>
                      <p className="font-medium text-slate-900">{m.name}</p>
                      {m.nameArabic && (
                        <p className="text-xs text-slate-500" dir="rtl" lang="ar">
                          {m.nameArabic}
                        </p>
                      )}
                    </Td>
                    <Td className="hidden text-xs text-slate-500 md:table-cell">{m.contactEmail ?? '—'}</Td>
                    <Td className="text-end tabular-nums">{m.activeServiceCount}</Td>
                    <Td className="text-end tabular-nums">{m.employeeCount}</Td>
                    <Td>
                      <Badge tone={m.isActive ? 'green' : 'neutral'} dot>
                        {m.isActive ? t('admin.active') : t('admin.inactive')}
                      </Badge>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Pagination page={list.data} onChange={setPage} />
          </>
        )}
      </Card>

      {creating && <MinistryFormDialog onClose={() => setCreating(false)} />}
    </>
  )
}
