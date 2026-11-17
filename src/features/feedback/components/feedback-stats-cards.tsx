import { FigureStrip } from '@/components/page'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatReviewCount, formatReviewDuration } from '@/lib/review-duration'
import { useFeedbackStats, type FeedbackStatsParams } from '../api'

export function FeedbackStatsCards({ params }: { params?: FeedbackStatsParams }) {
  const { data: stats, isError, isFetching, isLoading, refetch } = useFeedbackStats(params)

  if (isLoading) {
    return (
      <div
        role="status"
        aria-busy="true"
        className="grid grid-cols-2 gap-px border-y border-border-strong lg:grid-cols-4"
      >
        <span className="sr-only">Cargando resumen de feedback</span>
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
            Reintenta para recuperar los contadores de feedback.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => void refetch()} disabled={isFetching} className="max-md:h-11">
          {isFetching ? 'Reintentando...' : 'Reintentar'}
        </Button>
      </div>
    )
  }

  const reviewedInPeriod = stats?.reviewed_in_period

  return (
    <FigureStrip
      aria-label="Resumen de feedback"
      items={[
        { label: 'Total feedback', value: stats?.total ?? 0 },
        { label: 'Pendientes', value: stats?.pending ?? 0, tone: (stats?.pending ?? 0) > 0 ? 'warning' : 'default' },
        { label: 'Revisados', value: stats?.reviewed ?? 0 },
        {
          label: 'Tiempo medio de revisión',
          value: formatReviewDuration(stats?.avg_review_seconds),
          hint:
            reviewedInPeriod !== undefined && reviewedInPeriod !== null
              ? formatReviewCount(reviewedInPeriod)
              : undefined,
        },
      ]}
    />
  )
}
