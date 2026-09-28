import { useQueryClient } from '@tanstack/react-query'
import { UserPlus } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router'
import { adminApi } from '../../api/endpoints'
import type { EmployeeLevel } from '../../api/types'
import { PasswordChecklist } from '../../components/PasswordChecklist'
import { Button } from '../../components/ui/Button'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { Alert, ErrorAlert } from '../../components/ui/Feedback'
import { Input, Select } from '../../components/ui/Form'
import { PageHeader } from '../../components/ui/Layout'
import { useToast } from '../../components/ui/Toast'
import { keys, useAllMinistries } from '../../hooks/queries'
import { useForm } from '../../hooks/useForm'
import { t } from '../../i18n'
import { EMPLOYEE_LEVELS, LEVEL, options } from '../../lib/labels'
import { email, maxLength, nationalId, required, strongPassword } from '../../lib/validation'

export function CreateEmployeePage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const queryClient = useQueryClient()
  const toast = useToast()
  const ministries = useAllMinistries()

  const form = useForm(
    {
      fullName: '',
      email: '',
      nationalId: '',
      phoneNumber: '',
      ministryId: params.get('ministryId') ?? '',
      employeeLevel: 'L1',
      jobTitle: '',
      initialPassword: '',
    },
    (v) => ({
      fullName: required(v.fullName, t('admin.field.fullName')) ?? maxLength(v.fullName, 200, t('admin.field.fullName')),
      email: email(v.email),
      nationalId: nationalId(v.nationalId),
      phoneNumber: maxLength(v.phoneNumber, 32, t('admin.field.phone')),
      ministryId: required(v.ministryId, t('admin.field.ministry')),
      jobTitle: maxLength(v.jobTitle, 150, t('admin.field.jobTitle')),
      initialPassword: strongPassword(v.initialPassword),
    }),
  )

  const onSubmit = form.handleSubmit(async (v) => {
    const profile = await adminApi.createEmployee({
      fullName: v.fullName.trim(),
      email: v.email.trim(),
      nationalId: v.nationalId.trim(),
      phoneNumber: v.phoneNumber.trim() || undefined,
      ministryId: v.ministryId,
      employeeLevel: v.employeeLevel as EmployeeLevel,
      jobTitle: v.jobTitle.trim() || undefined,
      initialPassword: v.initialPassword,
    })
    await queryClient.invalidateQueries({ queryKey: keys.users })
    await queryClient.invalidateQueries({ queryKey: keys.ministries })
    toast.success(t('admin.createEmployee.created'), t('admin.createEmployee.createdDetail', { name: profile.fullName }))
    navigate(`/admin/users/${profile.id}`, { replace: true })
  })

  return (
    <>
      <PageHeader
        back={{ to: '/admin/users', label: t('admin.users') }}
        title={t('admin.createEmployee.title')}
        description={t('admin.createEmployee.description')}
      />

      <form onSubmit={onSubmit} noValidate className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader title={t('admin.createEmployee.identity')} />
            <CardBody className="grid gap-5 sm:grid-cols-2">
              <ErrorAlert error={form.formError} className="sm:col-span-2" />
              <Input label={t('admin.field.fullName')} required containerClassName="sm:col-span-2" {...form.field('fullName')} />
              <Input label={t('admin.field.workEmail')} type="email" dir="ltr" required {...form.field('email')} />
              <Input label={t('admin.field.nationalId')} dir="ltr" required {...form.field('nationalId')} />
              <Input label={t('admin.field.phone')} type="tel" dir="ltr" {...form.field('phoneNumber')} />
              <Input label={t('admin.field.jobTitle')} placeholder={t('admin.createEmployee.jobTitlePlaceholder')} {...form.field('jobTitle')} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={t('admin.createEmployee.placement')} description={t('admin.createEmployee.placementDescription')} />
            <CardBody className="grid gap-5 sm:grid-cols-2">
              <Select
                label={t('admin.field.ministry')}
                required
                placeholder={t('admin.chooseMinistry')}
                options={(ministries.data ?? []).map((m) => ({ value: m.id, label: t('admin.ministryOption', { code: m.code, name: m.name }) }))}
                {...form.field('ministryId')}
              />
              <Select label={t('admin.field.approvalTier')} required options={options(EMPLOYEE_LEVELS, (l) => LEVEL[l])} {...form.field('employeeLevel')} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={t('admin.createEmployee.initialPassword')} description={t('admin.createEmployee.initialPasswordDescription')} />
            <CardBody className="space-y-2">
              <Input label={t('admin.field.password')} type="text" dir="ltr" autoComplete="off" required {...form.field('initialPassword')} />
              <PasswordChecklist value={form.values.initialPassword} />
            </CardBody>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => navigate(-1)}>
              {t('ui.cancel')}
            </Button>
            <Button type="submit" icon={UserPlus} loading={form.submitting}>
              {t('admin.createEmployee.submit')}
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <Alert tone="info" title={t('admin.createEmployee.tiersTitle')}>
            <ul className="mt-1 list-disc space-y-1 ps-4">
              <li>
                <b>{t('level.short.L1')}</b> — {t('admin.createEmployee.tierL1')}
              </li>
              <li>
                <b>{t('level.short.L2')}</b> — {t('admin.createEmployee.tierL2')}
              </li>
              <li>
                <b>{t('level.short.L3')}</b> — {t('admin.createEmployee.tierL3')}
              </li>
            </ul>
          </Alert>
        </div>
      </form>
    </>
  )
}
