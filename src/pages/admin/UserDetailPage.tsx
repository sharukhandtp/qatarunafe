import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeftRight, Layers, ShieldBan } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { adminApi } from '../../api/endpoints'
import type { AccountStatus, EmployeeLevel, UserProfile } from '../../api/types'
import { useAuth } from '../../auth/AuthContext'
import { AccountStatusBadge, Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, CardBody, CardHeader, DetailList } from '../../components/ui/Card'
import { Alert, EmptyState, ErrorAlert, ErrorState, PageLoader, Spinner } from '../../components/ui/Feedback'
import { Select, Textarea } from '../../components/ui/Form'
import { PageHeader, Table, Td, Th } from '../../components/ui/Layout'
import { useToast } from '../../components/ui/Toast'
import { keys, useAllMinistries } from '../../hooks/queries'
import { t } from '../../i18n'
import { formatDateTime, formatRelative } from '../../lib/format'
import { ACCOUNT_STATUS, ACCOUNT_STATUSES, AUDIT_ACTION, EMPLOYEE_LEVELS, LEVEL, NATIVE_STATUS, USER_TYPE, options } from '../../lib/labels'

function useAdminMutation<T>(fn: (value: T) => Promise<void>, success: string, userId: string) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const { user: me, reloadProfile } = useAuth()

  return useMutation({
    mutationFn: fn,
    onSuccess: async () => {
      toast.success(success)
      await queryClient.invalidateQueries({ queryKey: keys.users })
      await queryClient.invalidateQueries({ queryKey: keys.ministries })
      if (me?.id === userId) await reloadProfile()
    },
  })
}

function PlacementCard({ user }: { user: UserProfile }) {
  const ministries = useAllMinistries()
  const [level, setLevel] = useState<EmployeeLevel>(user.employeeLevel)
  const [ministryId, setMinistryId] = useState(user.ministryId ?? '')

  const changeLevel = useAdminMutation(
    (value: EmployeeLevel) => adminApi.changeLevel(user.id, value),
    t('admin.user.tierChanged'),
    user.id,
  )
  const transfer = useAdminMutation((value: string) => adminApi.transfer(user.id, value), t('admin.user.transferred'), user.id)

  return (
    <Card>
      <CardHeader title={t('admin.user.placement')} description={t('admin.user.placementDescription')} />
      <CardBody className="space-y-5">
        <ErrorAlert error={changeLevel.error ?? transfer.error} />
        <div className="flex flex-wrap items-end gap-3">
          <Select
            label={t('admin.field.approvalTier')}
            containerClassName="min-w-56 flex-1"
            value={level}
            onChange={(e) => setLevel(e.target.value as EmployeeLevel)}
            options={options(EMPLOYEE_LEVELS, (l) => LEVEL[l])}
          />
          <Button
            variant="secondary"
            icon={Layers}
            disabled={level === user.employeeLevel}
            loading={changeLevel.isPending}
            onClick={() => changeLevel.mutate(level)}
          >
            {EMPLOYEE_LEVELS.indexOf(level) > EMPLOYEE_LEVELS.indexOf(user.employeeLevel) ? t('admin.user.promote') : t('admin.user.changeTier')}
          </Button>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <Select
            label={t('admin.field.ministry')}
            containerClassName="min-w-56 flex-1"
            value={ministryId}
            onChange={(e) => setMinistryId(e.target.value)}
            placeholder={t('admin.chooseMinistry')}
            options={(ministries.data ?? []).map((m) => ({ value: m.id, label: t('admin.ministryOption', { code: m.code, name: m.name }) }))}
          />
          <Button
            variant="secondary"
            icon={ArrowLeftRight}
            disabled={!ministryId || ministryId === user.ministryId}
            loading={transfer.isPending}
            onClick={() => transfer.mutate(ministryId)}
          >
            {t('admin.user.transfer')}
          </Button>
        </div>
        <p className="text-xs text-slate-500">
          {t('admin.user.transferNote')}
        </p>
      </CardBody>
    </Card>
  )
}

