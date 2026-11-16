import type { Ingredient } from '../ingredients/types'
import type { MealIngredientFormValues } from './schemas'

/**
 * Nutrition sums used by the diet builder. «Calcular desde ingredientes» and
 * «Calcular desde comidas» write these results into the form; the live comparison
 * (RDS-F4-10) only reads them, so both always show the same numbers.
 */

export type MacroKey = 'calories' | 'protein_g' | 'carbs_g' | 'fat_g'
export type MacroTotals = Record<MacroKey, number>

export const MACRO_KEYS: readonly MacroKey[] = ['calories', 'protein_g', 'carbs_g', 'fat_g']

export type IngredientNutrition = Pick<
  Ingredient,
  'calories_per_100g' | 'protein_per_100g' | 'carbs_per_100g' | 'fat_per_100g'
>

export type MealIngredientInput = Pick<
  MealIngredientFormValues,
  'ingredient_id' | 'quantity' | 'unit' | 'grams_equivalent'
>

export interface IngredientMacrosSum {
  /** Unrounded sum of the ingredients that could be calculated. */
  totals: MacroTotals
  calculatedItems: number
  /** In the catalog but without grams (no quantity in g or no gram equivalent). */
  omittedItems: number
  /** Not found in the loaded catalog. */
  missingItems: number
}

/** A difference within this margin (kcal or g) is attributed to rounding. */
export const MACRO_TOLERANCE = 1

const emptyTotals = (): MacroTotals => ({ calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 })

/** Grams of an ingredient line: the quantity when the unit is g, otherwise its gram equivalent. */
export function getIngredientGrams(item: MealIngredientInput): number | null {
  const grams = item.unit === 'g' ? item.quantity : item.grams_equivalent
  // Only numbers count: an empty or non-numeric value is treated as no grams (never NaN).
  if (typeof grams !== 'number' || !grams || grams <= 0) return null
  return grams
}

/** Unrounded macros of one ingredient line, or null when it cannot be calculated. */
export function calculateIngredientMacros(
  item: MealIngredientInput,
  ingredient: IngredientNutrition | undefined
): MacroTotals | null {
  if (!ingredient) return null
  const grams = getIngredientGrams(item)
  if (grams === null) return null

  const factor = grams / 100
  return {
    calories: ingredient.calories_per_100g * factor,
    protein_g: ingredient.protein_per_100g * factor,
    carbs_g: ingredient.carbs_per_100g * factor,
    fat_g: ingredient.fat_per_100g * factor,
  }
}

/** Sum of a meal's (or variant's) ingredients, the formula behind «Calcular desde ingredientes». */
export function sumIngredientMacros(
  items: readonly MealIngredientInput[],
  ingredientsById: ReadonlyMap<string, IngredientNutrition>
): IngredientMacrosSum {
  const totals = emptyTotals()
  let calculatedItems = 0
  let omittedItems = 0
  let missingItems = 0

  for (const item of items) {
    const ingredient = ingredientsById.get(item.ingredient_id)
    if (!ingredient) {
      missingItems += 1
      continue
    }
    const macros = calculateIngredientMacros(item, ingredient)
    if (!macros) {
      omittedItems += 1
      continue
    }
    for (const key of MACRO_KEYS) totals[key] += macros[key]
    calculatedItems += 1
  }

  return { totals, calculatedItems, omittedItems, missingItems }
}

/** Rounding written by the calculate buttons: whole kcal, macros to one decimal. */
export function roundMacros(totals: MacroTotals): MacroTotals {
  return {
    calories: Math.round(totals.calories),
    protein_g: Math.round(totals.protein_g * 10) / 10,
    carbs_g: Math.round(totals.carbs_g * 10) / 10,
    fat_g: Math.round(totals.fat_g * 10) / 10,
  }
}

type DeclaredMacros = Partial<Record<MacroKey, number | null | undefined>>

/**
 * Sum of the values declared on each meal (variants are not included), the formula
 * behind «Calcular desde comidas». A meal without a value counts as 0.
 */
export function sumDeclaredMealMacros(meals: readonly DeclaredMacros[]): MacroTotals {
  return meals.reduce<MacroTotals>(
    (acc, meal) => ({
      calories: acc.calories + (meal.calories ?? 0),
      protein_g: acc.protein_g + (meal.protein_g ?? 0),
      carbs_g: acc.carbs_g + (meal.carbs_g ?? 0),
      fat_g: acc.fat_g + (meal.fat_g ?? 0),
    }),
    emptyTotals()
  )
}

export type MacroComparisonStatus = 'match' | 'mismatch' | 'undeclared' | 'unknown'

export interface MacroComparison {
  /** computed − declared, to one decimal; null when either side is missing. */
  difference: number | null
  status: MacroComparisonStatus
}

/** Compares a computed (already rounded) value with the declared one. */
export function compareMacro(
  computed: number | null,
  declared: number | null | undefined,
  tolerance = MACRO_TOLERANCE
): MacroComparison {
  if (computed === null || !Number.isFinite(computed)) return { difference: null, status: 'unknown' }
  if (typeof declared !== 'number' || !Number.isFinite(declared)) {
    return { difference: null, status: 'undeclared' }
  }

  const difference = Math.round((computed - declared) * 10) / 10 || 0
  return {
    difference,
    status: Math.abs(difference) <= tolerance ? 'match' : 'mismatch',
  }
}

function formatAmount(value: number) {
  return Number.isInteger(value) ? value.toString() : value.toFixed(1)
}

/** Value with its unit, rounded like the buttons: «655 kcal», «68.8 g». */
export function formatMacroAmount(value: number | null | undefined, unit: 'kcal' | 'g') {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
  return `${formatAmount(value)} ${unit}`
}

/** Signed difference with its unit: «+35 kcal», «−4 g», «0 g»; «—» without a value. */
export function formatSignedDifference(difference: number | null, unit: 'kcal' | 'g') {
  if (difference === null) return '—'
  if (difference === 0) return `0 ${unit}`
  const sign = difference > 0 ? '+' : '−'
  return `${sign}${formatAmount(Math.abs(difference))} ${unit}`
}
