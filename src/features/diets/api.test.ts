import { describe, expect, it } from 'vitest'
import { normalizeDietPayload } from './api'
import type { DietFormValues } from './schemas'

describe('normalizeDietPayload', () => {
  it('preserves existing meal and variant ids while omitting new ids', () => {
    const values = {
      name: 'Dieta',
      tags: [],
      total_calories: null,
      total_protein_g: null,
      total_carbs_g: null,
      total_fat_g: null,
      meals: [
        {
          id: 'meal-1',
          type: 'BREAKFAST',
          name: 'Desayuno',
          image_url: '',
          calories: null,
          protein_g: null,
          carbs_g: null,
          fat_g: null,
          nutritional_badges: [],
          order: 0,
          ingredients: [],
          variants: [
            {
              id: 'variant-1',
              type: 'BREAKFAST',
              name: 'Variante',
              image_url: '',
              calories: null,
              protein_g: null,
              carbs_g: null,
              fat_g: null,
              nutritional_badges: [],
              order: 0,
              ingredients: [],
            },
            {
              type: 'BREAKFAST',
              name: 'Nueva',
              image_url: '',
              calories: null,
              protein_g: null,
              carbs_g: null,
              fat_g: null,
              nutritional_badges: [],
              order: 1,
              ingredients: [],
            },
          ],
        },
      ],
    } as DietFormValues

    const payload = normalizeDietPayload(values)
    expect(payload.meals[0]).toMatchObject({ id: 'meal-1' })
    expect(payload.meals[0].variants[0]).toMatchObject({ id: 'variant-1' })
    expect(payload.meals[0].variants[1]).not.toHaveProperty('id')
  })
})
