import { describe, expect, it } from 'vitest'
import { calculateYAxisScale } from './chart-scale-utils'

describe('calculateYAxisScale', () => {
  it('uses a useful automatic scale for a small weight range', () => {
    expect(calculateYAxisScale([72, 74], 'auto', 1)).toEqual({
      domain: [71, 75],
      ticks: [71, 72, 73, 74, 75],
    })
  })

  it('uses half-hour precision for sleep values', () => {
    expect(calculateYAxisScale([6.5, 7], 'auto', 0.5)).toEqual({
      domain: [5.5, 7.5],
      ticks: [5.5, 6, 6.5, 7, 7.5],
    })
  })

  it('centers a single value with enough context', () => {
    expect(calculateYAxisScale([80], 'auto', 1)).toEqual({
      domain: [78, 82],
      ticks: [78, 79, 80, 81, 82],
    })
  })

  it('honors a manual step', () => {
    expect(calculateYAxisScale([72, 81], '5', 1)).toEqual({
      domain: [65, 90],
      ticks: [65, 70, 75, 80, 85, 90],
    })
  })

  it('returns undefined without data', () => {
    expect(calculateYAxisScale([null, undefined], 'auto', 1)).toBeUndefined()
  })
})
