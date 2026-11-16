import { useMemo, useState } from 'react'
import { normalizeSearchText } from '@/lib/search'
import { useExercisesList } from '../api'
import {
  parsePrescriptionInput,
  type TrainingCircuitExerciseFormValues,
  type TrainingItemFormValues,
} from '../schemas'
import { CircuitBlock } from './circuit-block'
import { ExerciseAddActions } from './exercise-add-actions'
import { ExercisePickerHeader } from './exercise-picker-header'
import { ExerciseRow } from './exercise-row'
import { ExerciseSearchPanel } from './exercise-search-panel'

interface ExercisePickerProps {
  value: TrainingItemFormValues[]
  onChange: (value: TrainingItemFormValues[]) => void
  error?: string
}

export function ExercisePicker({ value, onChange, error }: ExercisePickerProps) {
  const [search, setSearch] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [targetCircuitIndex, setTargetCircuitIndex] = useState<number | null>(null)
  const exercisesQuery = useExercisesList()
  const allExercises = useMemo(() => exercisesQuery.data?.data ?? [], [exercisesQuery.data?.data])
  const trackedCount = value.reduce(
    (count, item) =>
      count +
      (item.kind === 'CIRCUIT'
        ? item.exercises.filter((exercise) => exercise.request_set_tracking).length
        : item.request_set_tracking
          ? 1
          : 0),
    0
  )
  const exerciseCount = value.reduce(
    (count, item) => count + (item.kind === 'CIRCUIT' ? item.exercises.length : 1),
    0
  )
  const allTracked = exerciseCount > 0 && trackedCount === exerciseCount

  const setAllTracking = (enabled: boolean) => {
    onChange(
      value.map((item) =>
        item.kind === 'CIRCUIT'
          ? {
              ...item,
              exercises: item.exercises.map((exercise) => ({
                ...exercise,
                request_set_tracking: enabled,
              })),
            }
          : { ...item, request_set_tracking: enabled }
      )
    )
  }

  const exercisesById = useMemo(
    () => new Map(allExercises.map((ex) => [ex.id, ex])),
    [allExercises]
  )

  const normalizedSearch = normalizeSearchText(search.trim())
  const filteredExercises = normalizedSearch
    ? allExercises.filter(
        (ex) =>
          normalizeSearchText(ex.name).includes(normalizedSearch) ||
          ex.muscle_groups.some((mg) => normalizeSearchText(mg).includes(normalizedSearch))
      )
    : allExercises

  const addExercise = (exerciseId: string) => {
    if (targetCircuitIndex != null) {
      const updated = value.map((item, index) => {
        if (index !== targetCircuitIndex || item.kind !== 'CIRCUIT') return item
        const newExercise: TrainingCircuitExerciseFormValues = {
          exercise_id: exerciseId,
          reps_or_duration: '10',
          measure_type: 'REPS',
          target_value: 10,
          target_value_min: null,
          target_value_max: null,
          target_rir: null,
          request_set_tracking: allTracked,
          rest_seconds: 15,
        }
        return { ...item, exercises: [...item.exercises, newExercise] }
      })
      onChange(updated)
      setSearch('')
      setPickerOpen(false)
      setTargetCircuitIndex(null)
      return
    }

    const newItem: TrainingItemFormValues = {
      kind: 'EXERCISE',
      exercise_id: exerciseId,
      order: value.length,
      sets: 3,
      reps_or_duration: '10',
      measure_type: 'REPS',
      target_value: 10,
      target_value_min: null,
      target_value_max: null,
      target_rir: null,
      request_set_tracking: allTracked,
      rest_seconds: 60,
    }
    onChange([...value, newItem])
    setSearch('')
    setPickerOpen(false)
  }

  const addCircuit = () => {
    onChange([
      ...value,
      {
        kind: 'CIRCUIT',
        order: value.length,
        name: 'Circuito',
        rounds: 3,
        rest_between_rounds_seconds: 60,
        exercises: [],
      },
    ])
  }

  const removeExercise = (index: number) => {
    const updated = value.filter((_, i) => i !== index).map((ex, i) => ({ ...ex, order: i }))
    onChange(updated)
  }

  const moveUp = (index: number) => {
    if (index === 0) return
    const updated = [...value]
    ;[updated[index - 1], updated[index]] = [updated[index], updated[index - 1]]
    onChange(updated.map((ex, i) => ({ ...ex, order: i })))
  }

  const moveDown = (index: number) => {
    if (index === value.length - 1) return
    const updated = [...value]
    ;[updated[index], updated[index + 1]] = [updated[index + 1], updated[index]]
    onChange(updated.map((ex, i) => ({ ...ex, order: i })))
  }

  const updateField = (index: number, field: string, fieldValue: unknown) => {
    const updated = value.map((ex, i) =>
      i === index
        ? {
            ...ex,
            [field]: fieldValue,
            ...(field === 'measure_type' && fieldValue === 'REPS' ? { timed_config: null } : {}),
          }
        : ex
    )
    onChange(updated as TrainingItemFormValues[])
  }

  const updateCircuitExercise = <K extends keyof TrainingCircuitExerciseFormValues>(
    circuitIndex: number,
    exerciseIndex: number,
    field: K,
    fieldValue: TrainingCircuitExerciseFormValues[K]
  ) => {
    onChange(
      value.map((item, index) => {
        if (index !== circuitIndex || item.kind !== 'CIRCUIT') return item
        return {
          ...item,
          exercises: item.exercises.map((exercise, nestedIndex) =>
            nestedIndex === exerciseIndex
              ? {
                  ...exercise,
                  [field]: fieldValue,
                  ...(field === 'measure_type' && fieldValue === 'REPS'
                    ? { timed_config: null }
                    : {}),
                }
              : exercise
          ),
        }
      })
    )
  }

  const updateExercisePrescription = (index: number, raw: string) => {
    onChange(
      value.map((item, itemIndex) =>
        itemIndex === index && item.kind === 'EXERCISE'
          ? { ...item, ...parsePrescriptionInput(raw, item.measure_type) }
          : item
      )
    )
  }

  const updateCircuitExercisePrescription = (
    circuitIndex: number,
    exerciseIndex: number,
    raw: string
  ) => {
    onChange(
      value.map((item, itemIndex) => {
        if (itemIndex !== circuitIndex || item.kind !== 'CIRCUIT') return item
        return {
          ...item,
          exercises: item.exercises.map((exercise, nestedIndex) =>
            nestedIndex === exerciseIndex
              ? { ...exercise, ...parsePrescriptionInput(raw, exercise.measure_type) }
              : exercise
          ),
        }
      })
    )
  }

  const removeCircuitExercise = (circuitIndex: number, exerciseIndex: number) => {
    onChange(
      value.map((item, index) => {
        if (index !== circuitIndex || item.kind !== 'CIRCUIT') return item
        return {
          ...item,
          exercises: item.exercises.filter((_, nestedIndex) => nestedIndex !== exerciseIndex),
        }
      })
    )
  }

  const moveCircuitExercise = (circuitIndex: number, exerciseIndex: number, direction: -1 | 1) => {
    onChange(
      value.map((item, index) => {
        if (index !== circuitIndex || item.kind !== 'CIRCUIT') return item
        const nextIndex = exerciseIndex + direction
        if (nextIndex < 0 || nextIndex >= item.exercises.length) return item
        const exercises = [...item.exercises]
        ;[exercises[exerciseIndex], exercises[nextIndex]] = [
          exercises[nextIndex],
          exercises[exerciseIndex],
        ]
        return { ...item, exercises }
      })
    )
  }

  return (
    <div className="min-w-0 space-y-4">
      <ExercisePickerHeader
        exerciseCount={exerciseCount}
        trackedCount={trackedCount}
        allTracked={allTracked}
        onSetAllTracking={setAllTracking}
      />

      {/* Exercise list */}
      {value.length > 0 && (
        <div className="divide-y divide-border border-y border-border">
          {value.map((item, index) => {
            if (item.kind === 'CIRCUIT') {
              return (
                <CircuitBlock
                  key={`circuit-${index}`}
                  item={item}
                  index={index}
                  count={value.length}
                  exercisesById={exercisesById}
                  onMoveUp={() => moveUp(index)}
                  onMoveDown={() => moveDown(index)}
                  onRemove={() => removeExercise(index)}
                  onUpdateField={(field, fieldValue) => updateField(index, field, fieldValue)}
                  onMoveNested={(nestedIndex, direction) =>
                    moveCircuitExercise(index, nestedIndex, direction)
                  }
                  onRemoveNested={(nestedIndex) => removeCircuitExercise(index, nestedIndex)}
                  onUpdateNested={(nestedIndex, field, fieldValue) =>
                    updateCircuitExercise(index, nestedIndex, field, fieldValue)
                  }
                  onNestedPrescriptionChange={(nestedIndex, raw) =>
                    updateCircuitExercisePrescription(index, nestedIndex, raw)
                  }
                  onNestedTimedChange={(nestedIndex, patch) =>
                    onChange(
                      value.map((v, j) =>
                        j === index && v.kind === 'CIRCUIT'
                          ? {
                              ...v,
                              exercises: v.exercises.map((e, k) =>
                                k === nestedIndex
                                  ? {
                                      ...e,
                                      ...patch,
                                      reps_or_duration:
                                        String(patch.target_value ?? patch.target_value_min) + 's',
                                    }
                                  : e
                              ),
                            }
                          : v
                      )
                    )
                  }
                  onAddExercise={() => {
                    setTargetCircuitIndex(index)
                    setPickerOpen(true)
                  }}
                />
              )
            }

            return (
              <ExerciseRow
                key={`${item.exercise_id}-${index}`}
                item={item}
                index={index}
                count={value.length}
                exercise={exercisesById.get(item.exercise_id)}
                onMoveUp={() => moveUp(index)}
                onMoveDown={() => moveDown(index)}
                onRemove={() => removeExercise(index)}
                onUpdateField={(field, fieldValue) => updateField(index, field, fieldValue)}
                onPrescriptionChange={(raw) => updateExercisePrescription(index, raw)}
                onTimedChange={(patch) =>
                  onChange(
                    value.map((v, j) =>
                      j === index && v.kind === 'EXERCISE'
                        ? {
                            ...v,
                            ...patch,
                            reps_or_duration:
                              String(patch.target_value ?? patch.target_value_min) + 's',
                          }
                        : v
                    )
                  )
                }
              />
            )
          })}
        </div>
      )}

      {/* Add exercise */}
      {pickerOpen ? (
        <ExerciseSearchPanel
          search={search}
          onSearchChange={setSearch}
          isLoading={exercisesQuery.isLoading}
          filteredExercises={filteredExercises}
          value={value}
          onAdd={addExercise}
          onCancel={() => {
            setPickerOpen(false)
            setSearch('')
            setTargetCircuitIndex(null)
          }}
        />
      ) : (
        <ExerciseAddActions
          onAddExercise={() => {
            setTargetCircuitIndex(null)
            setPickerOpen(true)
          }}
          onAddCircuit={addCircuit}
        />
      )}

      {error && <p className="text-xs text-status-error">{error}</p>}
    </div>
  )
}
