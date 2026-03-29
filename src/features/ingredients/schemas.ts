import { z } from 'zod'

function nonNegativeNumber(label: string) {
  return z.coerce
    .number({ invalid_type_error: `${label} debe ser un número` })
    .refine((value) => Number.isFinite(value), `${label} debe ser un número válido`)
    .refine((value) => value >= 0, `${label} debe ser mayor o igual a 0`)
}

export const ingredientSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio'),
  icon: z.string().trim().optional().or(z.literal('')),
  calories_per_100g: nonNegativeNumber('Las kcal por 100 g'),
  protein_per_100g: nonNegativeNumber('La proteína por 100 g'),
  carbs_per_100g: nonNegativeNumber('Los carbohidratos por 100 g'),
  fat_per_100g: nonNegativeNumber('Las grasas por 100 g'),
})

export type IngredientFormValues = z.infer<typeof ingredientSchema>
