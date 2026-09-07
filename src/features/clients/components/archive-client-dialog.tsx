import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { getApiErrorMessage, useArchiveClient } from '../api'
import { getUserDisplayName, type Client } from '../types'

export function ArchiveClientDialog({ client, open, onOpenChange }: {
  client: Client | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const mutation = useArchiveClient()
  const [error, setError] = useState<string | null>(null)
  const restoring = Boolean(client?.is_archived)
  const close = (value: boolean) => {
    if (mutation.isPending) return
    setError(null)
    onOpenChange(value)
  }
  const confirm = async () => {
    if (!client || mutation.isPending) return
    setError(null)
    try {
      const result = await mutation.mutateAsync({ clientId: client.id, is_archived: !restoring })
      toast.success(result.message)
      onOpenChange(false)
    } catch (cause) {
      setError(getApiErrorMessage(cause, 'No se ha podido cambiar el archivado. Inténtalo de nuevo.'))
    }
  }
  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{restoring ? 'Desarchivar cliente' : 'Archivar cliente'}</DialogTitle>
          <DialogDescription>
            {client ? getUserDisplayName(client) : 'El cliente'} {restoring
              ? 'volverá a aparecer en el listado principal.'
              : 'se ocultará del listado principal. Podrás encontrarlo en Archivados y desarchivarlo cuando quieras.'}
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">Se conservan todos sus datos. Su situación de alta o baja, acceso a la App y recordatorios no cambian.</p>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" disabled={mutation.isPending} onClick={() => close(false)}>Cancelar</Button>
          <Button disabled={!client || mutation.isPending} onClick={confirm}>
            {mutation.isPending ? 'Guardando…' : restoring ? 'Confirmar desarchivado' : 'Confirmar archivado'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
