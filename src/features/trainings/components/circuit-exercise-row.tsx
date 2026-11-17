import type { ComponentProps } from 'react'
import { ChevronDown, ChevronUp, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Exercise } from '../../exercises/types'
import type { TrainingCircuitExerciseFormValues } from '../schemas'
import { PrescriptionFields } from './prescription-fields'
import { SortableHandle } from '@/components/sortable'
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
    <div className="space-y-2 py-3">
      <div className="flex items-center gap-2">
        <SortableHandle label={`Reordenar ${exercise?.name ?? 'ejercicio'}`} />
        <div className="flex flex-none gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="size-8 p-0 max-md:size-11"
            onClick={() => onMove(-1)}
            disabled={nestedIndex === 0}
            aria-label={`Subir ${exercise?.name ?? 'ejercicio'}`}
          >
            <ChevronUp aria-hidden="true" className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="size-8 p-0 max-md:size-11"
            onClick={() => onMove(1)}
            disabled={nestedIndex === count - 1}
            aria-label={`Bajar ${exercise?.name ?? 'ejercicio'}`}
          >
            <ChevronDown aria-hidden="true" className="h-4 w-4" />
          </Button>
        </div>
        <span className="text-xs font-medium tabular-nums text-muted-foreground max-md:hidden">{nestedIndex + 1}</span>
        <p className="min-w-0 flex-1 break-words text-sm font-medium text-foreground [overflow-wrap:anywhere]">
          {exercise?.name ?? 'Ejercicio no encontrado'}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="size-8 flex-none p-0 text-muted-foreground hover:text-status-error max-md:size-11"
          onClick={onRemove}
          aria-label={`Quitar ${exercise?.name ?? "ejercicio"}`}
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
      <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground max-md:min-h-11">
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
