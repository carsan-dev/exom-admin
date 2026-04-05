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
import { getApiErrorMessage, useDeleteExercise } from '../api'
import type { Exercise } from '../types'

interface DeleteExerciseDialogProps {
  exercise: Exercise | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted?: () => void
}

export function DeleteExerciseDialog({ exercise, open, onOpenChange, onDeleted }: DeleteExerciseDialogProps) {
  const deleteExercise = useDeleteExercise()

  const handleDelete = async () => {
    if (!exercise) return

    try {
      await deleteExercise.mutateAsync(exercise.id)
      toast.success(`"${exercise.name}" ha sido eliminado`)
      onDeleted?.()
      onOpenChange(false)
    } catch (error) {
      if (isApprovalPendingError(error)) {
        onOpenChange(false)
        return
      }

      toast.error(getApiErrorMessage(error, 'No se ha podido eliminar el ejercicio'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Eliminar ejercicio</DialogTitle>
          <DialogDescription>
            ¿Eliminar <strong>{exercise?.name}</strong>? El ejercicio dejará de estar disponible pero sus datos se conservarán.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteExercise.isPending}
          >
            {deleteExercise.isPending ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
