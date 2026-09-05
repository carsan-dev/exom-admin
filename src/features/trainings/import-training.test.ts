import { describe, expect, it } from 'vitest'
import { parseTrainingImport } from './import-training'

function source(exercise: Record<string, unknown>) {
  return JSON.stringify({
    name: 'Importado',
    types: ['Fuerza'],
    level: 'PRINCIPIANTE',
    items: [
      {
        kind: 'EXERCISE',
        exercise_id: 'exercise-1',
        sets: 3,
        reps_or_duration: '30-45s',
        ...exercise,
      },
    ],
  })
}

describe('parseTrainingImport prescription fields', () => {
  it('preserves RIR 0 and infers an ambiguous legacy time target deterministically', () => {
    const result = parseTrainingImport('training.json', source({ target_rir: 0 }), [])

    expect(result.values.items[0]).toMatchObject({
      measure_type: 'SECONDS',
      target_value: null,
      target_value_min: 30,
      target_value_max: 45,
      target_rir: 0,
    })
  })

  it.each([{ target_rir: 2.5 }, { target_value: 30.5, measure_type: 'SECONDS' }])(
    'rejects fractional structured fields: %o',
    (fields) => {
      expect(() => parseTrainingImport('training.json', source(fields), [])).toThrow(/entero/)
    }
  )

  it('rejects a measure type that contradicts legacy data without a target', () => {
    expect(() =>
      parseTrainingImport('training.json', source({ measure_type: 'REPS' }), [])
    ).toThrow(/objetivo estructurado/)
  })

  it('accepts an explicit structured range', () => {
    const result = parseTrainingImport(
      'training.json',
      source({
        reps_or_duration: '8-10',
        measure_type: 'REPS',
        target_value_min: 8,
        target_value_max: 10,
      }),
      []
    )

    expect(result.values.items[0]).toMatchObject({
      measure_type: 'REPS',
      target_value: null,
      target_value_min: 8,
      target_value_max: 10,
    })
  })

  it.each([
    { target_value_min: 8 },
    { target_value: 8, target_value_min: 8, target_value_max: 10 },
    { target_value_min: 10, target_value_max: 8 },
  ])('rejects an incoherent target shape: %o', (fields) => {
    expect(() => parseTrainingImport('training.json', source(fields), [])).toThrow()
  })
})
