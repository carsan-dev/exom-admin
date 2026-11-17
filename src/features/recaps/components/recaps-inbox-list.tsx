import { FileText } from 'lucide-react'
import { EmptyState, ErrorState, Pagination } from '@/components/page'
import { Skeleton } from '@/components/ui/skeleton'
import { Tag } from '@/components/ui/tag'
import { cn } from '@/lib/utils'
import { getRecapRowId } from '../recaps-selection'
import { formatAverageDailySteps, getRecapClientName } from '../types'
import type { RecapListItem, RecapStatusFilter } from '../types'
import { RecapStatusChip } from './recap-status-chip'
import { formatDate, formatWeekRange } from './recaps-list-format'

/** Texto del estado igual al de `RecapStatusChip`, para el nombre accesible de la fila. */
function getRecapStatusLabel(item: Pick<RecapListItem, 'status' | 'archived_at'>) {
  if (item.archived_at) return 'Archivado'
  if (item.status === 'DRAFT') return 'Borrador'
  if (item.status === 'SUBMITTED') return 'Por revisar'
  return 'Revisado'
}

function RecapsInboxListSkeleton() {
  return (
    <div role="status" aria-busy="true" className="divide-y divide-border border-y border-border">
      <span className="sr-only">Cargando recaps</span>
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} aria-hidden="true" className="grid grid-cols-[minmax(0,1fr)_72px] items-center gap-3 px-1 py-3 md:px-3">
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

interface RecapsInboxListProps {
  items: RecapListItem[]
  isLoading: boolean
  isError: boolean
  isRefetching: boolean
  onRetry: () => void
  clientId?: string
  status?: RecapStatusFilter
  archived: boolean
  page: number
  totalPages: number
  selectedId?: string | null
  /** Recaps con una respuesta local sin enviar. */
  draftIds: ReadonlySet<string>
  /** id del panel de detalle que controlan las filas (solo en la variante de escritorio). */
  controlsId?: string
  onPageChange: (page: number) => void
  onSelect: (item: RecapListItem) => void
}

/** Listado seleccionable de `/recaps`: cada fila abre la vista rápida (panel o diálogo). */
export function RecapsInboxList({
  items,
  isLoading,
  isError,
  isRefetching,
  onRetry,
  clientId,
  status,
  archived,
  page,
  totalPages,
  selectedId,
  draftIds,
  controlsId,
  onPageChange,
  onSelect,
}: RecapsInboxListProps) {
  if (isLoading) {
    return <RecapsInboxListSkeleton />
  }

  if (isError) {
    return (
      <ErrorState
        className="border-y border-border"
        title="Error al cargar los recaps. Intenta de nuevo."
        retryLabel={isRefetching ? 'Reintentando...' : 'Reintentar'}
        onRetry={onRetry}
      />
    )
  }

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
      <ul aria-label="Recaps recibidos" className="divide-y divide-border border-y border-border">
        {items.map((item) => {
          const selected = item.id === selectedId
          const hasDraft = draftIds.has(item.id)
          const clientName = getRecapClientName(item.client)
          const week = formatWeekRange(item.week_start_date, item.week_end_date)
          const sentDate = formatDate(item.submitted_at ?? item.created_at)
          const rowLabel = [
            `Cliente: ${clientName}`,
            `Semana: ${week}`,
            `Estado: ${getRecapStatusLabel(item)}`,
            `Enviado: ${sentDate}`,
            ...(hasDraft ? ['Borrador de respuesta sin enviar'] : []),
          ].join('. ')

          return (
            <li key={item.id}>
              <button
                id={getRecapRowId(item.id)}
                type="button"
                aria-label={rowLabel}
                aria-current={selected ? 'true' : undefined}
                aria-controls={controlsId}
                aria-haspopup={controlsId ? undefined : 'dialog'}
                onClick={() => onSelect(item)}
                className={cn(
                  'grid min-h-[72px] w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-1 py-3 text-left transition-colors duration-(--dur-fast) ease-(--ease-out) hover:bg-background-secondary focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus md:min-h-[68px] md:px-3',
                  selected && 'bg-lime-soft hover:bg-lime-soft',
                )}
              >
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-sm font-semibold leading-5 text-foreground">{clientName}</span>
                  <span className="flex min-w-0 flex-wrap items-center gap-x-2 text-[13px] leading-5 text-foreground-secondary">
                    <span className="min-w-0">{week}</span>
                    {item.average_daily_steps != null && (
                      <span className="tabular-nums text-foreground-muted">
                        {formatAverageDailySteps(item.average_daily_steps, true)}
                      </span>
                    )}
                  </span>
                </span>
                <span className="flex flex-col items-end gap-1.5">
                  <RecapStatusChip status={item.status} archivedAt={item.archived_at} />
                  {hasDraft && <Tag className="h-5 flex-none px-1.5 text-[11px]">Borrador</Tag>}
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
