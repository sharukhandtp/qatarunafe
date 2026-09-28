import clsx from 'clsx'
import { Download, FileImage, FileText, Paperclip, Trash2, Upload } from 'lucide-react'
import { useRef, useState, type DragEvent } from 'react'
import { t } from '../i18n'
import { formatBytes, formatDateTime } from '../lib/format'
import { ATTACHMENT_ACCEPT, attachment as validateAttachment } from '../lib/validation'
import { Spinner } from './ui/Feedback'

export interface AttachmentRow {
  id: string
  fileName: string
  contentType: string
  sizeBytes: number
  uploadedAt: string
}

function FileIcon({ type }: { type: string }) {
  const Icon = type.startsWith('image/') ? FileImage : FileText
  return (
    <div className="rounded-lg bg-slate-100 p-2 text-slate-500">
      <Icon className="size-4" aria-hidden />
    </div>
  )
}

export function AttachmentList({
  items,
  onDownload,
  onDelete,
  busyId,
}: {
  items: AttachmentRow[]
  onDownload: (item: AttachmentRow) => void
  onDelete?: (item: AttachmentRow) => void
  busyId?: string | null
}) {
  if (!items.length) {
    return (
      <p className="flex items-center gap-2 py-2 text-sm text-slate-500">
        <Paperclip className="size-4" aria-hidden /> {t('attachments.none')}
      </p>
    )
  }

  return (
    <ul className="divide-y divide-slate-100">
      {items.map((item) => (
        <li key={item.id} className="flex items-center gap-3 py-2.5">
          <FileIcon type={item.contentType} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-800" title={item.fileName}>
              {item.fileName}
            </p>
            <p className="text-xs text-slate-500">
              {formatBytes(item.sizeBytes)} · {formatDateTime(item.uploadedAt)}
            </p>
          </div>
          {busyId === item.id ? (
            <Spinner className="size-4" />
          ) : (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onDownload(item)}
                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                title={t('attachments.download')}
                aria-label={t('attachments.downloadFile', { name: item.fileName })}
              >
                <Download className="size-4" />
              </button>
              {onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(item)}
                  className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"
                  title={t('attachments.remove')}
                  aria-label={t('attachments.removeFile', { name: item.fileName })}
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}

/** Drop zone that validates type and size locally before anything is sent. */
export function FileDropzone({
  onFiles,
  onReject,
  disabled,
  uploading,
  compact,
}: {
  onFiles: (files: File[]) => void
  onReject: (message: string) => void
  disabled?: boolean
  uploading?: boolean
  compact?: boolean
}) {
  const input = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const accept = (list: FileList | null) => {
    if (!list?.length) return
    const good: File[] = []
    for (const file of Array.from(list)) {
      const problem = validateAttachment(file)
      if (problem) onReject(problem)
      else good.push(file)
    }
    if (good.length) onFiles(good)
  }

  const onDrop = (event: DragEvent) => {
    event.preventDefault()
    setDragging(false)
    if (!disabled) accept(event.dataTransfer.files)
  }

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault()
        if (!disabled) setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={clsx(
        'flex flex-col items-center justify-center rounded-lg border-2 border-dashed text-center transition',
        compact ? 'gap-1 px-4 py-4' : 'gap-2 px-6 py-8',
        dragging ? 'border-brand-500 bg-brand-50' : 'border-slate-300 bg-slate-50/50',
        disabled && 'opacity-60',
      )}
    >
      {uploading ? <Spinner className="size-6" /> : <Upload className="size-6 text-slate-400" aria-hidden />}
      <p className="text-sm text-slate-600">
        <button
          type="button"
          disabled={disabled}
          onClick={() => input.current?.click()}
          className="font-medium text-brand-700 hover:text-brand-800 disabled:cursor-not-allowed"
        >
          {t('attachments.chooseFiles')}
        </button>{' '}
        {t('attachments.orDrag')}
      </p>
      <p className="text-xs text-slate-500">{t('attachments.accepted')}</p>
      <input
        ref={input}
        type="file"
        multiple
        accept={ATTACHMENT_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          accept(event.target.files)
          event.target.value = ''
        }}
      />
    </div>
  )
}
