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
import { getApiErrorMessage, useDeleteIngredient } from '../api'
import type { Ingredient } from '../types'

interface DeleteIngredientDialogProps {
  ingredient: Ingredient | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted?: () => void
}

export function DeleteIngredientDialog({ ingredient, open, onOpenChange, onDeleted }: DeleteIngredientDialogProps) {
  const deleteIngredient = useDeleteIngredient()

  const handleDelete = async () => {
    if (!ingredient) {
      return
    }

    try {
      await deleteIngredient.mutateAsync(ingredient.id)
      toast.success(`"${ingredient.name}" ha sido eliminado`)
      onDeleted?.()
      onOpenChange(false)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'No se ha podido eliminar el ingrediente'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Eliminar ingrediente</DialogTitle>
          <DialogDescription>
            ¿Eliminar <strong>{ingredient?.name}</strong>? El ingrediente dejará de estar disponible en el catálogo activo, pero sus datos se conservarán.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteIngredient.isPending}
          >
            {deleteIngredient.isPending ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
