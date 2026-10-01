import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { BadgeCheck, Building2, Clock, LayoutGrid, Lock, Receipt, ShieldCheck } from 'lucide-react'
import { catalogueApi } from '../../api/endpoints'
import type { ServiceCatalogItem, ServiceCategory } from '../../api/types'
import { useCurrentUser } from '../../auth/AuthContext'
import { isCitizen } from '../../auth/roles'
import { SearchInput } from '../../components/SearchInput'
import { Badge } from '../../components/ui/Badge'
import { Button, ButtonLink } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState, ErrorState, PageLoader } from '../../components/ui/Feedback'
import { Select } from '../../components/ui/Form'
import { PageHeader, Pagination } from '../../components/ui/Layout'
import { keys, useAllMinistries } from '../../hooks/queries'
import { opt, useUrlFilters } from '../../hooks/useUrlFilters'
import { getLang, t, tn } from '../../i18n'
import { formatMoney, formatSla } from '../../lib/format'
import { ministryName, serviceDescription, serviceName } from '../../lib/localized'
import { CATEGORIES, CATEGORY, options } from '../../lib/labels'

const FILTERS = ['search', 'ministryCode', 'category'] as const

function ServiceCard({ service, eligible, canApply }: { service: ServiceCatalogItem; eligible: boolean; canApply: boolean }) {
  return (
    <Card className="flex flex-col p-5 transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <Badge tone="brand">{service.ministryCode}</Badge>
        {service.nativeCitizensOnly && (
          <Badge tone="violet">
            <ShieldCheck className="size-3" aria-hidden /> {t('citizen.catalogue.nativeBadge')}
          </Badge>
        )}
      </div>
      {/* dir="auto": a service with no Arabic text falls back to English, which must stay LTR. */}
      <h3 dir="auto" className="mt-3 font-semibold rtl:text-right text-slate-900">{serviceName(service)}</h3>
      <p className="mt-1 text-xs text-slate-500">{ministryName(service)}</p>
      {serviceDescription(service) && (
        <p dir="auto" className="mt-3 line-clamp-3 text-sm rtl:text-right text-slate-600">{serviceDescription(service)}</p>
      )}

      <dl className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-500">
        <div className="flex items-center gap-1">
          <LayoutGrid className="size-3.5" aria-hidden />
          <dt className="sr-only">{t('citizen.category')}</dt>
          <dd>{CATEGORY[service.category]}</dd>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="size-3.5" aria-hidden />
          <dt className="sr-only">{t('citizen.catalogue.targetTime')}</dt>
          <dd>{formatSla(service.slaHours)}</dd>
        </div>
        <div className="flex items-center gap-1">
          <BadgeCheck className="size-3.5" aria-hidden />
          <dt className="sr-only">{t('citizen.catalogue.approval')}</dt>
          <dd>
            {service.requiredApprovalLevel === 'L1'
              ? t('citizen.catalogue.singleReview')
              : tn('citizen.catalogue.stageReview', Number(service.requiredApprovalLevel.slice(1)))}
          </dd>
        </div>
        <div className="flex items-center gap-1">
          <Receipt className="size-3.5" aria-hidden />
          <dt className="sr-only">{t('fee.title')}</dt>
          <dd className={service.fee > 0 ? 'font-medium text-slate-700' : undefined}>
            {service.fee > 0 ? formatMoney(service.fee) : t('fee.free')}
          </dd>
        </div>
      </dl>

      <div className="mt-auto pt-5">
        {!canApply ? null : eligible ? (
          <ButtonLink to={`/requests/new?service=${service.id}`} state={{ service }} variant="secondary" block>
            {t('citizen.catalogue.apply')}
          </ButtonLink>
        ) : (
          <Button variant="secondary" block disabled icon={Lock} title={t('citizen.catalogue.restricted')}>
            {t('citizen.catalogue.nativeOnly')}
          </Button>
        )}
      </div>
    </Card>
  )
}

export function CataloguePage() {
  const user = useCurrentUser()
  const { filters, setFilters, page, setPage, clear, active } = useUrlFilters(FILTERS)
  const ministries = useAllMinistries()

  const query = {
    pageNumber: page,
    pageSize: 12,
    search: filters.search || undefined,
    ministryCode: filters.ministryCode || undefined,
    category: opt<ServiceCategory>(filters.category),
  }

  const catalogue = useQuery({
    queryKey: keys.catalogue(query),
    queryFn: () => catalogueApi.list(query),
    placeholderData: keepPreviousData,
  })

  const canApply = isCitizen(user)
  const isNative = user.nativeStatus === 'NativeCitizen'

  return (
    <>
      <PageHeader
        title={t('nav.catalogue')}
        description={t('citizen.catalogue.description')}
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-[minmax(0,1fr)_200px_220px_auto]">
        <SearchInput
          value={filters.search}
          onChange={(search) => setFilters({ search })}
          placeholder={t('citizen.catalogue.search')}
        />
        <Select
          aria-label={t('citizen.ministry')}
          value={filters.ministryCode}
          onChange={(e) => setFilters({ ministryCode: e.target.value })}
          placeholder={t('citizen.catalogue.allMinistries')}
          options={(ministries.data ?? []).map((m) => ({ value: m.code, label: (getLang() === 'ar' && m.nameArabic) || m.name }))}
        />
        <Select
          aria-label={t('citizen.category')}
          value={filters.category}
          onChange={(e) => setFilters({ category: e.target.value })}
          placeholder={t('citizen.catalogue.allCategories')}
          options={options(CATEGORIES, (c) => CATEGORY[c])}
        />
        {active && (
          <Button variant="ghost" onClick={clear}>
            {t('citizen.clear')}
          </Button>
        )}
      </div>

      {catalogue.isLoading ? (
        <PageLoader />
      ) : catalogue.isError ? (
        <Card>
          <ErrorState error={catalogue.error} onRetry={() => catalogue.refetch()} />
        </Card>
      ) : !catalogue.data?.items.length ? (
        <Card>
          <EmptyState
            icon={Building2}
            title={t('citizen.catalogue.emptyTitle')}
            description={t(active ? 'citizen.catalogue.emptyFiltered' : 'citizen.catalogue.emptyNone')}
          />
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {catalogue.data.items.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                canApply={canApply}
                eligible={!service.nativeCitizensOnly || isNative}
              />
            ))}
          </div>
          <Card className="mt-6">
            <Pagination page={catalogue.data} onChange={setPage} />
          </Card>
        </>
      )}
    </>
  )
}
