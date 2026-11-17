import { FigureStrip } from '@/components/page'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { AchievementSummary } from '../types'
import { CRITERIA_TYPE_LABELS } from '../types'

interface AchievementsStatsCardsProps {
  summary?: AchievementSummary
  isLoading: boolean
  isError: boolean
  isFetching: boolean
  onRetry: () => void
}

export function AchievementsStatsCards({ summary, isLoading, isError, isFetching, onRetry }: AchievementsStatsCardsProps) {
  if (isLoading) {
    return (
      <div
        role="status"
        aria-busy="true"
        className="grid grid-cols-2 gap-px border-y border-border-strong lg:grid-cols-4"
      >
        <span className="sr-only">Cargando resumen de logros</span>
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} aria-hidden="true" className="space-y-3 px-5 pb-[18px] pt-4">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-9 w-16" />
          </div>
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div
        role="alert"
        className="flex flex-col gap-3 border-y border-border-strong px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="space-y-1">
          <p className="text-base font-semibold text-foreground">No se pudo cargar el resumen</p>
          <p className="text-[13px] text-foreground-secondary">
            Reintenta para recuperar el total de logros y la distribución por tipo de criterio.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={onRetry} disabled={isFetching} className="max-md:h-11">
          {isFetching ? 'Reintentando...' : 'Reintentar'}
        </Button>
      </div>
    )
  }

  const criteriaEntries = Object.entries(summary?.criteria_types ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)

  return (
    <FigureStrip
      aria-label="Resumen de logros"
      items={[
        { label: 'Total logros', value: summary?.total ?? 0 },
        ...criteriaEntries.map(([type, count]) => ({ label: CRITERIA_TYPE_LABELS[type] ?? type, value: count })),
      ]}
    />
  )
}
