import type { ComponentProps } from 'react'
import { ChevronDown, ChevronUp, Plus, Repeat, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Exercise } from '../../exercises/types'
import type { TrainingCircuitExerciseFormValues, TrainingItemFormValues } from '../schemas'
import { CircuitExerciseRow } from './circuit-exercise-row'
import type { TimedPrescriptionEditor } from './timed-prescription-editor'

interface CircuitBlockProps {
  item: Extract<TrainingItemFormValues, { kind: 'CIRCUIT' }>
  index: number
  count: number
  exercisesById: Map<string, Exercise>
  onMoveUp: () => void
  onMoveDown: () => void
  onRemove: () => void
  onUpdateField: (field: string, fieldValue: unknown) => void
  onMoveNested: (nestedIndex: number, direction: -1 | 1) => void
  onRemoveNested: (nestedIndex: number) => void
  onUpdateNested: <K extends keyof TrainingCircuitExerciseFormValues>(
    nestedIndex: number,
    field: K,
    fieldValue: TrainingCircuitExerciseFormValues[K]
  ) => void
  onNestedPrescriptionChange: (nestedIndex: number, raw: string) => void
  onNestedTimedChange: (
    nestedIndex: number,
    patch: Parameters<ComponentProps<typeof TimedPrescriptionEditor>['onChange']>[0]
  ) => void
  onAddExercise: () => void
}

export function CircuitBlock({
  item,
  index,
  count,
  exercisesById,
  onMoveUp,
  onMoveDown,
  onRemove,
  onUpdateField,
  onMoveNested,
  onRemoveNested,
  onUpdateNested,
  onNestedPrescriptionChange,
  onNestedTimedChange,
  onAddExercise,
}: CircuitBlockProps) {
  return (
    <div className="rounded-lg border border-brand-soft/40 bg-brand-soft/10 p-3 space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex flex-col gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0"
            onClick={onMoveUp}
            disabled={index === 0}
          >
            <ChevronUp className="h-3 w-3" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0"
            onClick={onMoveDown}
            disabled={index === count - 1}
          >
            <ChevronDown className="h-3 w-3" />
          </Button>
        </div>
        <Repeat className="h-4 w-4 text-accent-text" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Circuito · {item.rounds} rondas</p>
          <p className="text-xs text-muted-foreground">
            {item.exercises.length} ejercicio{item.exercises.length !== 1 ? 's' : ''}
          </p>
        </div>
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

      <div className="grid gap-2 sm:grid-cols-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Nombre</label>
          <Input
            value={item.name}
            onChange={(e) => onUpdateField('name', e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Rondas</label>
          <Input
            type="number"
            min={1}
            value={item.rounds}
            onChange={(e) => onUpdateField('rounds', parseInt(e.target.value) || 1)}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Descanso entre rondas (s)</label>
          <Input
            type="number"
            min={0}
            value={item.rest_between_rounds_seconds}
            onChange={(e) =>
              onUpdateField('rest_between_rounds_seconds', parseInt(e.target.value) || 0)
            }
            className="h-8 text-sm"
          />
        </div>
      </div>

      <div className="space-y-2 rounded-md border border-border/60 bg-background/60 p-2">
        {item.exercises.map((nested, nestedIndex) => (
          <CircuitExerciseRow
            key={`${nested.exercise_id}-${nestedIndex}`}
            nested={nested}
            nestedIndex={nestedIndex}
            count={item.exercises.length}
            exercise={exercisesById.get(nested.exercise_id)}
            onMove={(direction) => onMoveNested(nestedIndex, direction)}
            onRemove={() => onRemoveNested(nestedIndex)}
            onUpdate={(field, fieldValue) => onUpdateNested(nestedIndex, field, fieldValue)}
            onPrescriptionChange={(raw) => onNestedPrescriptionChange(nestedIndex, raw)}
            onTimedChange={(patch) => onNestedTimedChange(nestedIndex, patch)}
          />
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={onAddExercise}
        >
          <Plus className="h-4 w-4" />
          Agregar ejercicio al circuito
        </Button>
      </div>
    </div>
  )
}
