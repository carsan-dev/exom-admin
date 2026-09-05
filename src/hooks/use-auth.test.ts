import { describe, expect, it } from 'vitest'
import { classifySessionValidationError } from '@/lib/auth-session-validation'

function axiosError(status?: number): unknown {
  return {
    isAxiosError: true,
    response: status === undefined ? undefined : { status },
  }
}

describe('classifySessionValidationError', () => {
  it.each([401, 403])('classifies %s as a rejected session', (status) => {
    expect(classifySessionValidationError(axiosError(status))).toBe('rejected')
  })

  it('classifies 423 as a locked account', () => {
    expect(classifySessionValidationError(axiosError(423))).toBe('locked')
    expect(classifySessionValidationError({ name: 'ACCOUNT_BLOCKED' })).toBe('locked')
  })

  it.each([undefined, 500, 503])('classifies network and %s responses as temporary', (status) => {
    expect(classifySessionValidationError(axiosError(status))).toBe('temporary')
  })
})
