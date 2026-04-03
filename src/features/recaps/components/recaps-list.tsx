import { Link } from 'react-router'
import { FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useRecapsList } from '../api'
import { RecapStatusBadge } from './recap-status-badge'
import { getRecapClientName, type RecapStatusFilter } from '../types'

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—'

  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatWeekRange(start: string, end: string) {
  const startDate = new Date(start)
  const endDate = new Date(end)

  return `${startDate.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
  })} - ${endDate.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })}`
}

function truncateText(value: string | null, maxLength = 72) {
  if (!value) return 'Sin comentario'
  if (value.length <= maxLength) return value
  return `${value.slice(0, maxLength - 1)}…`
}

interface RecapsListProps {
  clientId?: string
  status?: RecapStatusFilter
  archived: boolean
  page: number
  onPageChange: (page: number) => void
}

export function RecapsList({ clientId, status, archived, page, onPageChange }: RecapsListProps) {
  const { data, isError, isLoading, isRefetching, refetch } = useRecapsList(
    clientId,
    status,
    archived,
    page,
  )

  if (isLoading) {
    return (
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Semana</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Enviado</TableHead>
              <TableHead>Comentario admin</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, rowIndex) => (
              <TableRow key={rowIndex}>
                {Array.from({ length: 6 }).map((_, cellIndex) => (
                  <TableCell key={cellIndex}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-3 rounded-lg border px-4 text-center">
        <p className="text-sm text-muted-foreground">Error al cargar los recaps. Intenta de nuevo.</p>
        <Button variant="outline" onClick={() => void refetch()} disabled={isRefetching}>
          {isRefetching ? 'Reintentando...' : 'Reintentar'}
        </Button>
      </div>
    )
  }

  const items = data?.data ?? []
  const totalPages = data?.totalPages ?? 1
  const hasActiveFilters = Boolean(clientId) || (status !== undefined && status !== 'ALL') || archived

  if (items.length === 0) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-lg border">
        <FileText className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {hasActiveFilters
            ? 'No hay recaps para los filtros seleccionados'
            : 'Todavía no hay recaps disponibles para revisión'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Semana</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Enviado</TableHead>
              <TableHead>Comentario admin</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{getRecapClientName(item.client)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatWeekRange(item.week_start_date, item.week_end_date)}
                </TableCell>
                <TableCell>
                  <RecapStatusBadge status={item.status} archivedAt={item.archived_at} />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDate(item.submitted_at ?? item.created_at)}
                </TableCell>
                <TableCell className="max-w-[260px] text-sm text-muted-foreground">
                  {truncateText(item.admin_comments)}
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="outline" asChild>
                    <Link to={`/recaps/${item.id}`}>Abrir</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              Anterior
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
