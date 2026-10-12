/** Series measures of the training load chart; each one keeps its own axis. */
export type TrainingLoadMeasure = 'weight_kg' | 'reps' | 'seconds'

export const parseTrainingLoadMeasure = (value: string | null | undefined): TrainingLoadMeasure | null =>
  value === 'weight_kg' || value === 'reps' || value === 'seconds' ? value : null
