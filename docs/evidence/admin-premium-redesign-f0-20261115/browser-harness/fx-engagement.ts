import { isoAt, paginate, uuid, type FixtureCtx } from './fx-util'
import { ADMIN_IDS, CLIENT_IDS, SESSION_USERS, admins, clientRef, clients } from './fx-people'
import { diets, exercises, ingredients, trainings } from './fx-catalog'
import { harnessRole } from './boot'

// ---- Retos ---------------------------------------------------------------------------------------
type RuleKey = 'TRAINING_DAYS' | 'MEAL_CHECKINS' | 'WEIGHT_LOGS' | 'STREAK_DAYS' | null
const challengeSeeds: Array<[string, string, 'WEEKLY' | 'MAIN_GOAL', number, string, boolean, boolean, number | null, RuleKey, number, number]> = [
  ['Cuatro entrenos esta semana', 'Completa cuatro sesiones de entrenamiento en la semana.', 'WEEKLY', 4, 'días', false, true, 3, 'TRAINING_DAYS', 9, 5],
  ['Comidas al día', 'Marca todas las comidas de tu plan durante siete días.', 'WEEKLY', 35, 'comidas', false, true, 4, 'MEAL_CHECKINS', 8, 3],
  ['Pésate cada semana', 'Registra tu peso al menos tres veces este mes.', 'MAIN_GOAL', 3, 'registros', false, false, 20, 'WEIGHT_LOGS', 6, 4],
  ['Racha de 14 días', 'Mantén una racha activa de catorce días consecutivos.', 'MAIN_GOAL', 14, 'días', false, true, 14, 'STREAK_DAYS', 10, 2],
  ['Reto de pasos manual', 'Alcanza 70.000 pasos acumulados registrados a mano por el coach.', 'WEEKLY', 70000, 'pasos', true, false, 5, null, 3, 1],
  ['Desafío de invierno', 'Reto de equipo para cerrar el año con constancia.', 'MAIN_GOAL', 20, 'días', true, true, 45, null, 12, 0],
]
const challenges = challengeSeeds.map(([title, description, type, target_value, unit, is_manual, is_global, deadlineDays, rule_key, assigned, completed], i) => ({
  id: uuid('c4a10000', i + 1), title, description, type, target_value, unit, is_manual, is_global, deadline: deadlineDays === null ? null : isoAt(deadlineDays, '23:59:00'), rule_key, rule_config: null,
  created_by: ADMIN_IDS[0], created_at: isoAt(-60 + i * 5), updated_at: isoAt(-10), assigned_clients: assigned, completed_clients: completed, completion_rate: assigned === 0 ? 0 : Math.round((completed / assigned) * 100),
}))
const challengeSummary = { total: challenges.length, weekly: challenges.filter((c) => c.type === 'WEEKLY').length, main_goal: challenges.filter((c) => c.type === 'MAIN_GOAL').length, automatic: challenges.filter((c) => !c.is_manual).length, global: challenges.filter((c) => c.is_global).length }
const challengeAssignments = (id: string, params: Record<string, unknown>) => {
  const rows = CLIENT_IDS.slice(0, 6).map((cid, i) => ({ id: uuid('c4a50000', i + 1), client_id: cid, current_value: i * 2, is_completed: i === 5, completed_at: i === 5 ? isoAt(-2) : null, assigned_at: isoAt(-20 + i), progress_rate: Math.min(100, i * 22), client: clientRef(cid) }))
  return { ...paginate(rows, params, 10), id }
}

// ---- Logros ---------------------------------------------------------------------------------------
const achievementSeeds: Array<[string, string, 'TRAINING_DAYS' | 'STREAK_DAYS' | 'CHALLENGES_COMPLETED' | 'WEIGHT_LOGS' | 'CUSTOM', number, number]> = [
  ['Primeros pasos', 'Completa tu primer día de entrenamiento.', 'TRAINING_DAYS', 1, 11], ['Constancia de hierro', 'Completa 50 días de entrenamiento.', 'TRAINING_DAYS', 50, 3],
  ['Semana perfecta', 'Mantén una racha de 7 días.', 'STREAK_DAYS', 7, 8], ['Racha imparable', 'Mantén una racha de 30 días.', 'STREAK_DAYS', 30, 2],
  ['Cazador de retos', 'Completa 5 retos.', 'CHALLENGES_COMPLETED', 5, 4], ['Báscula fiel', 'Registra tu peso 10 veces.', 'WEIGHT_LOGS', 10, 6],
  ['Mejor compañero', 'Reconocimiento manual del coach.', 'CUSTOM', 1, 1], ['Aniversario EXOM', 'Un año entrenando con EXOM.', 'CUSTOM', 1, 0],
]
const achievements = achievementSeeds.map(([name, description, criteria_type, criteria_value, unlocked_count], i) => ({
  id: uuid('ac100000', i + 1), name, description, icon_url: null, criteria_type, criteria_value, rule_config: null, created_at: isoAt(-200 + i * 8), unlocked_count,
}))
const achievementSummary = { total: achievements.length, criteria_types: achievements.reduce<Record<string, number>>((acc, a) => ({ ...acc, [a.criteria_type]: (acc[a.criteria_type] ?? 0) + 1 }), {}) }

