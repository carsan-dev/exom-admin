import { z } from 'zod'
import { CRITERIA_TYPE_OPTIONS, TRAINING_TYPE_OPTIONS } from './types'

const achievementRuleConfigSchema = z.object({
  training_type: z.enum(TRAINING_TYPE_OPTIONS).optional(),
})

export const achievementFormSchema = z.object({
  name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(100, 'Máximo 100 caracteres'),
  description: z.string().trim().min(5, 'La descripción debe tener al menos 5 caracteres').max(500, 'Máximo 500 caracteres'),
  icon_url: z.string().trim().url('Introduce una URL válida').or(z.literal('')).optional(),
  criteria_type: z.enum(CRITERIA_TYPE_OPTIONS, { required_error: 'Selecciona un tipo de criterio' }),
  criteria_value: z.coerce.number().min(1, 'El valor debe ser mayor o igual a 1'),
  rule_config: achievementRuleConfigSchema,
}).superRefine((values, ctx) => {
  if (values.criteria_type !== 'TRAINING_DAYS' && values.rule_config.training_type) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['rule_config', 'training_type'],
      message: 'Solo los logros por días de entrenamiento admiten un tipo de entrenamiento',
    })
  }
})

export const grantAchievementSchema = z.object({
  client_ids: z.array(z.string()).min(1, 'Selecciona al menos un cliente'),
})

export type AchievementFormSchemaValues = z.infer<typeof achievementFormSchema>
export type GrantAchievementSchemaValues = z.infer<typeof grantAchievementSchema>
