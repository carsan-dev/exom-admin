import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { useSearchParams } from 'react-router'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/hooks/use-auth'
import { getApiErrorMessage } from '@/lib/api-utils'
import { useApprovalRequests, useMyApprovalRequests } from '../api'
import {
  getApprovalActionLabel,
  getApprovalActorInitials,
  getApprovalActorName,
  getApprovalResourceLabel,
  getApprovalResourceName,
  getApprovalStatusFilterOptions,
  getRelativeApprovalDate,
  type ApprovalStatusFilter,
  type ResourceType,
} from '../types'
import { ApprovalDetailDialog } from '../components/approval-detail-dialog'
import { ApprovalStatusBadge } from '../components/approval-status-badge'
import { PendingApprovalsBanner } from '../components/pending-approvals-banner'

const PAGE_SIZE = 20

function getPage(value: string | null) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1
}

function getStatusFilter(value: string | null): ApprovalStatusFilter {
  return getApprovalStatusFilterOptions().includes(value as ApprovalStatusFilter)
    ? (value as ApprovalStatusFilter)
    : 'PENDING'
}

function getResourceTypeFilter(value: string | null): ResourceType | 'ALL' {
  return value === 'training' ||
    value === 'diet' ||
    value === 'exercise' ||
    value === 'ingredient' ||
    value === 'meal' ||
    value === 'challenge' ||
    value === 'achievement' ||
    value === 'notification'
    ? value
    : 'ALL'
}

export function ApprovalRequestsPage() {
  const currentUserRole = useAuth((state) => state.user?.role ?? 'ADMIN')
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)

  const page = getPage(searchParams.get('page'))
  const status = getStatusFilter(searchParams.get('status'))
  const resourceType = getResourceTypeFilter(searchParams.get('resourceType'))

  const filters = {
    status,
    resource_type: resourceType === 'ALL' ? undefined : resourceType,
    page,
    limit: PAGE_SIZE,
  }

  const approvalRequestsQuery = currentUserRole === 'SUPER_ADMIN'
    ? useApprovalRequests(filters)
    : useMyApprovalRequests(filters)
  const data = approvalRequestsQuery.data
  const items = data?.data ?? []
  const totalPages = data?.totalPages ?? 1

  const updateSearchParams = (updates: {
    status?: ApprovalStatusFilter
    resourceType?: ResourceType | 'ALL'
    page?: number
  }) => {
    const nextSearchParams = new URLSearchParams(searchParams)

    if (updates.status !== undefined) {
      if (updates.status === 'PENDING') {
        nextSearchParams.delete('status')
      } else {
        nextSearchParams.set('status', updates.status)
      }
    }

    if (updates.resourceType !== undefined) {
      if (updates.resourceType === 'ALL') {
        nextSearchParams.delete('resourceType')
      } else {
        nextSearchParams.set('resourceType', updates.resourceType)
      }
    }

    if (updates.page !== undefined) {
      if (updates.page <= 1) {
        nextSearchParams.delete('page')
      } else {
        nextSearchParams.set('page', String(updates.page))
      }
    }

    setSearchParams(nextSearchParams, { replace: true })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-card p-6 shadow-none [isolation:isolate] [backface-visibility:hidden] [-webkit-backface-visibility:hidden] sm:shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-brand-primary">Aprobaciones</p>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Solicitudes</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              {currentUserRole === 'SUPER_ADMIN'
                ? 'Revisa las acciones sensibles pendientes, compara el estado actual con el cambio propuesto y decide si deben ejecutarse.'
                : 'Consulta el estado de tus solicitudes, revisa rechazos o fallos y cancela las que ya no quieras mantener pendientes.'}
            </p>
          </div>
        </div>

        <div className="rounded-full bg-brand-soft/10 p-3 text-brand-primary">
          <ShieldCheck className="h-6 w-6" />
        </div>
      </div>

      {currentUserRole === 'ADMIN' ? <PendingApprovalsBanner /> : null}

      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <Tabs value={status} onValueChange={(value) => updateSearchParams({ status: value as ApprovalStatusFilter, page: 1 })}>
              <TabsList className="grid w-full grid-cols-5 xl:w-auto">
                {getApprovalStatusFilterOptions().map((value) => (
                  <TabsTrigger key={value} value={value}>
                    {value === 'ALL' ? 'Todas' : value === 'PENDING' ? 'Pendientes' : value === 'APPROVED' ? 'Aprobadas' : value === 'REJECTED' ? 'Rechazadas' : 'Fallidas'}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <div className="w-full xl:w-64">
              <Select value={resourceType} onValueChange={(value) => updateSearchParams({ resourceType: value as ResourceType | 'ALL', page: 1 })}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo de recurso" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos los recursos</SelectItem>
                  <SelectItem value="training">Entrenamientos</SelectItem>
                  <SelectItem value="diet">Dietas</SelectItem>
                  <SelectItem value="exercise">Ejercicios</SelectItem>
                  <SelectItem value="ingredient">Ingredientes</SelectItem>
                  <SelectItem value="meal">Comidas</SelectItem>
                  <SelectItem value="challenge">Retos</SelectItem>
                  <SelectItem value="achievement">Logros</SelectItem>
                  <SelectItem value="notification">Notificaciones</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {approvalRequestsQuery.isLoading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Cargando solicitudes...</div>
          ) : approvalRequestsQuery.isError ? (
            <div className="rounded-xl border border-status-error/20 bg-status-error/5 p-4 text-sm text-status-error">
              {getApiErrorMessage(approvalRequestsQuery.error, 'No se pudieron cargar las solicitudes')}
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/70 p-10 text-center text-sm text-muted-foreground">
              No hay solicitudes que coincidan con los filtros actuales.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-border/70">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {currentUserRole === 'SUPER_ADMIN' ? <TableHead>Solicitante</TableHead> : null}
                      <TableHead>Acción</TableHead>
                      <TableHead>Recurso</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Detalle</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((request) => (
                      <TableRow key={request.id}>
                        {currentUserRole === 'SUPER_ADMIN' ? (
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9 border border-border/60">
                                <AvatarImage
                                  src={request.requester.profile?.avatar_url ?? undefined}
                                  alt={getApprovalActorName(request.requester)}
                                />
                                <AvatarFallback>{getApprovalActorInitials(request.requester)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-foreground">{getApprovalActorName(request.requester)}</p>
                                <p className="text-xs text-muted-foreground">{request.requester.email}</p>
                              </div>
                            </div>
                          </TableCell>
                        ) : null}
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-medium text-foreground">{getApprovalActionLabel(request.action_type)}</p>
                            <Badge variant="outline" className="border-border bg-muted text-muted-foreground">
                              {getApprovalResourceLabel(request.resource_type)}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{getApprovalResourceName(request)}</TableCell>
                        <TableCell>
                          <ApprovalStatusBadge status={request.status} />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{getRelativeApprovalDate(request.created_at)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => setSelectedRequestId(request.id)}>
                            Ver detalle
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 ? (
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    Página {page} de {totalPages}
                  </span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => updateSearchParams({ page: page - 1 })}>
                      Anterior
                    </Button>
                    <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => updateSearchParams({ page: page + 1 })}>
                      Siguiente
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      <ApprovalDetailDialog
        requestId={selectedRequestId}
        open={Boolean(selectedRequestId)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setSelectedRequestId(null)
          }
        }}
      />
    </div>
  )
}
