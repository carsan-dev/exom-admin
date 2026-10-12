import { PERIOD_LABELS, PeriodSelector } from '@/components/period'
import type { UsePeriodParamResult } from '@/components/period'
import { STATS_PERIOD_OPTIONS } from './use-stats-period'

interface PeriodStatsHeaderProps {
  period: UsePeriodParamResult
  filtered?: boolean
  filterLabel?: string
}

export function PeriodStatsHeader({ period, filtered, filterLabel = 'Cliente filtrado' }: PeriodStatsHeaderProps) {
  const label = PERIOD_LABELS[period.effectivePreset]
  return (
    <div className="space-y-3">
      <PeriodSelector
        value={period.preset}
        options={STATS_PERIOD_OPTIONS}
        onChange={period.setPreset}
        custom={period.custom}
        onCustomChange={period.setCustomRange}
        error={period.error}
        range={period.range}
        previousRange={period.previousRange}
        effectivePreset={period.effectivePreset}
      />
      <div>
        <h2 className="text-sm font-semibold text-foreground">
          Resumen · {label}
          {filtered ? ` · ${filterLabel}` : ''}
        </h2>
        <p className="text-xs text-muted-foreground">
          Las tarjetas resumen el periodo{filtered ? ' y el filtro seleccionado' : ''}; el listado inferior no se filtra por periodo.
        </p>
      </div>
    </div>
  )
}
