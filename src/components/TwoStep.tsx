import QRCode from 'qrcode'
import { Copy, Smartphone } from 'lucide-react'
import { useEffect, useState, type InputHTMLAttributes } from 'react'
import type { MfaEnrollment } from '../api/types'
import { t } from '../i18n'
import { Spinner } from './ui/Feedback'
import { Input } from './ui/Form'

/** Draws a QR code locally; the secret inside it never leaves the browser. */
export function QrCode({ value, size = 184 }: { value: string; size?: number }) {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    QRCode.toDataURL(value, { width: size, margin: 1, errorCorrectionLevel: 'M' })
      .then((url) => live && setSrc(url))
      .catch(() => live && setSrc(null))
    return () => {
      live = false
    }
  }, [value, size])

  return (
    <div
      className="flex items-center justify-center rounded-lg bg-white p-2 ring-1 ring-slate-200"
      style={{ width: size + 16, height: size + 16 }}
    >
      {src ? <img src={src} width={size} height={size} alt={t('mfa.qrAlt')} /> : <Spinner />}
    </div>
  )
}

/** "JBSW Y3DP EHPK 3PXP" - easier to type from a screen than one long run. */
const groupSecret = (secret: string) => secret.replace(/(.{4})/g, '$1 ').trim()

/** The authenticator set-up: scan the code, or type the key by hand. */
export function EnrollmentPanel({ enrollment }: { enrollment: MfaEnrollment }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(enrollment.secret)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard blocked; the key is on screen to type.
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
      <QrCode value={enrollment.otpAuthUri} />
      <div className="min-w-0 flex-1 space-y-3 text-sm text-slate-600">
        <p className="flex items-start gap-2">
          <Smartphone className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden />
          {t('mfa.scanInstructions')}
        </p>
        <div>
          <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">{t('mfa.manualKey')}</p>
          <div className="mt-1 flex items-center gap-2">
            <code dir="ltr" className="rounded bg-slate-100 px-2 py-1 font-mono text-xs break-all text-slate-800">
              {groupSecret(enrollment.secret)}
            </code>
            <button
              type="button"
              onClick={copy}
              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label={t('mfa.copyKey')}
              title={copied ? t('mfa.copied') : t('mfa.copyKey')}
            >
              <Copy className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Six-digit code field: numeric keyboard on phones, and the OS can offer the code itself. */
export function CodeInput(props: InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string; hint?: string }) {
  return (
    <Input
      label={t('mfa.codeLabel')}
      inputMode="numeric"
      autoComplete="one-time-code"
      pattern="[0-9]*"
      maxLength={8}
      dir="ltr"
      placeholder="123456"
      className="font-mono tracking-[0.3em]"
      {...props}
    />
  )
}
