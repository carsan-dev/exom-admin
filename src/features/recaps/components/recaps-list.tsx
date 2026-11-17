import { FileText } from 'lucide-react'
import { EmptyState, ErrorState, Pagination } from '@/components/page'
import { Skeleton } from '@/components/ui/skeleton'
import { useMediaQuery } from '@/hooks/use-media-query'
import { useRecapsList } from '../api'
import type { RecapStatusFilter } from '../types'
import { RecapsDesktopTable } from './recaps-desktop-table'
import { RecapsMobileList } from './recaps-mobile-list'

function RecapsListSkeleton() {
  return (
    <div role="status" aria-busy="true" className="divide-y divide-border border-y border-border">
      <span className="sr-only">Cargando recaps</span>
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} aria-hidden="true" className="flex items-center gap-4 py-4">
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-48 max-w-[60%]" />
            <Skeleton className="h-3 w-64 max-w-[80%]" />
          </div>
          <Skeleton className="h-5 w-20 flex-none" />
        </div>
      ))}
    </div>
  )
}

interface RecapsListProps {
  clientId?: string
  status?: RecapStatusFilter
  archived: boolean
  page: number
  onPageChange: (page: number) => void
  returnTo?: string
}

export function RecapsList({ clientId, status, archived, page, onPageChange, returnTo }: RecapsListProps) {
  // Tabla desde md; lista apilada por debajo. Solo se monta una variante.
  const isDesktop = useMediaQuery('(min-width: 768px)', true)
  const { data, isError, isLoading, isRefetching, refetch } = useRecapsList(
    clientId,
    status,
    archived,
    page,
  )

  if (isLoading) {
    return <RecapsListSkeleton />
  }

  if (isError) {
    return (
      <ErrorState
        className="border-y border-border"
        title="Error al cargar los recaps. Intenta de nuevo."
        retryLabel={isRefetching ? 'Reintentando...' : 'Reintentar'}
        onRetry={() => void refetch()}
      />
    )
  }

  const items = data?.data ?? []
  const totalPages = data?.totalPages ?? 1
  const hasActiveFilters = Boolean(clientId) || (status !== undefined && status !== 'ALL') || archived

  if (items.length === 0) {
    return (
      <EmptyState
        className="border-y border-border"
        icon={<FileText aria-hidden="true" />}
        title={
          hasActiveFilters
            ? 'No hay recaps para los filtros seleccionados'
            : 'Todavía no hay recaps disponibles para revisión'
        }
      />
    )
  }

  return (
    <div>
      {isDesktop ? (
        <RecapsDesktopTable items={items} returnTo={returnTo} />
      ) : (
        <RecapsMobileList items={items} returnTo={returnTo} />
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
    </div>
  )
}
