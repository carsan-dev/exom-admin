import { describe, expect, it } from 'vitest'
import { resolveLegacyPrescription, trainingExerciseSchema, trainingSchema } from './schemas'

const exercise = {
  kind: 'EXERCISE' as const,
  exercise_id: 'exercise-1',
  order: 0,
  sets: 3,
  reps_or_duration: '10',
  request_set_tracking: true,
  rest_seconds: 60,
}

describe('trainingExerciseSchema', () => {
  it.each([
    ['REPS', 10],
    ['SECONDS', 45],
  ] as const)('accepts %s prescriptions for create and edit', (measure_type, target_value) => {
    expect(
      trainingExerciseSchema.parse({
        ...exercise,
        measure_type,
        target_value,
        target_rir: 2,
      })
    ).toMatchObject({ measure_type, target_value, target_rir: 2 })
  })

  it.each([-1, 11, 2.5])('rejects invalid target RIR %s', (target_rir) => {
    expect(() =>
      trainingExerciseSchema.parse({
        ...exercise,
        measure_type: 'REPS',
        target_value: 10,
        target_rir,
      })
    ).toThrow()
  })

  it.each([undefined, null, 0, 10])('accepts optional target RIR %s', (target_rir) => {
    expect(() =>
      trainingExerciseSchema.parse({
        ...exercise,
        measure_type: 'REPS',
        target_value: 10,
        ...(target_rir === undefined ? {} : { target_rir }),
      })
    ).not.toThrow()
  })

  it('uses a deterministic legacy fallback without inventing ambiguous values', () => {
    expect(resolveLegacyPrescription('30-45s')).toEqual({
      measure_type: 'SECONDS',
      target_value: null,
    })
    expect(resolveLegacyPrescription('8-10')).toEqual({
      measure_type: 'REPS',
      target_value: null,
    })
    expect(resolveLegacyPrescription('2 min')).toEqual({
      measure_type: 'SECONDS',
      target_value: 120,
    })
    expect(resolveLegacyPrescription('0s')).toEqual({
      measure_type: 'SECONDS',
      target_value: null,
    })
  })

  it('rejects an incoherent type without a structured target', () => {
    expect(() =>
      trainingSchema.parse({
        name: 'Legacy',
        types: ['Fuerza'],
        accentColor: null,
        level: 'PRINCIPIANTE',
        tags: [],
        items: [
          {
            ...exercise,
            reps_or_duration: '30-45s',
            measure_type: 'REPS',
            target_value: null,
          },
        ],
      })
    ).toThrow(/valor objetivo/)
  })
})
