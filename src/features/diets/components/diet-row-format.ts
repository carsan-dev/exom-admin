import type { Diet } from '../types'

export function getDietMealsCount(diet: Diet) {
  return diet.meals_count ?? diet.meals.length
}

export function formatDietCalories(diet: Diet) {
  return diet.total_calories != null ? `${diet.total_calories} kcal` : '—'
}

export function hasDietMacros(diet: Diet) {
  return diet.total_protein_g != null || diet.total_carbs_g != null || diet.total_fat_g != null
}

export function formatDietMacros(diet: Diet) {
  return `P ${diet.total_protein_g ?? '—'}g · C ${diet.total_carbs_g ?? '—'}g · G ${diet.total_fat_g ?? '—'}g`
}

/** Nombre corto de la comida en la fila (mismo recorte que la tabla anterior). */
export function formatMealShortName(name: string) {
  return name.length > 10 ? name.slice(0, 10) + '…' : name
}
