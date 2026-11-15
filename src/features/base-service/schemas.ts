import { z } from 'zod'

export const subscriberFormSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio'),
  email: z.string().trim().min(1, 'El email es obligatorio').email('Introduce un email válido'),
  goal: z.string().min(1, 'El objetivo es obligatorio'),
  days_per_week: z.string().min(1, 'Los días por semana son obligatorios'),
  service_scope: z.enum(['TRAINING', 'NUTRITION', 'BOTH']),
  notes: z.string(),
})

export type SubscriberFormValues = z.infer<typeof subscriberFormSchema>
