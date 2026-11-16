import { FigureStrip } from '@/components/page'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useNotificationStats, type NotificationStatsParams } from '../api'

export function NotificationsStatsCards({ params }: { params?: NotificationStatsParams }) {
  const { data: stats, isError, isFetching, isLoading, refetch } = useNotificationStats(params)

  if (isLoading) {
    return (
      <div
        role="status"
        aria-busy="true"
        className="grid grid-cols-2 gap-px border-y border-border-strong lg:grid-cols-3"
      >
        <span className="sr-only">Cargando resumen de notificaciones</span>
        {Array.from({ length: 3 }).map((_, index) => (
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
            Reintenta para recuperar las estadísticas de tus notificaciones.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => void refetch()} disabled={isFetching} className="max-md:h-11">
          {isFetching ? 'Reintentando...' : 'Reintentar'}
        </Button>
      </div>
    )
  }

  return (
    <FigureStrip
      aria-label="Resumen de notificaciones"
      items={[
        { label: 'Total enviadas', value: stats?.total ?? 0 },
        { label: 'Enviadas hoy', value: stats?.today ?? 0 },
        { label: 'Fallidas', value: stats?.failed ?? 0, tone: (stats?.failed ?? 0) > 0 ? 'danger' : 'default' },
      ]}
    />
  )
}
