import { z } from 'zod'
import { CHALLENGE_RULE_OPTIONS, CHALLENGE_TYPE_OPTIONS } from './types'

const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/
const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function getTodayDateInputValue() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function isExpiredDateInputValue(value: string) {
  return isoDateRegex.test(value) && value < getTodayDateInputValue()
}

export const challengeFormSchema = z
  .object({
    title: z.string().trim().min(1, 'Ingresa un título'),
    description: z.string().trim().min(1, 'Ingresa una descripción'),
    type: z.enum(CHALLENGE_TYPE_OPTIONS),
    target_value: z.coerce.number().min(0, 'Ingresa un objetivo válido'),
    unit: z.string().trim().min(1, 'Ingresa una unidad'),
    is_manual: z.boolean().default(true),
    is_global: z.boolean().default(false),
    deadline: z
      .string()
      .trim()
      .refine((value) => value === '' || isoDateRegex.test(value), 'Selecciona una fecha válida')
      .refine((value) => value === '' || !isExpiredDateInputValue(value), 'La fecha límite no puede estar vencida')
      .default(''),
    rule_key: z.enum(CHALLENGE_RULE_OPTIONS).nullable().optional(),
    rule_config: z.record(z.string(), z.unknown()).nullable().optional(),
  })
  .superRefine((value, context) => {
    if (!value.is_manual && !value.rule_key) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Selecciona una regla automática',
        path: ['rule_key'],
      })
    }
  })

export const assignChallengeSchema = z
  .object({
    client_ids: z.array(z.string().trim().regex(uuidV4Regex, 'Selecciona clientes válidos')).default([]),
    apply_to_all_visible_clients: z.boolean().default(false),
  })
  .superRefine((value, context) => {
    if (!value.apply_to_all_visible_clients && value.client_ids.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Selecciona al menos un cliente o aplica el reto a todos los visibles',
        path: ['client_ids'],
      })
    }
  })

export type ChallengeFormSchemaValues = z.infer<typeof challengeFormSchema>
export type AssignChallengeSchemaValues = z.infer<typeof assignChallengeSchema>
