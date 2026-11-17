import { Trophy } from 'lucide-react'
import { EmptyState, ErrorState, Pagination } from '@/components/page'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useMediaQuery } from '@/hooks/use-media-query'
import type { AchievementListItem } from '../types'
import { AchievementsDesktopTable } from './achievements-desktop-table'
import { AchievementsMobileList } from './achievements-mobile-list'

interface AchievementApprovalSummary {
  pending_approval_actions: string[]
}

export interface AchievementsListProps {
  items: AchievementListItem[]
  approvalById?: Record<string, AchievementApprovalSummary>
  onEdit: (achievement: AchievementListItem) => void
  onViewUsers: (achievement: AchievementListItem) => void
  onGrant: (achievement: AchievementListItem) => void
  onDelete: (achievement: AchievementListItem) => void
  canDelete: boolean
}

interface AchievementsTableProps extends AchievementsListProps {
  page: number
  totalPages: number
  isLoading: boolean
  isError: boolean
  isRefetching: boolean
  hasActiveFilters: boolean
  onRetry: () => void
  onPageChange: (page: number) => void
  onCreate: () => void
}

function AchievementsListSkeleton() {
  return (
    <div role="status" aria-busy="true" className="divide-y divide-border border-y border-border">
      <span className="sr-only">Cargando logros</span>
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

export function AchievementsTable({
  items,
  approvalById = {},
  page,
  totalPages,
  isLoading,
  isError,
  isRefetching,
  hasActiveFilters,
  onRetry,
  onPageChange,
  onCreate,
  onEdit,
  onViewUsers,
  onGrant,
  onDelete,
  canDelete,
}: AchievementsTableProps) {
  // Tabla desde md; lista apilada por debajo. Solo se monta una variante.
  const isDesktop = useMediaQuery('(min-width: 768px)', true)

  if (isLoading) {
    return <AchievementsListSkeleton />
  }

  if (isError) {
    return (
      <ErrorState
        className="border-y border-border"
        title="No se pudieron cargar los logros"
        description="Reintenta para recuperar el listado de logros configurados."
        onRetry={onRetry}
      />
    )
  }

  if (items.length === 0) {
    return (
      <EmptyState
        className="border-y border-border"
        icon={<Trophy aria-hidden="true" />}
        title={hasActiveFilters ? 'Ningún logro coincide con los filtros' : 'Todavía no hay logros creados'}
        description={
          hasActiveFilters
            ? 'Ajusta los filtros para volver a ver logros o crea uno nuevo si todavía no existe.'
            : 'Crea logros para premiar a tus clientes por sus esfuerzos y objetivos alcanzados.'
        }
        action={
          !hasActiveFilters ? (
            <Button onClick={onCreate} className="max-md:h-11">
              Crear primer logro
            </Button>
          ) : undefined
        }
      />
    )
  }

  const listProps: AchievementsListProps = { items, approvalById, onEdit, onViewUsers, onGrant, onDelete, canDelete }

  return (
    <div className="space-y-3">
      {isRefetching && <p className="text-sm text-foreground-muted">Actualizando listado de logros...</p>}

      {isDesktop ? <AchievementsDesktopTable {...listProps} /> : <AchievementsMobileList {...listProps} />}

      <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
    </div>
  )
}
