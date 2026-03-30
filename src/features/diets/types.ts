import type { Ingredient } from '../ingredients/types'

export const MEAL_TYPE_OPTIONS = ['BREAKFAST', 'LUNCH', 'SNACK', 'DINNER'] as const
export type MealType = (typeof MEAL_TYPE_OPTIONS)[number]

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  BREAKFAST: 'Desayuno',
  LUNCH: 'Almuerzo',
  SNACK: 'Snack',
  DINNER: 'Cena',
}

export const MEASURE_UNIT_OPTIONS = ['g', 'ml', 'piece'] as const
export type MeasureUnit = (typeof MEASURE_UNIT_OPTIONS)[number]

export const MEASURE_UNIT_LABELS: Record<MeasureUnit, string> = {
  g: 'gramos',
  ml: 'mililitros',
  piece: 'unidades',
}

export function getMealTypeBadgeClass(type: string) {
  switch (type) {
    case 'BREAKFAST':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-600'
    case 'LUNCH':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600'
    case 'SNACK':
      return 'border-purple-500/30 bg-purple-500/10 text-purple-600'
    case 'DINNER':
      return 'border-blue-500/30 bg-blue-500/10 text-blue-600'
    default:
      return 'border-border bg-muted text-muted-foreground'
  }
}

export interface MealIngredient {
  id: string
  quantity: number
  unit: MeasureUnit
  ingredient: Ingredient
}

export interface Meal {
  id: string
  type: MealType
  name: string
  image_url: string | null
  calories: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  nutritional_badges: string[]
  order: number
  ingredients: MealIngredient[]
}

export interface Diet {
  id: string
  name: string
  total_calories: number | null
  total_protein_g: number | null
  total_carbs_g: number | null
  total_fat_g: number | null
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
  meals: Meal[]
}
