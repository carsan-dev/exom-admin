import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getLeadingEmptyCells } from './month-grid-layout'

// Monday-first grid: Mon=0 ... Sun=6. Dates are built explicitly, never from "now".
const cases: [string, number][] = [
  ['2026-11-01', 6], // Sunday
  ['2026-11-02', 0], // Monday
  ['2026-11-03', 1], // Tuesday
  ['2026-11-07', 5], // Saturday
  ['2026-03-01', 6], // Sunday
  ['2026-06-01', 0], // Monday
]

// The defect only shows in zones east of UTC (local midnight is the previous UTC day), and CI
// runs in UTC. Pin the process zone so the test is deterministic on any machine.
describe.each(['Europe/Madrid', 'UTC', 'America/New_York', 'Pacific/Auckland'])(
  'getLeadingEmptyCells in %s',
  (zone) => {
    const previousZone = process.env.TZ

    beforeAll(() => {
      process.env.TZ = zone
    })

    afterAll(() => {
      if (previousZone === undefined) delete process.env.TZ
      else process.env.TZ = previousZone
    })

    it('applies the requested zone', () => {
      const offsetMinutes = new Date(2026, 10, 1).getTimezoneOffset()
      const expected = { 'Europe/Madrid': -60, UTC: 0, 'America/New_York': 240, 'Pacific/Auckland': -780 }[zone]
      expect(offsetMinutes).toBe(expected)
    })

    it.each(cases)('maps %s to %i leading cells', (date, expected) => {
      expect(getLeadingEmptyCells(date)).toBe(expected)
    })
  }
)
