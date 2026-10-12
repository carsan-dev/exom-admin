import type { TrainingCompletionMode } from '../types'

export const COMPLETION_MODE_OPTIONS: ReadonlyArray<{ value: TrainingCompletionMode; label: string }> = [
  { value: 'ALL', label: 'Completar todos' },
  { value: 'ANY', label: 'Elegir uno' },
]

export const COMPLETION_MODE_HELP =
  'Elegir uno: el día cuenta como completado al terminar cualquiera de los entrenamientos asignados.'

/** The field only makes sense with more than one training on a non-rest day. */
export function isCompletionModeVisible(trainingIds: readonly string[] | undefined, isRestDay: boolean) {
  return !isRestDay && (trainingIds?.length ?? 0) > 1
}

/**
 * Value to send to the API: the chosen mode only when the field was shown;
 * otherwise undefined so the stored value is kept.
 */
export function resolveCompletionModeForSubmit(
  trainingIds: readonly string[] | undefined,
  isRestDay: boolean,
  mode: TrainingCompletionMode | undefined,
): TrainingCompletionMode | undefined {
  return isCompletionModeVisible(trainingIds, isRestDay) ? (mode ?? 'ALL') : undefined
}

/**
 * With auto-assignment enabled the rule-level mode governs every saved day
 * (current-week rows and later weeks must match); otherwise the per-day mode applies.
 */
export function resolveDayCompletionModeForSubmit(
  trainingIds: readonly string[] | undefined,
  isRestDay: boolean,
  dayMode: TrainingCompletionMode | undefined,
  autoAssignmentEnabled: boolean,
  ruleMode: TrainingCompletionMode | undefined,
): TrainingCompletionMode | undefined {
  return resolveCompletionModeForSubmit(trainingIds, isRestDay, autoAssignmentEnabled ? ruleMode : dayMode)
}
