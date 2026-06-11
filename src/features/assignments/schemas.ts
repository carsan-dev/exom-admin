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

function isoWeekday(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)

  if (!match) {
    return null
  }

  const [, year, month, day] = match
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
  const weekday = date.getUTCDay()

  return weekday === 0 ? 7 : weekday
}

const nullableSelectionSchema = z
  .string()
  .trim()
  .min(1, 'Selecciona una opción válida')
  .refine((value) => value !== '__none__', 'Selecciona una opción válida')
  .nullable()
  .optional()

export const assignmentEditorDaySchema = z
  .object({
    assignment_id: z.string().nullable().optional(),
    original_date: z.string().regex(isoDateRegex, 'Fecha original inválida'),
    date: z.string().regex(isoDateRegex, 'Selecciona una fecha válida'),
    training_id: nullableSelectionSchema,
    diet_id: nullableSelectionSchema,
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

export const assignmentEditorSchema = z
  .object({
    days: z.array(assignmentEditorDaySchema).min(1, 'Selecciona al menos un día'),
    auto_assignment_enabled: z.boolean().default(false),
    auto_assignment_end_mode: z.enum(['indefinite', 'date']).default('indefinite'),
    auto_assignment_ends_on: z.string().regex(isoDateRegex, 'Selecciona una fecha válida').nullable().optional(),
  })
  .superRefine((value, context) => {
    if (!value.auto_assignment_enabled) {
      return
    }

    if (value.auto_assignment_end_mode === 'date' && !value.auto_assignment_ends_on) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Selecciona una fecha fin',
        path: ['auto_assignment_ends_on'],
      })
    }

    const seenWeekdays = new Set<number>()

    value.days.forEach((day, index) => {
      const weekday = isoWeekday(day.date)

      if (!weekday) {
        return
      }

      if (seenWeekdays.has(weekday)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'La autoasignación no puede repetir el mismo día de la semana',
          path: ['days', index, 'date'],
        })
      }

      seenWeekdays.add(weekday)
    })
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
