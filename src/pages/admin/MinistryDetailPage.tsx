import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LayoutGrid, Pencil, Plus, Power, ShieldCheck, Users } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { errorMessage } from '../../api/client'
import { adminApi, ministriesApi } from '../../api/endpoints'
import type { EmployeeLevel, ServiceCategory, ServiceDefinition } from '../../api/types'
import { AccountStatusBadge, Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, CardBody, CardHeader, DetailList } from '../../components/ui/Card'
import { Alert, EmptyState, ErrorAlert, ErrorState, PageLoader, Spinner } from '../../components/ui/Feedback'
import { Checkbox, Input, Select, Textarea } from '../../components/ui/Form'
import { PageHeader, Table, Td, Th } from '../../components/ui/Layout'
import { ConfirmDialog, Modal } from '../../components/ui/Modal'
import { useToast } from '../../components/ui/Toast'
import { keys } from '../../hooks/queries'
import { useForm } from '../../hooks/useForm'
import { t } from '../../i18n'
import { formatMoney, formatSla } from '../../lib/format'
import { CATEGORIES, CATEGORY, EMPLOYEE_LEVELS, LEVEL, LEVEL_SHORT, options } from '../../lib/labels'
import { code, maxLength, required } from '../../lib/validation'
import { MinistryFormDialog } from './MinistryForm'

