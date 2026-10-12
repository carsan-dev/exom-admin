import { usePeriodParam } from '@/components/period'
import type { PeriodPreset, UsePeriodParamResult } from '@/components/period'
import { toStatsPeriodParams, type StatsPeriodParams } from '@/lib/stats-period'

export const STATS_PERIOD_OPTIONS: readonly PeriodPreset[] = ['7d', '30d', '90d', 'ytd', 'all', 'custom']

/** Period state for a section's stat cards; uses dedicated URL keys so list params are untouched. */
export function useStatsPeriod(section: 'feedback' | 'recaps' | 'notifications'): UsePeriodParamResult & {
  params: StatsPeriodParams
} {
  const period = usePeriodParam({
    section: `${section}-stats`,
    options: STATS_PERIOD_OPTIONS,
    defaultPreset: '30d',
    keys: { period: 'stats_period', from: 'stats_from', to: 'stats_to' },
  })
  return { ...period, params: toStatsPeriodParams(period.range) }
}
