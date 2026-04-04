import { z } from 'zod'
import { LEVEL_OPTIONS, ROLE_OPTIONS } from './types'

export const createClientSchema = z.object({
  email: z.string().trim().email('Introduce un email válido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  first_name: z.string().trim().min(1, 'El nombre es obligatorio'),
  last_name: z.string().trim().min(1, 'El apellido es obligatorio'),
  level: z.enum(LEVEL_OPTIONS).optional(),
  main_goal: z.string().trim().max(160, 'El objetivo no puede superar 160 caracteres').optional(),
})

export const createAdminSchema = z.object({
  email: z.string().trim().email('Introduce un email válido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  first_name: z.string().trim().min(1, 'El nombre es obligatorio'),
  last_name: z.string().trim().min(1, 'El apellido es obligatorio'),
})

export const updateUserSchema = z.object({
  email: z.string().trim().email('Introduce un email válido'),
  first_name: z.string().trim().min(1, 'El nombre es obligatorio'),
  last_name: z.string().trim().min(1, 'El apellido es obligatorio'),
})

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
