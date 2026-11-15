import { avatar, daysFromToday, has, isoAt, list, paginate, uuid, type FixtureCtx } from './fx-util'

export const CLIENT_IDS = Array.from({ length: 12 }, (_, i) => uuid('c11e0000', i + 1))
export const ADMIN_IDS = Array.from({ length: 5 }, (_, i) => uuid('ad000000', i + 1))
export const SUPER_IDS = [uuid('50000000', 1), uuid('50000000', 2)]
/** Cliente "protagonista" con datos de entrenamiento, dieta, progreso, feedback y recaps. */
export const MAIN_CLIENT = CLIENT_IDS[0]
export const SECOND_CLIENT = CLIENT_IDS[1]

type Level = 'PRINCIPIANTE' | 'INTERMEDIO' | 'AVANZADO'
interface Person { first: string; last: string; level?: Level; goal?: string | null }

const clientPeople: Person[] = [
  { first: 'Valeria', last: 'Quintero', level: 'INTERMEDIO', goal: 'Ganar masa muscular' },
  { first: 'Andrés', last: 'Montoya', level: 'AVANZADO', goal: 'Mejorar fuerza máxima' },
  { first: 'Camila', last: 'Reyes', level: 'PRINCIPIANTE', goal: 'Perder grasa corporal' },
  { first: 'Joaquín', last: 'Salvatierra', level: 'INTERMEDIO', goal: 'Preparar media maratón' },
  { first: 'Irene', last: 'Bermúdez', level: 'PRINCIPIANTE', goal: null },
  { first: 'Tomás', last: 'Echeverría', level: 'AVANZADO', goal: 'Definición para verano' },
  { first: 'Noelia', last: 'Pardo', level: 'INTERMEDIO', goal: 'Recomposición corporal' },
  { first: 'Gael', last: 'Villanueva', level: 'PRINCIPIANTE', goal: 'Ganar movilidad' },
  { first: 'Marta', last: 'Olmedo', level: 'INTERMEDIO', goal: 'Mejorar resistencia' },
  { first: 'Rodrigo', last: 'Casas', level: 'AVANZADO', goal: 'Competir en powerlifting' },
  { first: 'Lía', last: 'Arévalo', level: 'PRINCIPIANTE', goal: 'Crear el hábito' },
  { first: 'Hugo', last: 'Santamaría', level: 'INTERMEDIO', goal: 'Rehabilitación de hombro' },
]
const adminPeople: Person[] = [
  { first: 'Mateo', last: 'Ríos' }, { first: 'Sofía', last: 'Lagos' }, { first: 'Emilio', last: 'Cárdenas' },
  { first: 'Paula', last: 'Navarrete' }, { first: 'Darío', last: 'Fuentes' },
]
const superPeople: Person[] = [{ first: 'Lucía', last: 'Marín' }, { first: 'Álvaro', last: 'Beltrán' }]
const slug = (p: Person) => `${p.first}.${p.last}`.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const initials = (p: Person) => `${p.first[0]}${p.last[0]}`

/** Sesión sintética: el rol ADMIN es Mateo Ríos, el SUPER_ADMIN es Lucía Marín. */
export const SESSION_USERS = {
  ADMIN: { id: ADMIN_IDS[0], email: `${slug(adminPeople[0])}@example.com`, first_name: 'Mateo', last_name: 'Ríos' },
  SUPER_ADMIN: { id: SUPER_IDS[0], email: `${slug(superPeople[0])}@example.com`, first_name: 'Lucía', last_name: 'Marín' },
}

// Estados: cliente 9 bloqueado, cliente 10 inactivo, cliente 11 sin admins, cliente 12 archivado.
const BLOCKED = 8, INACTIVE = 9, NO_ADMINS = 10, ARCHIVED = 11

