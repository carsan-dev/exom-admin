import { Edit, Copy, Clock, Flame, Layers } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { getLevelBadgeClass, LEVEL_LABELS } from '../../exercises/types'
import {
  getTrainingAccentStyle,
  getTrainingTypeBadgeClass,
  getTrainingTypeLabel,
  resolveTrainingTypes,
  type Training,
} from '../types'

interface TrainingDetailDialogProps {
  training: Training | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: (training: Training) => void
  onDuplicate?: (training: Training) => void
}

export function TrainingDetailDialog({
  training,
  open,
  onOpenChange,
  onEdit,
  onDuplicate,
}: TrainingDetailDialogProps) {
  if (!training) return null

  const sortedExercises = [...training.exercises].sort((a, b) => a.order - b.order)
  const trainingTypes = resolveTrainingTypes(training)
  const accentStyle = getTrainingAccentStyle(training.accentColor)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] overflow-x-hidden overflow-y-auto p-4 sm:max-w-2xl sm:p-6">
        <DialogHeader>
          <DialogTitle className="pr-8">{training.name}</DialogTitle>
        </DialogHeader>

        <div className="min-w-0 space-y-4">
          {/* Type + level badges */}
          <div className="flex flex-wrap items-center gap-2">
            {training.accentColor ? (
              <span
                className="h-3 w-3 rounded-full border border-white/20"
                style={{ backgroundColor: training.accentColor }}
              />
            ) : null}
            {trainingTypes.map((type) => (
              <Badge
                key={type}
                variant="outline"
                className={cn('font-medium', !accentStyle && getTrainingTypeBadgeClass(type))}
                style={accentStyle}
              >
                {getTrainingTypeLabel(type)}
              </Badge>
            ))}
            <Badge
              variant="outline"
              className={cn('font-medium', getLevelBadgeClass(training.level))}
            >
              {LEVEL_LABELS[training.level]}
            </Badge>
          </div>

          {/* Tags */}
          {training.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {training.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="border-border bg-muted text-muted-foreground text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Metrics */}
          <div className="flex flex-wrap gap-4">
            {training.estimated_duration_min != null && training.estimated_duration_min > 0 && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{training.estimated_duration_min} min</span>
              </div>
            )}
            {training.estimated_calories != null && training.estimated_calories > 0 && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Flame className="h-4 w-4" />
                <span>{training.estimated_calories} kcal</span>
              </div>
            )}
            {training.total_volume != null && training.total_volume > 0 && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Layers className="h-4 w-4" />
                <span>{training.total_volume} vol</span>
              </div>
            )}
          </div>

          <Separator />

          {/* Warmup */}
          {(training.warmup_description || training.warmup_duration_min) && (
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-amber-600">Calentamiento</p>
              {training.warmup_duration_min != null && training.warmup_duration_min > 0 && (
                <p className="text-sm text-muted-foreground">{training.warmup_duration_min} min</p>
              )}
              {training.warmup_description && (
                <p className="text-sm text-foreground whitespace-pre-wrap">{training.warmup_description}</p>
              )}
            </div>
          )}

          {/* Exercises */}
          {sortedExercises.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Ejercicios ({sortedExercises.length})
              </p>
              <div className="space-y-2">
                {sortedExercises.map((te, index) => (
                  <div
                    key={te.id}
                    className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5"
                  >
                    <span className="text-xs font-medium text-muted-foreground w-4 pt-0.5 flex-none">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-sm font-medium text-foreground">{te.exercise.name}</p>
                      <div className="flex flex-wrap gap-1">
                        {te.exercise.muscle_groups.slice(0, 2).map((mg) => (
                          <Badge
                            key={mg}
                            variant="outline"
                            className="text-xs h-4 px-1 border-brand-soft/40 bg-brand-soft/10 text-brand-primary"
                          >
                            {mg}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground flex-none space-y-0.5">
                      <p className="font-medium text-foreground">
                        {te.sets}×{te.reps_or_duration}
                      </p>
                      <p>{te.rest_seconds}s entre series</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cooldown */}
          {training.cooldown_description && (
            <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-blue-500">Vuelta a la calma</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{training.cooldown_description}</p>
            </div>
          )}

          {/* Footer actions */}
          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
            {onDuplicate && (
              <Button
                variant="outline"
                onClick={() => {
                  onOpenChange(false)
                  onDuplicate(training)
                }}
              >
                <Copy className="h-4 w-4" />
                Duplicar
              </Button>
            )}
            {onEdit && (
              <Button
                onClick={() => {
                  onOpenChange(false)
                  onEdit(training)
                }}
              >
                <Edit className="h-4 w-4" />
                Editar
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
