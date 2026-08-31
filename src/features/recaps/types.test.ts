import { describe, expect, it } from 'vitest'
import { formatAverageDailySteps } from './types'

describe('formatAverageDailySteps', () => {
  it.each([null, undefined])('handles missing value %s', (value) => {
    expect(formatAverageDailySteps(value)).toBe('No indicado')
  })

  it('formats steps with an optional unit', () => {
    expect(formatAverageDailySteps(12345)).toBe('12.345')
    expect(formatAverageDailySteps(12345, true)).toBe('12.345 pasos/día')
  })
})
