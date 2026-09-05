import { describe, expect, it } from 'vitest'
import {
  parsePrescriptionInput,
  resolveLegacyPrescription,
  trainingExerciseSchema,
  trainingSchema,
} from './schemas'

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
      target_value_min: 30,
      target_value_max: 45,
    })
    expect(resolveLegacyPrescription('8-10')).toEqual({
      measure_type: 'REPS',
      target_value: null,
      target_value_min: 8,
      target_value_max: 10,
    })
    expect(resolveLegacyPrescription('2 min')).toEqual({
      measure_type: 'SECONDS',
      target_value: 120,
      target_value_min: null,
      target_value_max: null,
    })
    expect(resolveLegacyPrescription('0s')).toEqual({
      measure_type: 'SECONDS',
      target_value: null,
      target_value_min: null,
      target_value_max: null,
    })
  })

  it.each([
    ['8', 'REPS', '8', 8, null, null],
    ['8-10', 'REPS', '8-10', null, 8, 10],
    ['30-45', 'SECONDS', '30-45s', null, 30, 45],
  ] as const)(
    'parses target input %s as a structured %s prescription',
    (input, measureType, legacy, exact, min, max) => {
      expect(parsePrescriptionInput(input, measureType)).toEqual({
        reps_or_duration: legacy,
        target_value: exact,
        target_value_min: min,
        target_value_max: max,
      })
    }
  )

  it.each(['10-8', '8-', '0-8'])('keeps invalid range %s unstructured for validation', (input) => {
    expect(parsePrescriptionInput(input, 'REPS')).toEqual({
      reps_or_duration: input,
      target_value: null,
      target_value_min: null,
      target_value_max: null,
    })
  })

  it('accepts a complete structured range and rejects incoherent shapes', () => {
    const range = {
      ...exercise,
      measure_type: 'REPS' as const,
      target_value: null,
      target_value_min: 8,
      target_value_max: 10,
    }
    expect(() =>
      trainingSchema.parse({
        name: 'Rango',
        types: ['Fuerza'],
        accentColor: null,
        level: 'PRINCIPIANTE',
        tags: [],
        items: [range],
      })
    ).not.toThrow()
    expect(() =>
      trainingSchema.parse({
        name: 'Rango inválido',
        types: ['Fuerza'],
        accentColor: null,
        level: 'PRINCIPIANTE',
        tags: [],
        items: [{ ...range, target_value_min: 11 }],
      })
    ).toThrow(/mínimo/)
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
            id: 'legacy-exercise',
            reps_or_duration: '30-45s',
            measure_type: 'REPS',
            target_value: null,
          },
        ],
      })
    ).toThrow(/valor objetivo/)
  })
})
