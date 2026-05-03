import { z } from 'zod'
import { MEAL_TYPE_OPTIONS, MEASURE_UNIT_OPTIONS } from './types'

export function normalizeDietTagLabel(tag: string) {
  return tag.trim().replace(/\s+/g, ' ')
}

export function getDietTagKey(tag: string) {
  return normalizeDietTagLabel(tag)
    .toLocaleLowerCase('es-ES')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .normalize('NFC')
}

export function normalizeDietTags(tags: string[]) {
  const seen = new Set<string>()
  const normalizedTags: string[] = []

  for (const tag of tags) {
    const normalizedTag = normalizeDietTagLabel(tag)
    const tagKey = getDietTagKey(normalizedTag)

    if (!normalizedTag || seen.has(tagKey)) {
      continue
    }

    seen.add(tagKey)
    normalizedTags.push(normalizedTag)
  }

  return normalizedTags
}

const dietTagSchema = z
  .string()
  .transform(normalizeDietTagLabel)
  .refine((value) => value.length > 0, 'Las etiquetas no pueden estar vacias')

export const mealIngredientSchema = z.object({
  ingredient_id: z.string().trim().min(1, 'Selecciona un ingrediente'),
  quantity: z.number().positive('Cantidad debe ser mayor que 0'),
  unit: z.enum(MEASURE_UNIT_OPTIONS),
})

export const mealSchema = z.object({
  type: z.enum(MEAL_TYPE_OPTIONS),
  name: z.string().trim().min(1, 'El nombre es obligatorio'),
  image_url: z.string().trim().url('URL inválida').optional().or(z.literal('')).nullable(),
  calories: z.number().int().min(0).optional().nullable(),
  protein_g: z.number().min(0).optional().nullable(),
  carbs_g: z.number().min(0).optional().nullable(),
  fat_g: z.number().min(0).optional().nullable(),
  nutritional_badges: z.array(z.string()).optional(),
  order: z.number().int().min(0).default(0),
  ingredients: z.array(mealIngredientSchema).min(1, 'Agrega al menos un ingrediente'),
})

export const dietSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio'),
  tags: z.array(dietTagSchema).superRefine((tags, context) => {
    if (new Set(tags.map(getDietTagKey)).size !== tags.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'No repitas etiquetas',
      })
    }
  }),
  total_calories: z.number().int().min(0).optional().nullable(),
  total_protein_g: z.number().min(0).optional().nullable(),
  total_carbs_g: z.number().min(0).optional().nullable(),
  total_fat_g: z.number().min(0).optional().nullable(),
  meals: z.array(mealSchema).min(1, 'Agrega al menos una comida'),
})

export type DietFormValues = z.infer<typeof dietSchema>
export type MealFormValues = z.infer<typeof mealSchema>
export type MealIngredientFormValues = z.infer<typeof mealIngredientSchema>
