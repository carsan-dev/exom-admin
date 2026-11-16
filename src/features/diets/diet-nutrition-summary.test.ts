import { describe, expect, it } from 'vitest'
import {
  MACRO_TOLERANCE,
  calculateIngredientMacros,
  compareMacro,
  formatSignedDifference,
  getIngredientGrams,
  roundMacros,
  sumDeclaredMealMacros,
  sumIngredientMacros,
  type IngredientNutrition,
} from './diet-nutrition-summary'

const nutrition = (kcal: number, p: number, c: number, f: number): IngredientNutrition => ({
  calories_per_100g: kcal,
  protein_per_100g: p,
  carbs_per_100g: c,
  fat_per_100g: f,
})

const catalog = new Map<string, IngredientNutrition>([
  ['avena', nutrition(380, 13, 66, 7)],
  ['pollo', nutrition(165, 31, 0, 3.6)],
  ['arroz', nutrition(130, 2.7, 28, 0.3)],
])

// Copy of the loop that «Calcular desde ingredientes» ran inline before the extraction,
// kept here as the reference the shared function must reproduce.
function legacyMealCalculation(
  items: { ingredient_id: string; quantity: number; unit: string; grams_equivalent: number | null }[]
) {
  let calories = 0
  let protein_g = 0
  let carbs_g = 0
  let fat_g = 0
  let calculatedItems = 0
  let omittedItems = 0
  let missingItems = 0
  for (const item of items) {
    const ing = catalog.get(item.ingredient_id)
    if (!ing) {
      missingItems += 1
      continue
    }
    const grams = item.unit === 'g' ? item.quantity : item.grams_equivalent
    if (!grams || grams <= 0) {
      omittedItems += 1
      continue
    }
    const factor = grams / 100
    calories += ing.calories_per_100g * factor
    protein_g += ing.protein_per_100g * factor
    carbs_g += ing.carbs_per_100g * factor
    fat_g += ing.fat_per_100g * factor
    calculatedItems += 1
  }
  return {
    written: {
      calories: Math.round(calories),
      protein_g: Math.round(protein_g * 10) / 10,
      carbs_g: Math.round(carbs_g * 10) / 10,
      fat_g: Math.round(fat_g * 10) / 10,
    },
    calculatedItems,
    omittedItems,
    missingItems,
  }
}

const item = (
  ingredient_id: string,
  quantity: number,
  unit: 'g' | 'bowl' | 'tablespoon' = 'g',
  grams_equivalent: number | null = unit === 'g' ? quantity : null
) => ({ ingredient_id, quantity, unit, grams_equivalent })

describe('getIngredientGrams', () => {
  it('uses the quantity in grams and the equivalent for other units', () => {
    expect(getIngredientGrams(item('avena', 80))).toBe(80)
    expect(getIngredientGrams(item('arroz', 1, 'bowl', 250))).toBe(250)
  })

  it('returns null when there are no usable grams', () => {
    expect(getIngredientGrams(item('arroz', 1, 'bowl', null))).toBeNull()
    expect(getIngredientGrams(item('avena', 0))).toBeNull()
    expect(getIngredientGrams(item('avena', -5))).toBeNull()
    expect(getIngredientGrams(item('avena', Number.NaN))).toBeNull()
    expect(getIngredientGrams({ ...item('avena', 1), quantity: '' as unknown as number })).toBeNull()
    expect(getIngredientGrams({ ...item('avena', 1), quantity: 'abc' as unknown as number })).toBeNull()
  })
})

describe('calculateIngredientMacros', () => {
  it('scales the catalog values per 100 g', () => {
    expect(calculateIngredientMacros(item('pollo', 200), catalog.get('pollo'))).toEqual({
      calories: 330,
      protein_g: 62,
      carbs_g: 0,
      fat_g: 7.2,
    })
  })

  it('returns null without catalog data or grams', () => {
    expect(calculateIngredientMacros(item('nada', 100), undefined)).toBeNull()
    expect(calculateIngredientMacros(item('arroz', 1, 'bowl', null), catalog.get('arroz'))).toBeNull()
  })
})

