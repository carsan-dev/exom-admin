import type { Exercise, Level } from '../exercises/types'

export const DEFAULT_TRAINING_TYPE = 'FUERZA'
export type TrainingType = string

export function normalizeTrainingTypeLabel(type: string) {
  return type.trim().replace(/\s+/g, ' ')
}

export function getTrainingTypeKey(type: string) {
  return normalizeTrainingTypeLabel(type)
    .toLocaleLowerCase('es-ES')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .normalize('NFC')
}

export function getTrainingTypeLabel(type: string) {
  const normalizedType = normalizeTrainingTypeLabel(type)

  switch (getTrainingTypeKey(normalizedType)) {
    case 'fuerza':
      return 'Fuerza'
    case 'cardio':
      return 'Cardio'
    case 'hiit':
      return 'HIIT'
    case 'flexibilidad':
      return 'Flexibilidad'
    default:
      return normalizedType
  }
}

export function getTrainingTypeBadgeClass(type: string) {
  switch (getTrainingTypeKey(type)) {
    case 'fuerza':
      return 'border-blue-500/30 bg-blue-500/10 text-blue-500'
    case 'cardio':
      return 'border-rose-500/30 bg-rose-500/10 text-rose-500'
    case 'hiit':
      return 'border-orange-500/30 bg-orange-500/10 text-orange-500'
    case 'flexibilidad':
      return 'border-purple-500/30 bg-purple-500/10 text-purple-500'
    default:
      return 'border-border bg-muted text-muted-foreground'
  }
}

export interface TrainingExercise {
  id: string
  order: number
  sets: number
  reps_or_duration: string
  rest_seconds: number
  exercise: Exercise
}

export interface Training {
  id: string
  name: string
  type: string
  level: Level
  estimated_duration_min: number | null
  estimated_calories: number | null
  total_volume: number | null
  warmup_description: string | null
  warmup_duration_min: number | null
  cooldown_description: string | null
  tags: string[]
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
  exercises: TrainingExercise[]
}
