import type { ComponentProps } from 'react'
import { ChevronDown, ChevronUp, X } from 'lucide-react'
import { Tag } from '@/components/ui/tag'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LEVEL_LABELS, type Exercise } from '../../exercises/types'
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
    <div className="space-y-3 py-4">
      {/* Row: order controls + exercise name + delete */}
      <div className="flex items-start gap-2">
        <div className="flex flex-none gap-0.5 md:flex-col">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="size-8 p-0 text-muted-foreground hover:text-foreground max-md:size-11"
            onClick={onMoveUp}
            disabled={index === 0}
            aria-label={`Subir ${exercise?.name ?? 'ejercicio'}`}
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="size-8 p-0 text-muted-foreground hover:text-foreground max-md:size-11"
            onClick={onMoveDown}
            disabled={index === count - 1}
            aria-label={`Bajar ${exercise?.name ?? 'ejercicio'}`}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>

        <span className="w-5 flex-none pt-2 text-center text-xs font-medium tabular-nums text-muted-foreground max-md:hidden">
          {index + 1}
        </span>

        <div className="min-w-0 flex-1 pt-1">
          <p className="break-words text-sm font-medium text-foreground [overflow-wrap:anywhere]">
            {exercise?.name ?? (
              <span className="text-muted-foreground italic">Ejercicio no encontrado</span>
            )}
          </p>
          {exercise && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              <Tag>{LEVEL_LABELS[exercise.level]}</Tag>
              {exercise.muscle_groups.slice(0, 2).map((mg) => (
                <Tag key={mg}>{mg}</Tag>
              ))}
            </div>
          )}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="size-8 flex-none p-0 text-muted-foreground hover:text-status-error max-md:size-11"
          onClick={onRemove}
          aria-label={`Quitar ${exercise?.name ?? 'ejercicio'}`}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Prescription fields */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-5">
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
      <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground max-md:min-h-11">
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
