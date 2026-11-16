import { Button } from '@/components/ui/button'
import { DialogFooter } from '@/components/ui/dialog'

interface TrainingFormFooterProps {
  isPending: boolean
  isEditing: boolean
  isDuplicate: boolean
  onCancel: () => void
}

export function TrainingFormFooter({
  isPending,
  isEditing,
  isDuplicate,
  onCancel,
}: TrainingFormFooterProps) {
  return (
    <DialogFooter>
      <Button type="button" variant="outline" onClick={onCancel}>
        Cancelar
      </Button>
      <Button type="submit" disabled={isPending}>
        {isPending
          ? isEditing
            ? 'Guardando...'
            : isDuplicate
              ? 'Creando copia...'
              : 'Creando...'
          : isEditing
            ? 'Guardar cambios'
            : isDuplicate
              ? 'Crear copia'
              : 'Crear entrenamiento'}
      </Button>
    </DialogFooter>
  )
}
