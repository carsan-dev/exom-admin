import { useMemo, useState } from 'react'
import { normalizeSearchText } from '@/lib/search'
import { useExercisesList } from '../api'
import {
  parsePrescriptionInput,
  type TrainingCircuitExerciseFormValues,
  type TrainingItemFormValues,
} from '../schemas'
import { moveKey, reorderCircuitExercises, reorderTrainingItems } from '../reorder-training-items'
import { CircuitBlock } from './circuit-block'
import { ExerciseAddActions } from './exercise-add-actions'
import { ExercisePickerHeader } from './exercise-picker-header'
import { ExerciseRow } from './exercise-row'
import { ExerciseSearchPanel } from './exercise-search-panel'
import { SortableItem, SortableList } from './sortable-list'

/**
 * Client-only keys for the rows, kept outside the form value (the schema and the payload
 * carry no such field). They follow the rows through every move made here, and are
 * rebuilt when the structure changes from outside (form reset, import, another training).
 */
interface RowKeys {
  signature: string
  items: string[]
  nested: string[][]
}

let rowKeySequence = 0
const nextRowKey = () => `row-${++rowKeySequence}`

const signatureOf = (value: TrainingItemFormValues[]) =>
  value
    .map((item) =>
      item.kind === 'CIRCUIT'
        ? `C[${item.exercises.map((exercise) => exercise.exercise_id).join(',')}]`
        : `E:${item.exercise_id}`
    )
    .join('|')

const createRowKeys = (value: TrainingItemFormValues[]): RowKeys => ({
  signature: signatureOf(value),
  items: value.map(() => nextRowKey()),
  nested: value.map((item) =>
    item.kind === 'CIRCUIT' ? item.exercises.map(() => nextRowKey()) : []
  ),
})

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
  const [storedKeys, setStoredKeys] = useState<RowKeys>(() => createRowKeys(value))
  let rowKeys = storedKeys
  if (storedKeys.signature !== signatureOf(value)) {
    rowKeys = createRowKeys(value)
    setStoredKeys(rowKeys)
  }

  const commit = (next: TrainingItemFormValues[], keys: Pick<RowKeys, 'items' | 'nested'>) => {
    setStoredKeys({ signature: signatureOf(next), ...keys })
    onChange(next)
  }
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
      commit(updated, {
        items: rowKeys.items,
        nested: rowKeys.nested.map((keys, index) =>
          index === targetCircuitIndex ? [...keys, nextRowKey()] : keys
        ),
      })
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
    commit([...value, newItem], {
      items: [...rowKeys.items, nextRowKey()],
      nested: [...rowKeys.nested, []],
    })
    setSearch('')
    setPickerOpen(false)
  }

  const addCircuit = () => {
    commit(
      [
        ...value,
        {
          kind: 'CIRCUIT',
          order: value.length,
          name: 'Circuito',
          rounds: 3,
          rest_between_rounds_seconds: 60,
          exercises: [],
        },
      ],
      { items: [...rowKeys.items, nextRowKey()], nested: [...rowKeys.nested, []] }
    )
  }

  const removeExercise = (index: number) => {
    const updated = value.filter((_, i) => i !== index).map((ex, i) => ({ ...ex, order: i }))
    commit(updated, {
      items: rowKeys.items.filter((_, i) => i !== index),
      nested: rowKeys.nested.filter((_, i) => i !== index),
    })
  }

  // Arrows and drag and drop share the same reorder, so the saved order is identical.
  const reorderItems = (from: number, to: number) => {
    commit(reorderTrainingItems(value, from, to), {
      items: moveKey(rowKeys.items, from, to),
      nested: moveKey(rowKeys.nested, from, to),
    })
  }

  const moveUp = (index: number) => {
    if (index === 0) return
    reorderItems(index, index - 1)
  }

  const moveDown = (index: number) => {
    if (index === value.length - 1) return
    reorderItems(index, index + 1)
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
    commit(
      value.map((item, index) => {
        if (index !== circuitIndex || item.kind !== 'CIRCUIT') return item
        return {
          ...item,
          exercises: item.exercises.filter((_, nestedIndex) => nestedIndex !== exerciseIndex),
        }
      }),
      {
        items: rowKeys.items,
        nested: rowKeys.nested.map((keys, index) =>
          index === circuitIndex
            ? keys.filter((_, nestedIndex) => nestedIndex !== exerciseIndex)
            : keys
        ),
      }
    )
  }

  // Circuit arrows and drag and drop share the same reorder (no `order` inside circuits).
  const reorderCircuit = (circuitIndex: number, from: number, to: number) => {
    const circuit = value[circuitIndex]
    const moves =
      circuit?.kind === 'CIRCUIT' && reorderCircuitExercises(circuit, from, to) !== circuit
    commit(
      value.map((item, index) =>
        index === circuitIndex && item.kind === 'CIRCUIT'
          ? reorderCircuitExercises(item, from, to)
          : item
      ),
      {
        items: rowKeys.items,
        nested: moves
          ? rowKeys.nested.map((keys, index) =>
              index === circuitIndex ? moveKey(keys, from, to) : keys
            )
          : rowKeys.nested,
      }
    )
  }

  const moveCircuitExercise = (circuitIndex: number, exerciseIndex: number, direction: -1 | 1) => {
    reorderCircuit(circuitIndex, exerciseIndex, exerciseIndex + direction)
  }

  const itemLabel = (key: string) => {
    const index = rowKeys.items.indexOf(key)
    const item = value[index]
    if (!item) return 'elemento'
    if (item.kind === 'CIRCUIT') return `circuito ${item.name || index + 1}`
    return exercisesById.get(item.exercise_id)?.name ?? 'ejercicio'
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
        <SortableList ids={rowKeys.items} getLabel={itemLabel} onReorder={reorderItems}>
          <div className="divide-y divide-border border-y border-border">
            {value.map((item, index) => {
              const rowKey = rowKeys.items[index]
              if (item.kind === 'CIRCUIT') {
                return (
                  <SortableItem key={rowKey} id={rowKey}>
                    <CircuitBlock
                      item={item}
                      index={index}
                      count={value.length}
                      exercisesById={exercisesById}
                      nestedKeys={rowKeys.nested[index]}
                      onMoveUp={() => moveUp(index)}
                      onMoveDown={() => moveDown(index)}
                      onRemove={() => removeExercise(index)}
                      onUpdateField={(field, fieldValue) => updateField(index, field, fieldValue)}
                      onMoveNested={(nestedIndex, direction) =>
                        moveCircuitExercise(index, nestedIndex, direction)
                      }
                      onReorderNested={(from, to) => reorderCircuit(index, from, to)}
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
                                            String(patch.target_value ?? patch.target_value_min) +
                                            's',
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
                  </SortableItem>
                )
              }

              return (
                <SortableItem key={rowKey} id={rowKey}>
                  <ExerciseRow
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
                </SortableItem>
              )
            })}
          </div>
        </SortableList>
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
