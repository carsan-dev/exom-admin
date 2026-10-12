import { describe, expect, it } from 'vitest'
import {
  PERIOD_LABELS,
  parsePeriodPreset,
  previousPeriod,
  resolvePeriod,
  todayUtc,
  validateCustomRange,
} from './period'

const TODAY = '2026-10-12'

describe('todayUtc', () => {
  it('uses the UTC civil date, not the local one', () => {
    expect(todayUtc(new Date('2026-10-12T23:30:00-05:00'))).toBe('2026-10-13')
    expect(todayUtc(new Date('2026-10-12T00:30:00+02:00'))).toBe('2026-10-11')
  })
})

describe('labels', () => {
  it('has Spanish labels for every preset', () => {
    expect(PERIOD_LABELS['7d']).toBe('Últimos 7 días')
    expect(PERIOD_LABELS.ytd).toBe('Año actual')
    expect(PERIOD_LABELS.all).toBe('Todo el historial')
    expect(PERIOD_LABELS.prev_month).toBe('Mes anterior')
    expect(PERIOD_LABELS.custom).toBe('Personalizado')
  })
})

describe('parsePeriodPreset', () => {
  it('accepts known presets and legacy aliases', () => {
    expect(parsePeriodPreset('7d')).toBe('7d')
    expect(parsePeriodPreset('custom')).toBe('custom')
    expect(parsePeriodPreset('4w')).toBe('30d')
    expect(parsePeriodPreset('3m')).toBe('90d')
  })
  it('rejects unknown or empty values', () => {
    expect(parsePeriodPreset('foo')).toBeNull()
    expect(parsePeriodPreset('')).toBeNull()
    expect(parsePeriodPreset(null)).toBeNull()
    expect(parsePeriodPreset(undefined)).toBeNull()
    expect(parsePeriodPreset('toString')).toBeNull()
  })
})

describe('resolvePeriod', () => {
  it.each([
    ['7d', '2026-10-06'],
    ['30d', '2026-09-13'],
    ['90d', '2026-07-15'],
    ['ytd', '2026-01-01'],
    ['month', '2026-10-01'],
  ] as const)('%s ends today inclusive', (preset, from) => {
    expect(resolvePeriod(preset, {}, TODAY)).toEqual({ from, to: TODAY })
  })
  it('all has no lower bound', () => {
    expect(resolvePeriod('all', {}, TODAY)).toEqual({ from: undefined, to: TODAY })
  })
  it('prev_month is the full previous month, across year boundaries', () => {
    expect(resolvePeriod('prev_month', {}, TODAY)).toEqual({ from: '2026-09-01', to: '2026-09-30' })
    expect(resolvePeriod('prev_month', {}, '2026-01-15')).toEqual({ from: '2025-12-01', to: '2025-12-31' })
    expect(resolvePeriod('prev_month', {}, '2024-03-31')).toEqual({ from: '2024-02-01', to: '2024-02-29' })
  })
  it('custom returns the given dates', () => {
    expect(resolvePeriod('custom', { from: '2026-02-01', to: '2026-03-01' }, TODAY))
      .toEqual({ from: '2026-02-01', to: '2026-03-01' })
  })
  it('crosses month and year boundaries using UTC days', () => {
    expect(resolvePeriod('7d', {}, '2026-01-03')).toEqual({ from: '2025-12-28', to: '2026-01-03' })
    expect(resolvePeriod('30d', {}, '2026-03-29')).toEqual({ from: '2026-02-28', to: '2026-03-29' })
  })
})

describe('previousPeriod', () => {
  it('returns null for all', () => {
    expect(previousPeriod({ from: undefined, to: TODAY }, 'all')).toBeNull()
  })
  it('rolling presets use the same number of days right before from', () => {
    expect(previousPeriod({ from: '2026-10-06', to: TODAY }, '7d')).toEqual({ from: '2026-09-29', to: '2026-10-05' })
    expect(previousPeriod({ from: '2026-09-13', to: TODAY }, '30d')).toEqual({ from: '2026-08-14', to: '2026-09-12' })
    expect(previousPeriod({ from: '2026-02-01', to: '2026-02-10' }, 'custom')).toEqual({ from: '2026-01-22', to: '2026-01-31' })
  })
  it('ytd compares with the same dates of the previous year', () => {
    expect(previousPeriod({ from: '2026-01-01', to: TODAY }, 'ytd')).toEqual({ from: '2025-01-01', to: '2025-10-12' })
    expect(previousPeriod({ from: '2024-01-01', to: '2024-02-29' }, 'ytd')).toEqual({ from: '2023-01-01', to: '2023-02-28' })
  })
  it('month compares with the same day span of the previous month, clamped', () => {
    expect(previousPeriod({ from: '2026-10-01', to: TODAY }, 'month')).toEqual({ from: '2026-09-01', to: '2026-09-12' })
    expect(previousPeriod({ from: '2026-03-01', to: '2026-03-31' }, 'month')).toEqual({ from: '2026-02-01', to: '2026-02-28' })
    expect(previousPeriod({ from: '2026-01-01', to: '2026-01-05' }, 'month')).toEqual({ from: '2025-12-01', to: '2025-12-05' })
  })
  it('prev_month compares with the month before it', () => {
    expect(previousPeriod({ from: '2026-09-01', to: '2026-09-30' }, 'prev_month')).toEqual({ from: '2026-08-01', to: '2026-08-31' })
    expect(previousPeriod({ from: '2026-03-01', to: '2026-03-31' }, 'prev_month')).toEqual({ from: '2026-02-01', to: '2026-02-28' })
  })
})

describe('validateCustomRange', () => {
  it('requires both dates', () => {
    expect(validateCustomRange(undefined, TODAY, TODAY)).toMatch(/fechas/)
    expect(validateCustomRange('2026-10-01', '', TODAY)).toMatch(/fechas/)
  })
  it('rejects malformed or impossible dates', () => {
    expect(validateCustomRange('2026-02-30', '2026-03-01', TODAY)).toMatch(/válidas/)
    expect(validateCustomRange('01/02/2026', '2026-03-01', TODAY)).toMatch(/válidas/)
  })
  it('requires from <= to', () => {
    expect(validateCustomRange('2026-10-05', '2026-10-01', TODAY)).toMatch(/inicio/)
  })
  it('rejects future end dates', () => {
    expect(validateCustomRange('2026-10-01', '2026-10-13', TODAY)).toMatch(/hoy/)
  })
  it('enforces maxDays inclusively', () => {
    expect(validateCustomRange('2026-10-06', TODAY, TODAY, 7)).toBeNull()
    expect(validateCustomRange('2026-10-05', TODAY, TODAY, 7)).toMatch(/7 días/)
  })
  it('accepts a valid range', () => {
    expect(validateCustomRange(TODAY, TODAY, TODAY)).toBeNull()
  })
})
