import { ShieldAlert, ShieldCheck } from 'lucide-react'
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
import { useAuth } from '@/hooks/use-auth'
import { getApiErrorMessage, useUpdateUserStatus } from '../api'
import { getUserDisplayName, ROLE_LABELS, type Role } from '../types'

interface ToggleUserStatusTarget {
  id: string
  email: string
  role: Role
  is_active: boolean
  profile: {
    first_name: string
    last_name: string
  } | null
}

interface ToggleUserStatusDialogProps {
  user: ToggleUserStatusTarget | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ToggleUserStatusDialog({ user, open, onOpenChange }: ToggleUserStatusDialogProps) {
  const currentUserId = useAuth((state) => state.user?.id)
  const updateUserStatus = useUpdateUserStatus()
  const nextStatus = user ? !user.is_active : false
  const isOwnAccount = user?.id === currentUserId

  const handleConfirm = async () => {
    if (!user) {
      return
    }

    try {
      const result = await updateUserStatus.mutateAsync({
        userId: user.id,
        is_active: nextStatus,
      })

      toast.success(result.message)
      onOpenChange(false)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'No se ha podido actualizar el estado de la cuenta'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{nextStatus ? 'Reactivar cuenta' : 'Dar de baja cuenta'}</DialogTitle>
          <DialogDescription>
            {isOwnAccount
              ? 'Tu propia cuenta no se puede activar o desactivar desde esta pantalla.'
              : nextStatus
              ? `La cuenta de ${user ? getUserDisplayName(user) : 'este usuario'} volverá a estar operativa con rol ${user ? ROLE_LABELS[user.role] : 'usuario'}.`
              : `La cuenta de ${user ? getUserDisplayName(user) : 'este usuario'} dejará de poder iniciar sesión hasta que la reactives.`}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-border/70 bg-muted/30 p-4 text-sm text-foreground">
          <div className="flex items-start gap-3">
            <div className={nextStatus ? 'rounded-full bg-status-success/10 p-2 text-status-success' : 'rounded-full bg-status-warning/10 p-2 text-status-warning'}>
              {nextStatus ? <ShieldCheck className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
            </div>
            <p>
              {isOwnAccount
                ? 'Esta restricción evita que cierres tu propio acceso por error.'
                : nextStatus
                ? 'La cuenta recuperará acceso al panel y podrá volver a operar con normalidad.'
                : 'Se conservarán sus datos, pero se bloqueará el acceso hasta nueva activación.'}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant={nextStatus ? 'default' : 'destructive'}
            onClick={handleConfirm}
            disabled={updateUserStatus.isPending || !user || isOwnAccount}
          >
            {updateUserStatus.isPending
              ? nextStatus
                ? 'Reactivando...'
                : 'Dando de baja...'
              : nextStatus
                ? 'Confirmar reactivación'
                : 'Confirmar baja'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
