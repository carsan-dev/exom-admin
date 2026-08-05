import { z } from 'zod'
import { LEVEL_OPTIONS, ROLE_OPTIONS } from './types'

export const createClientSchema = z
  .object({
    email: z.string().trim().email('Introduce un email válido'),
    send_invitation: z.boolean(),
    password: z.string().optional(),
    first_name: z.string().trim().min(1, 'El nombre es obligatorio'),
    last_name: z.string().trim().min(1, 'El apellido es obligatorio'),
    level: z.enum(LEVEL_OPTIONS).optional(),
    main_goal: z.string().trim().max(160, 'El objetivo no puede superar 160 caracteres').optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.send_invitation) {
      if (!data.password || data.password.length < 8) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['password'],
          message: 'La contraseña debe tener al menos 8 caracteres',
        })
      }
    }
  })

export const createAdminSchema = z
  .object({
    email: z.string().trim().email('Introduce un email válido'),
    send_invitation: z.boolean(),
    password: z.string().optional(),
    first_name: z.string().trim().min(1, 'El nombre es obligatorio'),
    last_name: z.string().trim().min(1, 'El apellido es obligatorio'),
  })
  .superRefine((data, ctx) => {
    if (!data.send_invitation) {
      if (!data.password || data.password.length < 8) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['password'],
          message: 'La contraseña debe tener al menos 8 caracteres',
        })
      }
    }
  })

export const updateUserSchema = z.object({
  email: z.string().trim().email('Introduce un email válido'),
  first_name: z.string().trim().min(1, 'El nombre es obligatorio'),
  last_name: z.string().trim().min(1, 'El apellido es obligatorio'),
})

export const updateClientProfileSchema = z.object({
  first_name: z.string().trim().min(1, 'El nombre es obligatorio').max(100),
  last_name: z.string().trim().min(1, 'El apellido es obligatorio').max(100),
  level: z.enum(LEVEL_OPTIONS),
  main_goal: z.string().trim().max(160, 'El objetivo no puede superar 160 caracteres'),
  muscle_mass_goal: z
    .string()
    .trim()
    .refine(
      (value) =>
        value === '' ||
        (!Number.isNaN(Number(value)) && Number(value) >= 0 && Number(value) <= 500),
      'Introduce un valor entre 0 y 500'
    ),
  target_calories: z
    .string()
    .trim()
    .refine(
      (value) =>
        value === '' ||
        (Number.isInteger(Number(value)) && Number(value) >= 0 && Number(value) <= 20000),
      'Introduce un valor entero entre 0 y 20.000'
    ),
  current_weight: z
    .string()
    .trim()
    .refine(
      (value) =>
        value === '' ||
        (!Number.isNaN(Number(value)) && Number(value) >= 0 && Number(value) <= 500),
      'Introduce un valor entre 0 y 500'
    ),
  height: z
    .string()
    .trim()
    .refine(
      (value) =>
        value === '' ||
        (!Number.isNaN(Number(value)) && Number(value) >= 0 && Number(value) <= 300),
      'Introduce un valor entre 0 y 300'
    ),
  birth_date: z
    .string()
    .refine(
      (value) => value === '' || new Date(`${value}T00:00:00`).getTime() <= Date.now(),
      'La fecha de nacimiento no puede ser futura'
    ),
})

const optionalMetricValue = z
  .string()
  .trim()
  .refine(
    (value) => value === '' || (!Number.isNaN(Number(value)) && Number(value) >= 0),
    'Introduce un número igual o mayor que 0'
  )

export const clientMetricSchema = z
  .object({
    date: z
      .string()
      .min(1, 'La fecha es obligatoria')
      .refine(
        (value) => new Date(`${value}T00:00:00Z`).getTime() <= Date.now(),
        'La fecha no puede ser futura'
      ),
    weight_kg: optionalMetricValue,
    muscle_mass_kg: optionalMetricValue,
    height_cm: optionalMetricValue,
    sleep_hours: optionalMetricValue,
    neck_cm: optionalMetricValue,
    shoulders_cm: optionalMetricValue,
    chest_cm: optionalMetricValue,
    arm_left_cm: optionalMetricValue,
    arm_right_cm: optionalMetricValue,
    forearm_left_cm: optionalMetricValue,
    forearm_right_cm: optionalMetricValue,
    waist_cm: optionalMetricValue,
    hips_cm: optionalMetricValue,
    thigh_left_cm: optionalMetricValue,
    thigh_right_cm: optionalMetricValue,
    calf_left_cm: optionalMetricValue,
    calf_right_cm: optionalMetricValue,
  })
  .refine(
    (values) =>
      Object.entries(values).some(([field, value]) => field !== 'date' && value !== ''),
    { message: 'Introduce al menos una métrica', path: ['weight_kg'] }
  )

export const updateRoleSchema = z.object({
  role: z.enum(ROLE_OPTIONS),
})

export const updateClientAssignmentsSchema = z.object({
  admin_ids: z.array(z.string().uuid('Selecciona administradores válidos')),
})

export type CreateClientFormValues = z.infer<typeof createClientSchema>
export type CreateAdminFormValues = z.infer<typeof createAdminSchema>
export type UpdateUserFormValues = z.infer<typeof updateUserSchema>
export type UpdateRoleFormValues = z.infer<typeof updateRoleSchema>
export type UpdateClientAssignmentsFormValues = z.infer<typeof updateClientAssignmentsSchema>
export type UpdateClientProfileFormValues = z.infer<typeof updateClientProfileSchema>
export type ClientMetricFormValues = z.infer<typeof clientMetricSchema>
