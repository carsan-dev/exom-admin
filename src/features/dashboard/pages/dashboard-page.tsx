import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/use-auth'
import { getApiErrorMessage } from '@/lib/api-utils'
import { useDashboard } from '../api'
import { RecentActivity } from '../components/recent-activity'
import { StatsCards } from '../components/stats-cards'
import { TopClients } from '../components/top-clients'

function DashboardPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}>
            <CardContent className="space-y-3 pt-6">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-9 w-16" />
              <Skeleton className="h-4 w-36" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <Card>
          <CardContent className="space-y-4 pt-6">
            <Skeleton className="h-6 w-40" />
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-20 w-full rounded-xl" />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 pt-6">
            <Skeleton className="h-6 w-32" />
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-24 w-full rounded-xl" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export function DashboardPage() {
  const currentUser = useAuth((state) => state.user)
  const { data, isError, isFetching, isLoading, refetch, error } = useDashboard()

  const adminName = currentUser?.profile.first_name || currentUser?.email || 'admin'

  if (isLoading) {
    return <DashboardPageSkeleton />
  }

  if (isError || !data) {
    return (
      <Card className="border-status-error/30">
        <CardContent className="flex flex-col items-center gap-4 pt-8 text-center">
          <div className="rounded-full bg-status-error/10 p-4 text-status-error">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-foreground">No se pudo cargar el dashboard</h1>
            <p className="max-w-xl text-sm text-muted-foreground">
              {getApiErrorMessage(error, 'Reintenta para recuperar el resumen ejecutivo del panel.')}
            </p>
          </div>
          <Button variant="outline" onClick={() => void refetch()} disabled={isFetching}>
            {isFetching ? 'Reintentando...' : 'Reintentar'}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Hola, {adminName}. Aquí tienes el resumen ejecutivo de tu operación en EXOM.
        </p>
      </div>

      <StatsCards stats={data.stats} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <RecentActivity items={data.recentActivity} />
        <TopClients clients={data.topClients} />
      </div>
    </div>
  )
}
