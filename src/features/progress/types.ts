export interface ExerciseCompleted {
  exercise_id: string
  weight_used: number | null
  completed_at: string
}

export interface DayProgress {
  id: string | null
  client_id: string
  date: string
  training_completed: boolean
  exercises_completed: ExerciseCompleted[]
  meals_completed: string[]
  notes: string | null
}

export interface CalendarDay {
  date: string
  has_training: boolean
  has_diet: boolean
  is_rest_day: boolean
  training_completed: boolean
  diet_completed: boolean
}

export interface WeekSummary {
  week_start: string
  trainings_assigned: number
  trainings_completed: number
  total_meals: number
  meals_completed: number
}

export interface MetricHistoryPoint {
  date: string
  value: number
}

export type BodyField =
  | 'weight_kg'
  | 'muscle_mass_kg'
  | 'sleep_hours'
  | 'neck_cm'
  | 'shoulders_cm'
  | 'chest_cm'
  | 'arm_cm'
  | 'forearm_cm'
  | 'waist_cm'
  | 'hips_cm'
  | 'thigh_cm'
  | 'calf_cm'

export const BODY_FIELD_LABELS: Record<BodyField, string> = {
  weight_kg: 'Peso (kg)',
  muscle_mass_kg: 'Masa muscular (kg)',
  sleep_hours: 'Horas de sueño',
  neck_cm: 'Cuello (cm)',
  shoulders_cm: 'Hombros (cm)',
  chest_cm: 'Pecho (cm)',
  arm_cm: 'Brazo (cm)',
  forearm_cm: 'Antebrazo (cm)',
  waist_cm: 'Cintura (cm)',
  hips_cm: 'Cadera (cm)',
  thigh_cm: 'Muslo (cm)',
  calf_cm: 'Gemelo (cm)',
}
