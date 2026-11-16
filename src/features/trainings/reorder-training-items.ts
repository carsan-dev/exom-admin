import { arrayMove } from '@dnd-kit/sortable'
import type { TrainingItemFormValues } from './schemas'

type CircuitItem = Extract<TrainingItemFormValues, { kind: 'CIRCUIT' }>

const inRange = (length: number, index: number) => index >= 0 && index < length

/**
 * Moves a top-level item (exercise or circuit) from one position to another and
 * reassigns `order` from the index on every item. Shared by the arrows (neighbour
 * moves) and by drag and drop, so both produce the same form value.
 */
export function reorderTrainingItems(
  items: TrainingItemFormValues[],
  from: number,
  to: number
): TrainingItemFormValues[] {
  if (!inRange(items.length, from) || !inRange(items.length, to)) return items
  return arrayMove(items, from, to).map((item, order) => ({ ...item, order }))
}

/**
 * Moves an exercise inside a circuit. Circuit exercises carry no `order`: their
 * position is the array index, exactly as with the circuit arrows.
 */
export function reorderCircuitExercises(item: CircuitItem, from: number, to: number): CircuitItem {
  if (from === to || !inRange(item.exercises.length, from) || !inRange(item.exercises.length, to)) {
    return item
  }
  return { ...item, exercises: arrayMove(item.exercises, from, to) }
}

/** Moves a client-side row key the same way as its item. */
export function moveKey<T>(keys: T[], from: number, to: number): T[] {
  return arrayMove(keys, from, to)
}
