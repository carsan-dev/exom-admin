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
          measure_type: 'REPS',
          target_value: 10,
          target_rir: 2,
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
              measure_type: 'REPS',
              target_value: 12,
              target_rir: null,
              request_set_tracking: false,
              rest_seconds: 15,
            },
            {
              exercise_id: 'exercise-3',
              reps_or_duration: '30s',
              measure_type: 'SECONDS',
              target_value: 30,
              target_rir: 1,
              request_set_tracking: false,
              rest_seconds: 15,
            },
          ],
        },
      ],
    })

    expect(payload.items[0]).toMatchObject({ id: 'training-exercise-1' })
    expect(payload.items[0]).toMatchObject({
      measure_type: 'REPS',
      target_value: 10,
      target_rir: 2,
      reps_or_duration: '10',
    })
    expect(payload.exercises[0]).toMatchObject({ id: 'training-exercise-1' })
    expect(payload.items[1]).toMatchObject({ id: 'block-1' })
    if (!('exercises' in payload.items[1])) throw new Error('Expected circuit')
    expect(payload.items[1].exercises[0]).toMatchObject({ id: 'training-exercise-2' })
    expect(payload.items[1].exercises[1]).not.toHaveProperty('id')
    expect(payload.items[1].exercises[1]).toMatchObject({
      measure_type: 'SECONDS',
      target_value: 30,
      target_rir: 1,
      reps_or_duration: '30s',
    })
  })

  it('preserves an ambiguous legacy prescription until it is normalized', () => {
    const payload = normalizeTrainingPayload({
      ...base,
      items: [
        {
          id: 'training-exercise-legacy',
          kind: 'EXERCISE',
          exercise_id: 'exercise-1',
          order: 0,
          sets: 3,
          reps_or_duration: '8-10',
          measure_type: 'REPS',
          target_value: null,
          target_rir: null,
          request_set_tracking: false,
          rest_seconds: 60,
        },
      ],
    })

    expect(payload.items[0]).toMatchObject({ reps_or_duration: '8-10' })
    expect(payload.items[0]).not.toHaveProperty('measure_type')
    expect(payload.items[0]).not.toHaveProperty('target_value')
  })

  it.each([
    ['REPS', 8, 10, '8-10'],
    ['SECONDS', 30, 45, '30-45s'],
  ] as const)('serializes a structured %s range', (measure_type, min, max, legacy) => {
    const payload = normalizeTrainingPayload({
      ...base,
      items: [
        {
          kind: 'EXERCISE',
          exercise_id: 'exercise-1',
          order: 0,
          sets: 3,
          reps_or_duration: 'ignored',
          measure_type,
          target_value: null,
          target_value_min: min,
          target_value_max: max,
          target_rir: null,
          request_set_tracking: false,
          rest_seconds: 60,
        },
      ],
    })

    expect(payload.items[0]).toMatchObject({
      reps_or_duration: legacy,
      measure_type,
      target_value_min: min,
      target_value_max: max,
    })
    expect(payload.items[0]).not.toHaveProperty('target_value')
  })
})
