import { addDays, daysFromToday, isoAt, paginate, svgImage, uuid, type FixtureCtx } from './fx-util'
import { CLIENT_IDS, clientRef, clients } from './fx-people'
import { exercises, trainings } from './fx-catalog'

// ---- Feedback -------------------------------------------------------------------------------
const cr = (id: string) => { const c = clients.find((x) => x.id === id) ?? clients[0]; return { id: c.id, email: c.email, profile: { first_name: c.profile.first_name, last_name: c.profile.last_name } } }
const feedbackSeeds: Array<[number, number, number, 'GENERAL' | 'LAST_SET', 'VIDEO' | 'IMAGE', string | null, string | null, 'PENDING' | 'REVIEWED']> = [
  [0, 0, 0, 'LAST_SET', 'VIDEO', 'Última serie al fallo, creo que bajé demasiado rápido.', null, 'PENDING'],
  [1, 2, 1, 'GENERAL', 'VIDEO', 'Dudas con la técnica del peso muerto rumano, ¿me sale la espalda?', null, 'PENDING'],
  [2, 3, 3, 'GENERAL', 'IMAGE', 'Foto del setup del remo, ¿la altura del banco es correcta?', null, 'PENDING'],
  [3, 7, 7, 'LAST_SET', 'VIDEO', null, null, 'PENDING'],
  [0, 1, 1, 'GENERAL', 'VIDEO', 'Sentadilla con 80 kg, siento tensión en la rodilla derecha.', 'Baja a 70 kg y trabaja el control del descenso. Revisamos el vídeo el jueves.', 'REVIEWED'],
  [5, 4, 0, 'LAST_SET', 'VIDEO', 'Press militar, última serie.', 'Muy buena ejecución. Sube 2,5 kg la próxima semana.', 'REVIEWED'],
  [6, 5, 5, 'GENERAL', 'IMAGE', 'Postura en dominadas asistidas.', 'Todo correcto, intenta bajar la asistencia un punto.', 'REVIEWED'],
]
const feedbackItems = feedbackSeeds.map(([c, ex, tr, kind, media, notes, response, status], i) => ({
  id: uuid('fb000000', i + 1), client_id: CLIENT_IDS[c], exercise_id: exercises[ex].id, training_id: trainings[tr].id, training_exercise_id: null, assignment_date: daysFromToday(-1 - i),
  feedback_kind: kind, media_type: media, media_url: svgImage(`${media === 'VIDEO' ? 'Vídeo' : 'Foto'} ${i + 1}`, 30 + i * 35, 480, 640), notes, admin_response: response, status,
  reviewed_by: status === 'REVIEWED' ? 'staff' : null, reviewed_at: status === 'REVIEWED' ? isoAt(-i, '12:00:00') : null, media_deleted_at: null, created_at: isoAt(-1 - i, '19:20:00'), updated_at: isoAt(-i),
  client: cr(CLIENT_IDS[c]), exercise: { id: exercises[ex].id, name: exercises[ex].name }, training: { id: trainings[tr].id, name: trainings[tr].name },
}))

