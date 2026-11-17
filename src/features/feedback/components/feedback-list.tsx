import { Image, MessageSquare, Video } from 'lucide-react'
import { EmptyState, ErrorState, Pagination } from '@/components/page'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusChip } from '@/components/ui/status-chip'
import { Tag } from '@/components/ui/tag'
import { cn } from '@/lib/utils'
import { formatFeedbackDate, getFeedbackClientName } from '../feedback-format'
import type { FeedbackItem, FeedbackStatusFilter } from '../types'

interface FeedbackListProps {
  items: FeedbackItem[]
  isLoading: boolean
  isError: boolean
  onRetry: () => void
  clientId?: string
  status?: FeedbackStatusFilter
  page: number
  totalPages: number
  selectedId?: string | null
  /** id del panel de detalle que controlan las filas (solo en la variante de escritorio). */
  controlsId?: string
  onPageChange: (page: number) => void
  onSelect: (item: FeedbackItem) => void
}

function FeedbackListSkeleton() {
  return (
    <div role="status" aria-busy="true" className="divide-y divide-border border-y border-border">
      <span className="sr-only">Cargando feedback</span>
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} aria-hidden="true" className="grid grid-cols-[16px_minmax(0,1fr)_72px] items-center gap-3 px-1 py-3 md:px-3">
          <Skeleton className="size-4" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
          <Skeleton className="h-4 w-full" />
        </div>
      ))}
    </div>
  )
}

export function FeedbackList({
  items,
  isLoading,
  isError,
  onRetry,
  clientId,
  status,
  page,
  totalPages,
  selectedId,
  controlsId,
  onPageChange,
  onSelect,
}: FeedbackListProps) {
  if (isLoading) {
    return <FeedbackListSkeleton />
  }

  if (isError) {
    return (
      <ErrorState
        className="border-y border-border"
        title="Error al cargar el feedback. Intenta de nuevo."
        onRetry={onRetry}
      />
    )
  }

  const hasActiveFilters = Boolean(clientId) || (status !== undefined && status !== 'ALL')

  if (items.length === 0) {
    return (
      <EmptyState
        className="border-y border-border"
        icon={<MessageSquare aria-hidden="true" />}
        title={hasActiveFilters ? 'No hay resultados para los filtros seleccionados' : 'No hay feedback disponible'}
      />
    )
  }

  return (
    <div>
      <ul aria-label="Feedback recibido" className="divide-y divide-border border-y border-border">
        {items.map((item) => {
          const selected = item.id === selectedId
          const TypeIcon = item.media_type === 'VIDEO' ? Video : Image
          const clientName = getFeedbackClientName(item)
          const exerciseName = item.exercise?.name ?? '—'
          const date = formatFeedbackDate(item.assignment_date ?? item.created_at)
          // Conserva como nombre accesible las columnas de la tabla anterior (Cliente, Ejercicio,
          // Tipo, Estado, Fecha), incluido el tipo de medio que visualmente solo es un icono.
          const rowLabel = [
            `Cliente: ${clientName}`,
            `Ejercicio: ${exerciseName}${item.feedback_kind === 'LAST_SET' ? ' (Última serie)' : ''}`,
            `Tipo: ${item.media_type === 'VIDEO' ? 'Vídeo' : 'Imagen'}`,
            `Estado: ${item.status === 'PENDING' ? 'Pendiente' : 'Revisado'}`,
            `Fecha: ${date}`,
          ].join('. ')

          return (
            <li key={item.id}>
              <button
                type="button"
                aria-label={rowLabel}
                aria-current={selected ? 'true' : undefined}
                aria-controls={controlsId}
                aria-haspopup={controlsId ? undefined : 'dialog'}
                onClick={() => onSelect(item)}
                className={cn(
                  'grid min-h-[72px] w-full grid-cols-[16px_minmax(0,1fr)_auto] items-center gap-3 px-1 py-3 text-left transition-colors duration-(--dur-fast) ease-(--ease-out) hover:bg-background-secondary focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus md:min-h-[68px] md:px-3',
                  selected && 'bg-lime-soft hover:bg-lime-soft',
                )}
              >
                <TypeIcon
                  aria-hidden="true"
                  className={cn('size-4 self-start mt-[3px]', selected ? 'text-accent-text' : 'text-foreground-muted')}
                />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-sm font-semibold leading-5 text-foreground">{clientName}</span>
                  <span className="flex min-w-0 items-center gap-2 text-[13px] leading-5 text-foreground-secondary">
                    <span className="min-w-0 truncate">{exerciseName}</span>
                    {item.feedback_kind === 'LAST_SET' && <Tag className="h-5 flex-none px-1.5 text-[11px]">Última serie</Tag>}
                  </span>
                </span>
                <span className="flex flex-col items-end gap-1.5">
                  <span className="whitespace-nowrap text-xs leading-4 text-foreground-muted">
                    {date}
                  </span>
                  {item.status === 'PENDING' ? (
                    <StatusChip variant="warning">Pendiente</StatusChip>
                  ) : (
                    <StatusChip variant="success">Revisado</StatusChip>
                  )}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
    </div>
  )
}
