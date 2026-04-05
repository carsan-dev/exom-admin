import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuth } from '@/hooks/use-auth'
import { getApiErrorMessage } from '@/lib/api-utils'
import { useApprovalRequest, useCancelApprovalRequest, useResolveApprovalRequest } from '../api'
import { resolveApprovalRequestSchema } from '../schemas'
import {
  buildAdminApprovalDetailView,
  buildSuperAdminApprovalDetailView,
  getApprovalActionLabel,
  getApprovalActorInitials,
  getApprovalActorName,
  getApprovalResourceLabel,
  getApprovalResourceName,
  getRelativeApprovalDate,
  hasTechnicalApprovalDetail,
  type SuperAdminApprovalRequestDetail,
} from '../types'
import { ApprovalStatusBadge } from './approval-status-badge'

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function formatValue(value: unknown) {
  if (value === undefined) {
    return '—'
  }

  if (value === null) {
    return 'null'
  }

  if (typeof value === 'string') {
    return value
  }

  return JSON.stringify(value, null, 2)
}

function buildComparisonRows(request: SuperAdminApprovalRequestDetail) {
  const current = isRecord(request.current_resource) ? request.current_resource : {}
  const payload = isRecord(request.payload) ? request.payload : {}
  const keys = [...new Set([...Object.keys(current), ...Object.keys(payload)])]

  return keys.map((key) => {
    const currentValue = current[key]
    const nextValue = payload[key]
    return {
      key,
      currentValue,
      nextValue,
      changed: JSON.stringify(currentValue ?? null) !== JSON.stringify(nextValue ?? null),
    }
  })
}

interface ApprovalDetailDialogProps {
  requestId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ApprovalDetailDialog({ requestId, open, onOpenChange }: ApprovalDetailDialogProps) {
  const currentUserRole = useAuth((state) => state.user?.role ?? 'ADMIN')
  const requestQuery = useApprovalRequest(requestId ?? undefined, open)
  const resolveRequest = useResolveApprovalRequest()
  const cancelRequest = useCancelApprovalRequest()

  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)

  useEffect(() => {
    if (!open) {
      setRejectionReason('')
      setShowRejectForm(false)
    }
  }, [open])

  const request = requestQuery.data
  const technicalRequest = request && hasTechnicalApprovalDetail(request) ? request : null
  const comparisonRows = useMemo(() => (technicalRequest ? buildComparisonRows(technicalRequest) : []), [technicalRequest])
  const adminDetailView = useMemo(() => (request ? buildAdminApprovalDetailView(request) : null), [request])
  const superAdminDetailView = useMemo(
    () => (technicalRequest ? buildSuperAdminApprovalDetailView(technicalRequest) : null),
    [technicalRequest],
  )
  const canResolve = currentUserRole === 'SUPER_ADMIN' && request?.status === 'PENDING'
  const canCancel = currentUserRole === 'ADMIN' && request?.status === 'PENDING'

