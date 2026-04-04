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
  role?: string
  profile: {
    first_name: string
    last_name: string
  } | null
}

interface UnlockDialogProps {
  user: UnlockTarget | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UnlockDialog({ user, open, onOpenChange }: UnlockDialogProps) {
  const unlockUser = useUnlockUser()

  const handleUnlock = async () => {
    if (!user) {
      return
    }

    try {
      await unlockUser.mutateAsync(user.id)
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
            Vas a restaurar el acceso de {user ? getUserDisplayName(user) : 'este usuario'}.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-status-warning/20 bg-status-warning/10 p-4 text-sm text-foreground">
          La cuenta recuperará el acceso al panel y se reiniciarán sus intentos de login fallidos.
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
