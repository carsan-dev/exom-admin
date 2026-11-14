import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { getApiErrorMessage, isNotConfiguredError, useSendMonth } from '../api'
import { formatRoute, NOT_CONFIGURED_HELP, NOT_CONFIGURED_TITLE } from '../labels'
import type { BaseSubscriber } from '../types'

interface SendMonthDialogProps {
  subscriber: BaseSubscriber | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SendMonthDialog({ subscriber, open, onOpenChange }: SendMonthDialogProps) {
  const sendMonth = useSendMonth()
  const [error, setError] = useState<string | null>(null)
  const inFlight = useRef(false)
  const month = subscriber?.next_month ?? 1

  const close = (value: boolean) => {
    if (inFlight.current) return
    if (!value) setError(null)
    onOpenChange(value)
  }

  const confirm = async () => {
    if (!subscriber || inFlight.current) return
    inFlight.current = true
    setError(null)
    try {
      await sendMonth.mutateAsync({ id: subscriber.id, month })
      toast.success(`Mes ${month} en cola para ${subscriber.email}`)
      onOpenChange(false)
    } catch (cause) {
      setError(
        isNotConfiguredError(cause)
          ? `${NOT_CONFIGURED_TITLE} ${NOT_CONFIGURED_HELP}`
          : getApiErrorMessage(cause, 'No se ha podido enviar el mes. Inténtalo de nuevo.'),
      )
    } finally {
      inFlight.current = false
    }
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enviar mes {month}</DialogTitle>
          <DialogDescription>
            Confirma que ha pagado este mes. Se enviará un email con los PDF adjuntos y no se puede deshacer.
          </DialogDescription>
        </DialogHeader>

        {subscriber && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Destinatario</dt>
            <dd className="min-w-0 break-words">
              {subscriber.name} ({subscriber.email})
            </dd>
            <dt className="text-muted-foreground">Ruta</dt>
            <dd>{formatRoute(subscriber.goal, subscriber.days_per_week)}</dd>
            <dt className="text-muted-foreground">Mes</dt>
            <dd>Mes {month}</dd>
            <dt className="text-muted-foreground">Adjuntos</dt>
            <dd>
              <ul className="list-disc pl-4">
                <li>Bloque de entrenamiento del mes {month}</li>
                <li>Guía de nutrición del mes {month}</li>
                {month === 1 && <li>Guía de inicio</li>}
              </ul>
            </dd>
          </dl>
        )}

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" disabled={sendMonth.isPending} onClick={() => close(false)}>
            Cancelar
          </Button>
          <Button disabled={!subscriber || sendMonth.isPending} onClick={confirm}>
            Enviar mes {month}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
