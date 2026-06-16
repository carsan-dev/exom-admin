import { z } from 'zod'
import { normalizeSearchText } from '@/lib/search'
import type { Ingredient } from '../ingredients/types'
import type { DietFormValues, MealIngredientFormValues } from './schemas'
import { normalizeDietTags } from './schemas'
import { MEAL_TYPE_OPTIONS, MEASURE_UNIT_OPTIONS, type MealType } from './types'

export interface DietImportResult {
  values: DietFormValues
  issues: string[]
}

const optionalNumber = z
  .union([z.number(), z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (value == null || value === '') return null
    const parsed = typeof value === 'number' ? value : Number(value)
    return Number.isFinite(parsed) ? parsed : Number.NaN
  })
  .refine((value) => value == null || Number.isFinite(value), 'Número inválido')

const optionalInteger = optionalNumber.transform((value) => (value == null ? null : Math.trunc(value)))

const optionalText = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => value?.trim() ?? '')

const stringList = z.union([z.array(z.string()), z.string(), z.null(), z.undefined()]).transform((value) => {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    return value
      .split('|')
      .map((entry) => entry.trim())
      .filter(Boolean)
  }
  return []
})

const importIngredientSchema = z
  .object({
    ingredient_id: optionalText,
    ingredient_name: optionalText,
    quantity: optionalNumber.transform((value) => value ?? Number.NaN),
    unit: z.enum(MEASURE_UNIT_OPTIONS),
    grams_equivalent: optionalNumber,
  })
  .superRefine((value, context) => {
    if (!value.ingredient_id && !value.ingredient_name) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Cada ingrediente necesita ingredient_id o ingredient_name',
      })
    }

    if (!Number.isFinite(value.quantity) || value.quantity <= 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['quantity'],
        message: 'quantity debe ser mayor que 0',
      })
    }

    if (value.unit !== 'g' && (!value.grams_equivalent || value.grams_equivalent <= 0)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['grams_equivalent'],
        message: 'grams_equivalent es obligatorio si unit no es g',
      })
    }
  })

const importMealBaseSchema = z.object({
  type: z.enum(MEAL_TYPE_OPTIONS),
  name: z.string().trim().min(1, 'name de comida es obligatorio'),
  image_url: optionalText.nullable().transform((value) => value || null),
  calories: optionalInteger,
  protein_g: optionalNumber,
  carbs_g: optionalNumber,
  fat_g: optionalNumber,
  nutritional_badges: stringList,
  ingredients: z.array(importIngredientSchema).min(1, 'Cada comida necesita ingredientes'),
})

const importMealVariantSchema = importMealBaseSchema

const importMealSchema = importMealBaseSchema.extend({
  variants: z.array(importMealVariantSchema).optional().default([]),
})

const importDietSchema = z.object({
  name: z.string().trim().min(1, 'name es obligatorio'),
  tags: stringList.transform((tags) => normalizeDietTags(tags)),
  total_calories: optionalInteger,
  total_protein_g: optionalNumber,
  total_carbs_g: optionalNumber,
  total_fat_g: optionalNumber,
  meals: z.array(importMealSchema).min(1, 'La dieta necesita al menos una comida'),
})

type ImportIngredient = z.infer<typeof importIngredientSchema>
type ImportMeal = z.infer<typeof importMealSchema>
type ImportMealVariant = z.infer<typeof importMealVariantSchema>
type ImportDiet = z.infer<typeof importDietSchema>

function buildIngredientIndexes(ingredients: Ingredient[]) {
  const byName = new Map<string, Ingredient[]>()

  for (const ingredient of ingredients) {
    const key = normalizeSearchText(ingredient.name.trim())
    byName.set(key, [...(byName.get(key) ?? []), ingredient])
  }

  return { byName }
}

function resolveIngredientId(
  ingredient: Pick<ImportIngredient, 'ingredient_id' | 'ingredient_name'>,
  indexes: ReturnType<typeof buildIngredientIndexes>,
  issues: string[]
) {
  if (ingredient.ingredient_id) {
    return ingredient.ingredient_id
  }

  const ingredientName = ingredient.ingredient_name

  if (!ingredientName) {
    return ''
  }

  const matches = indexes.byName.get(normalizeSearchText(ingredientName))

  if (!matches?.length) {
    issues.push(`Ingrediente no encontrado: ${ingredientName}`)
    return ''
  }

  if (matches.length > 1) {
    issues.push(`Ingrediente ambiguo: ${ingredientName}`)
    return ''
  }

  return matches[0].id
}

function toIngredientFormValues(
  ingredients: ImportIngredient[],
  indexes: ReturnType<typeof buildIngredientIndexes>,
  issues: string[]
): MealIngredientFormValues[] {
  return ingredients.map((ingredient) => ({
    ingredient_id: resolveIngredientId(ingredient, indexes, issues),
    quantity: ingredient.quantity,
    unit: ingredient.unit,
    grams_equivalent: ingredient.unit === 'g' ? ingredient.quantity : ingredient.grams_equivalent,
  }))
}

function toMealFormValues(
  meal: ImportMeal | ImportMealVariant,
  order: number,
  indexes: ReturnType<typeof buildIngredientIndexes>,
  issues: string[]
) {
  return {
    type: meal.type as MealType,
    name: meal.name,
    image_url: meal.image_url,
    calories: meal.calories,
    protein_g: meal.protein_g,
    carbs_g: meal.carbs_g,
    fat_g: meal.fat_g,
    nutritional_badges: meal.nutritional_badges,
    order,
    ingredients: toIngredientFormValues(meal.ingredients, indexes, issues),
  }
}

function toFormValues(diet: ImportDiet, ingredients: Ingredient[]): DietImportResult {
  const issues: string[] = []
  const indexes = buildIngredientIndexes(ingredients)

  return {
    values: {
      name: diet.name,
      tags: diet.tags,
      total_calories: diet.total_calories,
      total_protein_g: diet.total_protein_g,
      total_carbs_g: diet.total_carbs_g,
      total_fat_g: diet.total_fat_g,
      meals: diet.meals.map((meal, order) => ({
        ...toMealFormValues(meal, order, indexes, issues),
        variants: (meal.variants ?? []).map((variant, variantOrder) =>
          toMealFormValues(variant, variantOrder, indexes, issues)
        ),
      })),
    },
    issues,
  }
}

function getParseError(error: unknown) {
  if (error instanceof z.ZodError) {
    return error.issues.map((issue) => issue.message).join('. ')
  }

  return error instanceof Error ? error.message : 'No se ha podido leer el archivo'
}

export function parseDietImport(fileName: string, text: string, ingredients: Ingredient[]) {
  if (!fileName.toLowerCase().endsWith('.json')) {
    throw new Error('Selecciona un archivo .json')
  }

  try {
    const parsed = importDietSchema.parse(JSON.parse(text))
    return toFormValues(parsed, ingredients)
  } catch (error) {
    throw new Error(getParseError(error))
  }
}
