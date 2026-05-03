import { useEffect, useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useFieldArray, useForm } from 'react-hook-form'
import { AlertTriangle, Eye, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
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

function buildPreviewTraining(trainingId: string | null, availableTrainings: Training[], sourceDay?: AssignmentDay) {
  if (!trainingId) {
    return null
  }

  const training = availableTrainings.find((item) => item.id === trainingId)

  if (training) {
    return createAssignmentPreviewTraining(training)
  }

  if (sourceDay?.training?.id === trainingId) {
    return {
      ...sourceDay.training,
      exercises_count: null,
    }
  }

  return null
}

function buildPreviewDiet(dietId: string | null, availableDiets: Diet[], sourceDay?: AssignmentDay) {
  if (!dietId) {
    return null
  }

  const diet = availableDiets.find((item) => item.id === dietId)

  if (diet) {
    return createAssignmentPreviewDiet(diet)
  }

  if (sourceDay?.diet?.id === dietId) {
    return {
      ...sourceDay.diet,
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
      days: [],
    },
  })
  const { fields } = useFieldArray({
    control: form.control,
    name: 'days',
  })

  const sortedSelectedDays = useMemo(
    () => [...selectedDays].sort((left, right) => left.date.localeCompare(right.date)),
    [selectedDays],
  )
  const selectedDaysKey = useMemo(
    () =>
      sortedSelectedDays
        .map((day) => `${day.id ?? 'new'}:${day.date}:${day.training?.id ?? 'none'}:${day.diet?.id ?? 'none'}:${day.is_rest_day}`)
        .join('|'),
    [sortedSelectedDays],
  )
  const sourceDayMap = useMemo(
    () => new Map(sortedSelectedDays.map((day) => [day.date, day])),
    [sortedSelectedDays],
  )
  const watchedDays = form.watch('days') ?? []
  const isRestOnlyMode = catalogAvailability.is_rest_only
  const canUseTrainingCatalog = catalogAvailability.can_use_training_catalog
  const canUseDietCatalog = catalogAvailability.can_use_diet_catalog
  const canEditSingleDate = fields.length === 1 && Boolean(fields[0]?.assignment_id)

  useEffect(() => {
    if (!open) {
      setPreviewOpen(false)
      form.reset({ days: [] })
      return
    }

    form.reset({
      days: sortedSelectedDays.map((day) => ({
        assignment_id: day.id,
        original_date: day.date,
        date: day.date,
        training_id: day.training?.id ?? null,
        diet_id: day.diet?.id ?? null,
        is_rest_day: day.is_rest_day,
      })),
    })
  }, [form, open, selectedDaysKey])

  const preview: AssignmentPreview = {
    days: watchedDays.map((day) => ({
      date: day.date,
      training: day.is_rest_day
        ? null
        : buildPreviewTraining(day.training_id ?? null, availableTrainings, sourceDayMap.get(day.original_date)),
      diet: day.is_rest_day
        ? null
        : buildPreviewDiet(day.diet_id ?? null, availableDiets, sourceDayMap.get(day.original_date)),
      is_rest_day: day.is_rest_day,
    })),
  }

  const dialogTitle = sortedSelectedDays.length > 1 ? 'Editar selección' : 'Editar día'
  const dialogDescription = sortedSelectedDays.length > 1
    ? 'Configura el contenido de cada fecha desde el mismo modal. Cada fila se guarda con su propia combinación.'
    : 'Ajusta la planificación del día seleccionado y cambia descanso, entreno o dieta sin salir del modal.'

  async function handleSave(values: AssignmentEditorFormValues) {
    await onSubmit({
      client_id: clientId,
      days: values.days.map((day) => ({
        assignment_id: day.assignment_id ?? null,
        original_date: day.original_date,
        date: day.date,
        training_id: day.training_id ?? null,
        diet_id: day.diet_id ?? null,
        is_rest_day: day.is_rest_day,
      })),
    })

    setPreviewOpen(false)
    onOpenChange(false)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
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
                  {sortedSelectedDays.length > 1
                    ? `${sortedSelectedDays.length} días seleccionados`
                    : '1 día seleccionado'}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {sortedSelectedDays.map((day) => (
                    <span key={day.date} className="rounded-full border border-border/70 bg-background px-3 py-1 text-xs text-muted-foreground">
                      {day.date}
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
                         {isRestOnlyMode ? 'Modo descanso temporal' : 'Catálogos parcialmente disponibles'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {isRestOnlyMode
                          ? 'No hay entrenamientos ni dietas disponibles ahora mismo. Puedes marcar descanso mientras reintentas los catálogos.'
                          : 'Solo podrás usar los catálogos ya cargados. Los selectores no disponibles quedan bloqueados hasta recuperar sus datos.'}
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

              <div className="space-y-4">
                {fields.map((field, index) => {
                  const sourceDay = sourceDayMap.get(field.original_date)
                  const isRestDay = watchedDays[index]?.is_rest_day ?? false

                  return (
                    <div key={field.id} className="space-y-4 rounded-2xl border border-border/70 bg-background/60 p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">Día {index + 1}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Configura el contenido visible para esta fecha.
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline" className="border-border/70 bg-background text-foreground">
                            {field.original_date}
                          </Badge>
                          {field.assignment_id && (
                            <Badge variant="outline" className="border-brand-primary/30 bg-brand-soft/20 text-brand-primary">
                              Ya existía
                            </Badge>
                          )}
                        </div>
                      </div>

                      {canEditSingleDate ? (
                        <FormField
                          control={form.control}
                          name={`days.${index}.date`}
                          render={({ field: dateField }) => (
                            <FormItem>
                              <FormLabel>Fecha</FormLabel>
                              <FormControl>
                                <Input {...dateField} type="date" />
                              </FormControl>
                              <FormDescription>Mueve la asignación si necesitas cambiarla a otro día.</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      ) : (
                        <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                          Fecha planificada: <span className="font-medium text-foreground">{field.date}</span>
                        </div>
                      )}

                      <FormField
                        control={form.control}
                        name={`days.${index}.is_rest_day`}
                        render={({ field: restField }) => (
                          <FormItem>
                            <FormLabel>Modo de asignación</FormLabel>
                            <FormControl>
                              <div className="grid gap-2 sm:grid-cols-2">
                                <Button
                                  type="button"
                                  variant={restField.value ? 'outline' : 'default'}
                                  onClick={() => restField.onChange(false)}
                                >
                                  Entrenamiento y/o dieta
                                </Button>
                                <Button
                                  type="button"
                                  variant={restField.value ? 'default' : 'outline'}
                                  onClick={() => restField.onChange(true)}
                                >
                                  Día de descanso
                                </Button>
                              </div>
                            </FormControl>
                            <FormDescription>El descanso se aplica solo a esta fila y no cambia nada hasta que confirmes.</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid gap-4 lg:grid-cols-2">
                        <FormField
                          control={form.control}
                          name={`days.${index}.training_id`}
                          render={({ field: trainingField }) => (
                            <FormItem>
                              <FormLabel>Entrenamiento</FormLabel>
                              {canUseTrainingCatalog ? (
                                <Select
                                  disabled={isRestDay}
                                  value={trainingField.value ?? CLEAR_SELECTION_VALUE}
                                  onValueChange={(value) => trainingField.onChange(value === CLEAR_SELECTION_VALUE ? null : value)}
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
                                    {sourceDay?.training ? `Entreno actual: ${sourceDay.training.name}` : 'Catálogo no disponible'}
                                  </p>
                                  <p className="mt-1 text-muted-foreground">
                                    {sourceDay?.training
                                      ? 'Podrás mantener el entreno actual, pero no elegir otro hasta recuperar el catálogo.'
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
                          name={`days.${index}.diet_id`}
                          render={({ field: dietField }) => (
                            <FormItem>
                              <FormLabel>Dieta</FormLabel>
                              {canUseDietCatalog ? (
                                <Select
                                  disabled={isRestDay}
                                  value={dietField.value ?? CLEAR_SELECTION_VALUE}
                                  onValueChange={(value) => dietField.onChange(value === CLEAR_SELECTION_VALUE ? null : value)}
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
                                        <span className="flex min-w-0 flex-col gap-0.5">
                                          <span className="truncate">{diet.name}</span>
                                          {(diet.tags ?? []).length > 0 && (
                                            <span className="truncate text-xs text-muted-foreground">
                                              {(diet.tags ?? []).join(' Â· ')}
                                            </span>
                                          )}
                                        </span>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 p-4 text-sm">
                                  <p className="font-medium text-foreground">
                                    {sourceDay?.diet ? `Dieta actual: ${sourceDay.diet.name}` : 'Catálogo no disponible'}
                                  </p>
                                  <p className="mt-1 text-muted-foreground">
                                    {sourceDay?.diet
                                      ? 'Podrás mantener la dieta actual, pero no elegir otra hasta recuperar el catálogo.'
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
                    </div>
                  )
                })}
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
                  Guardar planificación
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AssignmentPreviewDialog
        open={previewOpen}
        preview={preview}
        mode={sortedSelectedDays.some((day) => day.id) ? 'edit' : 'create'}
        isSubmitting={isSubmitting}
        onOpenChange={setPreviewOpen}
        onConfirm={form.handleSubmit(async (values) => {
          await handleSave(values)
        })}
      />
    </>
  )
}
