import { describe, expect, it } from 'vitest'
import { parseTrainingImport } from './import-training'
import { normalizeTrainingPayload } from './api'
import { trainingSchema } from './schemas'

const config = {
  version: 1,
  unit: 'MINUTES',
  segments: [
    { action: 'Camina', seconds: 120, unit: 'MINUTES' },
    { action: 'Corre', seconds: 60, unit: 'MINUTES' },
  ],
}
const item = {
  kind: 'EXERCISE',
  exercise_id: 'ex',
  sets: 1,
  reps_or_duration: '1440s',
  measure_type: 'SECONDS',
  target_value: 1440,
  timed_config: config,
  rest_seconds: 30,
}
const training = { name: 'Temporal', types: ['CARDIO'], level: 'PRINCIPIANTE', items: [item] }
describe('F007 import and payload contracts', () => {
  it.each(['EXERCISE', 'CIRCUIT'])(
    'JSON %s preserves canonical total, units and action order through form and wire',
    (kind) => {
      const source = {
        ...training,
        items:
          kind === 'CIRCUIT'
            ? [
                {
                  kind,
                  name: 'Circuito',
                  rounds: 2,
                  rest_between_rounds_seconds: 45,
                  exercises: [item],
                },
              ]
            : [item],
      }
      const values = parseTrainingImport('training.json', JSON.stringify(source), []).values
      expect(trainingSchema.safeParse(values).success).toBe(true)
      const payload = normalizeTrainingPayload(values)
      const first = payload.items[0]
      const ex = 'exercises' in first ? first.exercises[0] : first
      expect(ex).toMatchObject({ timed_config: config, target_value: 1440, rest_seconds: 30 })
    }
  )
  it('CSV roundtrip preserves JSON metadata with escaped commas and quotes', () => {
    const columns = [
      'training_name',
      'types',
      'level',
      'kind',
      'exercise_id',
      'sets',
      'reps_or_duration',
      'measure_type',
      'target_value',
      'timed_config',
    ]
    const cells = [
      'Temporal',
      'CARDIO',
      'PRINCIPIANTE',
      'EXERCISE',
      'ex',
      '1',
      '1440s',
      'SECONDS',
      '1440',
      JSON.stringify(config),
    ]
    const csv =
      columns.join(',') + '\n' + cells.map((v) => '"' + v.replace(/"/g, '""') + '"').join(',')
    expect(parseTrainingImport('training.csv', csv, []).values.items[0]).toMatchObject({
      target_value: 1440,
      timed_config: config,
    })
  })
  it.each([
    { measure_type: 'REPS' },
    { target_value: null, target_value_min: 30, target_value_max: 60 },
    { timed_config: { ...config, segments: [{ action: '', seconds: 0, unit: 'MINUTES' }] } },
  ])('rejects invalid temporal import %o', (change) => {
    expect(() =>
      parseTrainingImport(
        'training.json',
        JSON.stringify({ ...training, items: [{ ...item, ...change }] }),
        []
      )
    ).toThrow()
  })
})
