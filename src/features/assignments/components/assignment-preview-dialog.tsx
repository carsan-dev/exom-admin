import { Apple, Dumbbell, PauseCircle } from 'lucide-react'
import { StatusChip } from '@/components/ui/status-chip'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { LEVEL_LABELS } from '../../clients/types'
import { getTrainingTypeLabel } from '../../trainings/types'
import type { AssignmentPreview } from '../types'

interface AssignmentPreviewDialogProps {
  open: boolean
  preview: AssignmentPreview | null
  mode: 'create' | 'edit'
  isSubmitting?: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void>
}

const dateFormatter = new Intl.DateTimeFormat('es-ES', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
})

function toDisplayDate(date: string) {
  return dateFormatter.format(new Date(`${date}T00:00:00`))
}

export function AssignmentPreviewDialog({
  open,
  preview,
  mode,
  isSubmitting = false,
  onOpenChange,
  onConfirm,
}: AssignmentPreviewDialogProps) {
  if (!preview) {
    return null
  }

  const confirmLabel = mode === 'edit' ? 'Confirmar cambios' : 'Confirmar asignación'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Vista previa cliente</DialogTitle>
          <DialogDescription>
            Revisa cómo quedará cada fecha seleccionada antes de confirmar la planificación.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {preview.days.map((day, index) => (
            <div key={`${day.date}-${index}`} className="space-y-4 border border-border p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{toDisplayDate(day.date)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Resumen de lo que verá el cliente en Home y Calendario.</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {day.trainings.length > 0 && (
                    <StatusChip variant="info" dot={false}>
                      {day.trainings.length} entreno{day.trainings.length === 1 ? '' : 's'} asignado{day.trainings.length === 1 ? '' : 's'}
                    </StatusChip>
                  )}
                  {day.diet && (
                    <StatusChip variant="success" dot={false}>
                      Dieta asignada
                    </StatusChip>
                  )}
                  {day.is_rest_day && (
                    <StatusChip variant="brand" dot={false}>
                      Descanso
                    </StatusChip>
                  )}
                </div>
              </div>

              <Separator />

              {day.is_rest_day ? (
                <div className="border border-border-strong bg-lime-soft p-5">
                  <div className="flex items-start gap-3">
                    <div className="text-accent-text">
                      <PauseCircle aria-hidden="true" className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-lg font-semibold text-foreground">Día de descanso</p>
                      <p className="text-sm text-muted-foreground">
                        El cliente verá el estado de descanso y no tendrá entreno ni dieta asignados para esta fecha.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {day.training ? (
                    <div className="border border-border bg-card p-5">
                      <div className="flex items-start gap-3">
                        <div className="text-status-info">
                          <Dumbbell aria-hidden="true" className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">Entrenamiento</p>
                          <h3 className="mt-2 text-lg font-semibold text-foreground">
                            {day.training.name}{day.training.is_active === false ? ' (retirado)' : ''}
                          </h3>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <StatusChip variant="info" dot={false}>
                          {getTrainingTypeLabel(day.training.type)}
                        </StatusChip>
                        <StatusChip variant="brand" dot={false}>
                          {LEVEL_LABELS[day.training.level]}
                        </StatusChip>
                      </div>

                      <ol className="mt-4 space-y-2 border border-border p-3">
                        {day.trainings.map((training, index) => (
                          <li key={training.id} className="text-sm font-medium text-foreground">
                            {index + 1}. {training.name}{training.is_active === false ? ' (retirado)' : ''}
                          </li>
                        ))}
                      </ol>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="border border-border p-3">
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Duración</p>
                          <p className="mt-1 text-sm font-medium text-foreground">
                            {day.training.estimated_duration_min ? `${day.training.estimated_duration_min} min` : 'Flexible'}
                          </p>
                        </div>
                        <div className="border border-border p-3">
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Ejercicios</p>
                          <p className="mt-1 text-sm font-medium text-foreground">
                            {day.training.exercises_count ?? 'Contenido existente'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="border border-dashed border-border-strong p-5 text-sm text-muted-foreground">
                      Sin entrenamiento asignado.
                    </div>
                  )}

                  {day.diet ? (
                    <div className="border border-border bg-card p-5">
                      <div className="flex items-start gap-3">
                        <div className="text-status-success">
                          <Apple aria-hidden="true" className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">Plan nutricional</p>
                          <h3 className="mt-2 text-lg font-semibold text-foreground">{day.diet.name}</h3>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="border border-border p-3">
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Calorías</p>
                          <p className="mt-1 text-sm font-medium text-foreground">
                            {day.diet.total_calories ? `${day.diet.total_calories} kcal` : 'Personalizadas'}
                          </p>
                        </div>
                        <div className="border border-border p-3">
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Comidas</p>
                          <p className="mt-1 text-sm font-medium text-foreground">
                            {day.diet.meals_count ?? 'Contenido existente'}
                          </p>
                        </div>
                        <div className="border border-border p-3">
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Proteína</p>
                          <p className="mt-1 text-sm font-medium text-foreground">
                            {day.diet.total_protein_g ? `${day.diet.total_protein_g} g` : 'N/D'}
                          </p>
                        </div>
                        <div className="border border-border p-3">
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Carbohidratos</p>
                          <p className="mt-1 text-sm font-medium text-foreground">
                            {day.diet.total_carbs_g ? `${day.diet.total_carbs_g} g` : 'N/D'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="border border-dashed border-border-strong p-5 text-sm text-muted-foreground">
                      Sin dieta asignada.
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Volver
          </Button>
          <Button type="button" onClick={() => void onConfirm()} disabled={isSubmitting}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
