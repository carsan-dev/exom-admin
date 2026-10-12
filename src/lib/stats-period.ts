import type { PeriodRange } from '@/components/period'

export interface StatsPeriodParams {
  from?: string
  to?: string
}

/** Stats query params for a resolved period; `all` has no `from`. */
export function toStatsPeriodParams(range: PeriodRange): StatsPeriodParams {
  const params: StatsPeriodParams = {}
  if (range.from) params.from = range.from
  if (range.to) params.to = range.to
  return params
}

/** Drops undefined/empty values so they are not serialised as query params. */
export function cleanParams<T extends object>(params: T): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string' && value !== '') out[key] = value
  }
  return out
}
