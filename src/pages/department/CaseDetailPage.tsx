import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import {
  AlarmClock,
  ArrowBigUpDash,
  CircleCheck,
  CircleX,
  CornerUpLeft,
  FileCheck,
  Hand,
  History,
  UserCog,
  type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import { useParams } from 'react-router'
import { errorMessage } from '../../api/client'
import { adminApi, departmentApi } from '../../api/endpoints'
import type { ApprovalTrailEntry, DepartmentRequestDetail, EmployeeLevel, WorkflowTransition } from '../../api/types'
import { useCurrentUser } from '../../auth/AuthContext'
import { caseCapabilities, isAdmin } from '../../auth/roles'
import { AttachmentList, type AttachmentRow } from '../../components/Attachments'
import { RequestProgress } from '../../components/RequestProgress'
import { buildSteps } from '../../lib/progress'
import { Badge, PriorityBadge, StatusBadge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, CardBody, CardHeader, DetailList } from '../../components/ui/Card'
import { Alert, ErrorAlert, ErrorState, PageLoader, Spinner } from '../../components/ui/Feedback'
import { Select, Textarea } from '../../components/ui/Form'
import { PageHeader } from '../../components/ui/Layout'
import { Modal } from '../../components/ui/Modal'
import { useToast } from '../../components/ui/Toast'
import { keys } from '../../hooks/queries'
import { formatDateTime, formatRelative } from '../../lib/format'
import { t, tn } from '../../i18n'
import { CATEGORY, DECISION, LEVEL, LEVEL_SHORT, NATIVE_STATUS, REQUEST_STATUS, isTerminal } from '../../lib/labels'
import { reason as validateReason } from '../../lib/validation'

/** "L2" / "المستوى 2" - the tier alone, for use inside sentences. */
const stageName = (level: EmployeeLevel) => (level === 'None' ? '—' : LEVEL_SHORT[level])

type ActionKind = 'approve' | 'reject' | 'return' | 'escalate' | 'complete'

interface ActionSpec {
  title: string
  description: string
  label: string
  icon: LucideIcon
  tone: 'primary' | 'danger' | 'success' | 'secondary'
  field: string
  placeholder: string
  /** Required text with the 10-character minimum the API enforces. */
  reasonRequired: boolean
  run: (id: string, text: string) => Promise<WorkflowTransition>
}

function specFor(kind: ActionKind, c: DepartmentRequestDetail, isFinalStage: boolean): ActionSpec {
  switch (kind) {
    case 'approve':
      return {
        title: isFinalStage
          ? t('department.action.approve.titleFinal')
          : t('department.action.approve.titleForward', {
              level: stageName(`L${Number(c.currentStage.slice(1)) + 1}` as EmployeeLevel),
            }),
        description: isFinalStage
          ? t('department.action.approve.descFinal')
          : t('department.action.approve.descForward', { level: stageName(c.requiredApprovalLevel) }),
        label: t(isFinalStage ? 'department.action.approve.labelFinal' : 'department.action.approve.labelForward'),
        icon: CircleCheck,
        tone: 'success',
        field: t('department.action.approve.field'),
        placeholder: t('department.action.approve.placeholder'),
        reasonRequired: false,
        run: departmentApi.approve,
      }
    case 'reject':
      return {
        title: t('department.action.reject.title'),
        description: t('department.action.reject.desc'),
        label: t('department.action.reject.label'),
        icon: CircleX,
        tone: 'danger',
        field: t('department.action.reject.field'),
        placeholder: t('department.action.reject.placeholder'),
        reasonRequired: true,
        run: departmentApi.reject,
      }
    case 'return':
      return {
        title: t('department.action.return.title'),
        description: t('department.action.return.desc'),
        label: t('department.action.return.label'),
        icon: CornerUpLeft,
        tone: 'primary',
        field: t('department.action.return.field'),
        placeholder: t('department.action.return.placeholder'),
        reasonRequired: true,
        run: departmentApi.returnForInformation,
      }
    case 'escalate':
      return {
        title: t('department.action.escalate.title'),
        description:
          t('department.action.escalate.desc'),
        label: t('department.action.escalate.label'),
        icon: ArrowBigUpDash,
        tone: 'primary',
        field: t('department.action.escalate.field'),
        placeholder: t('department.action.escalate.placeholder'),
        reasonRequired: true,
        run: departmentApi.escalate,
      }
    case 'complete':
      return {
        title: t('department.action.complete.title'),
        description: t('department.action.complete.desc'),
        label: t('department.action.complete.label'),
        icon: FileCheck,
        tone: 'success',
        field: t('department.action.complete.field'),
        placeholder: t('department.action.complete.placeholder'),
        reasonRequired: false,
        run: departmentApi.complete,
      }
  }
}

function ActionDialog({
  kind,
  detail,
  isFinalStage,
  onClose,
  onDone,
}: {
  kind: ActionKind
  detail: DepartmentRequestDetail
  isFinalStage: boolean
  onClose: () => void
  onDone: (result: WorkflowTransition, kind: ActionKind) => void
}) {
  const spec = specFor(kind, detail, isFinalStage)
  const [text, setText] = useState('')
  const [fieldError, setFieldError] = useState<string>()

  const mutation = useMutation({
    mutationFn: () => spec.run(detail.id, text.trim()),
    onSuccess: (result) => onDone(result, kind),
  })

  const submit = () => {
    const problem = spec.reasonRequired
      ? validateReason(text)
      : text.length > 2000
        ? t('validation.reasonMax')
        : undefined
    setFieldError(problem)
    if (!problem) mutation.mutate()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={spec.title}
      description={spec.description}
      busy={mutation.isPending}
      onSubmit={submit}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            {t('ui.cancel')}
          </Button>
          <Button type="submit" variant={spec.tone} icon={spec.icon} loading={mutation.isPending}>
            {spec.label}
          </Button>
        </>
      }
    >
      <ErrorAlert error={mutation.error} />
      <Textarea
        label={spec.field}
        required={spec.reasonRequired}
        rows={5}
        maxLength={2000}
        autoFocus
        placeholder={spec.placeholder}
        value={text}
        error={fieldError}
        hint={spec.reasonRequired ? tn('department.action.charCount', text.trim().length) : undefined}
        onChange={(e) => {
          setText(e.target.value)
          setFieldError(undefined)
        }}
      />
    </Modal>
  )
}

