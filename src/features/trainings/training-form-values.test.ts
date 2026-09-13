import { describe, expect, it } from 'vitest'
import { toFormValues } from './training-form-values'
import type { Training, TrainingExercise } from './types'

const occurrence: TrainingExercise = {
  id: 'occurrence',
  order: 0,
  sets: 1,
  reps_or_duration: '90s',
  measure_type: 'SECONDS',
  target_value: 90,
  target_rir: 0,
  timed_config: {
    version: 1,
    unit: 'MINUTES',
    segments: [{ action: 'Camina', seconds: 120, unit: 'MINUTES' }],
  },
  request_set_tracking: true,
  rest_seconds: 15,
  exercise: {
    id: 'exercise',
    name: 'Carrera',
    muscle_groups: [],
    equipment: [],
    level: 'PRINCIPIANTE',
    video_url: null,
    video_stream_id: null,
    thumbnail_url: null,
    technique_text: null,
    common_errors_text: null,
    explanation_text: null,
    is_active: true,
    created_at: '2026-09-13',
    updated_at: '2026-09-13',
    training_usage_count: 1,
    is_used_in_training: true,
  },
}
const training: Training = {
  id: 'training',
  name: 'Temporal',
  type: 'CARDIO',
  types: ['CARDIO'],
  level: 'PRINCIPIANTE',
  estimated_duration_min: null,
  estimated_calories: null,
  total_volume: null,
  warmup_description: null,
  warmup_duration_min: null,
  cooldown_description: null,
  tags: [],
  is_active: true,
  created_by: null,
  created_at: '2026-09-13',
  updated_at: '2026-09-13',
  group_id: null,
  group: null,
  exercises: [occurrence],
  rir_proposal: [0, 2],
}
describe('P10 training form boundary', () => {
  it.each([false, true])(
    'retains seconds, RIR zero and metadata while duplicate=%s controls identity',
    (duplicate) => {
      const before = structuredClone(training)
      const result = toFormValues(training, duplicate)
      expect(result.items[0]).toMatchObject({
        target_value: 90,
        target_rir: 0,
        timed_config: occurrence.timed_config,
      })
      expect(result.items[0].id).toBe(duplicate ? undefined : 'occurrence')
      expect(result.rir_proposal).toEqual([0, 2])
      expect(training).toEqual(before)
    }
  )
  it('preserves circuit order, rounds and legacy fallback independently of rest', () => {
    const source: Training = {
      ...training,
      items: [
        {
          kind: 'CIRCUIT',
          id: 'circuit',
          type: 'CIRCUIT',
          order: 0,
          name: null,
          rounds: 3,
          rest_between_rounds_seconds: 45,
          exercises: [
            { ...occurrence, measure_type: null, target_value: null, reps_or_duration: '90s' },
          ],
        },
      ],
    }
    const result = toFormValues(source, true)
    expect(result.items[0]).toMatchObject({
      kind: 'CIRCUIT',
      rounds: 3,
      rest_between_rounds_seconds: 45,
      exercises: [
        {
          target_value: 90,
          measure_type: 'SECONDS',
          rest_seconds: 15,
          target_rir: 0,
          timed_config: occurrence.timed_config,
        },
      ],
    })
    expect(result.items[0].id).toBeUndefined()
  })
})
