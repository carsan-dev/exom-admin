import { describe, it, expect } from 'vitest'
import { parseTrainingImport } from './import-training'
import { normalizeTrainingPayload } from './api'
import { trainingSchema } from './schemas'
import { rirWeek, resolveRir } from './rir'
describe('RIR proposals and dates', () => {
  it('preserves proposal and exceptions through JSON import, schema and API payload', () => {
    const result = parseTrainingImport(
      'training.json',
      JSON.stringify({
        name: 'Fuerza',
        types: ['FUERZA'],
        level: 'PRINCIPIANTE',
        rir_proposal: [0, 10],
        items: [
          {
            kind: 'EXERCISE',
            exercise_id: 'exercise',
            sets: 3,
            reps_or_duration: '10',
            rir_override: { mode: 'SEQUENCE', sequence: [10, 0] },
          },
          {
            kind: 'CIRCUIT',
            name: 'Circuito',
            rounds: 3,
            exercises: [
              { exercise_id: 'exercise', reps_or_duration: '10', rir_override: { mode: 'NONE' } },
            ],
          },
        ],
      }),
      []
    )
    const values = trainingSchema.parse(result.values)
    const payload = normalizeTrainingPayload(values)
    expect(payload.rir_proposal).toEqual([0, 10])
    expect(payload.items[0]).toMatchObject({
      rir_override: { mode: 'SEQUENCE', sequence: [10, 0] },
    })
    expect(payload.items[1]).toMatchObject({ exercises: [{ rir_override: { mode: 'NONE' } }] })
    const old = { ...values }
    delete old.rir_proposal
    expect(normalizeTrainingPayload(old)).not.toHaveProperty('rir_proposal')
  })
  it('calculates Monday rollover, midweek start, repetition and explicit null', () => {
    expect(rirWeek('2027-01-03', '2026-12-30', 4)).toBe(0)
    expect(rirWeek('2027-01-04', '2026-12-30', 4)).toBe(1)
    expect(rirWeek('2027-01-25', '2026-12-30', 4)).toBe(0)
    expect(
      resolveRir(
        { sequence: [0], overrides: { a: { mode: 'NONE' } } },
        '2026-12-30',
        '2027-01-04',
        'a',
        8
      )
    ).toBeNull()
  })
})
