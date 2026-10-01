import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Award, Ban, CreditCard, Pencil, Send, X } from 'lucide-react'
import { useState } from 'react'
import { useParams } from 'react-router'
import { errorMessage } from '../../api/client'
import { myRequestsApi } from '../../api/endpoints'
import type { CitizenRequestDetail, RequestPriority } from '../../api/types'
import { AttachmentList, FileDropzone, type AttachmentRow } from '../../components/Attachments'
import { FeeCard, useFeePayment } from '../../components/Fees'
import { isFeeOutstanding } from '../../lib/fees'
import { RequestProgress } from '../../components/RequestProgress'
import { buildSteps } from '../../lib/progress'
import { PriorityBadge, StatusBadge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, CardBody, CardHeader, DetailList } from '../../components/ui/Card'
import { Alert, ErrorAlert, ErrorState, PageLoader } from '../../components/ui/Feedback'
import { Input, Select, Textarea } from '../../components/ui/Form'
import { PageHeader } from '../../components/ui/Layout'
import { ConfirmDialog, Modal } from '../../components/ui/Modal'
import { useToast } from '../../components/ui/Toast'
import { keys } from '../../hooks/queries'
import { useForm } from '../../hooks/useForm'
import { t, tn } from '../../i18n'
import { formatDateTime, formatMoney, formatRelative } from '../../lib/format'
import { CATEGORY, PRIORITIES, PRIORITY, isTerminal, options } from '../../lib/labels'
import { ATTACHMENT_MAX_COUNT, maxLength, required } from '../../lib/validation'

function EditDialog({ request, open, onClose }: { request: CitizenRequestDetail; open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const form = useForm(
    { title: request.title, description: request.description, priority: request.priority as string },
    (v) => ({
      title: required(v.title, t('citizen.title')) ?? maxLength(v.title, 200, t('citizen.title')),
      description: required(v.description, t('citizen.description')) ?? maxLength(v.description, 4000, t('citizen.description')),
    }),
  )

  const onSubmit = form.handleSubmit(async (v) => {
    await myRequestsApi.update(request.id, {
      title: v.title.trim(),
      description: v.description.trim(),
      priority: v.priority as RequestPriority,
    })
    await queryClient.invalidateQueries({ queryKey: keys.myRequests })
    toast.success(t('citizen.detail.changesSaved'))
    onClose()
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('citizen.detail.editTitle')}
      size="lg"
      busy={form.submitting}
      onSubmit={onSubmit}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={form.submitting}>
            {t('ui.cancel')}
          </Button>
          <Button type="submit" loading={form.submitting}>
            {t('citizen.detail.saveChanges')}
          </Button>
        </>
      }
    >
      <ErrorAlert error={form.formError} />
      <Input label={t('citizen.title')} required maxLength={200} {...form.field('title')} />
      <Textarea label={t('citizen.description')} required rows={8} maxLength={4000} {...form.field('description')} />
      <Select
        label={t('citizen.priority')}
        containerClassName="sm:max-w-xs"
        options={options(PRIORITIES, (p) => PRIORITY[p].label)}
        {...form.field('priority')}
      />
    </Modal>
  )
}

