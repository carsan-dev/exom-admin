import { Bell } from 'lucide-react'
import { EmptyState, ErrorState, Pagination } from '@/components/page'
import { Skeleton } from '@/components/ui/skeleton'
import { useMediaQuery } from '@/hooks/use-media-query'
import { useNotificationHistory } from '../api'
import type { NotificationStatusFilter } from '../types'
import { NotificationsDesktopTable } from './notifications-desktop-table'
import { NotificationsMobileList } from './notifications-mobile-list'

interface NotificationsListProps {
  recipientId?: string
  status?: NotificationStatusFilter
  search?: string
  page: number
  onPageChange: (page: number) => void
}

function NotificationsListSkeleton() {
  return (
    <div role="status" aria-busy="true" className="divide-y divide-border border-y border-border">
      <span className="sr-only">Cargando historial de notificaciones</span>
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} aria-hidden="true" className="flex items-start gap-3 py-4">
          <Skeleton className="size-9 flex-none" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-64 max-w-[60%]" />
            <Skeleton className="h-3 w-96 max-w-[85%]" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function NotificationsList({
  recipientId,
  status,
  search,
  page,
  onPageChange,
}: NotificationsListProps) {
  // Tabla desde md; lista apilada por debajo. Solo se monta una variante.
  const isDesktop = useMediaQuery('(min-width: 768px)', true)
  const { data, isLoading, isError, refetch } = useNotificationHistory(
    recipientId || undefined,
    status,
    search,
    page,
  )

  if (isLoading) {
    return <NotificationsListSkeleton />
  }

  if (isError) {
    return (
      <ErrorState
        className="border-y border-border"
        title="Error al cargar el historial de notificaciones. Intenta de nuevo."
        onRetry={() => void refetch()}
      />
    )
  }

  const items = data?.data ?? []
  const totalPages = data?.totalPages ?? 1
  const hasActiveFilters = Boolean(recipientId) || (status !== undefined && status !== 'ALL') || Boolean(search?.trim())

  if (items.length === 0) {
    return (
      <EmptyState
        className="border-y border-border"
        icon={<Bell />}
        title={
          hasActiveFilters
            ? 'No hay notificaciones que coincidan con los filtros seleccionados'
            : 'Todavía no has enviado notificaciones desde el panel'
        }
      />
    )
  }

  return (
    <div className="space-y-3">
      {isDesktop ? <NotificationsDesktopTable items={items} /> : <NotificationsMobileList items={items} />}

      <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
    </div>
  )
}
