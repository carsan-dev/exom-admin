import type { Exercise, Level } from '../exercises/types'

export const TRAINING_TYPE_OPTIONS = ['FUERZA', 'CARDIO', 'HIIT', 'FLEXIBILIDAD'] as const
export type TrainingType = (typeof TRAINING_TYPE_OPTIONS)[number]

export const TRAINING_TYPE_LABELS: Record<TrainingType, string> = {
  FUERZA: 'Fuerza',
  CARDIO: 'Cardio',
  HIIT: 'HIIT',
  FLEXIBILIDAD: 'Flexibilidad',
}

export function getTrainingTypeBadgeClass(type: string) {
  switch (type) {
    case 'FUERZA':
      return 'border-blue-500/30 bg-blue-500/10 text-blue-500'
    case 'CARDIO':
      return 'border-rose-500/30 bg-rose-500/10 text-rose-500'
    case 'HIIT':
      return 'border-orange-500/30 bg-orange-500/10 text-orange-500'
    case 'FLEXIBILIDAD':
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
  type: TrainingType
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
