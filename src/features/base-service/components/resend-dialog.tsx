import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { getApiErrorMessage, isNotConfiguredError, useBaseSubscriber, useResendDelivery } from '../api'
import { Skeleton } from '@/components/ui/skeleton'
import { canResendDelivery, getResendMessage, NOT_CONFIGURED_HELP, NOT_CONFIGURED_TITLE } from '../labels'
import type { BaseDelivery } from '../types'

interface ResendDialogProps {
  /** Null while the delivery is still being loaded (row flow); the detail flow always passes one. */
  delivery: BaseDelivery | null
  /** Month to title the dialog while `delivery` is still null. */
  pendingMonth?: number
  /** The delivery could not be loaded: shows the error state with `onRetry`. */
  loadFailed?: boolean
  onRetry?: () => void
  onCloseAutoFocus?: (event: Event) => void
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ResendDialog({ delivery, pendingMonth, loadFailed = false, onRetry, onCloseAutoFocus, open, onOpenChange }: ResendDialogProps) {
  const resend = useResendDelivery()
  // The resend goes to the CURRENT subscriber data, so read it fresh whenever the dialog opens.
  const subscriberQuery = useBaseSubscriber(open && delivery ? delivery.subscriber_id : null)
  const month = delivery?.month ?? pendingMonth
  const refetchSubscriber = subscriberQuery.refetch
  const [error, setError] = useState<string | null>(null)
  const inFlight = useRef(false)
  const subscriber = subscriberQuery.data

  useEffect(() => {
    if (open) void refetchSubscriber()
  }, [open, refetchSubscriber])

  const close = (value: boolean) => {
    if (inFlight.current) return
    if (!value) setError(null)
    onOpenChange(value)
  }

  const confirm = async () => {
    if (!delivery || inFlight.current) return
    inFlight.current = true
    setError(null)
    try {
      await resend.mutateAsync({ subscriberId: delivery.subscriber_id, deliveryId: delivery.id })
      toast.success(`Mes ${delivery.month} en cola para reenviar`)
      onOpenChange(false)
    } catch (cause) {
      setError(
        isNotConfiguredError(cause)
          ? `${NOT_CONFIGURED_TITLE} ${NOT_CONFIGURED_HELP}`
          : getApiErrorMessage(cause, 'No se ha podido reenviar el mes. Inténtalo de nuevo.'),
      )
    } finally {
      inFlight.current = false
    }
  }

  const lines = delivery && subscriber ? getResendMessage(delivery, subscriber) : []
  const loading = !delivery && !loadFailed
  // Judged on the FRESH delivery and subscriber, never on the possibly stale list row.
  const blockedText =
    delivery?.status === 'PENDING'
      ? 'Este envío ya está en curso.'
      : delivery && subscriber && !subscriberQuery.isFetching && !canResendDelivery(delivery, subscriber)
        ? 'El suscriptor está archivado.'
        : null

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent onCloseAutoFocus={onCloseAutoFocus}>
        <DialogHeader>
          <DialogTitle>Reenviar mes {month}</DialogTitle>
          <DialogDescription>
            {blockedText ?? (loadFailed ? 'No se ha podido comprobar el envío.' : (lines[0] ?? 'Comprobando los datos actuales del suscriptor…'))}
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Úsalo cuando al cliente no le ha llegado o lo ha perdido. Se envía al email actual del suscriptor, no al de la
          vez anterior.
        </p>
        {loading && (
          <div className="space-y-2" aria-busy="true">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        )}
        {!blockedText &&
          lines.slice(1).map((line) => (
            <p key={line} className="text-sm">
              {line}
            </p>
          ))}
        {!blockedText && delivery?.status === 'SENT' && (
          <p className="text-sm text-muted-foreground">Mientras se reenvía no podrás enviar el mes siguiente.</p>
        )}
        {loadFailed && (
          <p role="alert" className="text-sm text-destructive">
            No se ha podido cargar el envío. Inténtalo de nuevo.
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <DialogFooter>
          {blockedText || loadFailed ? (
            <>
              <Button variant="outline" onClick={() => close(false)}>
                Cerrar
              </Button>
              {loadFailed && onRetry && <Button onClick={onRetry}>Reintentar</Button>}
            </>
          ) : (
            <>
              <Button variant="outline" disabled={resend.isPending} onClick={() => close(false)}>
                Cancelar
              </Button>
              <Button disabled={!delivery || !subscriber || subscriberQuery.isFetching || resend.isPending} onClick={confirm}>
                Reenviar mes {month}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
