import {
  normalizeTrainingTags,
  resolveLegacyPrescription,
  type TrainingFormValues,
} from './schemas'
import { resolveTrainingTypes, type Training } from './types'

function toPrescriptionFormValues(trainingExercise: Training['exercises'][number]) {
  if (
    trainingExercise.measure_type &&
    (trainingExercise.target_value != null ||
      (trainingExercise.target_value_min != null && trainingExercise.target_value_max != null))
  ) {
    return {
      measure_type: trainingExercise.measure_type,
      target_value: trainingExercise.target_value,
      target_value_min: trainingExercise.target_value_min ?? null,
      target_value_max: trainingExercise.target_value_max ?? null,
      target_rir: trainingExercise.target_rir ?? null,
      rir_override: trainingExercise.rir_override,
      timed_config: trainingExercise.timed_config,
    }
  }

  return {
    ...resolveLegacyPrescription(trainingExercise.reps_or_duration),
    target_rir: trainingExercise.target_rir ?? null,
    rir_override: trainingExercise.rir_override,
    timed_config: trainingExercise.timed_config,
  }
}

export function toFormValues(training: Training, isDuplicate: boolean): TrainingFormValues {
  const sourceItems = training.items?.length
    ? training.items
    : [...training.exercises]
        .sort((a, b) => a.order - b.order)
        .map((te) => ({ kind: 'EXERCISE' as const, ...te }))

  return {
    rir_proposal: training.rir_proposal ?? null,
    name: isDuplicate ? `${training.name} (copia)` : training.name,
    types: resolveTrainingTypes(training),
    accentColor: training.accentColor ?? null,
    level: training.level,
    estimated_duration_min: training.estimated_duration_min,
    estimated_calories: training.estimated_calories,
    warmup_description: training.warmup_description ?? '',
    warmup_duration_min: training.warmup_duration_min,
    cooldown_description: training.cooldown_description ?? '',
    tags: normalizeTrainingTags(training.tags),
    items: sourceItems.map((item, order) => {
      if (item.kind === 'CIRCUIT') {
        return {
          kind: 'CIRCUIT',
          ...(isDuplicate ? {} : { id: item.id }),
          order,
          name: item.name ?? 'Circuito',
          rounds: item.rounds,
          rest_between_rounds_seconds: item.rest_between_rounds_seconds,
          exercises: [...item.exercises]
            .sort((a, b) => (a.position_in_block ?? 0) - (b.position_in_block ?? 0))
            .map((te) => ({
              ...(isDuplicate ? {} : { id: te.id }),
              exercise_id: te.exercise.id,
              reps_or_duration: te.reps_or_duration,
              ...toPrescriptionFormValues(te),
              request_set_tracking: te.request_set_tracking,
              rest_seconds: te.rest_seconds,
            })),
        }
      }

      const te = item
      return {
        kind: 'EXERCISE',
        ...(isDuplicate ? {} : { id: te.id }),
        exercise_id: te.exercise.id,
        order,
        sets: te.sets,
        reps_or_duration: te.reps_or_duration,
        ...toPrescriptionFormValues(te),
        request_set_tracking: te.request_set_tracking,
        rest_seconds: te.rest_seconds,
      }
    }),
  }
}
