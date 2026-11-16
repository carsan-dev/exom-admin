import { Button } from '@/components/ui/button'

interface DietFormFooterProps {
  isPending: boolean
  isEditing: boolean
  isDuplicate: boolean
  isUploadingMealImage: boolean
  isBusy: boolean
  onCancel: () => void
  /** Id del `<form>`: las acciones viven en el pie del Workbench, fuera del formulario. */
  formId: string
}

export function DietFormFooter({
  isPending,
  isEditing,
  isDuplicate,
  isUploadingMealImage,
  isBusy,
  onCancel,
  formId,
}: DietFormFooterProps) {
  return (
    <>
      {isUploadingMealImage && (
        <p className="mr-auto basis-full text-xs text-status-warning md:basis-auto">
          Espera a que termine la subida de la imagen para seguir editando o guardar la dieta.
        </p>
      )}

      {/* Fuera del fieldset del formulario: se deshabilitan con la misma condición (isBusy). */}
      <Button type="button" variant="outline" onClick={onCancel} disabled={isBusy} className="max-md:h-11">
        Cancelar
      </Button>
      <Button type="submit" form={formId} disabled={isBusy} className="max-md:h-11">
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
    </>
  )
}