export const clients = clientPeople.map((p, i) => ({
  id: CLIENT_IDS[i], email: `${slug(p)}@example.com`, role: 'CLIENT' as const,
  is_active: i !== INACTIVE, is_archived: i === ARCHIVED, is_locked: i === BLOCKED,
  created_at: isoAt(-300 + i * 18), active_admins_count: i === NO_ADMINS ? 0 : i % 3 === 0 ? 2 : 1,
  profile: { first_name: p.first, last_name: p.last, avatar_url: i % 4 === 0 ? avatar(initials(p), 20 + i * 25) : null, level: p.level as Level, main_goal: p.goal ?? null },
}))
const staff = (people: Person[], ids: string[], role: 'ADMIN' | 'SUPER_ADMIN') => people.map((p, i) => ({
  id: ids[i], email: `${slug(p)}@example.com`, role, is_active: !(role === 'ADMIN' && i === 4), is_locked: role === 'ADMIN' && i === 3,
  created_at: isoAt(-500 + i * 30),
  profile: { first_name: p.first, last_name: p.last, avatar_url: i === 0 ? avatar(initials(p), 200 + i * 30) : null },
}))
export const admins = staff(adminPeople, ADMIN_IDS, 'ADMIN')
export const superAdmins = staff(superPeople, SUPER_IDS, 'SUPER_ADMIN')

const nameOf = (c: { profile: { first_name: string; last_name: string } | null; email: string }) => `${c.profile?.first_name ?? ''} ${c.profile?.last_name ?? ''}`.trim() || c.email
export const clientName = (id: string) => { const c = clients.find((x) => x.id === id); return c ? nameOf(c) : 'Cliente' }
export const clientAvatar = (id: string) => clients.find((x) => x.id === id)?.profile.avatar_url ?? null
export const clientRef = (id: string) => { const c = clients.find((x) => x.id === id) ?? clients[0]; return { id: c.id, email: c.email, profile: { first_name: c.profile.first_name, last_name: c.profile.last_name, avatar_url: c.profile.avatar_url } } }

function listClients(params: Record<string, unknown>) {
  const archive = String(params.archive ?? 'all')
  const levels = list(params.level), status = list(params.status), assignment = list(params.assignment_state)
  const filtered = clients.filter((c) =>
    (archive === 'all' || (archive === 'archived') === Boolean(c.is_archived))
    && (!params.search || has(`${c.profile.first_name} ${c.profile.last_name}`, params.search) || has(c.email, params.search))
    && (levels.length === 0 || levels.includes(c.profile.level))
    && (status.length === 0 || status.some((s) => (s === 'LOCKED' ? c.is_locked : s === 'INACTIVE' ? !c.is_active : c.is_active && !c.is_locked)))
    && (assignment.length === 0 || assignment.some((s) => (s === 'UNASSIGNED' ? c.active_admins_count === 0 : c.active_admins_count !== 0))))
  return paginate(filtered, params)
}

const bodyMetric = (i: number) => ({
  id: uuid('b0d10000', i + 1), date: daysFromToday(-14 * (5 - i)), weight_kg: 71.4 - i * 0.6, muscle_mass_kg: 31.2 + i * 0.3, height_cm: 168,
  sleep_hours: 7 + (i % 3) * 0.5, neck_cm: 33, shoulders_cm: 108 + i * 0.4, chest_cm: 92 + i * 0.3, arm_left_cm: 28.5 + i * 0.2, arm_right_cm: 29 + i * 0.2,
  forearm_left_cm: 24, forearm_right_cm: 24.2, waist_cm: 74 - i * 0.7, hips_cm: 98 - i * 0.3, thigh_left_cm: 56, thigh_right_cm: 56.4, calf_left_cm: 37, calf_right_cm: 37.2,
  created_at: isoAt(-14 * (5 - i), '08:00:00'),
})
export const bodyMetrics = Array.from({ length: 6 }, (_, i) => bodyMetric(i))

export function clientDetail(id: string) {
  const c = clients.find((x) => x.id === id)
  if (!c) return undefined
  const idx = clients.indexOf(c)
  return {
    id: c.id, email: c.email, role: c.role, is_active: c.is_active, is_locked: c.is_locked, firebase_uid: `fixture-uid-${idx}`,
    created_at: c.created_at, updated_at: isoAt(-2),
    profile: { id: uuid('9f0f0000', idx + 1), user_id: c.id, first_name: c.profile.first_name, last_name: c.profile.last_name, avatar_url: c.profile.avatar_url,
      level: c.profile.level, main_goal: c.profile.main_goal, muscle_mass_goal: idx % 2 === 0 ? 34 : null, target_calories: 2200 + idx * 50, current_weight: 68 + idx,
      height: 160 + idx * 2, birth_date: `199${idx % 10}-0${(idx % 9) + 1}-1${idx % 9}`, created_at: c.created_at, updated_at: isoAt(-2) },
    bodyMetrics: idx === 0 || idx === 1 ? bodyMetrics : [],
    streak: idx < 8 ? { current_days: 12 - idx, longest_days: 31 - idx, last_active_date: daysFromToday(-1) } : null,
  }
}

