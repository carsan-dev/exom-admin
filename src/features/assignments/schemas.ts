import { z } from 'zod'

const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/

function isMondayDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)

  if (!match) {
    return false
  }

  const [, year, month, day] = match
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))

  return date.getUTCDay() === 1
}

const nullableUuidSchema = z.string().uuid('Selecciona una opción válida').nullable().optional()

export const assignmentEditorSchema = z
  .object({
    date: z
      .string()
      .nullable()
      .optional()
      .refine((value) => value == null || value === '' || isoDateRegex.test(value), 'Selecciona una fecha válida'),
    training_id: nullableUuidSchema,
    diet_id: nullableUuidSchema,
    is_rest_day: z.boolean().default(false),
  })
  .superRefine((value, context) => {
    if (!value.is_rest_day && !value.training_id && !value.diet_id) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Selecciona un entrenamiento, una dieta o marca descanso',
        path: ['training_id'],
      })
    }
  })

export const copyWeekSchema = z
  .object({
    source_week_start: z
      .string()
      .regex(isoDateRegex, 'Selecciona una fecha válida')
      .refine(isMondayDate, 'La semana origen debe comenzar en lunes'),
    target_week_start: z
      .string()
      .regex(isoDateRegex, 'Selecciona una fecha válida')
      .refine(isMondayDate, 'La semana destino debe comenzar en lunes'),
  })
  .refine((value) => value.source_week_start !== value.target_week_start, {
    message: 'Selecciona una semana distinta para copiar',
    path: ['target_week_start'],
  })

export type AssignmentEditorFormValues = z.infer<typeof assignmentEditorSchema>
export type CopyWeekFormValues = z.infer<typeof copyWeekSchema>
