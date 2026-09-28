import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Clock, FileText, Save, Send, ShieldCheck, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import { errorMessage } from '../../api/client'
import { catalogueApi, myRequestsApi } from '../../api/endpoints'
import type { RequestPriority, ServiceCatalogItem } from '../../api/types'
import { useCurrentUser } from '../../auth/AuthContext'
import { FileDropzone } from '../../components/Attachments'
import { SearchInput } from '../../components/SearchInput'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { Alert, ErrorAlert, Spinner } from '../../components/ui/Feedback'
import { Input, Select, Textarea } from '../../components/ui/Form'
import { PageHeader } from '../../components/ui/Layout'
import { useToast } from '../../components/ui/Toast'
import { keys } from '../../hooks/queries'
import { useForm } from '../../hooks/useForm'
import { t } from '../../i18n'
import { formatBytes, formatSla } from '../../lib/format'
import { CATEGORY, LEVEL, LEVEL_SHORT, PRIORITIES, PRIORITY, options } from '../../lib/labels'
import { ATTACHMENT_MAX_COUNT, maxLength, required } from '../../lib/validation'

function ServicePicker({ onPick }: { onPick: (service: ServiceCatalogItem) => void }) {
  const [search, setSearch] = useState('')
  const results = useQuery({
    queryKey: keys.catalogue({ search, pageSize: 8 }),
    queryFn: () => catalogueApi.list({ search: search || undefined, pageSize: 8 }),
  })

  return (
    <Card>
      <CardHeader title={t('citizen.newRequest.chooseService')} description={t('citizen.newRequest.chooseServiceHint')} />
      <CardBody className="space-y-3">
        <SearchInput value={search} onChange={setSearch} placeholder={t('citizen.newRequest.searchPlaceholder')} />
        {results.isLoading ? (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-lg ring-1 ring-slate-200">
            {results.data?.items.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => onPick(s)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-start hover:bg-slate-50"
                >
                  <Badge tone="brand">{s.ministryCode}</Badge>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">{s.name}</span>
                  <span className="text-xs text-slate-500">{CATEGORY[s.category]}</span>
                </button>
              </li>
            ))}
            {!results.data?.items.length && <li className="px-4 py-6 text-center text-sm text-slate-500">{t('citizen.newRequest.noServices')}</li>}
          </ul>
        )}
      </CardBody>
    </Card>
  )
}

