import { describe, expect, it } from 'vitest'
import { trainingWindowFor } from './training-window'

const day = (value: string) => Date.parse(`${value}T00:00:00Z`) / 86400000

const validDate = (value: string) => {
  expect(value).toMatch(/^(?!0000)\d{4}-\d{2}-\d{2}$/)
  expect(new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10)).toBe(value)
}

describe('historic training windows', () => {
  it('returns adjacent 366-day inclusive windows across leap day in both directions', () => {
    const current = trainingWindowFor('2024-03-01', '0')
    const older = trainingWindowFor('2024-03-01', '1')
    expect(current).toMatchObject({ from: '2023-03-02', to: '2024-03-01', hasNewer: false, hasOlder: true })
    expect(day(current.to) - day(current.from)).toBe(365)
    expect(day(older.to) - day(older.from)).toBe(365)
    expect(day(current.from) - day(older.to)).toBe(1)
    expect(trainingWindowFor('2024-03-01', String(older.index - 1))).toEqual(current)
  })

  it('normalizes malformed offsets and bounds huge offsets without invalid dates or exceptions', () => {
    const current = trainingWindowFor('2024-03-01', '0')
    for (const raw of ['nope', '-1', '1.2', '']) {
      expect(trainingWindowFor('2024-03-01', raw)).toEqual(current)
    }
    for (const raw of ['9999', '999999999999999999999999999999999999']) {
      const oldest = trainingWindowFor('2024-03-01', raw)
      validDate(oldest.from)
      validDate(oldest.to)
      expect(oldest.from).toBe('0001-01-01')
      expect(oldest.hasOlder).toBe(false)
      expect(oldest.hasNewer).toBe(true)
    }
  })

  it('exposes the final partial window and disables older navigation at year 0001', () => {
    const final = trainingWindowFor('0002-02-01', '1')
    expect(final).toMatchObject({ from: '0001-01-01', to: '0001-01-31', hasOlder: false, hasNewer: true })
    validDate(final.from)
    validDate(final.to)
    expect(trainingWindowFor('0001-01-01', '0')).toMatchObject({
      from: '0001-01-01', to: '0001-01-01', hasOlder: false, hasNewer: false,
    })
  })
})