function ServiceFormDialog({
  ministryId,
  service,
  onClose,
}: {
  ministryId: string
  service?: ServiceDefinition
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const editing = Boolean(service)

  const form = useForm(
    {
      code: service?.code ?? '',
      name: service?.name ?? '',
      description: service?.description ?? '',
      nameArabic: service?.nameArabic ?? '',
      descriptionArabic: service?.descriptionArabic ?? '',
      fee: String(service?.fee ?? 0),
      category: service?.category ?? 'NewConnection',
      requiredApprovalLevel: service?.requiredApprovalLevel ?? 'L1',
      nativeCitizensOnly: service?.nativeCitizensOnly ?? false,
      slaHours: String(service?.slaHours ?? 72),
    },
    (v) => {
      const hours = Number(v.slaHours)
      // Same bounds as the API: 0 to 1,000,000 QAR with at most two decimals.
      const fee = v.fee.trim()
      return {
        nameArabic: maxLength(v.nameArabic, 200, t('admin.serviceForm.nameArabic')),
        descriptionArabic: maxLength(v.descriptionArabic, 1000, t('admin.serviceForm.descriptionArabic')),
        fee: !/^\d+(\.\d{1,2})?$/.test(fee) || Number(fee) > 1_000_000 ? t('admin.serviceForm.feeInvalid') : undefined,
        code: editing ? undefined : code(v.code, t('admin.field.code')),
        name: required(v.name, t('admin.field.name')) ?? maxLength(v.name, 200, t('admin.field.name')),
        description: maxLength(v.description, 1000, t('admin.field.description')),
        slaHours:
          !Number.isInteger(hours) || hours < 1 || hours > 24 * 365 ? t('admin.serviceForm.slaRange') : undefined,
      }
    },
  )

  const onSubmit = form.handleSubmit(async (v) => {
    const body = {
      name: v.name.trim(),
      description: v.description.trim() || undefined,
      nameArabic: v.nameArabic.trim() || undefined,
      descriptionArabic: v.descriptionArabic.trim() || undefined,
      fee: Number(v.fee),
      category: v.category as ServiceCategory,
      requiredApprovalLevel: v.requiredApprovalLevel as EmployeeLevel,
      nativeCitizensOnly: v.nativeCitizensOnly,
      slaHours: Number(v.slaHours),
    }
    if (service) {
      await ministriesApi.updateService(service.id, body)
      toast.success(t('admin.serviceForm.updated'))
    } else {
      await ministriesApi.createService(ministryId, { code: v.code.trim().toUpperCase(), ...body })
      toast.success(t('admin.serviceForm.created'), t('admin.serviceForm.createdDetail'))
    }
    await queryClient.invalidateQueries({ queryKey: keys.ministries })
    await queryClient.invalidateQueries({ queryKey: ['catalogue'] })
    onClose()
  })

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? t('admin.editCode', { code: service!.code }) : t('admin.ministry.newService')}
      size="lg"
      busy={form.submitting}
      onSubmit={onSubmit}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={form.submitting}>
            {t('ui.cancel')}
          </Button>
          <Button type="submit" loading={form.submitting}>
            {editing ? t('admin.saveChanges') : t('admin.serviceForm.submit')}
          </Button>
        </>
      }
    >
      <ErrorAlert error={form.formError} />
      <div className="grid gap-4 sm:grid-cols-[180px_minmax(0,1fr)]">
        <Input
          label={t('admin.field.code')}
          required={!editing}
          disabled={editing}
          className="uppercase"
          placeholder="WATER-NEWCONN"
          dir="ltr"
          {...form.field('code')}
        />
        <Input label={t('admin.field.name')} required {...form.field('name')} />
      </div>
      <Textarea label={t('admin.field.description')} rows={3} maxLength={1000} hint={t('admin.serviceForm.descriptionHint')} {...form.field('description')} />
      <Input
        label={t('admin.serviceForm.nameArabic')}
        dir="rtl"
        lang="ar"
        maxLength={200}
        hint={t('admin.serviceForm.arabicHint')}
        {...form.field('nameArabic')}
      />
      <Textarea label={t('admin.serviceForm.descriptionArabic')} dir="rtl" lang="ar" rows={3} maxLength={1000} {...form.field('descriptionArabic')} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Select label={t('admin.field.category')} options={options(CATEGORIES, (c) => CATEGORY[c])} {...form.field('category')} />
        <Select
          label={t('admin.serviceForm.signOffRequired')}
          options={options(EMPLOYEE_LEVELS, (l) => LEVEL[l])}
          hint={t('admin.serviceForm.signOffHint')}
          {...form.field('requiredApprovalLevel')}
        />
        <Input label={t('admin.serviceForm.slaHours')} type="number" min={1} max={8760} {...form.field('slaHours')} />
      </div>
      <Input
        label={t('admin.serviceForm.fee')}
        type="number"
        min={0}
        step="0.01"
        dir="ltr"
        containerClassName="sm:max-w-xs"
        hint={t('admin.serviceForm.feeHint')}
        {...form.field('fee')}
      />
      <Checkbox
        label={t('admin.serviceForm.nativeOnly')}
        description={t('admin.serviceForm.nativeOnlyDescription')}
        {...form.checkbox('nativeCitizensOnly')}
      />
      {editing && (
        <Alert tone="info">{t('admin.serviceForm.editNotice')}</Alert>
      )}
    </Modal>
  )
}

