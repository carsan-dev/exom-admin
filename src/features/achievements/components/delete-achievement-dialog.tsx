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
import { getApiErrorMessage, useDeleteAchievement } from '../api'
import type { AchievementListItem } from '../types'

interface DeleteAchievementDialogProps {
  achievement: AchievementListItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted?: () => void
}

export function DeleteAchievementDialog({ achievement, open, onOpenChange, onDeleted }: DeleteAchievementDialogProps) {
  const deleteAchievement = useDeleteAchievement()

  const handleDelete = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()

    if (!achievement) return

    try {
      await deleteAchievement.mutateAsync(achievement.id)
      toast.success('Logro eliminado correctamente')
      onDeleted?.()
      onOpenChange(false)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'No se ha podido eliminar el logro'))
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar logro?</AlertDialogTitle>
          <AlertDialogDescription>
            {achievement
              ? `Eliminarás "${achievement.name}" y todos los registros de clientes que lo hayan desbloqueado. Esta acción no se puede deshacer.`
              : 'Esta acción eliminará el logro y sus registros de usuarios.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteAchievement.isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={(event) => void handleDelete(event)} disabled={deleteAchievement.isPending}>
            {deleteAchievement.isPending ? 'Eliminando...' : 'Eliminar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
