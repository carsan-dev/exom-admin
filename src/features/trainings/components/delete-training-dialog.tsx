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
import { getApiErrorMessage, useDeleteTraining } from '../api'
import type { Training } from '../types'

interface DeleteTrainingDialogProps {
  training: Training | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted?: () => void
}

export function DeleteTrainingDialog({ training, open, onOpenChange, onDeleted }: DeleteTrainingDialogProps) {
  const deleteTraining = useDeleteTraining()

  const handleDelete = async () => {
    if (!training) return

    try {
      await deleteTraining.mutateAsync(training.id)
      toast.success(`"${training.name}" ha sido eliminado`)
      onDeleted?.()
      onOpenChange(false)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'No se ha podido eliminar el entrenamiento'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Eliminar entrenamiento</DialogTitle>
          <DialogDescription>
            ¿Eliminar <strong>{training?.name}</strong>? El entrenamiento dejará de estar disponible para asignaciones.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteTraining.isPending}
          >
            {deleteTraining.isPending ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
