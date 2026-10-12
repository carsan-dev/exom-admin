import type { ReactNode } from 'react'
import { act, renderHook } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PeriodPreset } from './period'
import { usePeriodParam } from './use-period-param'

const OPTIONS: PeriodPreset[] = ['7d', '30d', '90d', 'all', 'custom']
const STORAGE_KEY = 'exom-admin-period:test'

function setup(initialUrl: string, options: Partial<Parameters<typeof usePeriodParam>[0]> = {}) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[initialUrl]}>{children}</MemoryRouter>
  )
  return renderHook(() => ({
    period: usePeriodParam({ section: 'test', options: OPTIONS, ...options }),
    location: useLocation(),
  }), { wrapper })
}

const params = (search: string) => new URLSearchParams(search)

describe('usePeriodParam', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-12T10:00:00Z'))
    window.localStorage.clear()
  })
  afterEach(() => {
    vi.useRealTimers()
    window.localStorage.clear()
  })

  it('uses the default preset without writing it into the URL', () => {
    const { result } = setup('/p?clientId=c1')
    expect(result.current.period.preset).toBe('30d')
    expect(result.current.period.effectivePreset).toBe('30d')
    expect(result.current.period.range).toEqual({ from: '2026-09-13', to: '2026-10-12' })
    expect(result.current.period.previousRange).toEqual({ from: '2026-08-14', to: '2026-09-12' })
    expect(result.current.location.search).toBe('?clientId=c1')
  })

  it('URL wins over storage', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ preset: '90d' }))
    const { result } = setup('/p?period=7d')
    expect(result.current.period.preset).toBe('7d')
  })

  it('treats a legacy from/to pair without period as custom, beating storage', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ preset: '90d' }))
    const { result } = setup('/p?from=2026-09-01&to=2026-09-10')
    expect(result.current.period.preset).toBe('custom')
    expect(result.current.period.range).toEqual({ from: '2026-09-01', to: '2026-09-10' })
  })

  it('does not infer custom from an invalid or partial legacy pair, or when custom is not offered', () => {
    expect(setup('/p?from=2026-09-01').result.current.period.preset).toBe('30d')
    expect(setup('/p?from=2026-02-30&to=2026-09-10').result.current.period.preset).toBe('30d')
    expect(setup('/p?from=2026-09-01&to=2026-09-10', { options: ['7d', '30d'] }).result.current.period.preset).toBe('30d')
  })

  it('uses storage when the URL has no period', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ preset: '90d' }))
    const { result } = setup('/p')
    expect(result.current.period.preset).toBe('90d')
    expect(result.current.location.search).toBe('')
  })

  it('restores a stored custom range', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ preset: 'custom', from: '2026-09-01', to: '2026-09-10' }))
    const { result } = setup('/p')
    expect(result.current.period.preset).toBe('custom')
    expect(result.current.period.range).toEqual({ from: '2026-09-01', to: '2026-09-10' })
  })

  it.each([
    ['not json', '{oops'],
    ['preset outside options', JSON.stringify({ preset: 'ytd' })],
    ['unknown preset', JSON.stringify({ preset: 'forever' })],
    ['wrong shape', JSON.stringify(['7d'])],
  ])('ignores invalid stored values (%s)', (_, value) => {
    window.localStorage.setItem(STORAGE_KEY, value)
    const { result } = setup('/p')
    expect(result.current.period.preset).toBe('30d')
  })

  it('survives a throwing localStorage', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
    const setSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    const { result } = setup('/p')
    expect(result.current.period.preset).toBe('30d')
    act(() => result.current.period.setPreset('7d'))
    expect(result.current.period.preset).toBe('7d')
    spy.mockRestore()
    setSpy.mockRestore()
  })

  it('maps legacy URL aliases', () => {
    expect(setup('/p?period=4w').result.current.period.preset).toBe('30d')
    expect(setup('/p?period=3m').result.current.period.preset).toBe('90d')
  })

  it('falls back when the URL period is not an allowed option', () => {
    const { result } = setup('/p?period=ytd')
    expect(result.current.period.preset).toBe('30d')
  })

  it('setPreset preserves other params, drops from/to and writes storage', () => {
    const { result } = setup('/p?clientId=c1&period=custom&from=2026-09-01&to=2026-09-10&tab=metrics')
    act(() => result.current.period.setPreset('7d'))
    const search = params(result.current.location.search)
    expect(search.get('period')).toBe('7d')
    expect(search.get('clientId')).toBe('c1')
    expect(search.get('tab')).toBe('metrics')
    expect(search.has('from')).toBe(false)
    expect(search.has('to')).toBe(false)
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null')).toEqual({ preset: '7d' })
  })

  it('setPreset("custom") seeds from/to with the current range', () => {
    const { result } = setup('/p?period=7d')
    act(() => result.current.period.setPreset('custom'))
    const search = params(result.current.location.search)
    expect(search.get('from')).toBe('2026-10-06')
    expect(search.get('to')).toBe('2026-10-12')
    expect(result.current.period.error).toBeNull()
  })

  it('setCustomRange writes URL and storage', () => {
    const { result } = setup('/p?x=1')
    act(() => result.current.period.setCustomRange({ from: '2026-09-01', to: '2026-09-10' }))
    const search = params(result.current.location.search)
    expect(search.get('period')).toBe('custom')
    expect(search.get('from')).toBe('2026-09-01')
    expect(search.get('to')).toBe('2026-09-10')
    expect(search.get('x')).toBe('1')
    expect(result.current.period.range).toEqual({ from: '2026-09-01', to: '2026-09-10' })
    expect(result.current.period.previousRange).toEqual({ from: '2026-08-22', to: '2026-08-31' })
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null'))
      .toEqual({ preset: 'custom', from: '2026-09-01', to: '2026-09-10' })
  })

  it('invalid custom range reports an error and keeps the last valid range', () => {
    const { result } = setup('/p?period=7d')
    act(() => result.current.period.setCustomRange({ from: '2026-10-10', to: '2026-10-01' }))
    expect(result.current.period.error).toMatch(/inicio/)
    expect(result.current.period.preset).toBe('custom')
    expect(result.current.period.effectivePreset).toBe('7d')
    expect(result.current.period.range).toEqual({ from: '2026-10-06', to: '2026-10-12' })
    expect(result.current.period.previousRange).toEqual({ from: '2026-09-29', to: '2026-10-05' })
  })

  it('invalid custom URL on mount falls back to the default range', () => {
    const { result } = setup('/p?period=custom&from=2026-10-01&to=2026-10-20')
    expect(result.current.period.error).toMatch(/hoy/)
    expect(result.current.period.preset).toBe('custom')
    expect(result.current.period.effectivePreset).toBe('30d')
    expect(result.current.period.range).toEqual({ from: '2026-09-13', to: '2026-10-12' })
  })

  it('enforces maxDays', () => {
    const { result } = setup('/p?period=custom&from=2026-01-01&to=2026-10-12', { maxDays: 90 })
    expect(result.current.period.error).toMatch(/90 días/)
  })

  it('supports custom keys', () => {
    const keys = { period: 'adherence_period', from: 'adherence_start', to: 'adherence_end' }
    const { result } = setup('/p?period=7d&adherence_period=custom&adherence_start=2026-09-01&adherence_end=2026-09-05', { keys })
    expect(result.current.period.preset).toBe('custom')
    expect(result.current.period.custom).toEqual({ from: '2026-09-01', to: '2026-09-05' })
    act(() => result.current.period.setPreset('90d'))
    const search = params(result.current.location.search)
    expect(search.get('adherence_period')).toBe('90d')
    expect(search.has('adherence_start')).toBe(false)
    expect(search.get('period')).toBe('7d')
  })
})
