import { describe, expect, it } from 'vitest'
import type { TrainingCircuitExerciseFormValues, TrainingItemFormValues } from './schemas'
import { moveKey, reorderCircuitExercises, reorderTrainingItems } from './reorder-training-items'

// Reference copies of the arrow handlers as they were before P7 (exercise-picker.tsx
// moveUp / moveDown / moveCircuitExercise). The shared reorder function must give the
// same result for every neighbour swap.
function legacyMoveUp(value: TrainingItemFormValues[], index: number) {
  if (index === 0) return value
  const updated = [...value]
  ;[updated[index - 1], updated[index]] = [updated[index], updated[index - 1]]
  return updated.map((ex, i) => ({ ...ex, order: i }))
}

function legacyMoveDown(value: TrainingItemFormValues[], index: number) {
  if (index === value.length - 1) return value
  const updated = [...value]
  ;[updated[index], updated[index + 1]] = [updated[index + 1], updated[index]]
  return updated.map((ex, i) => ({ ...ex, order: i }))
}

function legacyMoveCircuitExercise(
  exercises: TrainingCircuitExerciseFormValues[],
  exerciseIndex: number,
  direction: -1 | 1
) {
  const nextIndex = exerciseIndex + direction
  if (nextIndex < 0 || nextIndex >= exercises.length) return exercises
  const updated = [...exercises]
  ;[updated[exerciseIndex], updated[nextIndex]] = [updated[nextIndex], updated[exerciseIndex]]
  return updated
}

const nested = (exerciseId: string): TrainingCircuitExerciseFormValues => ({
  exercise_id: exerciseId,
  reps_or_duration: '10',
  measure_type: 'REPS',
  target_value: 10,
  target_value_min: null,
  target_value_max: null,
  target_rir: null,
  request_set_tracking: false,
  rest_seconds: 15,
})

const single = (exerciseId: string, order: number): TrainingItemFormValues => ({
  kind: 'EXERCISE',
  exercise_id: exerciseId,
  order,
  sets: 3,
  reps_or_duration: '10',
  measure_type: 'REPS',
  target_value: 10,
  target_value_min: null,
  target_value_max: null,
  target_rir: null,
  request_set_tracking: false,
  rest_seconds: 60,
})

// Stale `order` values on purpose: both paths must reassign them from the index.
const items: TrainingItemFormValues[] = [
  single('a', 7),
  {
    kind: 'CIRCUIT',
    order: 3,
    name: 'Circuito',
    rounds: 3,
    rest_between_rounds_seconds: 60,
    exercises: [nested('c1'), nested('c2'), nested('c3')],
  },
  single('b', 1),
  single('c', 0),
]

describe('reorderTrainingItems', () => {
  it('matches the up and down arrows for every neighbour pair', () => {
    for (let index = 0; index < items.length; index += 1) {
      if (index > 0) {
        expect(reorderTrainingItems(items, index, index - 1)).toEqual(legacyMoveUp(items, index))
      }
      if (index < items.length - 1) {
        expect(reorderTrainingItems(items, index, index + 1)).toEqual(legacyMoveDown(items, index))
      }
    }
  })

  it('moves across several positions and reassigns order from the index', () => {
    const result = reorderTrainingItems(items, 0, 3)
    expect(result.map((item) => (item.kind === 'CIRCUIT' ? 'circuit' : item.exercise_id))).toEqual([
      'circuit',
      'b',
      'c',
      'a',
    ])
    expect(result.map((item) => item.order)).toEqual([0, 1, 2, 3])

    const back = reorderTrainingItems(items, 3, 0)
    expect(back.map((item) => (item.kind === 'CIRCUIT' ? 'circuit' : item.exercise_id))).toEqual([
      'c',
      'a',
      'circuit',
      'b',
    ])
    expect(back.map((item) => item.order)).toEqual([0, 1, 2, 3])
  })

  it('is the same as repeating the arrow step by step', () => {
    let stepwise = items
    for (let index = 0; index < 3; index += 1) stepwise = legacyMoveDown(stepwise, index)
    expect(reorderTrainingItems(items, 0, 3)).toEqual(stepwise)
  })

  it('reassigns order without moving when the indexes are equal or out of range', () => {
    expect(reorderTrainingItems(items, 2, 2).map((item) => item.order)).toEqual([0, 1, 2, 3])
    expect(reorderTrainingItems(items, -1, 2)).toBe(items)
    expect(reorderTrainingItems(items, 0, 9)).toBe(items)
  })

  it('does not mutate the input', () => {
    const snapshot = JSON.parse(JSON.stringify(items))
    reorderTrainingItems(items, 0, 2)
    expect(items).toEqual(snapshot)
  })
})

describe('reorderCircuitExercises', () => {
  const circuit = items[1] as Extract<TrainingItemFormValues, { kind: 'CIRCUIT' }>

  it('matches the circuit arrows for every neighbour pair and adds no order', () => {
    for (let index = 0; index < circuit.exercises.length; index += 1) {
      for (const direction of [-1, 1] as const) {
        const target = index + direction
        if (target < 0 || target >= circuit.exercises.length) continue
        const result = reorderCircuitExercises(circuit, index, target)
        expect(result).toEqual({
          ...circuit,
          exercises: legacyMoveCircuitExercise(circuit.exercises, index, direction),
        })
        for (const exercise of result.exercises) expect(exercise).not.toHaveProperty('order')
      }
    }
  })

  it('moves across several positions and keeps the circuit order untouched', () => {
    const result = reorderCircuitExercises(circuit, 2, 0)
    expect(result.exercises.map((exercise) => exercise.exercise_id)).toEqual(['c3', 'c1', 'c2'])
    expect(result.order).toBe(circuit.order)
  })

  it('returns the same circuit when the move is a no-op', () => {
    expect(reorderCircuitExercises(circuit, 1, 1)).toBe(circuit)
    expect(reorderCircuitExercises(circuit, 0, 5)).toBe(circuit)
  })
})

describe('moveKey', () => {
  it('moves keys the same way as the items', () => {
    expect(moveKey(['a', 'b', 'c', 'd'], 0, 3)).toEqual(['b', 'c', 'd', 'a'])
    expect(moveKey(['a', 'b', 'c', 'd'], 2, 1)).toEqual(['a', 'c', 'b', 'd'])
  })
})
