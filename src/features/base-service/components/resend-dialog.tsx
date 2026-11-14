import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { getApiErrorMessage, isNotConfiguredError, useBaseSubscriber, useResendDelivery } from '../api'
import { getResendMessage, NOT_CONFIGURED_HELP, NOT_CONFIGURED_TITLE } from '../labels'
import type { BaseDelivery } from '../types'

interface ResendDialogProps {
  delivery: BaseDelivery | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ResendDialog({ delivery, open, onOpenChange }: ResendDialogProps) {
  const resend = useResendDelivery()
  // The resend goes to the CURRENT subscriber data, so read it fresh whenever the dialog opens.
  const subscriberQuery = useBaseSubscriber(open && delivery ? delivery.subscriber_id : null)
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

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reenviar mes {delivery?.month}</DialogTitle>
          <DialogDescription>{lines[0] ?? 'Comprobando los datos actuales del suscriptor…'}</DialogDescription>
        </DialogHeader>
        {lines.slice(1).map((line) => (
          <p key={line} className="text-sm">
            {line}
          </p>
        ))}
        {delivery?.status === 'SENT' && (
          <p className="text-sm text-muted-foreground">Mientras se reenvía no podrás enviar el mes siguiente.</p>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" disabled={resend.isPending} onClick={() => close(false)}>
            Cancelar
          </Button>
          <Button disabled={!delivery || !subscriber || subscriberQuery.isFetching || resend.isPending} onClick={confirm}>
            Reenviar mes {delivery?.month}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
