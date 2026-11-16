import type { ComponentProps } from 'react'
import { ChevronDown, ChevronUp, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { getLevelBadgeClass, LEVEL_LABELS, type Exercise } from '../../exercises/types'
import type { TrainingItemFormValues } from '../schemas'
import { PrescriptionFields } from './prescription-fields'
import { TimedPrescriptionEditor } from './timed-prescription-editor'

interface ExerciseRowProps {
  item: Extract<TrainingItemFormValues, { kind: 'EXERCISE' }>
  index: number
  count: number
  exercise: Exercise | undefined
  onMoveUp: () => void
  onMoveDown: () => void
  onRemove: () => void
  onUpdateField: (field: string, fieldValue: unknown) => void
  onPrescriptionChange: (raw: string) => void
  onTimedChange: ComponentProps<typeof TimedPrescriptionEditor>['onChange']
}

export function ExerciseRow({
  item,
  index,
  count,
  exercise,
  onMoveUp,
  onMoveDown,
  onRemove,
  onUpdateField,
  onPrescriptionChange,
  onTimedChange,
}: ExerciseRowProps) {
  return (
    <div className="rounded-lg border border-border/70 bg-muted/30 p-3 space-y-3">
      {/* Row: order controls + exercise name + delete */}
      <div className="flex items-center gap-2">
        <div className="flex flex-col gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
            onClick={onMoveUp}
            disabled={index === 0}
          >
            <ChevronUp className="h-3 w-3" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
            onClick={onMoveDown}
            disabled={index === count - 1}
          >
            <ChevronDown className="h-3 w-3" />
          </Button>
        </div>

        <span className="text-xs font-medium text-muted-foreground w-5 text-center">
          {index + 1}
        </span>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate text-foreground">
            {exercise?.name ?? (
              <span className="text-muted-foreground italic">Ejercicio no encontrado</span>
            )}
          </p>
          {exercise && (
            <div className="flex flex-wrap gap-1 mt-0.5">
              <Badge
                variant="outline"
                className={cn('text-xs h-4 px-1', getLevelBadgeClass(exercise.level))}
              >
                {LEVEL_LABELS[exercise.level]}
              </Badge>
              {exercise.muscle_groups.slice(0, 2).map((mg) => (
                <Badge
                  key={mg}
                  variant="outline"
                  className="text-xs h-4 px-1 border-brand-soft/40 bg-brand-soft/10 text-accent-text"
                >
                  {mg}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-muted-foreground hover:text-status-error flex-none"
          onClick={onRemove}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Prescription fields */}
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Series</label>
          <Input
            type="number"
            min={1}
            value={item.sets}
            onChange={(e) => onUpdateField('sets', parseInt(e.target.value) || 1)}
            className="h-8 text-sm"
          />
        </div>
        {item.measure_type === 'SECONDS' && (
          <TimedPrescriptionEditor
            total={item.target_value}
            minimum={item.target_value_min}
            maximum={item.target_value_max}
            config={item.timed_config}
            onChange={onTimedChange}
          />
        )}
        <PrescriptionFields
          measureType={item.measure_type}
          targetValue={item.target_value}
          targetValueMin={item.target_value_min}
          targetValueMax={item.target_value_max}
          targetRir={item.target_rir}
          legacyValue={item.reps_or_duration}
          onMeasureTypeChange={(next) => onUpdateField('measure_type', next)}
          onTargetInputChange={onPrescriptionChange}
          onTargetRirChange={(next) => onUpdateField('target_rir', next)}
        />
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Descanso entre series (s)</label>
          <Input
            type="number"
            min={0}
            value={item.rest_seconds}
            onChange={(e) => onUpdateField('rest_seconds', parseInt(e.target.value) || 0)}
            className="h-8 text-sm"
          />
          <p className="text-[11px] leading-tight text-muted-foreground">
            Tiempo de descanso entre cada serie del ejercicio
          </p>
        </div>
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={item.request_set_tracking}
          onChange={(event) => onUpdateField('request_set_tracking', event.target.checked)}
          className="h-4 w-4 accent-brand-primary"
        />
        Solicitar rendimiento real en cada serie
      </label>
    </div>
  )
}