describe('sumIngredientMacros + roundMacros', () => {
  const cases = [
    [item('avena', 80)],
    [item('pollo', 200), item('arroz', 1, 'bowl', 250)],
    [item('pollo', 150), item('arroz', 1, 'bowl', 250)],
    [item('avena', 33.3), item('pollo', 17.7), item('arroz', 1, 'tablespoon', 15)],
    [item('avena', 80), item('desconocido', 50), item('arroz', 1, 'bowl', null)],
  ]

  it.each(cases.map((items, index) => [index, items] as const))(
    'matches «Calcular desde ingredientes» (case %i)',
    (_, items) => {
      const legacy = legacyMealCalculation(items)
      const sum = sumIngredientMacros(items, catalog)
      expect(roundMacros(sum.totals)).toEqual(legacy.written)
      expect(sum.calculatedItems).toBe(legacy.calculatedItems)
      expect(sum.omittedItems).toBe(legacy.omittedItems)
      expect(sum.missingItems).toBe(legacy.missingItems)
    }
  )

  it('sums a meal with the button rounding (integer kcal, one decimal for macros)', () => {
    const sum = sumIngredientMacros([item('pollo', 200), item('arroz', 1, 'bowl', 250)], catalog)
    expect(roundMacros(sum.totals)).toEqual({ calories: 655, protein_g: 68.8, carbs_g: 70, fat_g: 8 })
  })

  it('counts ingredients without data, missing grams or empty quantities as 0', () => {
    const sum = sumIngredientMacros(
      [
        item('avena', 100),
        item('desconocido', 100),
        item('arroz', 1, 'bowl', null),
        { ...item('pollo', 1), quantity: '' as unknown as number },
      ],
      catalog
    )
    expect(roundMacros(sum.totals)).toEqual({ calories: 380, protein_g: 13, carbs_g: 66, fat_g: 7 })
    expect(sum).toMatchObject({ calculatedItems: 1, missingItems: 1, omittedItems: 2 })
    for (const value of Object.values(sum.totals)) expect(Number.isFinite(value)).toBe(true)
  })

  it('returns zeros for an empty meal', () => {
    const sum = sumIngredientMacros([], catalog)
    expect(sum.totals).toEqual({ calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 })
    expect(sum.calculatedItems).toBe(0)
  })
})

describe('sumDeclaredMealMacros', () => {
  it('adds the declared values of the meals like «Calcular desde comidas»', () => {
    const totals = sumDeclaredMealMacros([
      { calories: 450, protein_g: 30.25, carbs_g: 50, fat_g: 12 },
      { calories: null, protein_g: null, carbs_g: 20.1, fat_g: undefined },
      { calories: 300, protein_g: 10, carbs_g: null, fat_g: 3.33 },
    ])
    expect(roundMacros(totals)).toEqual({ calories: 750, protein_g: 40.3, carbs_g: 70.1, fat_g: 15.3 })
  })
})

describe('compareMacro', () => {
  it('reports the signed difference between the computed sum and the declared value', () => {
    expect(compareMacro(535, 500)).toEqual({ difference: 35, status: 'mismatch' })
    expect(compareMacro(36, 40)).toEqual({ difference: -4, status: 'mismatch' })
  })

  it('treats differences within ±1 as matching (rounding)', () => {
    expect(MACRO_TOLERANCE).toBe(1)
    expect(compareMacro(501, 500).status).toBe('match')
    expect(compareMacro(499, 500).status).toBe('match')
    expect(compareMacro(40.9, 40).status).toBe('match')
    expect(compareMacro(41.1, 40).status).toBe('mismatch')
    expect(compareMacro(500, 500)).toEqual({ difference: 0, status: 'match' })
  })

  it('does not flag anything without a declared value or a computed sum', () => {
    expect(compareMacro(535, null)).toEqual({ difference: null, status: 'undeclared' })
    expect(compareMacro(535, undefined)).toEqual({ difference: null, status: 'undeclared' })
    expect(compareMacro(535, Number.NaN)).toEqual({ difference: null, status: 'undeclared' })
    expect(compareMacro(null, 500)).toEqual({ difference: null, status: 'unknown' })
  })

  it('avoids floating point noise in the difference', () => {
    expect(compareMacro(68.8, 68.7).difference).toBe(0.1)
  })
})

describe('formatSignedDifference', () => {
  it('always shows the sign and the unit', () => {
    expect(formatSignedDifference(35, 'kcal')).toBe('+35 kcal')
    expect(formatSignedDifference(-4, 'g')).toBe('−4 g')
    expect(formatSignedDifference(0.5, 'g')).toBe('+0.5 g')
    expect(formatSignedDifference(0, 'kcal')).toBe('0 kcal')
    expect(formatSignedDifference(null, 'g')).toBe('—')
  })
})
