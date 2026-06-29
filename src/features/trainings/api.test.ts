import { describe, expect, it } from 'vitest'
import { normalizeTrainingPayload } from './api'
import type { TrainingFormValues } from './schemas'

const base = {
  name: 'Entreno',
  types: ['FUERZA'],
  accentColor: null,
  level: 'PRINCIPIANTE',
  estimated_duration_min: null,
  estimated_calories: null,
  warmup_description: '',
  warmup_duration_min: null,
  cooldown_description: '',
  tags: [],
} satisfies Omit<TrainingFormValues, 'items'>

describe('normalizeTrainingPayload', () => {
  it('preserves existing item ids while omitting ids for new items', () => {
    const payload = normalizeTrainingPayload({
      ...base,
      items: [
        {
          id: 'training-exercise-1',
          kind: 'EXERCISE',
          exercise_id: 'exercise-1',
          order: 0,
          sets: 3,
          reps_or_duration: '10',
          request_set_tracking: false,
          rest_seconds: 60,
        },
        {
          id: 'block-1',
          kind: 'CIRCUIT',
          order: 1,
          name: 'Circuito',
          rounds: 3,
          rest_between_rounds_seconds: 60,
          exercises: [
            {
              id: 'training-exercise-2',
              exercise_id: 'exercise-2',
              reps_or_duration: '12',
              request_set_tracking: false,
              rest_seconds: 15,
            },
            {
              exercise_id: 'exercise-3',
              reps_or_duration: '30s',
              request_set_tracking: false,
              rest_seconds: 15,
            },
          ],
        },
      ],
    })

    expect(payload.items[0]).toMatchObject({ id: 'training-exercise-1' })
    expect(payload.exercises[0]).toMatchObject({ id: 'training-exercise-1' })
    expect(payload.items[1]).toMatchObject({ id: 'block-1' })
    if (!('exercises' in payload.items[1])) throw new Error('Expected circuit')
    expect(payload.items[1].exercises[0]).toMatchObject({ id: 'training-exercise-2' })
    expect(payload.items[1].exercises[1]).not.toHaveProperty('id')
  })
})
