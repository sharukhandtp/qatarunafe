import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { ministriesApi } from '../../api/endpoints'
import type { Ministry } from '../../api/types'
import { Button } from '../../components/ui/Button'
import { ErrorAlert } from '../../components/ui/Feedback'
import { Input, Textarea } from '../../components/ui/Form'
import { Modal } from '../../components/ui/Modal'
import { useToast } from '../../components/ui/Toast'
import { keys } from '../../hooks/queries'
import { useForm } from '../../hooks/useForm'
import { t } from '../../i18n'
import { code, maxLength, optionalEmail, required } from '../../lib/validation'

/** Create (no `ministry`) or edit a ministry. The code is immutable once created. */
export function MinistryFormDialog({ ministry, onClose }: { ministry?: Ministry; onClose: () => void }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const navigate = useNavigate()
  const editing = Boolean(ministry)

  const form = useForm(
    {
      code: ministry?.code ?? '',
      name: ministry?.name ?? '',
      nameArabic: ministry?.nameArabic ?? '',
      description: ministry?.description ?? '',
      contactEmail: ministry?.contactEmail ?? '',
      contactPhone: ministry?.contactPhone ?? '',
    },
    (v) => ({
      code: editing ? undefined : code(v.code, t('admin.field.code')),
      name: required(v.name, t('admin.field.name')) ?? maxLength(v.name, 200, t('admin.field.name')),
      nameArabic: maxLength(v.nameArabic, 200, t('admin.field.arabicName')),
      description: maxLength(v.description, 1000, t('admin.field.description')),
      contactEmail: optionalEmail(v.contactEmail),
      contactPhone: maxLength(v.contactPhone, 32, t('admin.field.contactPhone')),
    }),
  )

  const onSubmit = form.handleSubmit(async (v) => {
    const body = {
      name: v.name.trim(),
      nameArabic: v.nameArabic.trim() || undefined,
      description: v.description.trim() || undefined,
      contactEmail: v.contactEmail.trim() || undefined,
      contactPhone: v.contactPhone.trim() || undefined,
    }
    if (ministry) {
      await ministriesApi.update(ministry.id, body)
      toast.success(t('admin.ministryForm.updated'))
    } else {
      const { id } = await ministriesApi.create({ code: v.code.trim().toUpperCase(), ...body })
      toast.success(t('admin.ministryForm.created'), t('admin.ministryForm.createdDetail'))
      navigate(`/admin/ministries/${id}`)
    }
    await queryClient.invalidateQueries({ queryKey: keys.ministries })
    onClose()
  })

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? t('admin.editCode', { code: ministry!.code }) : t('admin.ministries.new')}
      size="lg"
      busy={form.submitting}
      onSubmit={onSubmit}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={form.submitting}>
            {t('ui.cancel')}
          </Button>
          <Button type="submit" loading={form.submitting}>
            {editing ? t('admin.saveChanges') : t('admin.ministryForm.submit')}
          </Button>
        </>
      }
    >
      <ErrorAlert error={form.formError} />
      <div className="grid gap-4 sm:grid-cols-[160px_minmax(0,1fr)]">
        <Input
          label={t('admin.field.code')}
          required={!editing}
          disabled={editing}
          placeholder="WATER"
          dir="ltr"
          hint={editing ? t('admin.ministryForm.codeLocked') : t('admin.ministryForm.codeHint')}
          className="uppercase"
          {...form.field('code')}
        />
        <Input label={t('admin.field.name')} required {...form.field('name')} />
      </div>
      <Input label={t('admin.field.arabicName')} dir="rtl" lang="ar" {...form.field('nameArabic')} />
      <Textarea label={t('admin.field.description')} rows={3} maxLength={1000} {...form.field('description')} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label={t('admin.field.contactEmail')} type="email" dir="ltr" {...form.field('contactEmail')} />
        <Input label={t('admin.field.contactPhone')} type="tel" dir="ltr" {...form.field('contactPhone')} />
      </div>
    </Modal>
  )
}
