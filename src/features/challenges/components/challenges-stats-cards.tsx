import { FigureStrip } from '@/components/page'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { ChallengeSummary } from '../types'

interface ChallengesStatsCardsProps {
  summary?: ChallengeSummary
  isLoading: boolean
  isError: boolean
  isFetching: boolean
  onRetry: () => void
}

export function ChallengesStatsCards({ summary, isLoading, isError, isFetching, onRetry }: ChallengesStatsCardsProps) {
  if (isLoading) {
    return (
      <div
        role="status"
        aria-busy="true"
        className="grid grid-cols-2 gap-px border-y border-border-strong lg:grid-cols-5"
      >
        <span className="sr-only">Cargando resumen de retos</span>
        {Array.from({ length: 5 }).map((_, index) => (
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
            Reintenta para recuperar el total, los retos semanales, los automáticos y el alcance global.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={onRetry} disabled={isFetching} className="max-md:h-11">
          {isFetching ? 'Reintentando...' : 'Reintentar'}
        </Button>
      </div>
    )
  }

  return (
    <FigureStrip
      aria-label="Resumen de retos"
      items={[
        { label: 'Retos semanales', value: summary?.weekly ?? 0 },
        { label: 'Objetivos principales', value: summary?.main_goal ?? 0 },
        { label: 'Retos automáticos', value: summary?.automatic ?? 0 },
        { label: 'Alcance global', value: summary?.global ?? 0 },
        { label: 'Total retos', value: summary?.total ?? 0 },
      ]}
    />
  )
}
