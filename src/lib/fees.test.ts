import { describe, expect, it } from 'vitest'
import { isFeeOutstanding, isSimulatorCheckout } from './fees'

describe('isFeeOutstanding', () => {
  it('is true only for a charged, unpaid fee', () => {
    expect(isFeeOutstanding({ feeAmount: 150, feePaidAt: undefined })).toBe(true)
    expect(isFeeOutstanding({ feeAmount: 150, feePaidAt: '2026-10-01T10:00:00Z' })).toBe(false)
    expect(isFeeOutstanding({ feeAmount: 0, feePaidAt: undefined })).toBe(false)
  })
})

describe('isSimulatorCheckout', () => {
  it('tells the development gateway apart from a real hosted checkout', () => {
    expect(isSimulatorCheckout('/api/v1/payments/7/simulate')).toBe(true)
    expect(isSimulatorCheckout('https://checkout.example-gateway.com/session/abc')).toBe(false)
  })
})
