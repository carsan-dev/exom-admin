import { AlertTriangle, Bell, CheckCircle2 } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
import { useNotificationHistory } from '../api'
import { NotificationStatusBadge } from './notification-status-badge'
import { getNotificationRecipientName, type NotificationStatusFilter } from '../types'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((value) => value[0])
    .join('')
    .toUpperCase()
}

interface NotificationsListProps {
  recipientId?: string
  status?: NotificationStatusFilter
  search?: string
  page: number
  onPageChange: (page: number) => void
}

export function NotificationsList({
  recipientId,
  status,
  search,
  page,
  onPageChange,
}: NotificationsListProps) {
  const { data, isLoading, isError } = useNotificationHistory(
    recipientId || undefined,
    status,
    search,
    page,
  )

  if (isLoading) {
    return (
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Destinatario</TableHead>
              <TableHead>Título</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, index) => (
              <TableRow key={index}>
                {Array.from({ length: 4 }).map((_, cellIndex) => (
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
      <div className="flex items-center justify-center h-40 rounded-lg border text-sm text-muted-foreground">
        Error al cargar el historial de notificaciones. Intenta de nuevo.
      </div>
    )
  }

  const items = data?.data ?? []
  const totalPages = data?.totalPages ?? 1
  const hasActiveFilters = Boolean(recipientId) || (status !== undefined && status !== 'ALL') || Boolean(search?.trim())

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-44 gap-3 rounded-lg border">
        <Bell className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground text-center px-4">
          {hasActiveFilters
            ? 'No hay notificaciones que coincidan con los filtros seleccionados'
            : 'Todavía no has enviado notificaciones desde el panel'}
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
              <TableHead>Destinatario</TableHead>
              <TableHead>Título</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const recipientName = getNotificationRecipientName(item.recipient)

              return (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 border border-border/60">
                        <AvatarImage src={item.recipient.profile?.avatar_url ?? undefined} alt={recipientName} />
                        <AvatarFallback>{getInitials(recipientName)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{recipientName}</p>
                        <p className="truncate text-sm text-muted-foreground">{item.recipient.email}</p>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="space-y-1 max-w-xl">
                      <p className="font-medium text-foreground">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.body}</p>
                      {item.error && (
                        <div className="flex items-start gap-2 text-sm text-status-error">
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                          <span>{item.error}</span>
                        </div>
                      )}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="space-y-2">
                      <NotificationStatusBadge status={item.status} />
                      {item.status === 'SENT' && (
                        <div className="flex items-center gap-1.5 text-xs text-green-700">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Registrada
                        </div>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(item.created_at)}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
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
