import clsx from 'clsx'
import { X } from 'lucide-react'
import { useEffect, useRef, type FormEvent, type ReactNode } from 'react'
import { t } from '../../i18n'
import { Button } from './Button'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
  /** Renders the body as a <form>, so Enter submits and the footer can hold a submit button. */
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void
  /** Blocks Esc and backdrop dismissal while a mutation is running. */
  busy?: boolean
}

const SIZES = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' }

/**
 * Built on the native <dialog> element: showModal() provides the focus trap, the inert
 * background and Esc handling that a hand-rolled overlay would have to reimplement.
 */
export function Modal({ open, onClose, title, description, children, footer, size = 'md', onSubmit, busy }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  const body = (
    <>
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="-m-1 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label={t('ui.close')}
        >
          <X className="size-5" />
        </button>
      </div>
      {children && <div className="space-y-4 px-5 py-4">{children}</div>}
      {footer && (
        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3">
          {footer}
        </div>
      )}
    </>
  )

  return (
    <dialog
      ref={ref}
      onCancel={(event) => {
        event.preventDefault()
        if (!busy) onClose()
      }}
      onClick={(event) => {
        // A click whose target is the <dialog> itself landed on the backdrop.
        if (event.target === ref.current && !busy) onClose()
      }}
      className={clsx(
        'm-auto w-[calc(100%-2rem)] rounded-xl bg-white p-0 shadow-xl ring-1 ring-slate-200',
        'backdrop:bg-slate-900/40 backdrop:backdrop-blur-[1px] open:animate-slide-up',
        SIZES[size],
      )}
    >
      {open &&
        (onSubmit ? (
          <form
            onSubmit={(event) => {
              event.preventDefault()
              onSubmit(event)
            }}
            noValidate
          >
            {body}
          </form>
        ) : (
          body
        ))}
    </dialog>
  )
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = t('ui.confirm'),
  tone = 'primary',
  loading,
  children,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: ReactNode
  description?: ReactNode
  confirmLabel?: string
  tone?: 'primary' | 'danger' | 'success'
  loading?: boolean
  children?: ReactNode
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      busy={loading}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {t('ui.cancel')}
          </Button>
          <Button variant={tone} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Modal>
  )
}
