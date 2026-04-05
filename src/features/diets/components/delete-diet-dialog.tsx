import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { isApprovalPendingError } from '@/lib/api-utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getApiErrorMessage, useDeleteDiet } from '../api'
import type { Diet } from '../types'

interface DeleteDietDialogProps {
  diet: Diet | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted?: () => void
}

export function DeleteDietDialog({ diet, open, onOpenChange, onDeleted }: DeleteDietDialogProps) {
  const deleteDiet = useDeleteDiet()

  const handleDelete = async () => {
    if (!diet) return

    try {
      await deleteDiet.mutateAsync(diet.id)
      toast.success(`"${diet.name}" ha sido eliminada`)
      onDeleted?.()
      onOpenChange(false)
    } catch (error) {
      if (isApprovalPendingError(error)) {
        onOpenChange(false)
        return
      }

      toast.error(getApiErrorMessage(error, 'No se ha podido eliminar la dieta'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Eliminar dieta</DialogTitle>
          <DialogDescription>
            ¿Eliminar <strong>{diet?.name}</strong>? La dieta dejará de estar disponible para asignaciones.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteDiet.isPending}
          >
            {deleteDiet.isPending ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