// ---- Notificaciones --------------------------------------------------------------------------------
const notificationSeeds: Array<[number, string, string, 'SENT' | 'FAILED', string | null, boolean]> = [
  [0, 'Recap listo', 'Ya puedes enviar tu recap semanal.', 'SENT', null, true], [1, 'Nuevo entrenamiento', 'Tienes asignado Fuerza tren superior para mañana.', 'SENT', null, true],
  [2, 'Buen trabajo', 'Has completado cuatro entrenos esta semana.', 'SENT', null, false], [3, 'Recordatorio de comidas', 'No olvides registrar tu cena.', 'FAILED', 'Dispositivo sin token FCM registrado', false],
  [4, 'Nuevo reto', 'Se ha activado el reto Racha de 14 días.', 'SENT', null, false], [5, 'Revisión de fotos', 'Tu coach ha revisado tus fotos de progreso.', 'SENT', null, true],
  [6, 'Recordatorio de peso', 'Es hora de registrar tu peso de la semana.', 'FAILED', 'Token FCM caducado', false], [7, 'Logro desbloqueado', 'Has conseguido Semana perfecta.', 'SENT', null, true],
]
const notificationItems = notificationSeeds.map(([c, title, body, status, error, read], i) => ({
  id: uuid('90710000', i + 1), sender_id: SESSION_USERS.SUPER_ADMIN.id, recipient_id: CLIENT_IDS[c], title, body, data: { route: i % 2 === 0 ? 'recap' : 'training' }, status, error, read_at: read ? isoAt(-i, '12:00:00') : null,
  created_at: isoAt(-Math.floor(i / 2), `${String(9 + i).padStart(2, '0')}:10:00`), recipient: { email: clients[c].email, profile: { first_name: clients[c].profile.first_name, last_name: clients[c].profile.last_name, avatar_url: clients[c].profile.avatar_url } },
}))

// ---- Plantillas -----------------------------------------------------------------------------------
const tpl = (key: string, name: string, description: string, category: string, title: string, body: string, route: string | null, system: boolean, delivery: Record<string, unknown>, extra: Partial<{ enabled: boolean; customized: boolean; variables: string[] }> = {}) => ({
  key, name, description, category, title, body, route: route ? `/${route}` : null, enabled: extra.enabled ?? true, variables: extra.variables ?? [], variable_help: Object.fromEntries((extra.variables ?? []).map((v) => [v, `Valor de ${v}`])),
  delivery_info: { type: 'manual', label: 'Manual', description: 'Se envía cuando el coach lo decide.', ...delivery }, customized: extra.customized ?? false, is_system: system, updated_at: system && !extra.customized ? null : isoAt(-6),
})
const templates = [
  tpl('recap_reminder', 'Recordatorio de recap', 'Aviso semanal para enviar el recap.', 'Recordatorios', 'Tu recap te espera', 'Hola {{first_name}}, ya puedes enviar tu recap semanal.', 'recap', true,
    { type: 'schedule', label: 'Programada', description: 'Se envía cada domingo.', timezone: 'Europe/Madrid', cron: '0 19 * * 0', times: ['19:00'], weekday: 0, schedule_enabled: true, schedule_kind: 'weekly' }, { variables: ['first_name'], customized: true }),
  tpl('meal_reminder', 'Recordatorio de comidas', 'Aviso diario para registrar comidas.', 'Recordatorios', 'Registra tu comida', 'No olvides marcar tus comidas de hoy.', 'diet', true,
    { type: 'schedule', label: 'Programada', description: 'Se envía a diario.', timezone: 'Europe/Madrid', times: ['14:30', '21:30'], schedule_enabled: false, schedule_kind: 'meal_daily' }, { enabled: false }),
  tpl('training_assigned', 'Nuevo entrenamiento asignado', 'Se dispara al asignar un entrenamiento.', 'Eventos', 'Nuevo entrenamiento', 'Tienes {{training_name}} asignado para {{date}}.', 'training', true,
    { type: 'event', label: 'Evento', description: 'Se envía al asignar un entrenamiento.' }, { variables: ['training_name', 'date'] }),
  tpl('streak_milestone', 'Hito de racha', 'Celebra los hitos de racha.', 'Eventos', '¡Racha de {{days}} días!', 'Sigue así, {{first_name}}.', 'home', true, { type: 'event', label: 'Evento', description: 'Se envía al alcanzar un hito.' }, { variables: ['days', 'first_name'] }),
  tpl('manual_bienvenida', 'Bienvenida personalizada', 'Mensaje manual de bienvenida.', 'Comunicación', 'Bienvenido a EXOM', 'Encantado de empezar contigo, estoy aquí para ayudarte.', 'home', false, {}),
  tpl('manual_promo_reto', 'Promoción de reto', 'Anuncia un nuevo reto global.', 'Comunicación', 'Nuevo reto disponible', 'Súmate al Desafío de invierno y entrena en equipo.', 'challenge', false, {}),
]

