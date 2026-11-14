import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { getApiErrorMessage, isNoResponseError, useArchiveSubscriber } from '../api'
import type { BaseSubscriber } from '../types'

interface ArchiveSubscriberDialogProps {
  subscriber: BaseSubscriber | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ArchiveSubscriberDialog({ subscriber, open, onOpenChange }: ArchiveSubscriberDialogProps) {
  const archive = useArchiveSubscriber()
  const [error, setError] = useState<string | null>(null)
  const [waiting, setWaiting] = useState(false)
  const inFlight = useRef(false)
  const restoring = Boolean(subscriber?.is_archived)

  useEffect(() => {
    if (!archive.isPending) {
      setWaiting(false)
      return
    }
    const timer = setTimeout(() => setWaiting(true), 5000)
    return () => clearTimeout(timer)
  }, [archive.isPending])

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
      await archive.mutateAsync({ id: subscriber.id, is_archived: !restoring })
      toast.success(restoring ? 'Suscriptor reactivado' : 'Suscriptor archivado')
      onOpenChange(false)
    } catch (cause) {
      setError(
        isNoResponseError(cause)
          ? 'No se obtuvo respuesta del servidor. Se ha recargado el estado del suscriptor: comprueba si el cambio se aplicó antes de repetirlo.'
          : getApiErrorMessage(cause, 'No se ha podido cambiar el estado. Inténtalo de nuevo.'),
      )
    } finally {
      inFlight.current = false
    }
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{restoring ? 'Reactivar suscriptor' : 'Archivar suscriptor'}</DialogTitle>
          <DialogDescription>
            {restoring
              ? `${subscriber?.name ?? 'El suscriptor'} volverá a poder recibir envíos.`
              : 'No recibirá más envíos. Su historial se conserva.'}
          </DialogDescription>
        </DialogHeader>
        {waiting && (
          <p role="status" className="text-sm text-muted-foreground">
            Esperando a que termine un envío en curso…
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" disabled={archive.isPending} onClick={() => close(false)}>
            Cancelar
          </Button>
          <Button disabled={!subscriber || archive.isPending} onClick={confirm}>
            {archive.isPending ? 'Guardando…' : restoring ? 'Reactivar' : 'Archivar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