  const handleApprove = async () => {
    if (!request) {
      return
    }

    const confirmed = window.confirm('¿Seguro que quieres ejecutar esta acción aprobada?')
    if (!confirmed) {
      return
    }

    try {
      await resolveRequest.mutateAsync({ id: request.id, values: { action: 'approve' } })
      toast.success('Solicitud aprobada y ejecutada correctamente')
      onOpenChange(false)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'No se ha podido aprobar la solicitud'))
    }
  }

  const handleReject = async () => {
    if (!request) {
      return
    }

    const parsed = resolveApprovalRequestSchema.safeParse({
      action: 'reject',
      rejection_reason: rejectionReason,
    })

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Revisa el motivo de rechazo')
      return
    }

    try {
      await resolveRequest.mutateAsync({ id: request.id, values: parsed.data })
      toast.success('Solicitud rechazada correctamente')
      onOpenChange(false)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'No se ha podido rechazar la solicitud'))
    }
  }

  const handleCancel = async () => {
    if (!request) {
      return
    }

    try {
      await cancelRequest.mutateAsync(request.id)
      toast.success('Solicitud cancelada correctamente')
      onOpenChange(false)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'No se ha podido cancelar la solicitud'))
    }
  }

  return (
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Detalle de solicitud</DialogTitle>
          <DialogDescription>
            {currentUserRole === 'SUPER_ADMIN'
              ? 'Revisa el contexto funcional y el diff técnico antes de aprobar o rechazar esta solicitud.'
              : 'Consulta el contexto de negocio de tu solicitud, su estado y si todavía puedes cancelarla.'}
          </DialogDescription>
        </DialogHeader>

        {requestQuery.isLoading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Cargando detalle...</div>
        ) : requestQuery.isError || !request ? (
          <div className="rounded-xl border border-status-error/20 bg-status-error/5 p-4 text-sm text-status-error">
            {getApiErrorMessage(requestQuery.error, 'No se pudo cargar el detalle de la solicitud')}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col gap-4 rounded-xl border border-border/70 bg-muted/20 p-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-11 w-11 border border-border/60">
                    <AvatarImage
                      src={request.requester.profile?.avatar_url ?? undefined}
                      alt={getApprovalActorName(request.requester)}
                    />
                    <AvatarFallback>{getApprovalActorInitials(request.requester)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-foreground">{getApprovalActorName(request.requester)}</p>
                    <p className="text-sm text-muted-foreground">{request.requester.email}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span>{getRelativeApprovalDate(request.created_at)}</span>
                  <span>·</span>
                  <span>{getApprovalActionLabel(request.action_type)}</span>
                  <span>·</span>
                  <Badge variant="outline" className="border-border bg-background text-muted-foreground">
                    {getApprovalResourceLabel(request.resource_type)}
                  </Badge>
                </div>
              </div>

              <ApprovalStatusBadge status={request.status} />
            </div>

            <section className="space-y-2">
              <h3 className="font-medium text-foreground">Resumen</h3>
              <div className="rounded-xl border border-border/70 bg-background p-4 text-sm text-muted-foreground">
                <p>
                  {adminDetailView?.summary}
                </p>
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="font-medium text-foreground">Contexto</h3>
              <div className="grid gap-3 md:grid-cols-2">
                {(currentUserRole === 'SUPER_ADMIN' ? superAdminDetailView : adminDetailView)?.facts.map((fact) => (
                  <div key={fact.label} className="rounded-xl border border-border/70 bg-background p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{fact.label}</p>
                    <p className="mt-2 text-sm text-foreground">{fact.value}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="font-medium text-foreground">Recurso afectado</h3>
              <div className="rounded-xl border border-border/70 bg-background p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-foreground">{getApprovalResourceName(request)}</p>
                  <Badge variant="outline" className="border-border bg-muted text-muted-foreground">
                    {getApprovalResourceLabel(request.resource_type)}
                  </Badge>
                </div>

                {request.resource_deleted ? (
                  <div className="mt-4 flex items-start gap-3 rounded-xl border border-orange-500/20 bg-orange-500/5 p-4 text-sm text-orange-700">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>Este recurso ya no existe en el estado actual del sistema.</p>
                  </div>
                ) : null}

                {currentUserRole === 'SUPER_ADMIN' && technicalRequest ? (
                  technicalRequest.action_type.endsWith('.update') ? (
                    <div className="mt-4 overflow-hidden rounded-xl border border-border/70">
                      <div className="grid grid-cols-[180px_1fr_1fr] border-b border-border bg-muted/40 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <span>Campo</span>
                        <span>Estado actual</span>
                        <span>Cambio propuesto</span>
                      </div>
                      {comparisonRows.map((row) => (
                        <div
                          key={row.key}
                          className={`grid grid-cols-[180px_1fr_1fr] gap-4 border-b border-border px-4 py-3 text-sm last:border-b-0 ${
                            row.changed ? 'bg-brand-soft/5' : 'bg-background'
                          }`}
                        >
                          <span className="font-medium text-foreground">{row.key}</span>
                          <pre className="overflow-x-auto whitespace-pre-wrap text-muted-foreground">{formatValue(row.currentValue)}</pre>
                          <pre className={`overflow-x-auto whitespace-pre-wrap ${row.changed ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {formatValue(row.nextValue)}
                          </pre>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-4 grid gap-4 lg:grid-cols-2">
                      <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                        <p className="mb-2 text-sm font-medium text-foreground">
                          {request.action_type.endsWith('.delete') ? 'Estado actual' : 'Payload solicitado'}
                        </p>
                          <pre className="overflow-x-auto whitespace-pre-wrap text-xs text-muted-foreground">
                            {technicalRequest.action_type.endsWith('.delete')
                              ? JSON.stringify(technicalRequest.current_resource ?? {}, null, 2)
                              : superAdminDetailView?.rawPayload}
                          </pre>
                        </div>

                      {technicalRequest.action_type.endsWith('.delete') ? null : (
                        <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                          <p className="mb-2 text-sm font-medium text-foreground">Estado actual</p>
                          <pre className="overflow-x-auto whitespace-pre-wrap text-xs text-muted-foreground">
                            {JSON.stringify(technicalRequest.current_resource ?? {}, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )
                ) : null}
              </div>
            </section>

            {adminDetailView?.requestReason ? (
              <section className="rounded-xl border border-brand-primary/15 bg-brand-soft/10 p-4 text-sm text-foreground">
                <p className="font-medium">Motivo de la solicitud</p>
                <p className="mt-1 text-muted-foreground">{adminDetailView.requestReason}</p>
              </section>
            ) : null}

            {request.status === 'REJECTED' && request.rejection_reason ? (
              <section className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 text-sm text-rose-700">
                <p className="font-medium">Motivo de rechazo</p>
                <p className="mt-1">{request.rejection_reason}</p>
              </section>
            ) : null}

            {request.status === 'FAILED' && request.failure_reason ? (
              <section className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-4 text-sm text-orange-700">
                <p className="font-medium">La ejecución aprobada falló</p>
                <p className="mt-1">{request.failure_reason}</p>
              </section>
            ) : null}

            {request.status !== 'PENDING' && adminDetailView?.outcomeReason && request.status !== 'REJECTED' && request.status !== 'FAILED' ? (
              <section className="rounded-xl border border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Resultado</p>
                <p className="mt-1">{adminDetailView.outcomeReason}</p>
              </section>
            ) : null}

            {canResolve && showRejectForm ? (
              <div className="space-y-2 rounded-xl border border-border/70 bg-muted/20 p-4">
                <label htmlFor="approval-rejection-reason" className="text-sm font-medium text-foreground">
                  Motivo de rechazo
                </label>
                <textarea
                  id="approval-rejection-reason"
                  value={rejectionReason}
                  onChange={(event) => setRejectionReason(event.target.value)}
                  rows={4}
                  placeholder="Explica claramente por qué se rechaza la acción."
                  className="flex w-full resize-none rounded-md border border-input bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
            ) : null}
          </div>
        )}

        <DialogFooter>
          {canCancel ? (
            <Button variant="outline" onClick={() => void handleCancel()} disabled={cancelRequest.isPending}>
              {cancelRequest.isPending ? 'Cancelando...' : 'Cancelar solicitud'}
            </Button>
          ) : null}

          {canResolve ? (
            <>
              {showRejectForm ? (
                <Button variant="outline" onClick={() => setShowRejectForm(false)} disabled={resolveRequest.isPending}>
                  Ocultar rechazo
                </Button>
              ) : (
                <Button variant="outline" onClick={() => setShowRejectForm(true)} disabled={resolveRequest.isPending}>
                  Rechazar
                </Button>
              )}

              {showRejectForm ? (
                <Button variant="destructive" onClick={() => void handleReject()} disabled={resolveRequest.isPending}>
                  {resolveRequest.isPending ? 'Guardando...' : 'Confirmar rechazo'}
                </Button>
              ) : (
                <Button onClick={() => void handleApprove()} disabled={resolveRequest.isPending}>
                  {resolveRequest.isPending ? 'Ejecutando...' : 'Aprobar y ejecutar'}
                </Button>
              )}
            </>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
