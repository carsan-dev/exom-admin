import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getApiErrorMessage, useUnlockUser } from '../api'
import { getUserDisplayName } from '../types'

interface UnlockTarget {
  id: string
  email: string
  profile: {
    first_name: string
    last_name: string
  } | null
}

interface UnlockDialogProps {
  client: UnlockTarget | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UnlockDialog({ client, open, onOpenChange }: UnlockDialogProps) {
  const unlockUser = useUnlockUser()

  const handleUnlock = async () => {
    if (!client) {
      return
    }

    try {
      await unlockUser.mutateAsync(client.id)
      toast.success('Cuenta desbloqueada correctamente')
      onOpenChange(false)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'No se ha podido desbloquear la cuenta'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Desbloquear cuenta</DialogTitle>
          <DialogDescription>
            Vas a restaurar el acceso de {client ? getUserDisplayName(client) : 'este cliente'}.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-status-warning/20 bg-status-warning/10 p-4 text-sm text-foreground">
          La cuenta recuperara el acceso al panel y se reiniciaran sus intentos de login fallidos.
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleUnlock} disabled={unlockUser.isPending}>
            {unlockUser.isPending ? 'Desbloqueando...' : 'Confirmar desbloqueo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
