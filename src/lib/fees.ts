import type { CitizenRequestDetail } from '../api/types'

/** A fee is charged and not yet paid: the API refuses to submit the request until it is. */
export const isFeeOutstanding = (r: Pick<CitizenRequestDetail, 'feeAmount' | 'feePaidAt'>) =>
  r.feeAmount > 0 && !r.feePaidAt

/**
 * The development gateway's "checkout page" is an API path, not a page to send the browser
 * to. A real provider returns an absolute https address of its hosted checkout.
 */
export const isSimulatorCheckout = (url: string) => url.startsWith('/') || url.endsWith('/simulate')
