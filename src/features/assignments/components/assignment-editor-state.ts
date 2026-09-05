import type { AssignmentEditorFormValues } from '../schemas'
import type {
  AssignmentDay,
  AssignmentDayTraining,
  AssignmentTrainingOption,
  AutoAssignmentRule,
} from '../types'

export type AssignmentEditorMode = 'selection' | 'auto-rule'

export function resolveSelectedTrainings(
  selectedIds: string[],
  availableTrainings: AssignmentTrainingOption[],
  assignedTrainings: AssignmentDayTraining[],
): AssignmentDayTraining[] {
  const trainingsById = new Map(
    [...assignedTrainings, ...availableTrainings].map((training) => [
      training.id,
      training,
    ]),
  )

  return selectedIds.flatMap((id) => {
    const training = trainingsById.get(id)
    return training ? [training] : []
  })
}

function parseUtcDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

function formatUtcDate(date: Date) {
  return date.toISOString().split('T')[0]
}

function addUtcDays(date: Date, days: number) {
  const nextDate = new Date(date)
  nextDate.setUTCDate(nextDate.getUTCDate() + days)
  return nextDate
}

export function buildAssignmentEditorDefaults(
  mode: AssignmentEditorMode,
  selectedDays: AssignmentDay[],
  activeAutoRule: AutoAssignmentRule | null,
): AssignmentEditorFormValues {
  const editingAutoRule = mode === 'auto-rule' ? activeAutoRule : null
  const days = editingAutoRule
    ? editingAutoRule.days.map((day) => {
        const date = formatUtcDate(addUtcDays(parseUtcDate(editingAutoRule.source_week_start), day.weekday - 1))
        return {
          assignment_id: null,
          original_date: date,
          date,
          training_id: day.training_id,
          training_ids: day.training_ids ?? day.trainings?.map((training) => training.id) ?? (day.training ? [day.training.id] : []),
          training_policies: Object.fromEntries(
            (day.trainings ?? (day.training ? [day.training] : [])).map((training) => [
              training.id,
              training.last_set_video_policy ?? 'AUTO',
            ]),
          ),
          diet_id: day.diet_id,
          is_rest_day: day.is_rest_day,
        }
      })
    : [...selectedDays]
        .sort((left, right) => left.date.localeCompare(right.date))
        .map((day) => ({
          assignment_id: day.id,
          original_date: day.date,
          date: day.date,
          training_id: day.training?.id ?? null,
          training_ids: day.training_ids ?? day.trainings?.map((training) => training.id) ?? (day.training ? [day.training.id] : []),
          training_policies: Object.fromEntries(
            (day.trainings ?? (day.training ? [day.training] : [])).map((training) => [
              training.id,
              training.last_set_video_policy ?? 'AUTO',
            ]),
          ),
          diet_id: day.diet?.id ?? null,
          is_rest_day: day.is_rest_day,
        }))

  return {
    days,
    auto_assignment_enabled: Boolean(editingAutoRule),
    auto_assignment_end_mode: editingAutoRule?.ends_on ? 'date' : 'indefinite',
    auto_assignment_ends_on: editingAutoRule?.ends_on ?? null,
  }
}
