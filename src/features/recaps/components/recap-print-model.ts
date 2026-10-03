import { formatAverageDailySteps, formatRecapOption, type RecapItem } from '../types'

export type RecapPrintSource = Readonly<Pick<RecapItem,
  | 'id' | 'status' | 'submitted_at' | 'reviewed_at'
  | 'week_start_date' | 'week_end_date' | 'client_feedback_text'
  | 'training_effort' | 'training_sessions' | 'average_daily_steps'
  | 'training_progress' | 'training_notes' | 'nutrition_quality' | 'food_quality'
  | 'hydration_enabled' | 'hydration_level' | 'nutrition_notes' | 'sleep_hours_range'
  | 'fatigue_level' | 'muscle_pain_zones' | 'pain_intensity' | 'recovery_notes'
  | 'mood' | 'stress_enabled' | 'stress_level' | 'hunger_level' | 'energy_level'
  | 'digestion_level' | 'general_notes' | 'improvement_app_rating'
  | 'improvement_service_rating' | 'improvement_areas' | 'improvement_feedback_text'
>>

interface PrintAnswer {
  label: string
  value: string
}
interface PrintSection {
  title: string
  answers: PrintAnswer[]
}
export interface RecapPrintModel {
  clientName: string
  week: string
  submittedDate: string
  feedback: string | null
  sections: PrintSection[]
}

function dateLabel(value: string, calendarDate = false) {
  return new Date(value).toLocaleDateString('es-ES', {
    day: '2-digit', month: 'long', year: 'numeric',
    ...(calendarDate ? { timeZone: 'UTC' } : {}),
  })
}
const numberLabel = (value: number | null | undefined) => value?.toString() ?? 'No indicado'
const notesLabel = (value: string | null, fallback = 'Sin notas del cliente') =>
  value?.trim() ? value : fallback
const answer = (label: string, value: string): PrintAnswer => ({ label, value })

// Project persisted public fields only; never spread the Admin DTO into the report.
export function toRecapPrintModel(source: RecapPrintSource, clientName: string): RecapPrintModel | null {
  if (!source.id.trim() || !source.submitted_at ||
    (source.status !== 'SUBMITTED' && source.status !== 'REVIEWED') ||
    [source.submitted_at, source.week_start_date, source.week_end_date]
      .some((value) => !Number.isFinite(Date.parse(value)))) return null

  return {
    clientName: clientName.trim() || 'Cliente sin nombre',
    week: `${dateLabel(source.week_start_date, true)} - ${dateLabel(source.week_end_date, true)}`,
    submittedDate: dateLabel(source.submitted_at),
    feedback: source.status === 'REVIEWED' && source.reviewed_at
      ? source.client_feedback_text?.trim() || null : null,
    sections: [
      { title: 'Entrenos', answers: [
        answer('Esfuerzo semanal', numberLabel(source.training_effort)),
        answer('Sesiones completadas', numberLabel(source.training_sessions)),
        answer('Media diaria de pasos', formatAverageDailySteps(source.average_daily_steps, true)),
        answer('Progreso', formatRecapOption(source.training_progress)),
        answer('Notas', notesLabel(source.training_notes)),
      ] },
      { title: 'Nutrición', answers: [
        answer('Calidad de alimentación', formatRecapOption(source.nutrition_quality)),
        answer('Calidad de comidas', numberLabel(source.food_quality)),
        answer('Hidratación activada', source.hydration_enabled ? 'Sí' : 'No'),
        answer('Nivel de hidratación', formatRecapOption(source.hydration_level)),
        answer('Notas', notesLabel(source.nutrition_notes)),
      ] },
      { title: 'Recuperación y hábitos', answers: [
        answer('Horas de sueño', formatRecapOption(source.sleep_hours_range)),
        answer('Fatiga', formatRecapOption(source.fatigue_level)),
        answer('Intensidad del dolor', formatRecapOption(source.pain_intensity)),
        answer('Zonas con dolor muscular', source.muscle_pain_zones.map(formatRecapOption).join(', ') || 'Sin zonas reportadas.'),
        answer('Notas', notesLabel(source.recovery_notes)),
      ] },
      { title: 'Sensaciones generales', answers: [
        answer('Estado de ánimo', formatRecapOption(source.mood)),
        answer('Estrés activado', source.stress_enabled ? 'Sí' : 'No'),
        answer('Nivel de estrés', numberLabel(source.stress_level)),
        answer('Hambre semanal (1 sin hambre – 10 extrema)', numberLabel(source.hunger_level)),
        answer('Energía semanal (1 sin energía – 10 mucha)', numberLabel(source.energy_level)),
        answer('Digestión semanal (1 muy mala – 10 muy buena)', numberLabel(source.digestion_level)),
        answer('Notas', notesLabel(source.general_notes)),
      ] },
      { title: 'Ayúdanos a mejorar', answers: [
        answer('Valoración del servicio', numberLabel(source.improvement_service_rating)),
        answer('Valoración de la app', numberLabel(source.improvement_app_rating)),
        answer('Áreas de mejora', source.improvement_areas.map(formatRecapOption).join(', ') || 'Sin áreas destacadas.'),
        answer('Comentario del cliente', notesLabel(source.improvement_feedback_text, 'Sin comentario adicional')),
      ] },
    ],
  }
}
