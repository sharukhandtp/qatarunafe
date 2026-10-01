import { describe, expect, it } from 'vitest'
import { cleanCode, compact, nationalId, reason, strongPassword, validCode } from './validation'

// These mirror the API's FluentValidation rules; a drift here means the form accepts what the
// server then rejects (or the reverse).

describe('strongPassword', () => {
  it('accepts a password meeting every rule', () => {
    expect(strongPassword('Qatar#Una2026!')).toBeUndefined()
  })

  it.each([
    ['too short', 'Short1a'],
    ['no upper case', 'qatar#una2026!'],
    ['no lower case', 'QATAR#UNA2026!'],
    ['no digit', 'Qatar#Una-Portal'],
    ['empty', ''],
  ])('rejects one that is %s', (_, value) => {
    expect(strongPassword(value)).toBeTypeOf('string')
  })
})

describe('reason', () => {
  it('needs at least ten characters after trimming', () => {
    expect(reason('   too short   ')).toBeTypeOf('string')
    expect(reason('Address not registered.')).toBeUndefined()
  })

  it('caps at 2000 characters', () => {
    expect(reason('x'.repeat(2001))).toBeTypeOf('string')
  })
})

describe('authenticator codes', () => {
  it('ignores the spaces people copy along with the code', () => {
    expect(cleanCode(' 123 456 ')).toBe('123456')
    expect(validCode('123 456')).toBeUndefined()
  })

  it.each(['12345', '123456789', 'abcdef'])('rejects %s', (value) => {
    expect(validCode(value)).toBeTypeOf('string')
  })
})

describe('nationalId', () => {
  it('allows letters, digits and dashes only', () => {
    expect(nationalId('28463400123')).toBeUndefined()
    expect(nationalId('284 634')).toBeTypeOf('string')
  })
})

describe('compact', () => {
  it('drops fields without an error, so an empty object means valid', () => {
    expect(compact({ email: undefined, password: 'Required' })).toEqual({ password: 'Required' })
  })
})
