import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { getApiErrorMessage, useBaseDeliveries, useBaseSubscriber } from '../api'
import { canResendDelivery, formatDateTime, formatRoute, getAmbiguityWarning, getSendFailureExplanation } from '../labels'
import type { BaseDelivery, BaseSubscriber } from '../types'
import { ArchiveSubscriberDialog } from './archive-subscriber-dialog'
import { DeliveryStatusBadge } from './delivery-status-badge'
import { ResendDialog } from './resend-dialog'

interface SubscriberDetailDialogProps {
  subscriberId: string | null
  onClose: () => void
  onEdit: (subscriber: BaseSubscriber) => void
}

function DeliveryItem({
  delivery,
  subscriber,
  onResend,
}: {
  delivery: BaseDelivery
  subscriber: BaseSubscriber
  onResend: (delivery: BaseDelivery) => void
}) {
  const routeDiffers =
    delivery.snapshot_goal !== subscriber.goal || delivery.snapshot_days_per_week !== subscriber.days_per_week
  const emailDiffers = delivery.snapshot_email !== subscriber.email
  const canResend = canResendDelivery(delivery, subscriber)

  return (
    <li className="space-y-2 rounded-lg border p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">Mes {delivery.month}</span>
          <DeliveryStatusBadge status={delivery.status} />
        </div>
        {canResend && (
          <Button
            size="sm"
            variant="outline"
            aria-label={`Reenviar mes ${delivery.month}`}
            onClick={() => onResend(delivery)}
          >
            Reenviar
          </Button>
        )}
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-muted-foreground">
        <dt>Solicitado</dt>
        <dd className="text-foreground">{formatDateTime(delivery.requested_at)}</dd>
        <dt>Enviado</dt>
        <dd className="text-foreground">{formatDateTime(delivery.sent_at)}</dd>
        {emailDiffers && (
          <>
            <dt>Enviado a</dt>
            <dd className="break-all text-foreground">{delivery.snapshot_email}</dd>
          </>
        )}
        {routeDiffers && (
          <>
            <dt>Ruta de este mes</dt>
            <dd className="text-foreground">
              {formatRoute(delivery.snapshot_goal, delivery.snapshot_days_per_week)}
            </dd>
          </>
        )}
      </dl>

      {delivery.files.length > 0 && (
        <ul className="list-disc pl-4 text-xs text-muted-foreground">
          {delivery.files.map((file) => (
            <li key={file.filename} className="break-all">
              {file.filename}
            </li>
          ))}
        </ul>
      )}

      {delivery.status === 'FAILED' && (
        <div role="note" className="rounded-md border border-status-error/40 bg-status-error/10 p-2 text-status-error">
          {getAmbiguityWarning(delivery) && <p className="font-medium">{getAmbiguityWarning(delivery)}</p>}
          <p>{getSendFailureExplanation(delivery.last_error)}</p>
          {delivery.last_error && <p className="mt-1 font-mono text-xs">{delivery.last_error}</p>}
        </div>
      )}

      {delivery.sends.length > 1 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground">Historial de envíos</p>
          <ul className="mt-1 space-y-1 text-xs">
            {delivery.sends.map((send) => (
              <li key={send.send_seq} className="space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span>Envío {send.send_seq}</span>
                  <DeliveryStatusBadge status={send.status} />
                  <span className="text-muted-foreground">{formatDateTime(send.sent_at ?? send.requested_at)}</span>
                </div>
                {send.snapshot_email && (
                  <p className="break-all text-muted-foreground">
                    A {send.snapshot_email}
                    {send.snapshot_name && send.snapshot_name !== subscriber.name ? ` (${send.snapshot_name})` : ''}
                  </p>
                )}
                {getAmbiguityWarning(send) && <p className="text-status-error">{getAmbiguityWarning(send)}</p>}
                {send.status === 'FAILED' && send.error && (
                  <p className="font-mono text-muted-foreground">{send.error}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </li>
  )
}

export function SubscriberDetailDialog({ subscriberId, onClose, onEdit }: SubscriberDetailDialogProps) {
  const subscriberQuery = useBaseSubscriber(subscriberId)
  const deliveriesQuery = useBaseDeliveries(subscriberId)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [resendTarget, setResendTarget] = useState<BaseDelivery | null>(null)
  const subscriber = subscriberQuery.data
  const deliveries = deliveriesQuery.data

  return (
    <>
      <Dialog open={subscriberId !== null} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{subscriber?.name ?? 'Suscriptor'}</DialogTitle>
            <DialogDescription>Datos del suscriptor y su historial de envíos.</DialogDescription>
          </DialogHeader>

          {subscriberQuery.isError ? (
            <p role="alert" className="text-sm text-destructive">
              {getApiErrorMessage(subscriberQuery.error, 'No se ha podido cargar el suscriptor.')}
            </p>
          ) : !subscriber ? (
            <div className="space-y-2" aria-busy="true">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : (
            <>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                <dt className="text-muted-foreground">Pedido</dt>
                <dd className="font-mono">{subscriber.order_code}</dd>
                <dt className="text-muted-foreground">Nombre</dt>
                <dd className="break-words">{subscriber.name}</dd>
                <dt className="text-muted-foreground">Email</dt>
                <dd className="break-all">{subscriber.email}</dd>
                <dt className="text-muted-foreground">Ruta</dt>
                <dd>{formatRoute(subscriber.goal, subscriber.days_per_week)}</dd>
                <dt className="text-muted-foreground">Notas</dt>
                <dd className="whitespace-pre-wrap break-words">{subscriber.notes ?? '—'}</dd>
                <dt className="text-muted-foreground">Alta</dt>
                <dd>{formatDateTime(subscriber.created_at)}</dd>
                <dt className="text-muted-foreground">Estado</dt>
                <dd>
                  {subscriber.is_archived
                    ? `Archivado el ${formatDateTime(subscriber.archived_at)}`
                    : 'Activo'}
                </dd>
              </dl>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => onEdit(subscriber)}>
                  Editar
                </Button>
                <Button variant="outline" onClick={() => setArchiveOpen(true)}>
                  {subscriber.is_archived ? 'Reactivar' : 'Archivar'}
                </Button>
              </div>

              <section aria-labelledby="base-service-history" className="space-y-2">
                <h3 id="base-service-history" className="text-sm font-semibold text-foreground">
                  Historial de envíos
                </h3>
                {deliveriesQuery.isError ? (
                  <p role="alert" className="text-sm text-destructive">
                    {getApiErrorMessage(deliveriesQuery.error, 'No se ha podido cargar el historial.')}
                  </p>
                ) : !deliveries ? (
                  <Skeleton className="h-16 w-full" />
                ) : deliveries.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Todavía no se ha enviado ningún mes.</p>
                ) : (
                  <ul className="space-y-2">
                    {[...deliveries]
                      .sort((a, b) => a.month - b.month)
                      .map((delivery) => (
                        <DeliveryItem
                          key={delivery.id}
                          delivery={delivery}
                          subscriber={subscriber}
                          onResend={setResendTarget}
                        />
                      ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ArchiveSubscriberDialog subscriber={subscriber ?? null} open={archiveOpen} onOpenChange={setArchiveOpen} />
      <ResendDialog
        delivery={resendTarget}
        open={resendTarget !== null}
        onOpenChange={(open) => !open && setResendTarget(null)}
      />
    </>
  )
}
