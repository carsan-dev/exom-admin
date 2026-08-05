import { describe, expect, it } from 'vitest'
import { normalizeClientMetricPayload } from './api'
import { clientMetricSchema, type ClientMetricFormValues } from './schemas'

function metricValues(overrides: Partial<ClientMetricFormValues> = {}): ClientMetricFormValues {
  return {
    date: '2026-07-10',
    weight_kg: '',
    muscle_mass_kg: '',
    height_cm: '',
    sleep_hours: '',
    neck_cm: '',
    shoulders_cm: '',
    chest_cm: '',
    arm_left_cm: '',
    arm_right_cm: '',
    forearm_left_cm: '',
    forearm_right_cm: '',
    waist_cm: '',
    hips_cm: '',
    thigh_left_cm: '',
    thigh_right_cm: '',
    calf_left_cm: '',
    calf_right_cm: '',
    ...overrides,
  }
}

describe('client metric form contract', () => {
  it('requires at least one non-negative metric and rejects future dates', () => {
    expect(clientMetricSchema.safeParse(metricValues()).success).toBe(false)
    expect(clientMetricSchema.safeParse(metricValues({ weight_kg: '-1' })).success).toBe(false)
    expect(
      clientMetricSchema.safeParse(metricValues({ date: '2999-01-01', weight_kg: '70' })).success,
    ).toBe(false)
    expect(clientMetricSchema.safeParse(metricValues({ weight_kg: '70.4' })).success).toBe(true)
  })

  it('converts numeric strings and clears blank values with null', () => {
    const payload = normalizeClientMetricPayload(
      metricValues({ weight_kg: '70.4', waist_cm: '81' }),
    )

    expect(payload).toMatchObject({
      date: '2026-07-10',
      weight_kg: 70.4,
      waist_cm: 81,
      muscle_mass_kg: null,
      sleep_hours: null,
    })
  })
})
