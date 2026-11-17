import { Button } from '@/components/ui/button'

interface TrainingFormFooterProps {
  isPending: boolean
  isEditing: boolean
  isDuplicate: boolean
  onCancel: () => void
  /** Id del `<form>`: las acciones viven en el pie del Workbench, fuera del formulario. */
  formId: string
}

export function TrainingFormFooter({
  isPending,
  isEditing,
  isDuplicate,
  onCancel,
  formId,
}: TrainingFormFooterProps) {
  return (
    <>
      <Button type="button" variant="outline" onClick={onCancel} className="max-md:h-11">
        Cancelar
      </Button>
      <Button type="submit" form={formId} disabled={isPending} className="max-md:h-11">
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
    </>
  )
}