function StatusCard({ user }: { user: UserProfile }) {
  const [status, setStatus] = useState<AccountStatus>(user.accountStatus)
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState<string>()

  const mutation = useAdminMutation(
    (value: { status: AccountStatus; reason: string }) => adminApi.setStatus(user.id, value.status, value.reason),
    t('admin.user.statusUpdated'),
    user.id,
  )

  const needsReason = status === 'Suspended' || status === 'Deactivated'

  const apply = () => {
    if (needsReason && !reason.trim()) {
      setReasonError(t('admin.user.reasonNeeded'))
      return
    }
    mutation.mutate({ status, reason: reason.trim() }, { onSuccess: () => setReason('') })
  }

  return (
    <Card>
      <CardHeader title={t('admin.user.accountStatus')} />
      <CardBody className="space-y-4">
        <ErrorAlert error={mutation.error} />
        {status === 'Deactivated' && user.accountStatus !== 'Deactivated' && (
          <Alert tone="warning">{t('admin.user.deactivationWarning')}</Alert>
        )}
        <Select
          label={t('admin.field.status')}
          value={status}
          onChange={(e) => setStatus(e.target.value as AccountStatus)}
          options={options(ACCOUNT_STATUSES, (s) => ACCOUNT_STATUS[s].label)}
        />
        <Textarea
          label={needsReason ? t('admin.user.reason') : t('admin.user.reasonOptional')}
          required={needsReason}
          rows={3}
          maxLength={500}
          value={reason}
          error={reasonError}
          onChange={(e) => {
            setReason(e.target.value)
            setReasonError(undefined)
          }}
          hint={t('admin.user.reasonHint')}
        />
        <Button
          variant={needsReason ? 'danger' : 'primary'}
          icon={ShieldBan}
          disabled={status === user.accountStatus}
          loading={mutation.isPending}
          onClick={apply}
        >
          {t('admin.user.applyStatus')}
        </Button>
      </CardBody>
    </Card>
  )
}

export function UserDetailPage() {
  const { userId = '' } = useParams()
  const { user: me } = useAuth()

  const user = useQuery({ queryKey: keys.user(userId), queryFn: () => adminApi.user(userId) })
  const activity = useQuery({
    queryKey: keys.audit({ actorUserId: userId, pageSize: 10 }),
    queryFn: () => adminApi.auditLogs({ actorUserId: userId, pageSize: 10 }),
  })

  if (user.isLoading) return <PageLoader />
  if (user.isError || !user.data) {
    return (
      <Card>
        <ErrorState error={user.error} onRetry={() => user.refetch()} />
      </Card>
    )
  }

  const u = user.data
  const employee = u.userType === 'GovernmentEmployee'
  const isMe = me?.id === u.id

  return (
    <>
      <PageHeader
        back={{ to: '/admin/users', label: t('admin.users') }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {u.fullName}
            <Badge tone={USER_TYPE[u.userType].tone}>{USER_TYPE[u.userType].label}</Badge>
            <AccountStatusBadge status={u.accountStatus} />
          </span>
        }
        description={<span dir="ltr">{u.email}</span>}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="space-y-6">
          <Card>
            <CardHeader title={t('admin.user.profile')} />
            <CardBody>
              <DetailList
                items={[
                  { label: t('admin.field.nationalId'), value: <span className="font-mono">{u.nationalId}</span> },
                  { label: t('admin.field.phone'), value: u.phoneNumber ? <span dir="ltr">{u.phoneNumber}</span> : '—' },
                  ...(employee
                    ? [
                        {
                          label: t('admin.field.ministry'),
                          value: u.ministryId ? (
                            <Link to={`/admin/ministries/${u.ministryId}`} className="text-brand-700 hover:underline">
                              {u.ministryName}
                            </Link>
                          ) : (
                            '—'
                          ),
                        },
                        { label: t('admin.field.tier'), value: LEVEL[u.employeeLevel] },
                        { label: t('admin.field.jobTitle'), value: u.jobTitle ?? '—' },
                      ]
                    : []),
                  ...(u.userType === 'PublicUser' ? [{ label: t('admin.field.residency'), value: NATIVE_STATUS[u.nativeStatus] }] : []),
                  { label: t('admin.field.lastSignIn'), value: u.lastLoginAt ? formatDateTime(u.lastLoginAt) : t('admin.never') },
                ]}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title={t('admin.user.recentActivity')}
              actions={
                <Link to={`/audit?actorUserId=${u.id}`} className="text-sm font-medium text-brand-700 hover:text-brand-800">
                  {t('admin.user.fullTrail')}
                </Link>
              }
            />
            {activity.isLoading ? (
              <div className="flex justify-center py-10">
                <Spinner />
              </div>
            ) : !activity.data?.items.length ? (
              <EmptyState icon={Layers} title={t('admin.user.noActivity')} />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>{t('admin.col.event')}</Th>
                    <Th className="hidden md:table-cell">{t('admin.col.target')}</Th>
                    <Th>{t('admin.col.when')}</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activity.data.items.map((e) => (
                    <tr key={e.id}>
                      <Td>
                        <Badge tone={e.succeeded ? AUDIT_ACTION[e.action].tone : 'red'}>{AUDIT_ACTION[e.action].label}</Badge>
                      </Td>
                      <Td className="hidden text-xs text-slate-500 md:table-cell">
                        {e.entityName}
                        {e.entityId && <span className="font-mono"> · {e.entityId.slice(0, 18)}</span>}
                      </Td>
                      <Td className="text-xs whitespace-nowrap text-slate-500">{formatRelative(e.occurredAt)}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          {isMe ? (
            <Alert tone="info">{t('admin.user.ownAccount')}</Alert>
          ) : (
            <>
              {employee && <PlacementCard key={`${u.employeeLevel}-${u.ministryId}`} user={u} />}
              <StatusCard key={u.accountStatus} user={u} />
            </>
          )}
        </div>
      </div>
    </>
  )
}
