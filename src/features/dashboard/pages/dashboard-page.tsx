import { ErrorState, PageHeader } from '@/components/page'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/use-auth'
import { getApiErrorMessage } from '@/lib/api-utils'
import { useDashboard } from '../api'
import { RecentActivity } from '../components/recent-activity'
import { StatsCards } from '../components/stats-cards'
import { TopClients } from '../components/top-clients'

const SPLIT_LAYOUT = 'grid gap-10 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]'

function DashboardPageSkeleton() {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-10">
      <span className="sr-only">Cargando el dashboard</span>

      <div aria-hidden="true" className="space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>

      <div
        aria-hidden="true"
        className="grid grid-cols-2 gap-px border-y border-border-strong lg:grid-cols-4"
      >
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="space-y-3 px-5 pb-[18px] pt-4">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-9 w-16" />
            <Skeleton className="h-3 w-36 max-w-full" />
          </div>
        ))}
      </div>

      <div aria-hidden="true" className={SPLIT_LAYOUT}>
        <div className="space-y-4">
          <Skeleton className="h-6 w-40" />
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </div>

        <div className="space-y-4">
          <Skeleton className="h-6 w-32" />
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </div>
      </div>
    </div>
  )
}

export function DashboardPage() {
  const currentUser = useAuth((state) => state.user)
  const { data, isError, isFetching, isLoading, refetch, error } = useDashboard()

  const adminName = currentUser?.profile?.first_name || currentUser?.email || 'admin'

  if (isLoading) {
    return <DashboardPageSkeleton />
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader className="mb-0 md:mb-0" eyebrow="Seguimiento" title="Dashboard" />
        <section className="border-y border-border-strong">
          <ErrorState
            title="No se pudo cargar el dashboard"
            description={getApiErrorMessage(error, 'Reintenta para recuperar el resumen ejecutivo del panel.')}
            retryLabel={isFetching ? 'Reintentando...' : 'Reintentar'}
            onRetry={() => {
              if (!isFetching) void refetch()
            }}
          />
        </section>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        className="mb-0 md:mb-0"
        eyebrow="Seguimiento"
        title="Dashboard"
        description={`Hola, ${adminName}. Aquí tienes el resumen ejecutivo de tu operación en EXOM.`}
      />

      <StatsCards stats={data.stats} />

      <div className={SPLIT_LAYOUT}>
        <RecentActivity items={data.recentActivity} />
        <TopClients clients={data.topClients} />
      </div>
    </div>
  )
}