export function MyRequestDetailPage() {
  const { requestId = '' } = useParams()
  const queryClient = useQueryClient()
  const toast = useToast()

  const [editing, setEditing] = useState(false)
  const [confirm, setConfirm] = useState<'submit' | 'cancel' | null>(null)
  const [removing, setRemoving] = useState<AttachmentRow | null>(null)
  const [busyAttachment, setBusyAttachment] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [downloadingCertificate, setDownloadingCertificate] = useState(false)
  const fee = useFeePayment(requestId)

  const detail = useQuery({
    queryKey: keys.myRequest(requestId),
    queryFn: () => myRequestsApi.get(requestId),
  })

  const refresh = () => queryClient.invalidateQueries({ queryKey: keys.myRequests })

  const submit = useMutation({
    mutationFn: () => myRequestsApi.submit(requestId),
    onSuccess: (r) => {
      toast.success(t('citizen.newRequest.submittedToast'), t('citizen.detail.submittedBody', { ref: r.referenceNumber }))
      setConfirm(null)
      refresh()
    },
    onError: (e) => toast.error(t('citizen.detail.submitFailed'), errorMessage(e)),
  })

  const cancel = useMutation({
    mutationFn: () => myRequestsApi.cancel(requestId),
    onSuccess: () => {
      toast.success(t('citizen.detail.cancelledToast'))
      setConfirm(null)
      refresh()
    },
    onError: (e) => toast.error(t('citizen.detail.cancelFailed'), errorMessage(e)),
  })

  const upload = useMutation({
    mutationFn: async (files: File[]) => {
      const failures: string[] = []
      for (const file of files) {
        try {
          await myRequestsApi.uploadAttachment(requestId, file)
        } catch (error) {
          failures.push(`${file.name}: ${errorMessage(error)}`)
        }
      }
      return { failures, uploaded: files.length - failures.length }
    },
    onSuccess: ({ failures, uploaded }) => {
      if (uploaded) toast.success(tn('citizen.detail.attached', uploaded))
      if (failures.length) setFileError(failures.join(' · '))
      refresh()
    },
  })

  const remove = useMutation({
    mutationFn: (a: AttachmentRow) => myRequestsApi.deleteAttachment(requestId, a.id),
    onSuccess: () => {
      toast.success(t('citizen.detail.removedToast'))
      setRemoving(null)
      refresh()
    },
    onError: (e) => toast.error(t('citizen.detail.removeFailed'), errorMessage(e)),
  })

  const download = async (a: AttachmentRow) => {
    setBusyAttachment(a.id)
    try {
      await myRequestsApi.downloadAttachment(requestId, a.id, a.fileName)
    } catch (error) {
      toast.error(t('citizen.detail.downloadFailed'), errorMessage(error))
    } finally {
      setBusyAttachment(null)
    }
  }

  const downloadCertificate = async (referenceNumber: string) => {
    setDownloadingCertificate(true)
    try {
      await myRequestsApi.downloadCertificate(requestId, referenceNumber)
    } catch (error) {
      toast.error(t('certificate.downloadFailed'), errorMessage(error))
    } finally {
      setDownloadingCertificate(false)
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

  const r = detail.data
  const closed = isTerminal(r.status)
  const canAttach = !closed && r.attachments.length < ATTACHMENT_MAX_COUNT
  // A service with a fee cannot enter the queue until it is paid; the API refuses the submit.
  const unpaid = isFeeOutstanding(r)

  return (
    <>
      <PageHeader
        back={{ to: '/requests', label: t('nav.myRequests') }}
        title={r.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono">{r.referenceNumber}</span>
            <span aria-hidden>·</span>
            {r.serviceName}
            <span aria-hidden>·</span>
            {r.ministryName}
          </span>
        }
        actions={
          <>
            {r.isEditable && (
              <Button variant="secondary" icon={Pencil} onClick={() => setEditing(true)}>
                {t('citizen.detail.edit')}
              </Button>
            )}
            {!closed && (
              <Button variant="secondary" icon={Ban} onClick={() => setConfirm('cancel')}>
                {t('citizen.detail.cancelRequest')}
              </Button>
            )}
            {r.status === 'Completed' && (
              <Button
                variant="secondary"
                icon={Award}
                loading={downloadingCertificate}
                onClick={() => downloadCertificate(r.referenceNumber)}
              >
                {t('certificate.download')}
              </Button>
            )}
            {unpaid && !closed && (
              <Button icon={CreditCard} loading={fee.starting} onClick={fee.pay}>
                {t('fee.payAmount', { amount: formatMoney(r.feeAmount) })}
              </Button>
            )}
            {r.isEditable && (
              <Button
                icon={Send}
                variant={unpaid ? 'secondary' : 'primary'}
                disabled={unpaid}
                title={unpaid ? t('fee.payFirst') : undefined}
                onClick={() => setConfirm('submit')}
              >
                {t(r.status === 'ReturnedForInformation' ? 'citizen.detail.resubmit' : 'citizen.detail.submit')}
              </Button>
            )}
          </>
        }
      />

      <Card className="mb-6 px-5 py-5">
        <RequestProgress steps={buildSteps(r.status)} />
      </Card>

      {unpaid && !closed && (
        <Alert tone="warning" title={t('fee.outstandingTitle', { amount: formatMoney(r.feeAmount) })} className="mb-6">
          {t('fee.outstandingBody')}
        </Alert>
      )}
      {r.status === 'ReturnedForInformation' && (
        <Alert tone="warning" title={t('citizen.detail.returnedTitle')} className="mb-6">
          <p className="whitespace-pre-line">{r.decisionNotes}</p>
          <p className="mt-2 text-xs">{t('citizen.detail.returnedHint')}</p>
        </Alert>
      )}
      {r.status === 'Rejected' && r.decisionNotes && (
        <Alert tone="error" title={t('citizen.detail.rejectedTitle')} className="mb-6">
          <p className="whitespace-pre-line">{r.decisionNotes}</p>
        </Alert>
      )}
      {(r.status === 'Approved' || r.status === 'Completed') && (
        <Alert tone="success" title={t(r.status === 'Completed' ? 'citizen.detail.deliveredTitle' : 'citizen.detail.approvedTitle')} className="mb-6">
          {r.decisionNotes ? <p className="whitespace-pre-line">{r.decisionNotes}</p> : t('citizen.detail.approvedBody')}
          {r.status === 'Completed' && <p className="mt-2 text-xs">{t('certificate.readyHint')}</p>}
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <Card>
            <CardHeader title={t('citizen.detail.details')} />
            <CardBody>
              <p className="text-sm whitespace-pre-line text-slate-700">{r.description}</p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title={t('citizen.detail.documents')}
              description={t('citizen.detail.documentsCount', { count: r.attachments.length, max: ATTACHMENT_MAX_COUNT })}
            />
            <CardBody className="space-y-4">
              {fileError && (
                <Alert
                  tone="error"
                  action={
                    <button type="button" onClick={() => setFileError(null)} aria-label={t('ui.dismiss')}>
                      <X className="size-4" />
                    </button>
                  }
                >
                  {fileError}
                </Alert>
              )}
              <AttachmentList
                items={r.attachments}
                busyId={busyAttachment}
                onDownload={download}
                onDelete={r.isEditable ? setRemoving : undefined}
              />
              {canAttach && (
                <FileDropzone
                  compact
                  uploading={upload.isPending}
                  disabled={upload.isPending}
                  onReject={setFileError}
                  onFiles={(files) => {
                    setFileError(null)
                    upload.mutate(files.slice(0, ATTACHMENT_MAX_COUNT - r.attachments.length))
                  }}
                />
              )}
              {!r.isEditable && !closed && r.attachments.length > 0 && (
                <p className="text-xs text-slate-500">{t('citizen.detail.removeHint')}</p>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
        <Card className="h-fit">
          <CardHeader title={t('citizen.detail.summary')} />
          <CardBody>
            <DetailList
              columns={1}
              items={[
                { label: t('citizen.status'), value: <StatusBadge status={r.status} /> },
                { label: t('citizen.priority'), value: <PriorityBadge priority={r.priority} /> },
                { label: t('citizen.category'), value: CATEGORY[r.category] },
                { label: t('status.Submitted'), value: formatDateTime(r.submittedAt) },
                {
                  label: t('citizen.detail.targetDecision'),
                  value: r.dueAt ? (
                    <>
                      {formatDateTime(r.dueAt)}
                      {!closed && <span className="block text-xs text-slate-500">{formatRelative(r.dueAt)}</span>}
                    </>
                  ) : (
                    '—'
                  ),
                },
                ...(r.decidedAt ? [{ label: t('citizen.detail.decided'), value: formatDateTime(r.decidedAt) }] : []),
                ...(r.completedAt ? [{ label: t('status.Completed'), value: formatDateTime(r.completedAt) }] : []),
              ]}
            />
          </CardBody>
        </Card>
        {r.feeAmount > 0 && <FeeCard request={r} />}
        </div>
      </div>

      {fee.dialog}
      {editing && <EditDialog request={r} open onClose={() => setEditing(false)} />}

      <ConfirmDialog
        open={confirm === 'submit'}
        onClose={() => setConfirm(null)}
        onConfirm={() => submit.mutate()}
        loading={submit.isPending}
        title={t(r.status === 'ReturnedForInformation' ? 'citizen.detail.confirmResubmit' : 'citizen.detail.confirmSubmit')}
        description={t('citizen.detail.confirmSubmitBody')}
        confirmLabel={t(r.status === 'ReturnedForInformation' ? 'citizen.detail.resubmit' : 'citizen.detail.submit')}
      />
      <ConfirmDialog
        open={confirm === 'cancel'}
        onClose={() => setConfirm(null)}
        onConfirm={() => cancel.mutate()}
        loading={cancel.isPending}
        tone="danger"
        title={t('citizen.detail.confirmCancel')}
        description={t('citizen.detail.confirmCancelBody')}
        confirmLabel={t('citizen.detail.cancelRequest')}
      />
      <ConfirmDialog
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        onConfirm={() => removing && remove.mutate(removing)}
        loading={remove.isPending}
        tone="danger"
        title={t('citizen.detail.confirmRemove')}
        description={removing?.fileName}
        confirmLabel={t('attachments.remove')}
      />
    </>
  )
}
