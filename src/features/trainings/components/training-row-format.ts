import type { Training } from '../types'

export function formatTrainingDuration(training: Training) {
  return training.estimated_duration_min ? `${training.estimated_duration_min} min` : '—'
}

export function formatTrainingCalories(training: Training) {
  return training.estimated_calories ? `${training.estimated_calories} kcal` : '—'
}

export function getTrainingExerciseCount(training: Training) {
  return training.exercises_count ?? training.exercises.length
}