function ReassignDialog({
  detail,
  onClose,
  onDone,
}: {
  detail: DepartmentRequestDetail
  onClose: () => void
  onDone: (result: WorkflowTransition) => void
}) {
  const [assignee, setAssignee] = useState('')

  // Only officers who could actually act at the current tier are offered; the domain
  // refuses anyone else.
  const colleagues = useQuery({
    queryKey: keys.userList({ ministryId: detail.ministryId, employeeLevel: detail.currentStage, reassign: true }),
    queryFn: () =>
      adminApi.users({
        userType: 'GovernmentEmployee',
        ministryId: detail.ministryId,
        employeeLevel: detail.currentStage,
        accountStatus: 'Active',
        pageSize: 100,
      }),
  })

  const mutation = useMutation({
    mutationFn: () => departmentApi.assign(detail.id, assignee),
    onSuccess: onDone,
  })

  const choices = (colleagues.data?.items ?? []).filter((u) => u.id !== detail.assignedToUserId)

  return (
    <Modal
      open
      onClose={onClose}
      title={t('department.reassign.title')}
      description={t('department.reassign.description', {
        reference: detail.referenceNumber,
        level: stageName(detail.currentStage),
        ministry: detail.ministryCode,
      })}
      busy={mutation.isPending}
      onSubmit={() => assignee && mutation.mutate()}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            {t('ui.cancel')}
          </Button>
          <Button type="submit" icon={UserCog} disabled={!assignee} loading={mutation.isPending}>
            {t('department.reassign.submit')}
          </Button>
        </>
      }
    >
      <ErrorAlert error={mutation.error ?? colleagues.error} />
      {colleagues.isLoading ? (
        <div className="flex justify-center py-6">
          <Spinner />
        </div>
      ) : choices.length === 0 ? (
        <Alert tone="info">{t('department.reassign.none', { level: stageName(detail.currentStage) })}</Alert>
      ) : (
        <Select
          label={t('department.reassign.officer')}
          required
          value={assignee}
          onChange={(e) => setAssignee(e.target.value)}
          placeholder={t('department.reassign.choose')}
          options={choices.map((u) => ({ value: u.id, label: `${u.fullName}${u.jobTitle ? ` — ${u.jobTitle}` : ''}` }))}
        />
      )}
    </Modal>
  )
}

function Trail({ entries }: { entries: ApprovalTrailEntry[] }) {
  if (!entries.length) {
    return <p className="text-sm text-slate-500">{t('department.trail.empty')}</p>
  }

  const sorted = [...entries].sort((a, b) => b.sequenceNumber - a.sequenceNumber)
  return (
    <ol className="relative space-y-5 border-s border-slate-200 ps-5">
      {sorted.map((e) => {
        const meta = DECISION[e.decision]
        return (
          <li key={e.sequenceNumber} className="relative">
            <span
              className={clsx(
                'absolute top-1 -start-[26px] size-3 rounded-full ring-4 ring-white',
                meta.tone === 'green' && 'bg-emerald-500',
                meta.tone === 'red' && 'bg-red-500',
                meta.tone === 'amber' && 'bg-amber-500',
                meta.tone === 'violet' && 'bg-violet-500',
                meta.tone === 'blue' && 'bg-sky-500',
              )}
              aria-hidden
            />
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={meta.tone}>{meta.label}</Badge>
              <span className="text-xs font-medium text-slate-500">{t('department.trail.at', { stage: stageName(e.stage) })}</span>
            </div>
            <p className="mt-1 text-sm font-medium text-slate-800">{e.actorName}</p>
            <p className="text-xs text-slate-500">{formatDateTime(e.actedAt)}</p>
            {e.comments && (
              <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm whitespace-pre-line text-slate-700">{e.comments}</p>
            )}
          </li>
        )
      })}
    </ol>
  )
}