// ---- Solicitudes de aprobación -----------------------------------------------------------------------
type AStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'FAILED'
const actor = (i: number) => ({ id: admins[i].id, email: admins[i].email, profile: { first_name: admins[i].profile.first_name, last_name: admins[i].profile.last_name, avatar_url: null } })
const reviewer = { id: SESSION_USERS.SUPER_ADMIN.id, email: SESSION_USERS.SUPER_ADMIN.email, profile: { first_name: SESSION_USERS.SUPER_ADMIN.first_name, last_name: SESSION_USERS.SUPER_ADMIN.last_name, avatar_url: null } }
interface ApprovalSeed { who: number; action: string; type: string; resourceId: string | null; name: string; reason: string | null; status: AStatus; payload: Record<string, unknown>; current: Record<string, unknown> | null; rejection?: string; failure?: string; ago: number }
const approvalSeeds: ApprovalSeed[] = [
  { who: 0, action: 'training.update', type: 'training', resourceId: trainings[0].id, name: trainings[0].name, reason: 'Ajuste de volumen tras la revisión del bloque.', status: 'PENDING', ago: 0,
    payload: { name: 'Fuerza tren superior', estimated_duration_min: 65, estimated_calories: 450, tags: ['pecho', 'espalda', 'fuerza'], exercises: [{ exercise_id: exercises[0].id, sets: 4, reps_or_duration: '6-8' }] },
    current: { name: 'Fuerza tren superior', estimated_duration_min: 60, estimated_calories: 420, tags: ['pecho', 'espalda'], exercises: [{ exercise_id: exercises[0].id, sets: 3, reps_or_duration: '8-10' }] } },
  { who: 1, action: 'diet.delete', type: 'diet', resourceId: diets[2].id, name: diets[2].name, reason: 'Dieta duplicada, ya existe una versión actualizada.', status: 'PENDING', ago: 0, payload: { id: diets[2].id }, current: { name: diets[2].name } },
  { who: 0, action: 'exercise.update', type: 'exercise', resourceId: exercises[4].id, name: exercises[4].name, reason: null, status: 'PENDING', ago: 1, payload: { name: 'Press militar de pie', level: 'AVANZADO' }, current: { name: exercises[4].name, level: 'INTERMEDIO' } },
  { who: 2, action: 'notification.send', type: 'notification', resourceId: null, name: 'Anuncio de mantenimiento', reason: 'Aviso a todos los clientes sobre la ventana de mantenimiento.', status: 'APPROVED', ago: 2, payload: { title: 'Anuncio de mantenimiento', body: 'La app estará en mantenimiento esta noche.' }, current: null },
  { who: 0, action: 'challenge.create', type: 'challenge', resourceId: null, name: 'Reto global de otoño', reason: 'Reto de captación para nuevos clientes.', status: 'REJECTED', ago: 3, rejection: 'El objetivo es demasiado exigente para el nivel inicial; reduce la meta a 3 días.', payload: { title: 'Reto global de otoño', target_value: 6 }, current: null },
  { who: 3, action: 'achievement.grant', type: 'achievement', resourceId: achievements[6].id, name: achievements[6].name, reason: 'Reconocimiento manual.', status: 'FAILED', ago: 4, failure: 'El cliente seleccionado ya tiene este logro asignado.', payload: { client_ids: [CLIENT_IDS[7]] }, current: null },
  { who: 0, action: 'ingredient.delete', type: 'ingredient', resourceId: ingredients[14].id, name: ingredients[14].name, reason: 'Ingrediente sin uso.', status: 'APPROVED', ago: 5, payload: { id: ingredients[14].id }, current: { name: ingredients[14].name } },
  { who: 1, action: 'meal.update', type: 'meal', resourceId: uuid('3e000000', 110), name: 'Arroz con pollo y brócoli', reason: 'Cambio de gramajes en la comida principal.', status: 'PENDING', ago: 1, payload: { calories: 620, protein_g: 48 }, current: { calories: 560, protein_g: 42 } },
]
const approvals = approvalSeeds.map((s, i) => ({
  id: uuid('a9900000', i + 1), requester_id: admins[s.who].id, reviewer_id: s.status === 'PENDING' ? null : reviewer.id, action_type: s.action, resource_type: s.type, resource_id: s.resourceId, request_reason: s.reason, status: s.status,
  rejection_reason: s.rejection ?? null, failure_reason: s.failure ?? null, resolved_at: s.status === 'PENDING' ? null : isoAt(-s.ago, '16:30:00'), created_at: isoAt(-s.ago - 1, '10:15:00'), updated_at: isoAt(-s.ago),
  requester: actor(s.who), reviewer: s.status === 'PENDING' ? null : reviewer, payload: s.payload, current_resource: s.current, resource_deleted: false, resource_name: s.name,
}))
const adminView = ({ payload: _payload, current_resource: _current, ...rest }: (typeof approvals)[number]) => { void _payload; void _current; return rest }
const approvalStats = () => ({ pending: approvals.filter((a) => a.status === 'PENDING').length, approved: approvals.filter((a) => a.status === 'APPROVED').length, rejected: approvals.filter((a) => a.status === 'REJECTED').length, failed: approvals.filter((a) => a.status === 'FAILED').length })