// ---- Recaps ---------------------------------------------------------------------------------
export const RECAP_DETAIL_ID = uuid('7ec00000', 1)
type RStatus = 'DRAFT' | 'SUBMITTED' | 'REVIEWED'
const recapSeeds: Array<[number, RStatus, boolean, number]> = [
  [0, 'SUBMITTED', false, 0], [1, 'SUBMITTED', false, 0], [3, 'SUBMITTED', false, 0],
  [2, 'REVIEWED', false, 1], [5, 'REVIEWED', false, 1], [6, 'REVIEWED', false, 2],
  [7, 'REVIEWED', true, 3], [8, 'REVIEWED', true, 4],
]
const weekStartFor = (weeksBack: number) => addDays('2026-11-09', -7 * weeksBack)
const recaps = recapSeeds.map(([c, status, archived, weeksBack], i) => {
  const start = weekStartFor(weeksBack)
  return {
    id: i === 0 ? RECAP_DETAIL_ID : uuid('7ec00000', i + 1), client_id: CLIENT_IDS[c], week_start_date: start, week_end_date: addDays(start, 6), submitted_at: `${addDays(start, 6)}T20:10:00.000Z`,
    average_daily_steps: 8200 + i * 410, admin_comments: status === 'REVIEWED' ? 'Buen trabajo esta semana.' : null, status, archived_at: archived ? isoAt(-20) : null, created_at: `${start}T08:00:00.000Z`, client: clientRef(CLIENT_IDS[c]),
  }
})
const recapDetail = (id: string) => {
  const base = recaps.find((r) => r.id === id)
  if (!base) return undefined
  return {
    ...base, updated_at: isoAt(-1), training_effort: 8, training_sessions: 4, training_progress: 'MEJOR', training_notes: 'Subí peso en press de banca y sentadilla; el jueves me costó más por el cansancio acumulado.',
    nutrition_quality: 'BUENA', hydration_enabled: true, hydration_level: 'ALTA', food_quality: 8, nutrition_notes: 'Cumplí casi todas las comidas, falló la cena del sábado.',
    sleep_hours_range: 'SEVEN_TO_EIGHT', fatigue_level: 'MEDIA', muscle_pain_zones: ['Cuádriceps', 'Hombros'], pain_intensity: 'LEVE', recovery_notes: 'Algo de agujetas el martes.', mood: 'MOTIVADO',
    stress_enabled: true, stress_level: 4, hunger_level: 6, energy_level: 7, digestion_level: 8, general_notes: 'Semana productiva, con ganas de seguir progresando.',
    improvement_app_rating: 5, improvement_service_rating: 5, improvement_areas: ['Más vídeos de técnica', 'Recordatorios de comidas'], improvement_feedback_text: 'La app va muy bien, me gustaría ver más vídeos explicativos.',
    client_feedback_text: base.status === 'REVIEWED' ? 'Gracias por el ajuste, esta semana lo probaré.' : null, client_feedback_sent_at: base.status === 'REVIEWED' ? isoAt(-3) : null, client_feedback_read_at: null,
    reviewed_at: base.status === 'REVIEWED' ? isoAt(-4) : null,
    review_version: 3, draft_coach_summary: 'Semana sólida de entrenamiento con progresión clara en los básicos.', draft_changes: 'Subir 2,5 kg en press de banca y mantener volumen de pierna.',
    draft_next_week_goals: 'Completar las 4 sesiones y mejorar la cena del fin de semana.', published_coach_summary: null, published_changes: null, published_next_week_goals: null,
  }
}

const statsOf = (kind: 'feedback' | 'recaps') => (kind === 'feedback'
  ? { total: feedbackItems.length, pending: feedbackItems.filter((f) => f.status === 'PENDING').length, reviewed: feedbackItems.filter((f) => f.status === 'REVIEWED').length, avg_review_seconds: 5_400, reviewed_in_period: 3 }
  : { total: recaps.length, submitted: recaps.filter((r) => r.status === 'SUBMITTED').length, reviewed: recaps.filter((r) => r.status === 'REVIEWED' && !r.archived_at).length, archived: recaps.filter((r) => r.archived_at).length, avg_review_seconds: 7_200, reviewed_in_period: 4 })

export const handleFeedbackRecaps = ({ method, path, params }: FixtureCtx): unknown => {
  if (method !== 'get') return undefined
  if (path === '/feedback') return paginate(feedbackItems.filter((f) => (!params.client_id || f.client_id === params.client_id) && (!params.status || f.status === params.status)), params, 20)
  if (path === '/feedback/stats') return statsOf('feedback')
  if (path === '/recaps') {
    const archived = params.archived === true || params.archived === 'true'
    return paginate(recaps.filter((r) => Boolean(r.archived_at) === archived && (!params.client_id || r.client_id === params.client_id) && (!params.status || r.status === params.status)), params, 20)
  }
  if (path === '/recaps/stats') return statsOf('recaps')
  const one = path.match(/^\/recaps\/([^/]+)$/)
  if (one) return recapDetail(one[1])
  return undefined
}
