import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertTriangle, MessageSquare, Clock, CheckCircle2 } from 'lucide-react'
import { useFeedbackStats } from '../api'

export function FeedbackStatsCards() {
  const { data: stats, isError, isFetching, isLoading, refetch } = useFeedbackStats()

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
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
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="sm:col-span-3 border-status-error/30">
          <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
            <div className="space-y-1">
              <CardTitle className="text-base">No se pudo cargar el resumen</CardTitle>
              <p className="text-sm text-muted-foreground">
                Reintenta para recuperar los contadores de feedback.
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
    <div className="grid gap-4 sm:grid-cols-3">
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total feedback</CardTitle>
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{stats?.total ?? 0}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium text-muted-foreground">Pendientes</CardTitle>
          <Clock className="h-4 w-4 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-yellow-600">{stats?.pending ?? 0}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium text-muted-foreground">Revisados</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-green-600">{stats?.reviewed ?? 0}</p>
        </CardContent>
      </Card>
    </div>
  )
}
