import { Apple, Dumbbell, PauseCircle } from 'lucide-react'
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
import { Separator } from '@/components/ui/separator'
import { LEVEL_LABELS } from '../../clients/types'
import { TRAINING_TYPE_LABELS } from '../../trainings/types'
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

  const confirmLabel = mode === 'edit' ? 'Confirmar cambios' : 'Confirmar asignacion'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Vista previa cliente</DialogTitle>
          <DialogDescription>
            Esta es la informacion principal que se reflejara en Home y Calendario para los dias seleccionados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-foreground">Dias afectados</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {preview.dates.map((date) => (
                <Badge key={date} variant="outline" className="border-border/70 bg-background/60 text-foreground">
                  {toDisplayDate(date)}
                </Badge>
              ))}
            </div>
          </div>

          <Separator />

          {preview.is_rest_day ? (
            <div className="rounded-2xl border border-brand-primary/25 bg-brand-soft/10 p-5">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-brand-soft/20 p-3 text-brand-primary">
                  <PauseCircle className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-lg font-semibold text-foreground">Dia de descanso</p>
                  <p className="text-sm text-muted-foreground">
                    El cliente vera el estado de descanso y no tendra entreno ni dieta asignados para esas fechas.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {preview.training && (
                <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-status-info/10 p-3 text-status-info">
                      <Dumbbell className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">Entrenamiento</p>
                      <h3 className="mt-2 text-lg font-semibold text-foreground">{preview.training.name}</h3>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge variant="outline" className="border-status-info/30 bg-status-info/10 text-status-info">
                      {TRAINING_TYPE_LABELS[preview.training.type]}
                    </Badge>
                    <Badge variant="outline" className="border-brand-primary/30 bg-brand-soft/20 text-brand-primary">
                      {LEVEL_LABELS[preview.training.level]}
                    </Badge>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-border/60 bg-background/50 p-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Duracion</p>
                      <p className="mt-1 text-sm font-medium text-foreground">
                        {preview.training.estimated_duration_min ? `${preview.training.estimated_duration_min} min` : 'Flexible'}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-background/50 p-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Ejercicios</p>
                      <p className="mt-1 text-sm font-medium text-foreground">
                        {preview.training.exercises_count ?? 'Contenido existente'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {preview.diet && (
                <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-status-success/10 p-3 text-status-success">
                      <Apple className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">Plan nutricional</p>
                      <h3 className="mt-2 text-lg font-semibold text-foreground">{preview.diet.name}</h3>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-border/60 bg-background/50 p-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Calorias</p>
                      <p className="mt-1 text-sm font-medium text-foreground">
                        {preview.diet.total_calories ? `${preview.diet.total_calories} kcal` : 'Personalizadas'}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-background/50 p-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Comidas</p>
                      <p className="mt-1 text-sm font-medium text-foreground">
                        {preview.diet.meals_count ?? 'Contenido existente'}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-background/50 p-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Proteina</p>
                      <p className="mt-1 text-sm font-medium text-foreground">
                        {preview.diet.total_protein_g ? `${preview.diet.total_protein_g} g` : 'N/D'}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-background/50 p-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Carbohidratos</p>
                      <p className="mt-1 text-sm font-medium text-foreground">
                        {preview.diet.total_carbs_g ? `${preview.diet.total_carbs_g} g` : 'N/D'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
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
