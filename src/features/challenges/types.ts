export const CHALLENGE_TYPE_OPTIONS = ['WEEKLY', 'MAIN_GOAL'] as const
export const CHALLENGE_RULE_OPTIONS = ['TRAINING_DAYS', 'MEAL_CHECKINS', 'WEIGHT_LOGS', 'STREAK_DAYS'] as const
export const CHALLENGE_SOURCE_FILTER_OPTIONS = ['ALL', 'MANUAL', 'AUTOMATIC'] as const
export const CHALLENGE_SCOPE_FILTER_OPTIONS = ['ALL', 'CLIENT', 'GLOBAL'] as const
export const CHALLENGE_COMPLETION_FILTER_OPTIONS = ['ALL', 'NOT_ASSIGNED', 'IN_PROGRESS', 'COMPLETED'] as const

export type ChallengeType = (typeof CHALLENGE_TYPE_OPTIONS)[number]
export type ChallengeRuleKey = (typeof CHALLENGE_RULE_OPTIONS)[number]
export type ChallengeSourceFilter = (typeof CHALLENGE_SOURCE_FILTER_OPTIONS)[number]
export type ChallengeScopeFilter = (typeof CHALLENGE_SCOPE_FILTER_OPTIONS)[number]
export type ChallengeCompletionFilter = (typeof CHALLENGE_COMPLETION_FILTER_OPTIONS)[number]
export type ChallengeProgressVariant = 'idle' | 'active' | 'complete'

export interface ChallengeClientProfile {
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
}

export interface ChallengeClientSummary {
  id: string
  email: string
  profile: ChallengeClientProfile | null
}

export interface ChallengeSummary {
  total: number
  weekly: number
  main_goal: number
  automatic: number
  global: number
}

export interface ChallengeListItem {
  id: string
  title: string
  description: string
  type: ChallengeType
  target_value: number
  unit: string
  is_manual: boolean
  is_global: boolean
  deadline: string | null
  rule_key: ChallengeRuleKey | null
  rule_config: Record<string, unknown> | null
  created_by: string | null
  created_at: string
  updated_at: string
  assigned_clients: number
  completed_clients: number
  completion_rate: number
}

export interface ChallengeAssignmentRow {
  id: string
  client_id: string
  current_value: number
  is_completed: boolean
  completed_at: string | null
  assigned_at: string
  progress_rate: number
  client: ChallengeClientSummary
}

export interface PaginatedChallengeAssignments {
  data: ChallengeAssignmentRow[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface ChallengeDetail extends ChallengeListItem {
  assignments: PaginatedChallengeAssignments
}

export type ChallengeMutationResponse = ChallengeListItem

export interface ChallengesResponse {
  data: ChallengeListItem[]
  total: number
  page: number
  limit: number
  totalPages: number
  summary: ChallengeSummary
}

export interface ChallengeFilters {
  page: number
  limit: number
  search?: string
  type?: ChallengeType
  is_manual?: boolean
  is_global?: boolean
  completion_status?: Exclude<ChallengeCompletionFilter, 'ALL'>
}

export interface ChallengeDetailFilters {
  page: number
  limit: number
  client_id?: string
  is_completed?: boolean
}

export interface ChallengeFormValues {
  title: string
  description: string
  type: ChallengeType
  target_value: number
  unit: string
  is_manual: boolean
  is_global: boolean
  deadline: string
  rule_key: ChallengeRuleKey | null
  rule_config?: Record<string, unknown> | null
}

export interface AssignChallengeValues {
  client_ids: string[]
  apply_to_all_visible_clients: boolean
}

export const CHALLENGE_TYPE_LABELS: Record<ChallengeType, string> = {
  WEEKLY: 'Reto semanal',
  MAIN_GOAL: 'Objetivo principal',
}

export const CHALLENGE_RULE_METADATA: Record<ChallengeRuleKey, { label: string; description: string; defaultUnit: string }> = {
  TRAINING_DAYS: {
    label: 'Entrenos completados',
    description: 'Cuenta los días con entrenamiento marcado como completado dentro de la ventana del reto.',
    defaultUnit: 'días',
  },
  MEAL_CHECKINS: {
    label: 'Comidas completadas',
    description: 'Suma cada comida marcada como realizada dentro del rango del reto.',
    defaultUnit: 'comidas',
  },
  WEIGHT_LOGS: {
    label: 'Registros de peso',
    description: 'Cuenta los días con actualización de peso registrada en métricas.',
    defaultUnit: 'registros',
  },
  STREAK_DAYS: {
    label: 'Racha activa',
    description: 'Usa la racha actual del cliente como valor del reto automático.',
    defaultUnit: 'días',
  },
}

export const CHALLENGE_COMPLETION_LABELS: Record<Exclude<ChallengeCompletionFilter, 'ALL'>, string> = {
  NOT_ASSIGNED: 'Sin asignar',
  IN_PROGRESS: 'En progreso',
  COMPLETED: 'Completado',
}

export function getChallengeScopeLabel(isGlobal: boolean) {
  return isGlobal ? 'Global' : 'Por cliente'
}

export function getChallengeTypeLabel(type: ChallengeType) {
  return CHALLENGE_TYPE_LABELS[type]
}

export function getChallengeRuleLabel(ruleKey: ChallengeRuleKey | null | undefined) {
  if (!ruleKey) {
    return 'Carga manual'
  }

  return CHALLENGE_RULE_METADATA[ruleKey].label
}

export function getChallengeProgressVariant(progressRate: number): ChallengeProgressVariant {
  if (progressRate >= 100) {
    return 'complete'
  }

  if (progressRate > 0) {
    return 'active'
  }

  return 'idle'
}

export function buildChallengeFormDefaults(challenge?: Partial<ChallengeListItem>): ChallengeFormValues {
  return {
    title: challenge?.title ?? '',
    description: challenge?.description ?? '',
    type: challenge?.type ?? 'WEEKLY',
    target_value: challenge?.target_value ?? 1,
    unit: challenge?.unit ?? 'puntos',
    is_manual: challenge?.is_manual ?? true,
    is_global: challenge?.is_global ?? false,
    deadline: challenge?.deadline?.slice(0, 10) ?? '',
    rule_key: challenge?.rule_key ?? null,
    rule_config: challenge?.rule_config ?? null,
  }
}
