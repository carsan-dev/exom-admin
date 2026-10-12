import { useCallback, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import {
  type CustomRange,
  type PeriodPreset,
  type PeriodRange,
  isCivilDate,
  parsePeriodPreset,
  previousPeriod,
  resolvePeriod,
  todayUtc,
  validateCustomRange,
} from './period'

export interface PeriodParamKeys {
  period: string
  from: string
  to: string
}

export interface UsePeriodParamOptions {
  /** Storage namespace: `exom-admin-period:<section>`. */
  section: string
  options: readonly PeriodPreset[]
  defaultPreset?: PeriodPreset
  keys?: PeriodParamKeys
  maxDays?: number
}

export interface UsePeriodParamResult {
  /** What the selector shows (may be an invalid `custom`). */
  preset: PeriodPreset
  /** The preset whose range is actually returned in `range`; use it to describe the data. */
  effectivePreset: PeriodPreset
  setPreset: (preset: PeriodPreset) => void
  custom: CustomRange
  setCustomRange: (range: CustomRange) => void
  range: PeriodRange
  previousRange: PeriodRange | null
  error: string | null
}

interface StoredPeriod {
  preset: PeriodPreset
  from?: string
  to?: string
}

const DEFAULT_KEYS: PeriodParamKeys = { period: 'period', from: 'from', to: 'to' }
const storageKey = (section: string) => `exom-admin-period:${section}`

function readStored(section: string, options: readonly PeriodPreset[]): StoredPeriod | null {
  let raw: string | null
  try {
    raw = window.localStorage.getItem(storageKey(section))
  } catch {
    return null
  }
  if (!raw) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null
  const record: Record<string, unknown> = { ...parsed }
  const preset = typeof record.preset === 'string' ? parsePeriodPreset(record.preset) : null
  if (!preset || !options.includes(preset)) return null
  if (preset !== 'custom') return { preset }
  const { from, to } = record
  return {
    preset,
    from: typeof from === 'string' && isCivilDate(from) ? from : undefined,
    to: typeof to === 'string' && isCivilDate(to) ? to : undefined,
  }
}

function writeStored(section: string, value: StoredPeriod) {
  try {
    window.localStorage.setItem(storageKey(section), JSON.stringify(value))
  } catch {
    // Storage is a convenience only; the URL remains the source of truth.
  }
}

export function usePeriodParam({
  section,
  options,
  defaultPreset = '30d',
  keys = DEFAULT_KEYS,
  maxDays,
}: UsePeriodParamOptions): UsePeriodParamResult {
  const [searchParams, setSearchParams] = useSearchParams()
  // Read storage once per mount; afterwards every change is reflected in the URL.
  const [stored] = useState(() => readStored(section, options))
  const [lastValid, setLastValid] = useState<{ preset: PeriodPreset; range: PeriodRange } | null>(null)
  const today = todayUtc()

  const urlPreset = parsePeriodPreset(searchParams.get(keys.period))
  const urlFrom = searchParams.get(keys.from)
  const urlTo = searchParams.get(keys.to)
  // Old links carried only the date pair; treat a valid pair as a custom period.
  const legacyCustom = !searchParams.has(keys.period) && options.includes('custom')
    && urlFrom !== null && urlTo !== null && isCivilDate(urlFrom) && isCivilDate(urlTo)
  const fromUrl = legacyCustom || (urlPreset !== null && options.includes(urlPreset))
  const preset: PeriodPreset = legacyCustom ? 'custom' : fromUrl && urlPreset ? urlPreset : stored?.preset ?? defaultPreset
  const customFrom = fromUrl ? urlFrom ?? undefined : stored?.from
  const customTo = fromUrl ? urlTo ?? undefined : stored?.to
  const custom = useMemo<CustomRange>(() => ({ from: customFrom, to: customTo }), [customFrom, customTo])

  const error = preset === 'custom' ? validateCustomRange(custom.from, custom.to, today, maxDays) : null
  const effective = useMemo(() => {
    if (!error) return { preset, range: resolvePeriod(preset, custom, today) }
    return lastValid ?? { preset: defaultPreset, range: resolvePeriod(defaultPreset, {}, today) }
  }, [error, preset, custom, today, lastValid, defaultPreset])
  const previousRange = useMemo(() => previousPeriod(effective.range, effective.preset), [effective])

  const write = useCallback((next: StoredPeriod) => {
    if (!error) setLastValid(effective)
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev)
      params.set(keys.period, next.preset)
      if (next.preset === 'custom' && next.from) params.set(keys.from, next.from)
      else params.delete(keys.from)
      if (next.preset === 'custom' && next.to) params.set(keys.to, next.to)
      else params.delete(keys.to)
      return params
    }, { replace: true })
    writeStored(section, next)
  }, [error, effective, setSearchParams, keys.period, keys.from, keys.to, section])

  const setPreset = useCallback((next: PeriodPreset) => {
    if (next !== 'custom') return write({ preset: next })
    // Seed a new custom period with the range currently shown so it starts valid.
    const seedFrom = preset === 'custom' ? custom.from : effective.range.from ?? effective.range.to
    const seedTo = preset === 'custom' ? custom.to : effective.range.to
    write({ preset: 'custom', from: seedFrom, to: seedTo })
  }, [write, preset, custom, effective])

  const setCustomRange = useCallback((next: CustomRange) => {
    write({ preset: 'custom', from: next.from || undefined, to: next.to || undefined })
  }, [write])

  return { preset, effectivePreset: effective.preset, setPreset, custom, setCustomRange, range: effective.range, previousRange, error }
}