export function MinistryDetailPage() {
  const { ministryId = '' } = useParams()
  const queryClient = useQueryClient()
  const toast = useToast()

  const [editing, setEditing] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [serviceDialog, setServiceDialog] = useState<{ service?: ServiceDefinition } | null>(null)

  const ministry = useQuery({ queryKey: keys.ministry(ministryId), queryFn: () => ministriesApi.get(ministryId) })
  const services = useQuery({
    queryKey: keys.ministryServices(ministryId),
    queryFn: () => ministriesApi.services(ministryId),
  })
  const staff = useQuery({
    queryKey: keys.userList({ ministryId, userType: 'GovernmentEmployee', pageSize: 50 }),
    queryFn: () => adminApi.users({ ministryId, userType: 'GovernmentEmployee', pageSize: 50 }),
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: keys.ministries })
    queryClient.invalidateQueries({ queryKey: ['catalogue'] })
  }

  const setActive = useMutation({
    mutationFn: (isActive: boolean) => ministriesApi.setActive(ministryId, isActive),
    onSuccess: (_, isActive) => {
      toast.success(isActive ? t('admin.ministry.reactivated') : t('admin.ministry.deactivated'))
      setToggling(false)
      invalidate()
    },
    onError: (e) => toast.error(t('admin.ministry.changeFailed'), errorMessage(e)),
  })

  const setServiceActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => ministriesApi.setServiceActive(id, isActive),
    onSuccess: (_, { isActive }) => {
      toast.success(isActive ? t('admin.ministry.serviceReopened') : t('admin.ministry.serviceClosed'))
      invalidate()
    },
    onError: (e) => toast.error(t('admin.ministry.serviceChangeFailed'), errorMessage(e)),
  })

  if (ministry.isLoading) return <PageLoader />
  if (ministry.isError || !ministry.data) {
    return (
      <Card>
        <ErrorState error={ministry.error} onRetry={() => ministry.refetch()} />
      </Card>
    )
  }

  const m = ministry.data

  return (
    <>
      <PageHeader
        back={{ to: '/admin/ministries', label: t('admin.ministries') }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {m.name}
            <Badge tone={m.isActive ? 'green' : 'neutral'} dot>
              {m.isActive ? t('admin.active') : t('admin.inactive')}
            </Badge>
          </span>
        }
        description={m.nameArabic && <span dir="rtl" lang="ar">{m.nameArabic}</span>}
        actions={
          <>
            <Button variant="secondary" icon={Pencil} onClick={() => setEditing(true)}>
              {t('admin.edit')}
            </Button>
            <Button variant={m.isActive ? 'danger' : 'success'} icon={Power} onClick={() => setToggling(true)}>
              {m.isActive ? t('admin.deactivate') : t('admin.reactivate')}
            </Button>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <Card>
            <CardHeader
              title={
                <span className="inline-flex items-center gap-2">
                  <LayoutGrid className="size-4 text-slate-400" aria-hidden /> {t('admin.ministry.services')}
                </span>
              }
              description={t('admin.ministry.servicesDescription')}
              actions={
                <Button size="sm" icon={Plus} onClick={() => setServiceDialog({})}>
                  {t('admin.ministry.newService')}
                </Button>
              }
            />
            {services.isLoading ? (
              <div className="flex justify-center py-12">
                <Spinner />
              </div>
            ) : services.isError ? (
              <ErrorState error={services.error} onRetry={() => services.refetch()} />
            ) : !services.data?.length ? (
              <EmptyState icon={LayoutGrid} title={t('admin.ministry.noServices')} description={t('admin.ministry.noServicesDescription')} />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>{t('admin.col.service')}</Th>
                    <Th className="hidden md:table-cell">{t('admin.col.category')}</Th>
                    <Th>{t('admin.col.signOff')}</Th>
                    <Th className="hidden sm:table-cell">{t('admin.col.sla')}</Th>
                    <Th className="hidden lg:table-cell">{t('fee.title')}</Th>
                    <Th>{t('admin.col.status')}</Th>
                    <Th className="text-end">
                      <span className="sr-only">{t('admin.col.actions')}</span>
                    </Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {services.data.map((s) => (
                    <tr key={s.id}>
                      <Td>
                        <p className="flex items-center gap-1.5 font-medium text-slate-900">
                          {s.name}
                          {s.nativeCitizensOnly && (
                            <ShieldCheck className="size-3.5 text-violet-600" aria-label={t('admin.serviceForm.nativeOnly')} />
                          )}
                        </p>
                        <p className="font-mono text-xs text-slate-500">{s.code}</p>
                        {s.nameArabic && (
                          <p className="text-xs text-slate-500" dir="rtl" lang="ar">
                            {s.nameArabic}
                          </p>
                        )}
                      </Td>
                      <Td className="hidden md:table-cell">{CATEGORY[s.category]}</Td>
                      <Td>{s.requiredApprovalLevel === 'None' ? '—' : LEVEL_SHORT[s.requiredApprovalLevel]}</Td>
                      <Td className="hidden whitespace-nowrap sm:table-cell">{formatSla(s.slaHours)}</Td>
                      <Td className="hidden whitespace-nowrap tabular-nums lg:table-cell">
                        {s.fee > 0 ? formatMoney(s.fee) : t('fee.free')}
                      </Td>
                      <Td>
                        <Badge tone={s.isActive ? 'green' : 'neutral'} dot>
                          {s.isActive ? t('admin.ministry.open') : t('admin.ministry.closed')}
                        </Badge>
                      </Td>
                      <Td className="text-end whitespace-nowrap">
                        <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setServiceDialog({ service: s })}>
                          <span className="sr-only sm:not-sr-only">{t('admin.edit')}</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={Power}
                          loading={setServiceActive.isPending && setServiceActive.variables?.id === s.id}
                          onClick={() => setServiceActive.mutate({ id: s.id, isActive: !s.isActive })}
                        >
                          <span className="sr-only sm:not-sr-only">{s.isActive ? t('admin.ministry.closeAction') : t('admin.ministry.openAction')}</span>
                        </Button>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>

          <Card>
            <CardHeader
              title={
                <span className="inline-flex items-center gap-2">
                  <Users className="size-4 text-slate-400" aria-hidden /> {t('admin.ministry.staff')}
                </span>
              }
              actions={
                <Link to={`/admin/users/new?ministryId=${m.id}`} className="text-sm font-medium text-brand-700 hover:text-brand-800">
                  {t('admin.ministry.addEmployee')}
                </Link>
              }
            />
            {staff.isLoading ? (
              <div className="flex justify-center py-10">
                <Spinner />
              </div>
            ) : !staff.data?.items.length ? (
              <EmptyState icon={Users} title={t('admin.ministry.noStaff')} />
            ) : (
              <ul className="divide-y divide-slate-100">
                {staff.data.items.map((u) => (
                  <li key={u.id}>
                    <Link to={`/admin/users/${u.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50">
                      <Badge tone="brand">{u.employeeLevel === 'None' ? '—' : LEVEL_SHORT[u.employeeLevel]}</Badge>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">{u.fullName}</p>
                        <p className="truncate text-xs text-slate-500">
                          {u.jobTitle ?? t('admin.officer')} · <span dir="ltr">{u.email}</span>
                        </p>
                      </div>
                      <AccountStatusBadge status={u.accountStatus} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader title={t('admin.ministry.details')} />
          <CardBody>
            <DetailList
              columns={1}
              items={[
                { label: t('admin.field.code'), value: <span className="font-mono">{m.code}</span> },
                { label: t('admin.field.description'), value: m.description ?? '—' },
                { label: t('admin.field.contactEmail'), value: m.contactEmail ? <span dir="ltr">{m.contactEmail}</span> : '—' },
                { label: t('admin.field.contactPhone'), value: m.contactPhone ? <span dir="ltr">{m.contactPhone}</span> : '—' },
                { label: t('admin.ministry.openServices'), value: m.activeServiceCount },
                { label: t('admin.ministry.employees'), value: m.employeeCount },
              ]}
            />
          </CardBody>
        </Card>
      </div>

      {editing && <MinistryFormDialog ministry={m} onClose={() => setEditing(false)} />}
      {serviceDialog && (
        <ServiceFormDialog ministryId={m.id} service={serviceDialog.service} onClose={() => setServiceDialog(null)} />
      )}
      <ConfirmDialog
        open={toggling}
        onClose={() => setToggling(false)}
        onConfirm={() => setActive.mutate(!m.isActive)}
        loading={setActive.isPending}
        tone={m.isActive ? 'danger' : 'success'}
        title={t(m.isActive ? 'admin.ministry.deactivateTitle' : 'admin.ministry.reactivateTitle', { code: m.code })}
        description={
          m.isActive
            ? t('admin.ministry.deactivateDescription')
            : t('admin.ministry.reactivateDescription')
        }
        confirmLabel={m.isActive ? t('admin.deactivate') : t('admin.reactivate')}
      />
    </>
  )
}