export function CaseDetailPage() {
  const { requestId = '' } = useParams()
  const user = useCurrentUser()
  const queryClient = useQueryClient()
  const toast = useToast()

  const [action, setAction] = useState<ActionKind | null>(null)
  const [reassigning, setReassigning] = useState(false)
  const [busyAttachment, setBusyAttachment] = useState<string | null>(null)

  const detail = useQuery({
    queryKey: keys.case(requestId),
    queryFn: () => departmentApi.get(requestId),
  })

  const afterTransition = (result: WorkflowTransition, message: string) => {
    toast.success(
      message,
      t('department.done.nowStatus', { reference: result.referenceNumber, status: REQUEST_STATUS[result.status].label }),
    )
    queryClient.invalidateQueries({ queryKey: keys.cases })
  }

  const take = useMutation({
    mutationFn: () => departmentApi.assign(requestId),
    onSuccess: (r) => afterTransition(r, t('department.done.assigned')),
    onError: (e) => toast.error(t('department.error.take'), errorMessage(e)),
  })

  const download = async (a: AttachmentRow) => {
    setBusyAttachment(a.id)
    try {
      await departmentApi.downloadAttachment(requestId, a.id, a.fileName)
    } catch (error) {
      toast.error(t('department.error.download'), errorMessage(error))
    } finally {
      setBusyAttachment(null)
    }
  }

  if (detail.isLoading) return <PageLoader />
  if (detail.isError || !detail.data) {
    return (
      <Card>
        <ErrorState error={detail.error} onRetry={() => detail.refetch()} />
      </Card>
    )
  }

  const c = detail.data
  const can = caseCapabilities(user, c)
  const anyAction = can.canDecide || can.canComplete || can.canReassign

  // For a closed case the stage has been cleared; the last trail entry says where it ended.
  const lastStage = c.approvalTrail.length
    ? [...c.approvalTrail].sort((a, b) => b.sequenceNumber - a.sequenceNumber)[0].stage
    : c.currentStage
  const steps = buildSteps(c.status, {
    currentStage: isTerminal(c.status) ? lastStage : c.currentStage,
    requiredLevel: c.requiredApprovalLevel,
  })

  const ACTION_MESSAGES: Record<ActionKind, string> = {
    approve: t('department.done.approve'),
    reject: t('department.done.reject'),
    return: t('department.done.return'),
    escalate: t('department.done.escalate'),
    complete: t('department.done.complete'),
  }

  return (
    <>
      <PageHeader
        back={{ to: '/department/queue', label: t('nav.caseQueue') }}
        title={c.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono">{c.referenceNumber}</span>
            <span aria-hidden>·</span>
            {c.serviceName}
            <span aria-hidden>·</span>
            {c.ministryCode}
          </span>
        }
        actions={
          <>
            <StatusBadge status={c.status} />
            <PriorityBadge priority={c.priority} />
          </>
        }
      />

      <Card className="mb-6 px-5 py-5">
        <RequestProgress steps={steps} />
      </Card>

      {c.isOverdue && (
        <Alert tone="error" title={t('department.case.pastSla')} className="mb-6">
          {t('department.case.dueWas', { relative: formatRelative(c.dueAt), date: formatDateTime(c.dueAt) })}
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <Card>
            <CardHeader title={t('department.case.application')} />
            <CardBody className="space-y-5">
              <p className="text-sm whitespace-pre-line text-slate-700">{c.description}</p>
              {c.decisionNotes && (
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                    {t('department.case.notesToApplicant')}
                  </p>
                  <p className="mt-1 text-sm whitespace-pre-line text-slate-700">{c.decisionNotes}</p>
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title={t('department.case.documents')}
              description={tn('department.case.documentsCount', c.attachments.length)}
            />
            <CardBody>
              <AttachmentList items={c.attachments} busyId={busyAttachment} onDownload={download} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title={
                <span className="inline-flex items-center gap-2">
                  <History className="size-4 text-slate-400" aria-hidden /> {t('department.case.trailTitle')}
                </span>
              }
              description={t('department.case.trailDescription')}
            />
            <CardBody>
              <Trail entries={c.approvalTrail} />
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title={t('department.case.actions')} />
            <CardBody className="space-y-3">
              {isAdmin(user) ? (
                <Alert tone="info">{t('department.case.adminReadOnly')}</Alert>
              ) : !anyAction ? (
                <Alert tone="info">
                  {isTerminal(c.status)
                    ? t('department.case.closed')
                    : c.status === 'ReturnedForInformation'
                      ? t('department.case.waitingApplicant')
                      : t('department.case.notYourStage', {
                          stage: stageName(c.currentStage),
                          level: stageName(user.employeeLevel),
                        })}
                </Alert>
              ) : null}

              {can.canTake && (
                <Button variant="secondary" block icon={Hand} loading={take.isPending} onClick={() => take.mutate()}>
                  {t('department.case.assignToMe')}
                </Button>
              )}
              {can.canReassign && (
                <Button variant="secondary" block icon={UserCog} onClick={() => setReassigning(true)}>
                  {t('department.case.reassign')}
                </Button>
              )}
              {can.canDecide && (
                <>
                  <Button variant="success" block icon={CircleCheck} onClick={() => setAction('approve')}>
                    {t(can.isFinalStage ? 'department.action.approve.labelFinal' : 'department.action.approve.labelForward')}
                  </Button>
                  <Button variant="secondary" block icon={CornerUpLeft} onClick={() => setAction('return')}>
                    {t('department.action.return.label')}
                  </Button>
                  {can.canEscalate && (
                    <Button variant="secondary" block icon={ArrowBigUpDash} onClick={() => setAction('escalate')}>
                      {t('department.action.escalate.label')}
                    </Button>
                  )}
                  <Button variant="danger" block icon={CircleX} onClick={() => setAction('reject')}>
                    {t('department.action.reject.label')}
                  </Button>
                </>
              )}
              {can.canComplete && (
                <Button variant="success" block icon={FileCheck} onClick={() => setAction('complete')}>
                  {t('department.case.markDelivered')}
                </Button>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={t('department.case.caseCard')} />
            <CardBody>
              <DetailList
                columns={1}
                items={[
                  { label: t('department.case.currentStage'), value: c.currentStage === 'None' ? '—' : LEVEL[c.currentStage] },
                  { label: t('department.case.requiredSignoff'), value: LEVEL[c.requiredApprovalLevel] },
                  {
                    label: t('department.case.assignedTo'),
                    value: c.assignedToName ? (
                      <span className={clsx(c.assignedToUserId === user.id && 'font-medium text-brand-800')}>
                        {c.assignedToName}
                        {c.assignedToUserId === user.id && t('department.case.you')}
                      </span>
                    ) : (
                      <span className="text-slate-400">{t('department.unassigned')}</span>
                    ),
                  },
                  { label: t('department.case.category'), value: CATEGORY[c.category] },
                  { label: t('department.case.submitted'), value: formatDateTime(c.submittedAt) },
                  {
                    label: t('department.case.due'),
                    value: c.dueAt ? (
                      <span className={clsx(c.isOverdue && 'font-medium text-red-600')}>
                        {c.isOverdue && <AlarmClock className="me-1 inline size-3.5 align-[-2px]" aria-hidden />}
                        {formatDateTime(c.dueAt)}
                      </span>
                    ) : (
                      '—'
                    ),
                  },
                  ...(c.decidedAt ? [{ label: t('department.case.decided'), value: formatDateTime(c.decidedAt) }] : []),
                  ...(c.completedAt ? [{ label: t('department.case.completed'), value: formatDateTime(c.completedAt) }] : []),
                ]}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={t('department.case.applicantCard')} />
            <CardBody>
              <DetailList
                columns={1}
                items={[
                  { label: t('department.case.name'), value: c.applicantName },
                  { label: t('validation.nationalIdLabel'), value: <span className="font-mono">{c.applicantNationalId}</span> },
                  { label: t('department.case.residency'), value: NATIVE_STATUS[c.applicantNativeStatus] },
                ]}
              />
            </CardBody>
          </Card>
        </div>
      </div>

      {action && (
        <ActionDialog
          kind={action}
          detail={c}
          isFinalStage={can.isFinalStage}
          onClose={() => setAction(null)}
          onDone={(result, kind) => {
            setAction(null)
            afterTransition(result, ACTION_MESSAGES[kind])
          }}
        />
      )}
      {reassigning && (
        <ReassignDialog
          detail={c}
          onClose={() => setReassigning(false)}
          onDone={(result) => {
            setReassigning(false)
            afterTransition(result, t('department.done.reassigned'))
          }}
        />
      )}
    </>
  )
}
