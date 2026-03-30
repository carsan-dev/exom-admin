import { addDays, format, parseISO } from 'date-fns'
import type { AdminUserListItem, Client } from '../clients/types'
import type { Diet } from '../diets/types'
import type { Training } from '../trainings/types'

export interface ClientOption {
  id: string
  email: string
  profile: Pick<NonNullable<Client['profile']>, 'first_name' | 'last_name' | 'avatar_url'> | null
}

export function toClientOption(client: Pick<Client, 'id' | 'email' | 'profile'>): ClientOption
export function toClientOption(client: Pick<AdminUserListItem, 'id' | 'email' | 'profile'>): ClientOption
export function toClientOption(
  client: Pick<Client, 'id' | 'email' | 'profile'> | Pick<AdminUserListItem, 'id' | 'email' | 'profile'>,
): ClientOption {
  return {
    id: client.id,
    email: client.email,
    profile: client.profile
      ? {
          first_name: client.profile.first_name,
          last_name: client.profile.last_name,
          avatar_url: client.profile.avatar_url,
        }
      : null,
  }
}
export type CatalogKey = 'trainings' | 'diets'

export interface AssignmentDayTraining {
  id: string
  name: string
  type: Training['type']
  level: Training['level']
  estimated_duration_min: number | null
  estimated_calories: number | null
}

export interface AssignmentDayDiet {
  id: string
  name: string
  total_calories: number | null
  total_protein_g: number | null
  total_carbs_g: number | null
  total_fat_g: number | null
}

export interface AssignmentDay {
  id: string | null
  client_id: string
  date: string
  is_rest_day: boolean
  training: AssignmentDayTraining | null
  diet: AssignmentDayDiet | null
}

export interface AssignmentWeekResponse {
  client_id: string
  week_start: string
  week_end: string
  days: AssignmentDay[]
}

export interface AssignmentSummary {
  training_days: number
  diet_days: number
  rest_days: number
}

export interface AssignmentEditorValues {
  client_id: string
  dates: string[]
  date?: string | null
  training_id?: string | null
  diet_id?: string | null
  is_rest_day: boolean
}

export interface CopyWeekValues {
  client_id: string
  source_week_start: string
  target_week_start: string
}

export interface AssignmentPreviewTraining {
  id: string
  name: string
  type: Training['type']
  level: Training['level']
  estimated_duration_min: number | null
  estimated_calories: number | null
  exercises_count: number | null
}

export interface AssignmentPreviewDiet {
  id: string
  name: string
  total_calories: number | null
  total_protein_g: number | null
  total_carbs_g: number | null
  total_fat_g: number | null
  meals_count: number | null
}

export interface AssignmentPreview {
  dates: string[]
  training: AssignmentPreviewTraining | null
  diet: AssignmentPreviewDiet | null
  is_rest_day: boolean
}

export interface CatalogLoadState {
  key: CatalogKey
  label: string
  is_loading: boolean
  is_error: boolean
  is_empty: boolean
  has_data: boolean
  error_message: string | null
}

export interface CatalogAvailability {
  trainings: CatalogLoadState
  diets: CatalogLoadState
  is_loading: boolean
  has_error: boolean
  has_empty_catalogs: boolean
  can_use_training_catalog: boolean
  can_use_diet_catalog: boolean
  can_use_any_plan_catalog: boolean
  is_rest_only: boolean
}

export interface CopyWeekPreviewDay {
  source_date: string
  target_date: string
  training: AssignmentDayTraining | null
  diet: AssignmentDayDiet | null
  is_rest_day: boolean
  will_clear_day: boolean
}

export interface CopyWeekPreviewSummary extends AssignmentSummary {
  cleared_days: number
}

export interface CopyWeekPreview {
  client_id: string
  source_week_start: string
  target_week_start: string
  days: CopyWeekPreviewDay[]
  summary: CopyWeekPreviewSummary
}

export type SelectableDay = AssignmentDay & {
  selected: boolean
}

function formatIsoDate(date: Date) {
  return format(date, 'yyyy-MM-dd')
}

export function createAssignmentPreviewTraining(training: Training): AssignmentPreviewTraining {
  return {
    id: training.id,
    name: training.name,
    type: training.type,
    level: training.level,
    estimated_duration_min: training.estimated_duration_min,
    estimated_calories: training.estimated_calories,
    exercises_count: training.exercises.length,
  }
}

export function createAssignmentPreviewDiet(diet: Diet): AssignmentPreviewDiet {
  return {
    id: diet.id,
    name: diet.name,
    total_calories: diet.total_calories,
    total_protein_g: diet.total_protein_g,
    total_carbs_g: diet.total_carbs_g,
    total_fat_g: diet.total_fat_g,
    meals_count: diet.meals.length,
  }
}

export function buildAssignmentSummary(days: AssignmentDay[]): AssignmentSummary {
  return days.reduce<AssignmentSummary>(
    (summary, day) => ({
      training_days: summary.training_days + (day.training ? 1 : 0),
      diet_days: summary.diet_days + (day.diet ? 1 : 0),
      rest_days: summary.rest_days + (day.is_rest_day ? 1 : 0),
    }),
    {
      training_days: 0,
      diet_days: 0,
      rest_days: 0,
    },
  )
}

export function buildCopyWeekPreview(
  clientId: string,
  sourceWeekStart: string,
  targetWeekStart: string,
  sourceDays: AssignmentDay[],
): CopyWeekPreview {
  const sourceMap = new Map(sourceDays.map((day) => [day.date, day]))
  const sourceStart = parseISO(sourceWeekStart)
  const targetStart = parseISO(targetWeekStart)

  const days = Array.from({ length: 7 }, (_, index) => {
    const sourceDate = formatIsoDate(addDays(sourceStart, index))
    const targetDate = formatIsoDate(addDays(targetStart, index))
    const sourceDay = sourceMap.get(sourceDate) ?? {
      id: null,
      client_id: clientId,
      date: sourceDate,
      is_rest_day: false,
      training: null,
      diet: null,
    }

    return {
      source_date: sourceDate,
      target_date: targetDate,
      training: sourceDay.training,
      diet: sourceDay.diet,
      is_rest_day: sourceDay.is_rest_day,
      will_clear_day: !sourceDay.training && !sourceDay.diet && !sourceDay.is_rest_day,
    }
  })

  const summary = days.reduce<CopyWeekPreviewSummary>(
    (currentSummary, day) => ({
      training_days: currentSummary.training_days + (day.training ? 1 : 0),
      diet_days: currentSummary.diet_days + (day.diet ? 1 : 0),
      rest_days: currentSummary.rest_days + (day.is_rest_day ? 1 : 0),
      cleared_days: currentSummary.cleared_days + (day.will_clear_day ? 1 : 0),
    }),
    {
      training_days: 0,
      diet_days: 0,
      rest_days: 0,
      cleared_days: 0,
    },
  )

  return {
    client_id: clientId,
    source_week_start: sourceWeekStart,
    target_week_start: targetWeekStart,
    days,
    summary,
  }
}
