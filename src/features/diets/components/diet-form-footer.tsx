import { Button } from '@/components/ui/button'
import { DialogFooter } from '@/components/ui/dialog'

interface DietFormFooterProps {
  isPending: boolean
  isEditing: boolean
  isDuplicate: boolean
  isUploadingMealImage: boolean
  isBusy: boolean
  onCancel: () => void
}

export function DietFormFooter({
  isPending,
  isEditing,
  isDuplicate,
  isUploadingMealImage,
  isBusy,
  onCancel,
}: DietFormFooterProps) {
  return (
    <>
      {isUploadingMealImage && (
        <p className="text-xs text-muted-foreground">
          Espera a que termine la subida de la imagen para seguir editando o guardar la dieta.
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isBusy}>
          {isPending
            ? isEditing
              ? 'Guardando...'
              : isDuplicate
                ? 'Creando copia...'
                : 'Creando...'
            : isUploadingMealImage
              ? 'Subiendo imagen...'
              : isEditing
                ? 'Guardar cambios'
                : isDuplicate
                  ? 'Crear copia'
                  : 'Crear dieta'}
        </Button>
      </DialogFooter>
    </>
  )
}
