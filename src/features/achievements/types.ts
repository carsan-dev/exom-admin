import { getTrainingTypeLabel } from '../trainings/types'

export const CRITERIA_TYPE_OPTIONS = ['TRAINING_DAYS', 'STREAK_DAYS', 'CHALLENGES_COMPLETED', 'WEIGHT_LOGS', 'CUSTOM'] as const
export type CriteriaType = (typeof CRITERIA_TYPE_OPTIONS)[number]

export interface AchievementRuleConfig {
  training_type?: string
}

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
  criteria_type: CriteriaType
  criteria_value: number
  rule_config?: AchievementRuleConfig | null
  created_at: string
  unlocked_count: number
}

export interface AchievementUserRow {
  id: string
  user_id: string
  unlocked_at: string
  user: AchievementUserSummary
}

export interface GrantedAchievementRecord {
  id: string
  user_id: string
  achievement_id: string
  unlocked_at: string
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
  criteria_type?: CriteriaType
}

export interface AchievementDetailFilters {
  page: number
  limit: number
}

export interface AchievementFormValues {
  name: string
  description: string
  icon_url: string
  criteria_type: CriteriaType
  criteria_value: number
  rule_config: AchievementRuleConfig
}

export interface GrantAchievementValues {
  client_ids: string[]
}

export interface RecomputeAchievementsValues {
  achievement_ids?: string[]
  user_ids?: string[]
  apply_to_all_visible_clients?: boolean
}

export interface RecomputeAchievementsResult {
  achievements_evaluated: number
  users_evaluated: number
  granted: number
  revoked: number
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
    rule_config: {
      training_type: achievement?.rule_config?.training_type,
    },
  }
}

export function isAutomaticAchievement(criteriaType: CriteriaType) {
  return criteriaType !== 'CUSTOM'
}

export function getAchievementModeLabel(criteriaType: CriteriaType) {
  return isAutomaticAchievement(criteriaType) ? 'Automático' : 'Manual'
}

export function getAchievementRuleLabel(criteriaType: CriteriaType, ruleConfig?: AchievementRuleConfig | null) {
  const baseLabel = CRITERIA_TYPE_LABELS[criteriaType] ?? criteriaType

  if (criteriaType === 'TRAINING_DAYS' && ruleConfig?.training_type) {
    return `${baseLabel} · ${getTrainingTypeLabel(ruleConfig.training_type)}`
  }

  return baseLabel
}

export function getAchievementCriteriaHelp(criteriaType: CriteriaType, ruleConfig?: AchievementRuleConfig) {
  switch (criteriaType) {
    case 'TRAINING_DAYS':
      return ruleConfig?.training_type
        ? `Cuenta días con entrenamiento completado solo cuando el entrenamiento asignado es de tipo ${getTrainingTypeLabel(ruleConfig.training_type)}.`
        : 'Cuenta días con entrenamiento completado en DayProgress.'
    case 'STREAK_DAYS':
      return 'Mide la racha actual del cliente usando Streak.current_days.'
    case 'CHALLENGES_COMPLETED':
      return 'Cuenta retos asignados al cliente que ya están marcados como completados.'
    case 'WEIGHT_LOGS':
      return 'Cuenta registros de BodyMetric que incluyen un valor de peso.'
    case 'CUSTOM':
      return 'No se autoevalúa. Este logro se otorga manualmente desde el panel.'
  }
}

export function getAchievementGoalHelp(criteriaType: CriteriaType) {
  if (criteriaType === 'CUSTOM') {
    return 'Se usa como referencia del logro manual. No sustituye el objetivo principal ni se autoevalúa.'
  }

  return 'Es la meta numérica que el cliente debe alcanzar para desbloquear el logro. No usa el target_value del objetivo principal.'
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
