import { Badge } from '@/components/ui/badge'
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
import { Video, Image, MessageSquare } from 'lucide-react'
import type { FeedbackItem, FeedbackStatusFilter } from '../types'
import { useFeedbackList } from '../api'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function getClientName(item: FeedbackItem) {
  const { profile } = item.client
  if (profile?.first_name || profile?.last_name) {
    return `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim()
  }
  return item.client.email
}

interface FeedbackListProps {
  clientId?: string
  status?: FeedbackStatusFilter
  page: number
  onPageChange: (page: number) => void
  onSelect: (item: FeedbackItem) => void
}

export function FeedbackList({ clientId, status, page, onPageChange, onSelect }: FeedbackListProps) {
  const { data, isLoading, isError } = useFeedbackList(
    clientId || undefined,
    status,
    page,
  )

  if (isLoading) {
    return (
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Ejercicio</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 6 }).map((_, j) => (
                  <TableCell key={j}>
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
      <div className="flex items-center justify-center h-40 rounded-lg border text-sm text-muted-foreground">
        Error al cargar el feedback. Intenta de nuevo.
      </div>
    )
  }

  const items = data?.data ?? []
  const totalPages = data?.totalPages ?? 1
  const hasActiveFilters = Boolean(clientId) || (status !== undefined && status !== 'ALL')

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 gap-2 rounded-lg border">
        <MessageSquare className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {hasActiveFilters ? 'No hay resultados para los filtros seleccionados' : 'No hay feedback disponible'}
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
              <TableHead>Ejercicio</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{getClientName(item)}</TableCell>
                <TableCell className="text-muted-foreground">
                  {item.exercise?.name ?? '—'}
                </TableCell>
                <TableCell>
                  {item.media_type === 'VIDEO' ? (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Video className="h-4 w-4" />
                      Vídeo
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Image className="h-4 w-4" />
                      Imagen
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {item.status === 'PENDING' ? (
                    <Badge variant="outline" className="border-yellow-400 text-yellow-700 bg-yellow-50">
                      Pendiente
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-green-400 text-green-700 bg-green-50">
                      Revisado
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {formatDate(item.created_at)}
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="outline" onClick={() => onSelect(item)}>
                    Ver
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
