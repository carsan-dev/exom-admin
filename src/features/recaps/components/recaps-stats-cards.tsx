import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertTriangle, Archive, CheckCircle2, Clock3, FileText } from 'lucide-react'
import { AvgReviewTimeCard } from '@/components/stats/avg-review-time-card'
import { useRecapStats, type RecapStatsParams } from '../api'

export function RecapsStatsCards({ params }: { params?: RecapStatsParams }) {
  const { data: stats, isError, isFetching, isLoading, refetch } = useRecapStats(params)

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
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
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Card className="border-status-error/30 sm:col-span-2 xl:col-span-5">
          <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
            <div className="space-y-1">
              <CardTitle className="text-base">No se pudo cargar el resumen</CardTitle>
              <p className="text-sm text-muted-foreground">
                Reintenta para recuperar los contadores de recaps.
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
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total recaps</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{stats?.total ?? 0}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Por revisar</CardTitle>
          <Clock3 className="h-4 w-4 text-status-warning" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-foreground">{stats?.submitted ?? 0}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Revisados</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-status-success" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-foreground">{stats?.reviewed ?? 0}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Archivados</CardTitle>
          <Archive className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-foreground">{stats?.archived ?? 0}</p>
        </CardContent>
      </Card>

      <AvgReviewTimeCard seconds={stats?.avg_review_seconds} reviewedInPeriod={stats?.reviewed_in_period} />
    </div>
  )
}
