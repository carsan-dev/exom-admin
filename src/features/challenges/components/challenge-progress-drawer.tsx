import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { ClientSelector } from '../../progress/components/client-selector'
import { useChallengeDetail } from '../api'
import {
  getChallengeProgressVariant,
  getChallengeScopeLabel,
  getChallengeTypeLabel,
  type ChallengeListItem,
} from '../types'

interface ChallengeProgressDrawerProps {
  challenge: ChallengeListItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function getClientInitials(client: { email: string; profile: { first_name: string | null; last_name: string | null } | null }) {
  const firstName = client.profile?.first_name?.[0] ?? ''
  const lastName = client.profile?.last_name?.[0] ?? ''
  const initials = `${firstName}${lastName}`.trim().toUpperCase()

  return initials || client.email.slice(0, 2).toUpperCase()
}

function getClientDisplayName(client: { email: string; profile: { first_name: string | null; last_name: string | null } | null }) {
  const firstName = client.profile?.first_name?.trim()
  const lastName = client.profile?.last_name?.trim()
  const fullName = [firstName, lastName].filter(Boolean).join(' ')

  return fullName || client.email
}

function formatDateTime(value: string | null) {
  if (!value) {
    return 'Pendiente'
  }

  return new Date(value).toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getProgressBarClass(progressRate: number) {
  const variant = getChallengeProgressVariant(progressRate)

  if (variant === 'complete') {
    return 'bg-status-success'
  }

  if (variant === 'active') {
    return 'bg-brand-primary'
  }

  return 'bg-muted-foreground/40'
}

function getStatusBadge(progressRate: number, isCompleted: boolean) {
  if (isCompleted) {
    return {
      label: 'Completado',
      className: 'border-status-success/30 bg-status-success/10 text-status-success',
    }
  }

  if (progressRate > 0) {
    return {
      label: 'En progreso',
      className: 'border-brand-primary/20 bg-brand-soft/10 text-brand-primary',
    }
  }

  return {
    label: 'Sin avance',
    className: 'border-border bg-muted text-muted-foreground',
  }
}

export function ChallengeProgressDrawer({ challenge, open, onOpenChange }: ChallengeProgressDrawerProps) {
  const [page, setPage] = useState(1)
  const [clientId, setClientId] = useState('')
  const [status, setStatus] = useState<'ALL' | 'COMPLETED' | 'PENDING'>('ALL')

  useEffect(() => {
    if (!open) {
      setPage(1)
      setClientId('')
      setStatus('ALL')
      return
    }

    setPage(1)
  }, [challenge?.id, open])

  useEffect(() => {
    setPage(1)
  }, [clientId, status])

  const detailQuery = useChallengeDetail(
    challenge?.id,
    {
      page,
      limit: 8,
      client_id: clientId || undefined,
      is_completed: status === 'ALL' ? undefined : status === 'COMPLETED',
    },
    open,
  )

  const detail = detailQuery.data
  const assignments = detail?.assignments.data ?? []
  const totalPages = detail?.assignments.totalPages ?? 1
  const hasAssignmentFilters = Boolean(clientId) || status !== 'ALL'

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-3xl">
        <SheetHeader>
          <SheetTitle>{challenge?.title ?? 'Progreso del reto'}</SheetTitle>
          <SheetDescription>
            Revisa asignaciones, clientes completados y el avance visible de este reto.
          </SheetDescription>
        </SheetHeader>

        {!challenge ? null : detailQuery.isLoading ? (
          <div className="mt-6 space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-28 rounded-2xl" />
            ))}
          </div>
        ) : detailQuery.isError ? (
          <div className="mt-6 flex flex-col items-center gap-4 rounded-xl border border-status-error/20 p-8 text-center">
            <div className="rounded-full bg-status-error/10 p-4 text-status-error">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">No se pudo cargar el progreso</h3>
              <p className="text-sm text-muted-foreground">
                Reintenta para recuperar el detalle de clientes y el estado de completado.
              </p>
            </div>
            <Button variant="outline" onClick={() => void detailQuery.refetch()}>
              Reintentar
            </Button>
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            <div className="rounded-xl border border-border/70 bg-muted/20 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-brand-primary/20 bg-brand-soft/10 text-brand-primary">
                  {getChallengeTypeLabel(challenge.type)}
                </Badge>
                <Badge variant="outline" className="border-border bg-muted text-muted-foreground">
                  {getChallengeScopeLabel(challenge.is_global)}
                </Badge>
                {detailQuery.isRefetching && (
                  <span className="text-sm text-muted-foreground">Actualizando detalle...</span>
                )}
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{challenge.description}</p>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-border/60 bg-background p-4">
                  <p className="text-sm text-muted-foreground">Asignados</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{detail?.assigned_clients ?? 0}</p>
                </div>
                <div className="rounded-xl border border-border/60 bg-background p-4">
                  <p className="text-sm text-muted-foreground">Completados</p>
                  <p className="mt-2 text-2xl font-semibold text-status-success">{detail?.completed_clients ?? 0}</p>
                </div>
                <div className="rounded-xl border border-border/60 bg-background p-4">
                  <p className="text-sm text-muted-foreground">Ratio</p>
                  <p className="mt-2 text-2xl font-semibold text-brand-primary">{detail?.completion_rate ?? 0}%</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">Cliente:</span>
                <ClientSelector selectedClientId={clientId} onSelect={setClientId} />
                {clientId && (
                  <Button variant="ghost" size="sm" onClick={() => setClientId('')}>
                    Todos
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">Estado:</span>
                <Select value={status} onValueChange={(value) => setStatus(value as 'ALL' | 'COMPLETED' | 'PENDING')}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos</SelectItem>
                    <SelectItem value="COMPLETED">Completados</SelectItem>
                    <SelectItem value="PENDING">Pendientes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {assignments.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground">
                {detail?.assigned_clients === 0
                  ? 'Este reto todavía no tiene clientes materializados.'
                  : hasAssignmentFilters
                    ? 'No hay clientes que coincidan con los filtros seleccionados.'
                    : 'No hay filas de progreso disponibles para mostrar.'}
              </div>
            ) : (
              <div className="space-y-4">
                {assignments.map((assignment) => {
                  const statusBadge = getStatusBadge(assignment.progress_rate, assignment.is_completed)

                  return (
                    <div key={assignment.id} className="rounded-xl border border-border/70 bg-card p-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex min-w-0 items-start gap-3">
                          <Avatar className="h-11 w-11 border border-border/60">
                            <AvatarImage src={assignment.client.profile?.avatar_url ?? undefined} alt={getClientDisplayName(assignment.client)} />
                            <AvatarFallback>{getClientInitials(assignment.client)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate font-medium text-foreground">{getClientDisplayName(assignment.client)}</p>
                              <Badge variant="outline" className={statusBadge.className}>
                                {statusBadge.label}
                              </Badge>
                            </div>
                            <p className="truncate text-sm text-muted-foreground">{assignment.client.email}</p>
                          </div>
                        </div>

                        <div className="min-w-[220px] space-y-2">
                          <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <span>
                              {assignment.current_value} / {detail?.target_value ?? challenge.target_value} {detail?.unit ?? challenge.unit}
                            </span>
                            <span>{assignment.progress_rate}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-muted">
                            <div
                              className={`h-2 rounded-full transition-all ${getProgressBarClass(assignment.progress_rate)}`}
                              style={{ width: `${Math.min(assignment.progress_rate, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                        <p>Asignado: {formatDateTime(assignment.assigned_at)}</p>
                        <p>Completado: {formatDateTime(assignment.completed_at)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  Página {page} de {totalPages}
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
                    Anterior
                  </Button>
                  <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}>
                    Siguiente
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
