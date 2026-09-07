import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { getApiErrorMessage } from '../api'
import { useDeleteClient } from '../deletion-api'
import { getUserDisplayName, type Client } from '../types'

export function DeleteClientDialog({ client, open, onOpenChange }: {
  client: Client
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const mutation = useDeleteClient()
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const close = (value: boolean) => {
    if (mutation.isPending) return
    setConfirmation('')
    setError(null)
    onOpenChange(value)
  }
  const confirm = async () => {
    if (confirmation !== 'ELIMINAR' || mutation.isPending) return
    setError(null)
    try {
      const operation = await mutation.mutateAsync(client.id)
      if (operation.status === 'COMPLETED') toast.success('Eliminación completada')
      else toast.info('Eliminación solicitada. Puedes seguir su estado en Eliminaciones recientes.')
      setConfirmation('')
      onOpenChange(false)
    } catch (cause) {
      setError(getApiErrorMessage(cause, 'No se pudo confirmar la solicitud. Consulta Eliminaciones recientes antes de repetirla.'))
    }
  }
  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eliminar cliente permanentemente</DialogTitle>
          <DialogDescription>Vas a eliminar a {getUserDisplayName(client)} ({client.email}). Esta acción no se puede deshacer.</DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">Perderá el acceso y se eliminarán su cuenta, historial, asignaciones, métricas, feedback y archivos propios. Los entrenamientos y dietas compartidos se conservan.</p>
        <p className="text-sm text-muted-foreground">Si solo quieres ocultarlo del listado, utiliza Archivar.</p>
        <Label htmlFor="delete-client-confirmation">Escribe ELIMINAR para confirmar</Label>
        <Input id="delete-client-confirmation" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" disabled={mutation.isPending} />
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" disabled={mutation.isPending} onClick={() => close(false)}>Cancelar</Button>
          <Button variant="destructive" disabled={confirmation !== 'ELIMINAR' || mutation.isPending} onClick={confirm}>
            {mutation.isPending ? 'Solicitando eliminación…' : 'Eliminar permanentemente'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
