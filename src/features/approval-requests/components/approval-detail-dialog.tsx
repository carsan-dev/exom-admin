import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tag } from '@/components/ui/tag'
import { useConfirmDialog } from '@/components/ui/use-confirm-dialog'
import { useAuth } from '@/hooks/use-auth'
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes'
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
  hasTechnicalApprovalDetail,
} from '../types'
import { ApprovalDate } from './approval-date'
import { ApprovalDiff } from './approval-diff'
import { ApprovalStatusBadge } from './approval-status-badge'

const SECTION_TITLE_CLASS = 'font-display text-xl font-extrabold uppercase leading-none text-foreground'

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
  const { confirm, dialog: confirmDialog } = useConfirmDialog()

  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)
  useUnsavedChanges(
    'approval-rejection',
    open && Boolean(rejectionReason.trim() || resolveRequest.isPending || cancelRequest.isPending),
  )

  useEffect(() => {
    if (!open) {
      setRejectionReason('')
      setShowRejectForm(false)
    }
  }, [open])

  const request = requestQuery.data
  const technicalRequest = request && hasTechnicalApprovalDetail(request) ? request : null
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

    const confirmed = await confirm({ title: '¿Seguro que quieres ejecutar esta acción aprobada?' })
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
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] min-w-0 grid-cols-[minmax(0,1fr)] overflow-y-auto sm:max-w-5xl">
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
            <div className="flex min-w-0 flex-col gap-4 border-y border-border py-4 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0 space-y-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar className="h-11 w-11 flex-none border border-border/60">
                    <AvatarImage
                      src={request.requester.profile?.avatar_url ?? undefined}
                      alt={getApprovalActorName(request.requester)}
                    />
                    <AvatarFallback>{getApprovalActorInitials(request.requester)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground [overflow-wrap:anywhere]">{getApprovalActorName(request.requester)}</p>
                    <p className="text-sm text-muted-foreground [overflow-wrap:anywhere]">{request.requester.email}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <ApprovalDate value={request.created_at} />
                  <span>·</span>
                  <span>{getApprovalActionLabel(request.action_type)}</span>
                  <span>·</span>
                  <Tag>{getApprovalResourceLabel(request.resource_type)}</Tag>
                </div>
              </div>

              <div className="self-start">
                <ApprovalStatusBadge status={request.status} />
              </div>
            </div>

            <section className="space-y-2">
              <h3 className={SECTION_TITLE_CLASS}>Resumen</h3>
              <p className="text-sm text-foreground-secondary [overflow-wrap:anywhere]">{adminDetailView?.summary}</p>
            </section>

            <section className="space-y-3">
              <h3 className={SECTION_TITLE_CLASS}>Contexto</h3>
              <dl className="grid gap-x-6 gap-y-4 md:grid-cols-2">
                {(currentUserRole === 'SUPER_ADMIN' ? superAdminDetailView : adminDetailView)?.facts.map((fact) => (
                  <div key={fact.label} className="min-w-0">
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{fact.label}</dt>
                    <dd className="mt-1 text-sm text-foreground [overflow-wrap:anywhere]">
                      {fact.label === 'Creada' ? (
                        <ApprovalDate value={request.created_at} />
                      ) : fact.label === 'Resuelta' && request.resolved_at ? (
                        <ApprovalDate value={request.resolved_at} />
                      ) : (
                        fact.value
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>

            <section className="min-w-0 space-y-3">
              <h3 className={SECTION_TITLE_CLASS}>Recurso afectado</h3>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-foreground [overflow-wrap:anywhere]">{getApprovalResourceName(request)}</p>
                <Tag>{getApprovalResourceLabel(request.resource_type)}</Tag>
              </div>

              {request.resource_deleted ? (
                <div className="flex items-start gap-3 rounded-xl border border-status-warning/30 bg-status-warning-soft p-4 text-sm text-status-warning">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>Este recurso ya no existe en el estado actual del sistema.</p>
                </div>
              ) : null}

              {currentUserRole === 'SUPER_ADMIN' && technicalRequest ? <ApprovalDiff request={technicalRequest} /> : null}
            </section>

            {adminDetailView?.requestReason ? (
              <section className="rounded-xl border border-brand-primary/15 bg-brand-soft/10 p-4 text-sm text-foreground">
                <p className="font-medium">Motivo de la solicitud</p>
                <p className="mt-1 text-muted-foreground">{adminDetailView.requestReason}</p>
              </section>
            ) : null}

            {request.status === 'REJECTED' && request.rejection_reason ? (
              <section className="rounded-xl border border-status-error/30 bg-status-error-soft p-4 text-sm text-status-error">
                <p className="font-medium">Motivo de rechazo</p>
                <p className="mt-1">{request.rejection_reason}</p>
              </section>
            ) : null}

            {request.status === 'FAILED' && request.failure_reason ? (
              <section className="rounded-xl border border-status-warning/30 bg-status-warning-soft p-4 text-sm text-status-warning">
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
      {confirmDialog}
    </>
  )
}
