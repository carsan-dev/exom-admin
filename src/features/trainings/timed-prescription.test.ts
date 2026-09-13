import { describe, expect, it } from 'vitest'
import { parseTimeInput, timeInputValue, timedInstructions } from './timed-prescription'

describe('F007 canonical seconds', () => {
  it.each([
    [120, '2'],
    [90, '1.5'],
    [7, '0.11666666666666667'],
  ])('displays %s seconds without changing stored seconds', (seconds, minutes) => {
    expect(timeInputValue(seconds, 'MINUTES')).toBe(minutes)
    expect(timeInputValue(seconds, 'SECONDS')).toBe(String(seconds))
  })
  it.each([
    ['2', 120],
    ['1,5', 90],
    ['0.05', 3],
    ['35791394.1', 2147483646],
  ])('converts %s minutes exactly', (value, seconds) =>
    expect(parseTimeInput(value, 'MINUTES')).toBe(seconds)
  )
  it.each(['', '0', '-1', '0.001', '1.234', '35791395', 'Infinity'])(
    'rejects %s minutes',
    (value) => expect(parseTimeInput(value, 'MINUTES')).toBeNaN()
  )
  it('previews exact total and truncation independently of rests', () => {
    const c = {
      version: 1,
      unit: 'MINUTES',
      segments: [
        { action: 'Corre', seconds: 120, unit: 'MINUTES' },
        { action: 'Camina', seconds: 60, unit: 'MINUTES' },
      ],
    } as const
    const config = { ...c, segments: [...c.segments] }
    expect(timedInstructions(1440, config)).toContain(
      '24 min en total. Corre: 2 min; Camina: 1 min; repetir hasta terminar.'
    )
    expect(timedInstructions(1500, config)).toContain('Último tramo recortado: Corre, 1 min.')
  })
})
