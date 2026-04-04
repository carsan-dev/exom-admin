import { AlertTriangle, BellRing, CalendarClock, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useNotificationStats } from '../api'

export function NotificationsStatsCards() {
  const { data: stats, isError, isFetching, isLoading, refetch } = useNotificationStats()

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-status-error/30 sm:col-span-3">
          <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
            <div className="space-y-1">
              <CardTitle className="text-base">No se pudo cargar el resumen</CardTitle>
              <p className="text-sm text-muted-foreground">
                Reintenta para recuperar las estadísticas de tus notificaciones.
              </p>
            </div>
            <AlertTriangle className="h-5 w-5 text-status-error" />
          </CardHeader>
          <CardContent>
            <Button size="sm" variant="outline" onClick={() => void refetch()} disabled={isFetching}>
              {isFetching ? 'Reintentando...' : 'Reintentar'}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total enviadas</CardTitle>
          <BellRing className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{stats?.total ?? 0}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Enviadas hoy</CardTitle>
          <CalendarClock className="h-4 w-4 text-brand-primary" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-brand-primary">{stats?.today ?? 0}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Fallidas</CardTitle>
          <TriangleAlert className="h-4 w-4 text-status-error" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-status-error">{stats?.failed ?? 0}</p>
        </CardContent>
      </Card>
    </div>
  )
}
