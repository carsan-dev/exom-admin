import type { ComponentProps } from 'react'
import { ChevronDown, ChevronUp, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Exercise } from '../../exercises/types'
import type { TrainingCircuitExerciseFormValues } from '../schemas'
import { PrescriptionFields } from './prescription-fields'
import { TimedPrescriptionEditor } from './timed-prescription-editor'

interface CircuitExerciseRowProps {
  nested: TrainingCircuitExerciseFormValues
  nestedIndex: number
  count: number
  exercise: Exercise | undefined
  onMove: (direction: -1 | 1) => void
  onRemove: () => void
  onUpdate: <K extends keyof TrainingCircuitExerciseFormValues>(
    field: K,
    fieldValue: TrainingCircuitExerciseFormValues[K]
  ) => void
  onPrescriptionChange: (raw: string) => void
  onTimedChange: ComponentProps<typeof TimedPrescriptionEditor>['onChange']
}

export function CircuitExerciseRow({
  nested,
  nestedIndex,
  count,
  exercise,
  onMove,
  onRemove,
  onUpdate,
  onPrescriptionChange,
  onTimedChange,
}: CircuitExerciseRowProps) {
  return (
    <div className="space-y-2 rounded-md border border-border/60 bg-muted/20 p-2">
      <div className="flex items-center gap-2">
        <div className="flex gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => onMove(-1)}
            disabled={nestedIndex === 0}
          >
            <ChevronUp className="h-3 w-3" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => onMove(1)}
            disabled={nestedIndex === count - 1}
          >
            <ChevronDown className="h-3 w-3" />
          </Button>
        </div>
        <span className="text-xs font-medium text-muted-foreground">{nestedIndex + 1}</span>
        <p className="flex-1 truncate text-sm font-medium text-foreground">
          {exercise?.name ?? 'Ejercicio no encontrado'}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-muted-foreground hover:text-status-error"
          onClick={onRemove}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {nested.measure_type === 'SECONDS' && (
          <TimedPrescriptionEditor
            total={nested.target_value}
            minimum={nested.target_value_min}
            maximum={nested.target_value_max}
            config={nested.timed_config}
            onChange={onTimedChange}
          />
        )}
        <PrescriptionFields
          measureType={nested.measure_type}
          targetValue={nested.target_value}
          targetValueMin={nested.target_value_min}
          targetValueMax={nested.target_value_max}
          targetRir={nested.target_rir}
          legacyValue={nested.reps_or_duration}
          onMeasureTypeChange={(next) => onUpdate('measure_type', next)}
          onTargetInputChange={onPrescriptionChange}
          onTargetRirChange={(next) => onUpdate('target_rir', next)}
        />
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Descanso tras ejercicio (s)</label>
          <Input
            type="number"
            min={0}
            value={nested.rest_seconds}
            onChange={(e) => onUpdate('rest_seconds', parseInt(e.target.value) || 0)}
            className="h-8 text-sm"
          />
        </div>
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={nested.request_set_tracking}
          onChange={(event) => onUpdate('request_set_tracking', event.target.checked)}
          className="h-4 w-4 accent-brand-primary"
        />
        Solicitar rendimiento real en cada ronda
      </label>
    </div>
  )
}
