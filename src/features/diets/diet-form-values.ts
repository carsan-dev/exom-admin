import { normalizeDietTags, type DietFormValues } from './schemas'
import type { Diet } from './types'

export const defaultMeal: DietFormValues['meals'][number] = {
  type: 'BREAKFAST',
  name: '',
  image_url: null,
  image_upload_id: '',
  calories: null,
  protein_g: null,
  carbs_g: null,
  fat_g: null,
  nutritional_badges: [],
  order: 0,
  ingredients: [],
  variants: [],
}

export const defaultVariant: NonNullable<DietFormValues['meals'][number]['variants']>[number] = {
  type: 'BREAKFAST',
  name: '',
  image_url: null,
  image_upload_id: '',
  calories: null,
  protein_g: null,
  carbs_g: null,
  fat_g: null,
  nutritional_badges: [],
  order: 0,
  ingredients: [],
}

export const defaultValues: DietFormValues = {
  name: '',
  tags: [],
  total_calories: null,
  total_protein_g: null,
  total_carbs_g: null,
  total_fat_g: null,
  meals: [{ ...defaultMeal }],
}

export function toFormValues(diet: Diet, isDuplicate: boolean): DietFormValues {
  return {
    name: isDuplicate ? `${diet.name} (copia)` : diet.name,
    tags: normalizeDietTags(diet.tags ?? []),
    total_calories: diet.total_calories,
    total_protein_g: diet.total_protein_g,
    total_carbs_g: diet.total_carbs_g,
    total_fat_g: diet.total_fat_g,
    meals: [...diet.meals]
      .sort((a, b) => a.order - b.order)
      .map((meal) => ({
        ...(isDuplicate ? {} : { id: meal.id }),
        type: meal.type,
        name: meal.name,
        image_url: isDuplicate ? null : meal.image_url,
        image_upload_id: '',
        calories: meal.calories,
        protein_g: meal.protein_g,
        carbs_g: meal.carbs_g,
        fat_g: meal.fat_g,
        nutritional_badges: meal.nutritional_badges,
        order: meal.order,
        ingredients: meal.ingredients.map((mi) => ({
          ingredient_id: mi.ingredient.id,
          quantity: mi.quantity,
          unit: mi.unit,
          grams_equivalent: mi.grams_equivalent ?? (mi.unit === 'g' ? mi.quantity : null),
        })),
        variants: (meal.variants ?? [])
          .sort((a, b) => a.order - b.order)
          .map((variant) => ({
            ...(isDuplicate ? {} : { id: variant.id }),
            type: variant.type,
            name: variant.name,
            image_url: isDuplicate ? null : variant.image_url,
            image_upload_id: '',
            calories: variant.calories,
            protein_g: variant.protein_g,
            carbs_g: variant.carbs_g,
            fat_g: variant.fat_g,
            nutritional_badges: variant.nutritional_badges,
            order: variant.order,
            ingredients: variant.ingredients.map((mi) => ({
              ingredient_id: mi.ingredient.id,
              quantity: mi.quantity,
              unit: mi.unit,
              grams_equivalent: mi.grams_equivalent ?? (mi.unit === 'g' ? mi.quantity : null),
            })),
          })),
      })),
  }
}
