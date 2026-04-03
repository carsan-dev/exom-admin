export type RecapStatus = 'DRAFT' | 'SUBMITTED' | 'REVIEWED'
export type RecapStatusFilter = 'ALL' | 'SUBMITTED' | 'REVIEWED'

export interface RecapClientProfile {
  first_name: string | null
  last_name: string | null
  avatar_url?: string | null
}

export interface RecapClient {
  id: string
  email: string
  profile: RecapClientProfile | null
}

export interface RecapItem {
  id: string
  client_id: string
  week_start_date: string
  week_end_date: string
  submitted_at: string | null
  training_effort: number | null
  training_sessions: number | null
  training_progress: string | null
  training_notes: string | null
  nutrition_quality: string | null
  hydration_enabled: boolean
  hydration_level: string | null
  food_quality: number | null
  nutrition_notes: string | null
  sleep_hours_range: string | null
  fatigue_level: string | null
  muscle_pain_zones: string[]
  recovery_notes: string | null
  mood: string | null
  stress_enabled: boolean
  stress_level: number | null
  general_notes: string | null
  improvement_app_rating: number | null
  improvement_service_rating: number | null
  improvement_areas: string[]
  improvement_feedback_text: string | null
  admin_comments: string | null
  status: RecapStatus
  reviewed_at: string | null
  archived_at: string | null
  created_at: string
  updated_at: string
  client: RecapClient
}

export interface RecapStats {
  total: number
  submitted: number
  reviewed: number
  archived: number
}

export interface PaginatedRecaps {
  data: RecapItem[]
  total: number
  page: number
  limit: number
  totalPages: number
}

type UserWithName = {
  email: string
  profile: RecapClientProfile | null
}

export function getRecapClientName(user: UserWithName) {
  const firstName = user.profile?.first_name?.trim()
  const lastName = user.profile?.last_name?.trim()
  const fullName = [firstName, lastName].filter(Boolean).join(' ')

  return fullName || user.email
}

export function formatRecapOption(value: string | null | undefined) {
  if (!value) return 'No indicado'

  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/(^|\s)\S/g, (match) => match.toUpperCase())
}
