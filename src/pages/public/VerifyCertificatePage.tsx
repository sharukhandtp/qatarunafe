import { useQuery } from '@tanstack/react-query'
import { BadgeCheck, Search, ShieldX } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ApiError } from '../../api/client'
import { certificatesApi } from '../../api/endpoints'
import { AuthLayout } from '../../components/layout/AuthLayout'
import { Button } from '../../components/ui/Button'
import { DetailList } from '../../components/ui/Card'
import { Alert, ErrorAlert, Spinner } from '../../components/ui/Feedback'
import { Input } from '../../components/ui/Form'
import { t } from '../../i18n'
import { formatDateTime } from '../../lib/format'

/**
 * Public check that a certificate is genuine - the address in its QR code when the API's
 * Certificates:VerificationBaseUrl points here. No sign-in: whoever holds the paper (a
 * landlord, an employer) is not a portal user.
 */
export function VerifyCertificatePage() {
  const { code = '' } = useParams()
  const navigate = useNavigate()
  const [typed, setTyped] = useState(code)

  const result = useQuery({
    queryKey: ['certificate-verification', code],
    queryFn: () => certificatesApi.verify(code),
    enabled: Boolean(code),
    retry: false,
  })

  const notFound = result.error instanceof ApiError && result.error.status === 404

  return (
    <AuthLayout title={t('verify.title')} subtitle={t('verify.subtitle')}>
      <div className="space-y-5">
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (typed.trim()) navigate(`/verify/${encodeURIComponent(typed.trim())}`)
          }}
        >
          <Input
            label={t('verify.codeLabel')}
            containerClassName="flex-1"
            dir="ltr"
            className="font-mono"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
          />
          <Button type="submit" icon={Search}>
            {t('verify.check')}
          </Button>
        </form>

        {code && result.isLoading && (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        )}

        {notFound && (
          <Alert tone="error" title={t('verify.notFoundTitle')}>
            <span className="inline-flex items-center gap-1.5">
              <ShieldX className="size-4" aria-hidden />
              {t('verify.notFoundBody')}
            </span>
          </Alert>
        )}
        {!notFound && <ErrorAlert error={result.error} />}

        {result.data && (
          <div className="space-y-4 rounded-xl bg-emerald-50/60 p-5 ring-1 ring-emerald-200">
            <p className="flex items-center gap-2 font-semibold text-emerald-800">
              <BadgeCheck className="size-5" aria-hidden />
              {t('verify.genuine')}
            </p>
            <DetailList
              items={[
                { label: t('verify.number'), value: <span className="font-mono">{result.data.number}</span> },
                { label: t('verify.reference'), value: <span className="font-mono">{result.data.referenceNumber}</span> },
                { label: t('verify.holder'), value: result.data.holderName },
                { label: t('verify.issued'), value: formatDateTime(result.data.issuedAt) },
                { label: t('verify.service'), value: result.data.serviceName, wide: true },
                { label: t('verify.ministry'), value: result.data.ministryName, wide: true },
              ]}
            />
            <p className="text-xs text-slate-500">{t('verify.compareHint')}</p>
          </div>
        )}

        <p className="text-sm">
          <Link to="/login" className="font-medium text-brand-700 hover:text-brand-800">
            {t('nid.backToSignIn')}
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}
