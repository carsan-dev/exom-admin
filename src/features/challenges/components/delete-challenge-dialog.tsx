import type { MouseEvent } from 'react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { getApiErrorMessage, useDeleteChallenge } from '../api'
import type { ChallengeListItem } from '../types'

interface DeleteChallengeDialogProps {
  challenge: ChallengeListItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted?: () => void
}

export function DeleteChallengeDialog({ challenge, open, onOpenChange, onDeleted }: DeleteChallengeDialogProps) {
  const deleteChallenge = useDeleteChallenge()

  const handleDelete = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()

    if (!challenge) {
      return
    }

    try {
      await deleteChallenge.mutateAsync(challenge.id)
      toast.success('Reto eliminado correctamente')
      onDeleted?.()
      onOpenChange(false)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'No se ha podido eliminar el reto'))
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar reto?</AlertDialogTitle>
          <AlertDialogDescription>
            {challenge
              ? `Eliminarás "${challenge.title}" y también todas las filas materializadas en clientes. Esta acción no se puede deshacer.`
              : 'Esta acción eliminará el reto y sus asignaciones.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteChallenge.isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={(event) => void handleDelete(event)} disabled={deleteChallenge.isPending}>
            {deleteChallenge.isPending ? 'Eliminando...' : 'Eliminar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
