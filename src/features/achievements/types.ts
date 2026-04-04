export const CRITERIA_TYPE_OPTIONS = ['TRAINING_DAYS', 'STREAK_DAYS', 'CHALLENGES_COMPLETED', 'WEIGHT_LOGS', 'CUSTOM'] as const
export type CriteriaType = (typeof CRITERIA_TYPE_OPTIONS)[number]

export interface AchievementUserProfile {
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
}

export interface AchievementUserSummary {
  id: string
  email: string
  profile: AchievementUserProfile | null
}

export interface AchievementSummary {
  total: number
  criteria_types: Record<string, number>
}

export interface AchievementListItem {
  id: string
  name: string
  description: string
  icon_url: string | null
  criteria_type: string
  criteria_value: number
  created_at: string
  unlocked_count: number
}

export interface AchievementUserRow {
  id: string
  user_id: string
  unlocked_at: string
  user: AchievementUserSummary
}

export interface PaginatedAchievementUsers {
  data: AchievementUserRow[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface AchievementDetail extends AchievementListItem {
  users: PaginatedAchievementUsers
}

export interface AchievementsResponse {
  data: AchievementListItem[]
  total: number
  page: number
  limit: number
  totalPages: number
  summary: AchievementSummary
}

export interface AchievementFilters {
  page: number
  limit: number
  search?: string
  criteria_type?: string
}

export interface AchievementDetailFilters {
  page: number
  limit: number
}

export interface AchievementFormValues {
  name: string
  description: string
  icon_url: string
  criteria_type: string
  criteria_value: number
}

export interface GrantAchievementValues {
  client_ids: string[]
}

export const CRITERIA_TYPE_LABELS: Record<string, string> = {
  TRAINING_DAYS: 'Días de entrenamiento',
  STREAK_DAYS: 'Días de racha',
  CHALLENGES_COMPLETED: 'Retos completados',
  WEIGHT_LOGS: 'Registros de peso',
  CUSTOM: 'Personalizado',
}

export function buildAchievementFormDefaults(achievement?: Partial<AchievementListItem>): AchievementFormValues {
  return {
    name: achievement?.name ?? '',
    description: achievement?.description ?? '',
    icon_url: achievement?.icon_url ?? '',
    criteria_type: achievement?.criteria_type ?? CRITERIA_TYPE_OPTIONS[0],
    criteria_value: achievement?.criteria_value ?? 1,
  }
}

export function getAchievementUserDisplayName(user: { email: string; profile: { first_name: string | null; last_name: string | null } | null }) {
  const firstName = user.profile?.first_name?.trim()
  const lastName = user.profile?.last_name?.trim()
  const fullName = [firstName, lastName].filter(Boolean).join(' ')
  return fullName || user.email
}

export function getAchievementUserInitials(user: { email: string; profile: { first_name: string | null; last_name: string | null } | null }) {
  const firstName = user.profile?.first_name?.[0] ?? ''
  const lastName = user.profile?.last_name?.[0] ?? ''
  const initials = `${firstName}${lastName}`.trim().toUpperCase()
  return initials || user.email.slice(0, 2).toUpperCase()
}