export const handleEngagement = ({ method, path, params }: FixtureCtx): unknown => {
  if (method !== 'get') return undefined
  if (path === '/challenges') {
    return { ...paginate(challenges.filter((c) => (!params.search || c.title.toLowerCase().includes(String(params.search).toLowerCase())) && (!params.type || c.type === params.type)), params), summary: challengeSummary }
  }
  const challenge = path.match(/^\/challenges\/([^/]+)$/)
  if (challenge) { const c = challenges.find((x) => x.id === challenge[1]); return c && { ...c, assignments: challengeAssignments(c.id, params) } }
  if (path === '/achievements') return { ...paginate(achievements.filter((a) => (!params.search || a.name.toLowerCase().includes(String(params.search).toLowerCase())) && (!params.criteria_type || a.criteria_type === params.criteria_type)), params), summary: achievementSummary }
  const achievement = path.match(/^\/achievements\/([^/]+)$/)
  if (achievement) {
    const a = achievements.find((x) => x.id === achievement[1])
    return a && { ...a, users: paginate(CLIENT_IDS.slice(0, Math.min(a.unlocked_count, 5)).map((cid, i) => ({ id: uuid('ac500000', i + 1), user_id: cid, unlocked_at: isoAt(-5 - i), user: clientRef(cid) })), params) }
  }
  if (path === '/notifications/history') {
    return paginate(notificationItems.filter((n) => (!params.status || n.status === params.status) && (!params.recipient_id || n.recipient_id === params.recipient_id)
      && (!params.search || `${n.title} ${n.body}`.toLowerCase().includes(String(params.search).toLowerCase()))), params, 20)
  }
  if (path === '/notifications/stats') return { total: notificationItems.length, today: 2, failed: notificationItems.filter((n) => n.status === 'FAILED').length }
  if (path === '/notifications/templates') return templates
  if (path === '/approval-requests/stats') return approvalStats()
  if (path === '/approval-requests' || path === '/approval-requests/my') {
    const source = path === '/approval-requests/my' ? approvals.filter((a) => a.requester_id === SESSION_USERS.ADMIN.id) : approvals
    return paginate(source.filter((a) => (!params.status || a.status === params.status) && (!params.resource_type || a.resource_type === params.resource_type)), params, 20)
  }
  const resourceBatch = path.match(/^\/approval-requests\/resource\/([^/]+)\/batch$/)
  if (resourceBatch) return String(params.ids ?? '').split(',').filter(Boolean).map((id) => {
    const hit = approvals.find((a) => a.resource_id === id && a.status === 'PENDING')
    return { resource_id: id, has_pending_approval: Boolean(hit), pending_approval_actions: hit ? [hit.action_type] : [] }
  })
  const resource = path.match(/^\/approval-requests\/resource\/([^/]+)\/([^/]+)$/)
  if (resource) return approvals.filter((a) => a.resource_type === resource[1] && a.resource_id === resource[2])
  const one = path.match(/^\/approval-requests\/([^/]+)$/)
  if (one) { const a = approvals.find((x) => x.id === one[1]); return a && (harnessRole === 'SUPER_ADMIN' ? a : adminView(a)) }
  return undefined
}
