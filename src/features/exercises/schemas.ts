import { z } from 'zod'
import { LEVEL_OPTIONS } from './types'

export const exerciseSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio'),
  muscle_groups: z.array(z.string()).min(1, 'Selecciona al menos un grupo muscular'),
  equipment: z.array(z.string()),
  level: z.enum(LEVEL_OPTIONS),
  video_url: z.string().url('URL inválida').optional().or(z.literal('')),
  video_stream_id: z.string().optional().or(z.literal('')),
  thumbnail_url: z.string().url('URL inválida').optional().or(z.literal('')),
  technique_text: z.string().max(2000).optional().or(z.literal('')),
  common_errors_text: z.string().max(2000).optional().or(z.literal('')),
  explanation_text: z.string().max(2000).optional().or(z.literal('')),
})

export type ExerciseFormValues = z.infer<typeof exerciseSchema>
