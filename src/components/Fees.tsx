import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CreditCard, FlaskConical, Receipt } from 'lucide-react'
import { useState } from 'react'
import { errorMessage } from '../api/client'
import { myRequestsApi, paymentsApi } from '../api/endpoints'
import type { CitizenRequestDetail, Payment, PaymentStatus } from '../api/types'
import { keys } from '../hooks/queries'
import { t } from '../i18n'
import { isFeeOutstanding, isSimulatorCheckout } from '../lib/fees'
import { formatDateTime, formatMoney } from '../lib/format'
import type { Tone } from '../lib/labels'
import { Badge } from './ui/Badge'
import { Button } from './ui/Button'
import { Card, CardBody, CardHeader } from './ui/Card'
import { Alert, Spinner } from './ui/Feedback'
import { Modal } from './ui/Modal'
import { useToast } from './ui/Toast'

const PAYMENT_TONE: Record<PaymentStatus, Tone> = { Pending: 'amber', Succeeded: 'green', Failed: 'red' }

/** Starting a payment, and the simulated checkout when that is what the API is using. */
export function useFeePayment(requestId: string) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [simulating, setSimulating] = useState<Payment | null>(null)

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: keys.myRequests })
  }

  const start = useMutation({
    mutationFn: () => myRequestsApi.startPayment(requestId),
    onSuccess: (payment) => {
      refresh()
      if (!payment.checkoutUrl) {
        toast.error(t('fee.noCheckout'))
      } else if (isSimulatorCheckout(payment.checkoutUrl)) {
        setSimulating(payment)
      } else {
        window.location.assign(payment.checkoutUrl)
      }
    },
    onError: (e) => toast.error(t('fee.startFailed'), errorMessage(e)),
  })

  const simulate = useMutation({
    mutationFn: ({ payment, succeed }: { payment: Payment; succeed: boolean }) =>
      paymentsApi.simulate(payment.id, succeed),
    onSuccess: (payment) => {
      setSimulating(null)
      refresh()
      if (payment.status === 'Succeeded') toast.success(t('fee.paidToast'), t('fee.paidToastBody'))
      else toast.error(t('fee.declinedToast'), payment.failureReason)
    },
    onError: (e) => toast.error(t('fee.simulateFailed'), errorMessage(e)),
  })

  const dialog = (
    <Modal
      open={Boolean(simulating)}
      onClose={() => setSimulating(null)}
      busy={simulate.isPending}
      size="sm"
      title={t('fee.simulatorTitle')}
      description={simulating && formatMoney(simulating.amount, simulating.currency)}
      footer={
        simulating && (
          <>
            <Button
              variant="secondary"
              disabled={simulate.isPending}
              loading={simulate.isPending && simulate.variables?.succeed === false}
              onClick={() => simulate.mutate({ payment: simulating, succeed: false })}
            >
              {t('fee.simulateDecline')}
            </Button>
            <Button
              icon={CreditCard}
              disabled={simulate.isPending}
              loading={simulate.isPending && simulate.variables?.succeed === true}
              onClick={() => simulate.mutate({ payment: simulating, succeed: true })}
            >
              {t('fee.simulatePay')}
            </Button>
          </>
        )
      }
    >
      <Alert tone="warning" title={t('fee.simulatorNoticeTitle')}>
        <span className="inline-flex items-start gap-1.5">
          <FlaskConical className="mt-0.5 size-4 shrink-0" aria-hidden />
          {t('fee.simulatorNotice')}
        </span>
      </Alert>
    </Modal>
  )

  return { pay: () => start.mutate(), starting: start.isPending, dialog }
}

/** Amount, whether it is paid, and every attempt so far. */
export function FeeCard({ request }: { request: CitizenRequestDetail }) {
  const payments = useQuery({
    queryKey: keys.payments(request.id),
    queryFn: () => myRequestsApi.payments(request.id),
  })
  const outstanding = isFeeOutstanding(request)

  return (
    <Card className="h-fit">
      <CardHeader
        title={
          <span className="inline-flex items-center gap-2">
            <Receipt className="size-4 text-slate-400" aria-hidden /> {t('fee.title')}
          </span>
        }
        actions={
          <Badge tone={outstanding ? 'amber' : 'green'} dot>
            {outstanding ? t('fee.unpaid') : t('fee.paid')}
          </Badge>
        }
      />
      <CardBody className="space-y-3">
        <p className="text-2xl font-semibold text-slate-900 tabular-nums">{formatMoney(request.feeAmount)}</p>
        {request.feePaidAt && (
          <p className="text-sm text-slate-500">{t('fee.paidOn', { date: formatDateTime(request.feePaidAt) })}</p>
        )}
        {payments.isLoading ? (
          <Spinner />
        ) : (
          !!payments.data?.length && (
            <div>
              <p className="mb-1.5 text-xs font-medium tracking-wide text-slate-500 uppercase">{t('fee.attempts')}</p>
              <ul className="divide-y divide-slate-100 rounded-lg text-sm ring-1 ring-slate-200">
                {payments.data.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2">
                    <span className="min-w-0">
                      <span className="block text-slate-700">{formatDateTime(p.createdAt)}</span>
                      {p.failureReason && <span className="block text-xs text-red-600">{p.failureReason}</span>}
                    </span>
                    <Badge tone={PAYMENT_TONE[p.status]}>{t(`fee.status.${p.status}`)}</Badge>
                  </li>
                ))}
              </ul>
            </div>
          )
        )}
      </CardBody>
    </Card>
  )
}
