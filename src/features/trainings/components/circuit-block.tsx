import { useId, type ComponentProps } from 'react'
import { ChevronDown, ChevronUp, Plus, Repeat, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RequiredMark } from '@/components/ui/label'
import type { Exercise } from '../../exercises/types'
import type { TrainingCircuitExerciseFormValues, TrainingItemFormValues } from '../schemas'
import { CircuitExerciseRow } from './circuit-exercise-row'
import { SortableHandle, SortableItem, SortableList } from '@/components/sortable'
import type { TimedPrescriptionEditor } from './timed-prescription-editor'

interface CircuitBlockProps {
  item: Extract<TrainingItemFormValues, { kind: 'CIRCUIT' }>
  index: number
  count: number
  exercisesById: Map<string, Exercise>
  /** Stable client keys of `item.exercises`, same length and order. */
  nestedKeys: string[]
  onMoveUp: () => void
  onMoveDown: () => void
  onRemove: () => void
  onUpdateField: (field: string, fieldValue: unknown) => void
  onMoveNested: (nestedIndex: number, direction: -1 | 1) => void
  onReorderNested: (from: number, to: number) => void
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
  nestedKeys,
  onMoveUp,
  onMoveDown,
  onRemove,
  onUpdateField,
  onMoveNested,
  onReorderNested,
  onRemoveNested,
  onUpdateNested,
  onNestedPrescriptionChange,
  onNestedTimedChange,
  onAddExercise,
}: CircuitBlockProps) {
  const nameId = useId()
  const roundsId = useId()
  const nestedLabel = (key: string) => {
    const nested = item.exercises[nestedKeys.indexOf(key)]
    return (nested && exercisesById.get(nested.exercise_id)?.name) ?? 'ejercicio'
  }

  return (
    <div className="space-y-3 py-4">
      <div className="flex items-start gap-2">
        <SortableHandle label={`Reordenar circuito ${item.name || index + 1}`} />
        <div className="flex flex-none gap-0.5 md:flex-col">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="size-8 p-0 max-md:size-11"
            onClick={onMoveUp}
            disabled={index === 0}
            aria-label={`Subir ${item.name || 'circuito'}`}
          >
            <ChevronUp aria-hidden="true" className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="size-8 p-0 max-md:size-11"
            onClick={onMoveDown}
            disabled={index === count - 1}
            aria-label={`Bajar ${item.name || 'circuito'}`}
          >
            <ChevronDown aria-hidden="true" className="h-4 w-4" />
          </Button>
        </div>
        <Repeat className="mt-2 h-4 w-4 flex-none text-accent-text" aria-hidden="true" />
        <div className="min-w-0 flex-1 pt-1">
          <p className="text-sm font-semibold text-foreground">Circuito · {item.rounds} rondas</p>
          <p className="text-xs text-muted-foreground">
            {item.exercises.length} ejercicio{item.exercises.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="size-8 flex-none p-0 text-muted-foreground hover:text-status-error max-md:size-11"
          onClick={onRemove}
          aria-label={`Quitar ${item.name || "circuito"}`}
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="col-span-2 space-y-1 sm:col-span-1">
          <label htmlFor={nameId} className="text-xs text-muted-foreground">
            Nombre
            <RequiredMark />
          </label>
          <Input
            id={nameId}
            aria-required="true"
            value={item.name}
            onChange={(e) => onUpdateField('name', e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor={roundsId} className="text-xs text-muted-foreground">
            Rondas
            <RequiredMark />
          </label>
          <Input
            id={roundsId}
            aria-required="true"
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

      <div className="ml-4 divide-y divide-border border-y border-l border-border pl-3 md:ml-10">
        <SortableList ids={nestedKeys} getLabel={nestedLabel} onReorder={onReorderNested}>
          {item.exercises.map((nested, nestedIndex) => (
            <SortableItem key={nestedKeys[nestedIndex]} id={nestedKeys[nestedIndex]}>
              <CircuitExerciseRow
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
            </SortableItem>
          ))}
        </SortableList>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="my-2 w-full max-md:h-11"
          onClick={onAddExercise}
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          Agregar ejercicio al circuito
        </Button>
      </div>
    </div>
  )
}
