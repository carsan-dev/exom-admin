import { z } from 'zod'
import { LEVEL_OPTIONS } from '../exercises/types'
import { normalizeTrainingTypeLabel } from './types'

export function normalizeTrainingTagLabel(tag: string) {
  return tag.trim().replace(/\s+/g, ' ')
}

export function getTrainingTagKey(tag: string) {
  return normalizeTrainingTagLabel(tag)
    .toLocaleLowerCase('es-ES')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .normalize('NFC')
}

export function normalizeTrainingTags(tags: string[]) {
  const seen = new Set<string>()
  const normalizedTags: string[] = []

  for (const tag of tags) {
    const normalizedTag = normalizeTrainingTagLabel(tag)
    const tagKey = getTrainingTagKey(normalizedTag)

    if (!normalizedTag || seen.has(tagKey)) {
      continue
    }

    seen.add(tagKey)
    normalizedTags.push(normalizedTag)
  }

  return normalizedTags
}

const trainingTypeSchema = z
  .string()
  .transform(normalizeTrainingTypeLabel)
  .refine((value) => value.length > 0, 'Selecciona o crea un tipo')

const trainingTagSchema = z
  .string()
  .transform(normalizeTrainingTagLabel)
  .refine((value) => value.length > 0, 'Las etiquetas no pueden estar vacias')

export const trainingExerciseSchema = z.object({
  exercise_id: z.string().trim().min(1, 'Selecciona un ejercicio'),
  order: z.number().int().min(0),
  sets: z.number().int().min(1, 'Mínimo 1 serie'),
  reps_or_duration: z.string().trim().min(1, 'Especifica reps o duración'),
  rest_seconds: z.number().int().min(0).default(60),
})

export const trainingSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio'),
  type: trainingTypeSchema,
  level: z.enum(LEVEL_OPTIONS),
  estimated_duration_min: z.number().int().positive().optional().or(z.literal(0)).nullable(),
  estimated_calories: z.number().int().positive().optional().or(z.literal(0)).nullable(),
  warmup_description: z.string().max(1000).optional().or(z.literal('')),
  warmup_duration_min: z.number().int().positive().optional().or(z.literal(0)).nullable(),
  cooldown_description: z.string().max(1000).optional().or(z.literal('')),
  tags: z.array(trainingTagSchema).superRefine((tags, context) => {
    if (new Set(tags.map(getTrainingTagKey)).size !== tags.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'No repitas etiquetas',
      })
    }
  }),
  exercises: z.array(trainingExerciseSchema).min(1, 'Agrega al menos un ejercicio'),
})

export type TrainingFormValues = z.infer<typeof trainingSchema>
export type TrainingExerciseFormValues = z.infer<typeof trainingExerciseSchema>