export function NewRequestPage() {
  const user = useCurrentUser()
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const toast = useToast()
  const queryClient = useQueryClient()

  const [service, setService] = useState<ServiceCatalogItem | null>(
    (location.state as { service?: ServiceCatalogItem } | null)?.service ?? null,
  )
  const [files, setFiles] = useState<File[]>([])
  const [fileError, setFileError] = useState<string | null>(null)
  // Which button submitted the form. A ref, because the click handler runs in the same event
  // as the submit and a state update would not be visible to the submit handler yet.
  const intent = useRef<'draft' | 'submit'>('submit')
  const [pendingIntent, setPendingIntent] = useState<'draft' | 'submit'>('submit')
  const choose = (value: 'draft' | 'submit') => {
    intent.current = value
    setPendingIntent(value)
  }

  // Deep link (?service=id) without router state: find it in the catalogue.
  const lookup = useQuery({
    queryKey: ['catalogue', 'lookup', params.get('service')],
    queryFn: async () => {
      const page = await catalogueApi.list({ pageSize: 100 })
      return page.items.find((s) => s.id === params.get('service')) ?? null
    },
    enabled: !service && Boolean(params.get('service')),
  })
  const selected = service ?? lookup.data ?? null

  const form = useForm({ title: '', description: '', priority: 'Normal' }, (v) => ({
    title: required(v.title, t('citizen.title')) ?? maxLength(v.title, 200, t('citizen.title')),
    description: required(v.description, t('citizen.description')) ?? maxLength(v.description, 4000, t('citizen.description')),
  }))

  const ineligible = selected?.nativeCitizensOnly && user.nativeStatus !== 'NativeCitizen'

  const onSubmit = form.handleSubmit(async (v) => {
    if (!selected) return

    // Always create as a draft first and attach, then submit. Submitting straight away would
    // put the case in front of an officer before its documents had arrived.
    const created = await myRequestsApi.create({
      serviceDefinitionId: selected.id,
      title: v.title.trim(),
      description: v.description.trim(),
      priority: v.priority as RequestPriority,
      saveAsDraft: true,
    })

    const failed: string[] = []
    for (const file of files) {
      try {
        await myRequestsApi.uploadAttachment(created.id, file)
      } catch (error) {
        failed.push(`${file.name}: ${errorMessage(error)}`)
      }
    }

    // From here on the draft exists, so nothing may throw back into the form - a retry
    // would create a second request. Failures are reported and the user lands on the draft.
    let submitted = false
    if (intent.current === 'submit' && failed.length === 0) {
      try {
        await myRequestsApi.submit(created.id)
        submitted = true
      } catch (error) {
        failed.push(t('citizen.newRequest.submissionFailed', { error: errorMessage(error) }))
      }
    }

    queryClient.invalidateQueries({ queryKey: keys.myRequests })

    if (failed.length) {
      toast.error(t('citizen.newRequest.savedAsDraft', { ref: created.referenceNumber }), failed.join(' · '))
    } else if (submitted) {
      toast.success(t('citizen.newRequest.submittedToast'), t('citizen.newRequest.referenceToast', { ref: created.referenceNumber }))
    } else {
      toast.success(t('citizen.newRequest.draftSavedToast'), t('citizen.newRequest.draftSavedBody', { ref: created.referenceNumber }))
    }
    navigate(`/requests/${created.id}`, { replace: true })
  })

  return (
    <>
      <PageHeader
        title={t('citizen.newRequest.title')}
        description={t('citizen.newRequest.description')}
        back={{ to: '/services', label: t('nav.catalogue') }}
      />

      {!selected ? (
        lookup.isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : (
          <ServicePicker onPick={setService} />
        )
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <form onSubmit={onSubmit} noValidate className="space-y-6">
            <Card>
              <CardHeader title={t('citizen.requestDetails')} />
              <CardBody className="space-y-5">
                {ineligible && (
                  <Alert tone="error" title={t('citizen.newRequest.notAvailableTitle')}>
                    {t('citizen.newRequest.notAvailableBody', { service: selected.name })}
                  </Alert>
                )}
                <ErrorAlert error={form.formError} />
                <Input
                  label={t('citizen.title')}
                  required
                  placeholder={t('citizen.newRequest.titlePlaceholder')}
                  maxLength={200}
                  {...form.field('title')}
                />
                <Textarea
                  label={t('citizen.description')}
                  required
                  rows={7}
                  maxLength={4000}
                  hint={t('citizen.newRequest.descriptionHint', { count: form.values.description.length })}
                  {...form.field('description')}
                />
                <Select
                  label={t('citizen.priority')}
                  containerClassName="sm:max-w-xs"
                  options={options(PRIORITIES, (p) => PRIORITY[p].label)}
                  hint={t('citizen.priorityHint')}
                  {...form.field('priority')}
                />
              </CardBody>
            </Card>

            <Card>
              <CardHeader title={t('citizen.newRequest.documents')} description={t('citizen.newRequest.documentsHint')} />
              <CardBody className="space-y-3">
                {fileError && (
                  <Alert tone="error" action={<button type="button" onClick={() => setFileError(null)}><X className="size-4" /></button>}>
                    {fileError}
                  </Alert>
                )}
                <FileDropzone
                  compact
                  disabled={files.length >= ATTACHMENT_MAX_COUNT}
                  onReject={setFileError}
                  onFiles={(added) => {
                    setFileError(null)
                    setFiles((current) => [...current, ...added].slice(0, ATTACHMENT_MAX_COUNT))
                  }}
                />
                {files.length > 0 && (
                  <ul className="divide-y divide-slate-100 rounded-lg ring-1 ring-slate-200">
                    {files.map((file, index) => (
                      <li key={`${file.name}-${index}`} className="flex items-center gap-3 px-3 py-2">
                        <FileText className="size-4 text-slate-400" aria-hidden />
                        <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{file.name}</span>
                        <span className="text-xs text-slate-500">{formatBytes(file.size)}</span>
                        <button
                          type="button"
                          onClick={() => setFiles((current) => current.filter((_, i) => i !== index))}
                          className="rounded p-1 text-slate-400 hover:text-red-600"
                          aria-label={t('attachments.removeFile', { name: file.name })}
                        >
                          <X className="size-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>

            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="submit"
                variant="secondary"
                icon={Save}
                disabled={ineligible}
                loading={form.submitting && pendingIntent === 'draft'}
                onClick={() => choose('draft')}
              >
                {t('citizen.saveDraft')}
              </Button>
              <Button
                type="submit"
                icon={Send}
                disabled={ineligible}
                loading={form.submitting && pendingIntent === 'submit'}
                onClick={() => choose('submit')}
              >
                {t('citizen.submitRequest')}
              </Button>
            </div>
          </form>

          <aside className="space-y-4">
            <Card className="p-5">
              <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">{t('citizen.service')}</p>
              <h3 className="mt-1 font-semibold text-slate-900">{selected.name}</h3>
              <p className="text-sm text-slate-500">{selected.ministryName}</p>
              {selected.description && <p className="mt-3 text-sm text-slate-600">{selected.description}</p>}
              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <p className="flex items-center gap-2">
                  <Clock className="size-4 text-slate-400" aria-hidden />{' '}
                  {t('citizen.newRequest.targetDecision', { duration: formatSla(selected.slaHours) })}
                </p>
                <p className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-slate-400" aria-hidden />{' '}
                  {t('citizen.newRequest.reviewedUpTo', {
                    level: selected.requiredApprovalLevel === 'None' ? LEVEL.None : LEVEL_SHORT[selected.requiredApprovalLevel],
                  })}
                </p>
              </div>
              <Button variant="ghost" size="sm" className="mt-4 -ms-2" onClick={() => {
                  setService(null)
                  navigate('/requests/new', { replace: true })
                }}
              >
                {t('citizen.newRequest.chooseDifferent')}
              </Button>
            </Card>
            <Alert tone="info" title={t('citizen.newRequest.nextTitle')}>
              {t('citizen.newRequest.nextBody')}
            </Alert>
          </aside>
        </div>
      )}
    </>
  )
}
