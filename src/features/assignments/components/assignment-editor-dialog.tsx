import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { AlertTriangle, Eye, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import type { Diet } from '../../diets/types'
import type { Training } from '../../trainings/types'
import { assignmentEditorSchema, type AssignmentEditorFormValues } from '../schemas'
import {
  createAssignmentPreviewDiet,
  createAssignmentPreviewTraining,
  type AssignmentDay,
  type AssignmentEditorValues,
  type AssignmentPreview,
  type CatalogAvailability,
} from '../types'
import { AssignmentPreviewDialog } from './assignment-preview-dialog'

const CLEAR_SELECTION_VALUE = '__none__'

interface AssignmentEditorDialogProps {
  open: boolean
  clientId: string
  selectedDays: AssignmentDay[]
  availableTrainings: Training[]
  availableDiets: Diet[]
  catalogAvailability: CatalogAvailability
  isSubmitting?: boolean
  onOpenChange: (open: boolean) => void
  onRetryTrainings: () => void
  onRetryDiets: () => void
  onSubmit: (values: AssignmentEditorValues) => Promise<void>
}

function buildPreviewTraining(
  trainingId: string | null,
  availableTrainings: Training[],
  primaryDay: AssignmentDay | null,
) {
  if (!trainingId) {
    return null
  }

  const training = availableTrainings.find((item) => item.id === trainingId)

  if (training) {
    return createAssignmentPreviewTraining(training)
  }

  if (primaryDay?.training?.id === trainingId) {
    return {
      ...primaryDay.training,
      exercises_count: null,
    }
  }

  return null
}

function buildPreviewDiet(
  dietId: string | null,
  availableDiets: Diet[],
  primaryDay: AssignmentDay | null,
) {
  if (!dietId) {
    return null
  }

  const diet = availableDiets.find((item) => item.id === dietId)

  if (diet) {
    return createAssignmentPreviewDiet(diet)
  }

  if (primaryDay?.diet?.id === dietId) {
    return {
      ...primaryDay.diet,
      meals_count: null,
    }
  }

  return null
}

export function AssignmentEditorDialog({
  open,
  clientId,
  selectedDays,
  availableTrainings,
  availableDiets,
  catalogAvailability,
  isSubmitting = false,
  onOpenChange,
  onRetryTrainings,
  onRetryDiets,
  onSubmit,
}: AssignmentEditorDialogProps) {
  const [previewOpen, setPreviewOpen] = useState(false)
  const form = useForm<AssignmentEditorFormValues>({
    resolver: zodResolver(assignmentEditorSchema),
    defaultValues: {
      date: null,
      training_id: null,
      diet_id: null,
      is_rest_day: false,
    },
  })

  const primaryDay = selectedDays.length === 1 ? selectedDays[0] : null
  const isEditingExistingDay = Boolean(primaryDay?.id)
  const isRestDay = form.watch('is_rest_day')
  const selectedTrainingId = form.watch('training_id') ?? null
  const selectedDietId = form.watch('diet_id') ?? null
  const selectedDates = selectedDays.map((day) => day.date).sort()
  const isRestOnlyMode = catalogAvailability.is_rest_only
  const canUseTrainingCatalog = catalogAvailability.can_use_training_catalog
  const canUseDietCatalog = catalogAvailability.can_use_diet_catalog

  useEffect(() => {
    if (!open) {
      setPreviewOpen(false)
      form.reset({
        date: null,
        training_id: null,
        diet_id: null,
        is_rest_day: false,
      })
      return
    }

    form.reset({
      date: primaryDay?.date ?? null,
      training_id: isRestOnlyMode ? null : isEditingExistingDay ? (primaryDay?.training?.id ?? null) : null,
      diet_id: isRestOnlyMode ? null : isEditingExistingDay ? (primaryDay?.diet?.id ?? null) : null,
      is_rest_day: isRestOnlyMode ? true : (primaryDay?.is_rest_day ?? false),
    })
  }, [
    form,
    isEditingExistingDay,
    isRestOnlyMode,
    open,
    primaryDay?.date,
    primaryDay?.diet?.id,
    primaryDay?.is_rest_day,
    primaryDay?.training?.id,
  ])

  const preview: AssignmentPreview = {
    dates:
      selectedDays.length === 1
        ? [form.watch('date') || selectedDays[0]?.date].filter(Boolean) as string[]
        : selectedDates,
    training: buildPreviewTraining(selectedTrainingId, availableTrainings, primaryDay),
    diet: buildPreviewDiet(selectedDietId, availableDiets, primaryDay),
    is_rest_day: isRestDay,
  }

  const dialogTitle = isEditingExistingDay
    ? 'Editar asignacion'
    : selectedDays.length > 1
      ? 'Asignacion masiva'
      : 'Nueva asignacion'

  const dialogDescription = isEditingExistingDay
    ? 'Ajusta el contenido del dia seleccionado. Tambien puedes moverlo a otra fecha.'
    : 'Selecciona entrenamiento, dieta o descanso para los dias marcados.'

  async function handleSave(values: AssignmentEditorFormValues) {
    await onSubmit({
      client_id: clientId,
      dates: selectedDates,
      date: values.date || undefined,
      training_id: values.training_id ?? null,
      diet_id: values.diet_id ?? null,
      is_rest_day: values.is_rest_day,
    })

    setPreviewOpen(false)
    onOpenChange(false)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>{dialogDescription}</DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form
              className="space-y-5"
              onSubmit={form.handleSubmit(async (values) => {
                await handleSave(values)
              })}
            >
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                <p className="text-sm font-medium text-foreground">
                  {selectedDays.length > 1
                    ? `${selectedDays.length} dias seleccionados`
                    : '1 dia seleccionado'}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedDates.map((date) => (
                    <span key={date} className="rounded-full border border-border/70 bg-background px-3 py-1 text-xs text-muted-foreground">
                      {date}
                    </span>
                  ))}
                </div>
              </div>

              {(catalogAvailability.is_loading || catalogAvailability.has_error || catalogAvailability.has_empty_catalogs) && (
                <div className="space-y-3 rounded-2xl border border-dashed border-border/70 bg-background/60 p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-brand-soft/10 p-3 text-brand-primary">
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">
                        {isRestOnlyMode
                          ? 'Modo descanso temporal'
                          : 'Catalogos parcialmente disponibles'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {isRestOnlyMode
                          ? 'No hay entrenamientos ni dietas disponibles ahora mismo. Puedes marcar descanso mientras reintentas los catalogos.'
                          : 'Solo podras usar los catalogos ya cargados. Los selectores no disponibles quedan bloqueados hasta recuperar sus datos.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {!canUseTrainingCatalog && (
                      <Badge variant="outline" className="border-status-error/30 bg-status-error/10 text-status-error">
                        Entrenamientos no disponibles
                      </Badge>
                    )}
                    {!canUseDietCatalog && (
                      <Badge variant="outline" className="border-status-error/30 bg-status-error/10 text-status-error">
                        Dietas no disponibles
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {!canUseTrainingCatalog && (
                      <Button type="button" variant="outline" onClick={onRetryTrainings}>
                        <RefreshCw className="h-4 w-4" />
                        Reintentar entrenos
                      </Button>
                    )}
                    {!canUseDietCatalog && (
                      <Button type="button" variant="outline" onClick={onRetryDiets}>
                        <RefreshCw className="h-4 w-4" />
                        Reintentar dietas
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {isEditingExistingDay && (
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''} type="date" />
                      </FormControl>
                      <FormDescription>Mueve la asignacion a otro dia si lo necesitas.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="is_rest_day"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modo de asignacion</FormLabel>
                    <FormControl>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Button
                          type="button"
                          variant={field.value ? 'outline' : 'default'}
                          disabled={isRestOnlyMode}
                          onClick={() => field.onChange(false)}
                        >
                          Entrenamiento y/o dieta
                        </Button>
                        <Button
                          type="button"
                          variant={field.value ? 'default' : 'outline'}
                          onClick={() => {
                            field.onChange(true)
                            form.setValue('training_id', null, { shouldValidate: true })
                            form.setValue('diet_id', null, { shouldValidate: true })
                          }}
                        >
                          Dia de descanso
                        </Button>
                      </div>
                    </FormControl>
                    <FormDescription>El modo descanso limpiara entrenamiento y dieta para los dias afectados.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 lg:grid-cols-2">
                <FormField
                  control={form.control}
                  name="training_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Entrenamiento</FormLabel>
                      {canUseTrainingCatalog ? (
                        <Select
                          disabled={isRestDay}
                          value={field.value ?? CLEAR_SELECTION_VALUE}
                          onValueChange={(value) => field.onChange(value === CLEAR_SELECTION_VALUE ? null : value)}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona un entrenamiento" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value={CLEAR_SELECTION_VALUE}>Sin entrenamiento</SelectItem>
                            {availableTrainings.map((training) => (
                              <SelectItem key={training.id} value={training.id}>
                                {training.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 p-4 text-sm">
                          <p className="font-medium text-foreground">
                            {primaryDay?.training ? `Entreno actual: ${primaryDay.training.name}` : 'Catalogo no disponible'}
                          </p>
                          <p className="mt-1 text-muted-foreground">
                            {primaryDay?.training
                              ? 'Podras mantener el entreno actual, pero no elegir otro hasta recuperar el catalogo.'
                              : 'Ahora mismo no puedes seleccionar un entrenamiento nuevo.'}
                          </p>
                        </div>
                      )}
                      <FormDescription>Opcional si quieres asignar solo dieta o descanso.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="diet_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dieta</FormLabel>
                      {canUseDietCatalog ? (
                        <Select
                          disabled={isRestDay}
                          value={field.value ?? CLEAR_SELECTION_VALUE}
                          onValueChange={(value) => field.onChange(value === CLEAR_SELECTION_VALUE ? null : value)}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona una dieta" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value={CLEAR_SELECTION_VALUE}>Sin dieta</SelectItem>
                            {availableDiets.map((diet) => (
                              <SelectItem key={diet.id} value={diet.id}>
                                {diet.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 p-4 text-sm">
                          <p className="font-medium text-foreground">
                            {primaryDay?.diet ? `Dieta actual: ${primaryDay.diet.name}` : 'Catalogo no disponible'}
                          </p>
                          <p className="mt-1 text-muted-foreground">
                            {primaryDay?.diet
                              ? 'Podras mantener la dieta actual, pero no elegir otra hasta recuperar el catalogo.'
                              : 'Ahora mismo no puedes seleccionar una dieta nueva.'}
                          </p>
                        </div>
                      )}
                      <FormDescription>Opcional si quieres asignar solo entrenamiento o descanso.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={async () => {
                    const isValid = await form.trigger()

                    if (isValid) {
                      setPreviewOpen(true)
                    }
                  }}
                >
                  <Eye className="h-4 w-4" />
                  Vista previa
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isEditingExistingDay ? 'Guardar cambios' : 'Aplicar asignacion'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AssignmentPreviewDialog
        open={previewOpen}
        preview={preview}
        mode={isEditingExistingDay ? 'edit' : 'create'}
        isSubmitting={isSubmitting}
        onOpenChange={setPreviewOpen}
        onConfirm={form.handleSubmit(async (values) => {
          await handleSave(values)
        })}
      />
    </>
  )
}
