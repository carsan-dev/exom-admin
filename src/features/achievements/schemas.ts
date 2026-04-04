import { z } from 'zod'
import { CRITERIA_TYPE_OPTIONS } from './types'

export const achievementFormSchema = z.object({
  name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(100, 'Máximo 100 caracteres'),
  description: z.string().trim().min(5, 'La descripción debe tener al menos 5 caracteres').max(500, 'Máximo 500 caracteres'),
  icon_url: z.string().trim().url('Introduce una URL válida').or(z.literal('')).optional(),
  criteria_type: z.enum(CRITERIA_TYPE_OPTIONS, { required_error: 'Selecciona un tipo de criterio' }),
  criteria_value: z.coerce.number().min(0, 'El valor debe ser mayor o igual a 0'),
})

export const grantAchievementSchema = z.object({
  client_ids: z.array(z.string()).min(1, 'Selecciona al menos un cliente'),
})

export type AchievementFormSchemaValues = z.infer<typeof achievementFormSchema>
export type GrantAchievementSchemaValues = z.infer<typeof grantAchievementSchema>