function clientAssignments(id: string) {
  const idx = clients.findIndex((c) => c.id === id)
  const active = idx === NO_ADMINS ? [] : [admins[0], ...(idx % 3 === 0 ? [admins[1]] : [])]
  return { client_id: id, active_admins: active.map((a, i) => ({ id: a.id, email: a.email, profile: a.profile, assigned_at: isoAt(-120 + i * 10) })) }
}

export const handlePeople = ({ method, path, params }: FixtureCtx): unknown => {
  if (method !== 'get') return undefined
  if (path === '/admin/clients') return listClients(params)
  if (path === '/admin/users') {
    const role = String(params.role ?? 'ADMIN')
    const source = role === 'SUPER_ADMIN' ? superAdmins : admins
    const status = list(params.status)
    return paginate(source.filter((u) => (!params.search || has(`${u.profile.first_name} ${u.profile.last_name}`, params.search) || has(u.email, params.search))
      && (status.length === 0 || status.some((s) => (s === 'LOCKED' ? u.is_locked : s === 'INACTIVE' ? !u.is_active : u.is_active && !u.is_locked)))), params)
  }
  if (path === '/admin/client-deletions') return []
  const match = path.match(/^\/admin\/clients\/([^/]+)(?:\/(assignments))?$/)
  if (match) return match[2] ? clientAssignments(match[1]) : clientDetail(match[1])
  return undefined
}

export const dashboardData = () => ({
  stats: { activeClients: 9, totalClients: 12, pendingRecaps: 3, pendingFeedback: 4, lockedAccounts: 1 },
  recentActivity: [
    { id: 'act-1', type: 'recap_submitted', clientId: CLIENT_IDS[0], clientName: clientName(CLIENT_IDS[0]), clientAvatar: clientAvatar(CLIENT_IDS[0]), description: 'Ha enviado el recap semanal', createdAt: isoAt(0, '08:12:00') },
    { id: 'act-2', type: 'feedback_sent', clientId: CLIENT_IDS[1], clientName: clientName(CLIENT_IDS[1]), clientAvatar: null, description: 'Ha dejado feedback tras Fuerza tren superior', createdAt: isoAt(-1, '19:40:00') },
    { id: 'act-3', type: 'progress_completed', clientId: CLIENT_IDS[2], clientName: clientName(CLIENT_IDS[2]), clientAvatar: null, description: 'Ha completado el día de entrenamiento y dieta', createdAt: isoAt(-1, '13:05:00') },
    { id: 'act-4', type: 'client_created', clientId: CLIENT_IDS[10], clientName: clientName(CLIENT_IDS[10]), clientAvatar: null, description: 'Nuevo cliente registrado', createdAt: isoAt(-3, '11:20:00') },
    { id: 'act-5', type: 'recap_submitted', clientId: CLIENT_IDS[3], clientName: clientName(CLIENT_IDS[3]), clientAvatar: null, description: 'Ha enviado el recap semanal', createdAt: isoAt(-3, '18:02:00') },
    { id: 'act-6', type: 'feedback_sent', clientId: CLIENT_IDS[5], clientName: clientName(CLIENT_IDS[5]), clientAvatar: null, description: 'Ha dejado feedback tras Pierna y glúteo', createdAt: isoAt(-4, '20:15:00') },
  ],
  topClients: [CLIENT_IDS[0], CLIENT_IDS[2], CLIENT_IDS[1], CLIENT_IDS[3], CLIENT_IDS[5]].map((id, i) => ({
    clientId: id, clientName: clientName(id), clientAvatar: clientAvatar(id), completedDays: 7 - i, currentStreak: 12 - i * 2 })),
})
