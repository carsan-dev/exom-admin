export const ROLE_OPTIONS = ['SUPER_ADMIN', 'ADMIN', 'CLIENT'] as const
export const LEVEL_OPTIONS = ['PRINCIPIANTE', 'INTERMEDIO', 'AVANZADO'] as const

export type Role = (typeof ROLE_OPTIONS)[number]
export type Level = (typeof LEVEL_OPTIONS)[number]

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  CLIENT: 'Cliente',
}

export const LEVEL_LABELS: Record<Level, string> = {
  PRINCIPIANTE: 'Principiante',
  INTERMEDIO: 'Intermedio',
  AVANZADO: 'Avanzado',
}

export interface ClientProfile {
  id: string
  user_id: string
  first_name: string
  last_name: string
  avatar_url: string | null
  level: Level
  main_goal: string | null
  muscle_mass_goal: number | null
  target_calories: number | null
  current_weight: number | null
  height: number | null
  birth_date: string | null
  created_at: string
  updated_at: string
}

export interface Client {
  id: string
  email: string
  role: Role
  is_active: boolean
  is_locked: boolean
  created_at: string
  active_admins_count?: number
  profile: Pick<ClientProfile, 'first_name' | 'last_name' | 'avatar_url' | 'level' | 'main_goal'> | null
}

export interface AdminUserListItem {
  id: string
  email: string
  role: Role
  is_active: boolean
  is_locked: boolean
  created_at: string
  profile: Pick<ClientProfile, 'first_name' | 'last_name' | 'avatar_url'> | null
}

export interface ClientAssignmentAdmin {
  id: string
  email: string
  profile: Pick<ClientProfile, 'first_name' | 'last_name' | 'avatar_url'> | null
  assigned_at: string
}

export interface ClientAssignmentsResponse {
  client_id: string
  active_admins: ClientAssignmentAdmin[]
}

export interface UpdateClientAssignmentsValues {
  admin_ids: string[]
}

export interface ClientAssignmentDiff {
  added: AdminUserListItem[]
  removed: ClientAssignmentAdmin[]
  unchanged: ClientAssignmentAdmin[]
}

export interface BodyMetric {
  id: string
  date: string
  weight_kg: number | null
  muscle_mass_kg: number | null
  height_cm: number | null
  sleep_hours: number | null
  neck_cm: number | null
  shoulders_cm: number | null
  chest_cm: number | null
  arm_cm: number | null
  forearm_cm: number | null
  waist_cm: number | null
  hips_cm: number | null
  thigh_cm: number | null
  calf_cm: number | null
  created_at: string
}

export interface Streak {
  current_days: number
  longest_days: number
  last_active_date: string | null
}

export interface ClientDetail {
  id: string
  email: string
  role: Role
  is_active: boolean
  is_locked: boolean
  firebase_uid: string
  created_at: string
  updated_at: string
  profile: ClientProfile | null
  bodyMetrics: BodyMetric[]
  streak: Streak | null
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

type NamedProfile = {
  first_name: string
  last_name: string
}

type UserWithName = {
  email: string
  profile: NamedProfile | null
}

export function getUserDisplayName(user: UserWithName) {
  const firstName = user.profile?.first_name?.trim()
  const lastName = user.profile?.last_name?.trim()
  const fullName = [firstName, lastName].filter(Boolean).join(' ')

  return fullName || user.email
}

export function getUsersRoute(currentUserRole?: Role) {
  return currentUserRole === 'SUPER_ADMIN' ? '/users' : '/clients'
}

export function getClientDetailRoute(clientId: string, currentUserRole?: Role) {
  return `${getUsersRoute(currentUserRole)}/${clientId}`
}

export function getClientAssignmentDiff(
  activeAdmins: ClientAssignmentAdmin[],
  availableAdmins: AdminUserListItem[],
  nextAdminIds: string[],
): ClientAssignmentDiff {
  const activeAdminIds = new Set(activeAdmins.map((admin) => admin.id))
  const nextAdminIdSet = new Set(nextAdminIds)
  const adminsById = new Map(availableAdmins.map((admin) => [admin.id, admin]))

  return {
    added: nextAdminIds
      .filter((adminId) => !activeAdminIds.has(adminId))
      .map((adminId) => adminsById.get(adminId))
      .filter((admin): admin is AdminUserListItem => Boolean(admin)),
    removed: activeAdmins.filter((admin) => !nextAdminIdSet.has(admin.id)),
    unchanged: activeAdmins.filter((admin) => nextAdminIdSet.has(admin.id)),
  }
}

export function hasClientAssignmentChanges(
  activeAdmins: ClientAssignmentAdmin[],
  nextAdminIds: string[],
) {
  if (activeAdmins.length !== nextAdminIds.length) {
    return true
  }

  const activeAdminIds = new Set(activeAdmins.map((admin) => admin.id))
  return nextAdminIds.some((adminId) => !activeAdminIds.has(adminId))
}
