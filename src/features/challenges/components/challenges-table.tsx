import { Target } from 'lucide-react'
import { EmptyState, ErrorState, Pagination } from '@/components/page'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useMediaQuery } from '@/hooks/use-media-query'
import type { ChallengeListItem } from '../types'
import { ChallengesDesktopTable } from './challenges-desktop-table'
import { ChallengesMobileList } from './challenges-mobile-list'

interface ChallengeApprovalSummary {
  pending_approval_actions: string[]
}

export interface ChallengesListProps {
  items: ChallengeListItem[]
  approvalById?: Record<string, ChallengeApprovalSummary>
  onEdit: (challenge: ChallengeListItem) => void
  onAssign: (challenge: ChallengeListItem) => void
  onViewProgress: (challenge: ChallengeListItem) => void
  onDelete: (challenge: ChallengeListItem) => void
}

interface ChallengesTableProps extends ChallengesListProps {
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

function ChallengesListSkeleton() {
  return (
    <div role="status" aria-busy="true" className="divide-y divide-border border-y border-border">
      <span className="sr-only">Cargando retos</span>
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} aria-hidden="true" className="space-y-2 py-4">
          <Skeleton className="h-4 w-64 max-w-[60%]" />
          <Skeleton className="h-3 w-96 max-w-[85%]" />
        </div>
      ))}
    </div>
  )
}

export function ChallengesTable({
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
  onAssign,
  onViewProgress,
  onDelete,
}: ChallengesTableProps) {
  // Tabla desde md; lista apilada por debajo. Solo se monta una variante.
  const isDesktop = useMediaQuery('(min-width: 768px)', true)

  if (isLoading) {
    return <ChallengesListSkeleton />
  }

  if (isError) {
    return (
      <ErrorState
        className="border-y border-border"
        title="No se pudieron cargar los retos"
        description="Reintenta para recuperar el listado de objetivos principales y retos semanales."
        onRetry={onRetry}
      />
    )
  }

  if (items.length === 0) {
    return (
      <EmptyState
        className="border-y border-border"
        icon={<Target aria-hidden="true" />}
        title={hasActiveFilters ? 'Ningún reto coincide con los filtros' : 'Todavía no hay retos creados'}
        description={
          hasActiveFilters
            ? 'Ajusta los filtros para volver a ver retos o crea uno nuevo si todavía no existe.'
            : 'Empieza con un objetivo principal o un reto semanal y asígnalo a clientes concretos o a toda tu cartera visible.'
        }
        action={
          !hasActiveFilters ? (
            <Button onClick={onCreate} className="max-md:h-11">
              Crear primer reto
            </Button>
          ) : undefined
        }
      />
    )
  }

  const listProps: ChallengesListProps = { items, approvalById, onEdit, onAssign, onViewProgress, onDelete }

  return (
    <div className="space-y-3">
      {isRefetching && <p className="text-sm text-foreground-muted">Actualizando listado de retos...</p>}

      {isDesktop ? <ChallengesDesktopTable {...listProps} /> : <ChallengesMobileList {...listProps} />}

      <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
    </div>
  )
}
