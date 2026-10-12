import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { UsePeriodParamResult } from '@/components/period'
import { PeriodStatsHeader } from './period-stats-header'

describe('PeriodStatsHeader', () => {
  it('describes the range actually shown when the custom range is invalid', () => {
    const period: UsePeriodParamResult = {
      preset: 'custom', effectivePreset: '30d', setPreset: () => undefined, custom: { from: '2026-10-10', to: '2026-10-01' },
      setCustomRange: () => undefined, range: { from: '2026-09-13', to: '2026-10-12' },
      previousRange: { from: '2026-08-14', to: '2026-09-12' }, error: 'La fecha de inicio no puede ser posterior al fin.',
    }
    render(<PeriodStatsHeader period={period} />)
    expect(screen.getByRole('heading', { name: /Resumen · Últimos 30 días/ })).toBeInTheDocument()
    expect(screen.queryByText(/Personalizado/, { selector: 'h2' })).not.toBeInTheDocument()
  })
})
