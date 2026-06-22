import { describe, expect, it } from 'vitest'
import { formatCompletedSet } from '../format-completed-set'

describe('formatCompletedSet', () => {
  it('renders partial and historical set values', () => {
    expect(formatCompletedSet({ set_number: 1, reps: 12 })).toBe('Serie 1 · 12 reps')
    expect(formatCompletedSet({ set_number: 2, weight_kg: 20 })).toBe('Serie 2 · 20 kg')
    expect(formatCompletedSet({ set_number: 3, reps: 10, weight_kg: 22.5 })).toBe(
      'Serie 3 · 10 reps · 22.5 kg',
    )
  })
})
