import { formatNotificationDateTime } from '../notifications/format-notification-date'

/**
 * Etiquetas legibles de los campos que aparecen en los payloads de las solicitudes
 * (training, diet, exercise, ingredient, meal, challenge, achievement, notification).
 * Una clave sin entrada se muestra tal cual: nunca se oculta ni se descarta una fila.
 */
export const DIFF_FIELD_LABELS: Record<string, string> = {
  // Comunes
  id: 'Identificador',
  name: 'Nombre',
  title: 'Título',
  description: 'Descripción',
  type: 'Tipo',
  types: 'Tipos',
  tags: 'Etiquetas',
  level: 'Nivel',
  unit: 'Unidad',
  order: 'Orden',
  // Entrenamientos
  estimated_duration_min: 'Duración estimada (min)',
  estimated_calories: 'Calorías estimadas',
  warmup_description: 'Descripción del calentamiento',
  warmup_duration_min: 'Duración del calentamiento (min)',
  cooldown_description: 'Descripción de la vuelta a la calma',
  exercises: 'Ejercicios',
  exercise_id: 'Ejercicio',
  kind: 'Clase de bloque',
  sets: 'Series',
  reps_or_duration: 'Repeticiones o duración',
  measure_type: 'Tipo de medida',
  target_value: 'Valor objetivo',
  target_value_min: 'Valor objetivo mínimo',
  target_value_max: 'Valor objetivo máximo',
  target_rir: 'RIR objetivo',
  rir_override: 'RIR personalizado',
  rir_proposal: 'Propuesta de RIR',
  rest_seconds: 'Descanso (s)',
  rest_between_rounds_seconds: 'Descanso entre rondas (s)',
  rounds: 'Rondas',
  timed_config: 'Configuración por tiempo',
  request_set_tracking: 'Registro de series',
  items: 'Elementos',
  // Dietas y comidas
  meals: 'Comidas',
  variants: 'Variantes',
  ingredients: 'Ingredientes',
  ingredient_id: 'Ingrediente',
  quantity: 'Cantidad',
  grams_equivalent: 'Equivalencia en gramos',
  calories: 'Calorías',
  protein_g: 'Proteínas (g)',
  carbs_g: 'Hidratos (g)',
  fat_g: 'Grasas (g)',
  total_calories: 'Calorías totales',
  total_protein_g: 'Proteínas totales (g)',
  total_carbs_g: 'Hidratos totales (g)',
  total_fat_g: 'Grasas totales (g)',
  nutritional_badges: 'Distintivos nutricionales',
  image_url: 'Imagen',
  image_upload_id: 'Subida de imagen',
  icon: 'Icono',
  // Ejercicios
  equipment: 'Material',
  muscle_groups: 'Grupos musculares',
  explanation_text: 'Explicación',
  technique_text: 'Técnica',
  common_errors_text: 'Errores comunes',
  thumbnail_url: 'Miniatura',
  thumbnail_upload_id: 'Subida de miniatura',
  video_url: 'Vídeo',
  video_upload_id: 'Subida de vídeo',
  video_stream_id: 'Vídeo en streaming',
  // Retos y logros
  deadline: 'Fecha límite',
  is_global: 'Global',
  is_manual: 'Manual',
  apply_to_all_visible_clients: 'Aplicar a todos los clientes visibles',
  client_ids: 'Clientes',
  rule_key: 'Regla',
  rule_config: 'Configuración de la regla',
  criteria_type: 'Tipo de criterio',
  criteria_value: 'Valor del criterio',
  training_type: 'Tipo de entrenamiento',
  icon_url: 'Icono',
  // Notificaciones
  body: 'Mensaje',
  user_id: 'Usuario',
  recipient_id: 'Destinatario',
}

export function getDiffFieldLabel(key: string): string {
  return Object.prototype.hasOwnProperty.call(DIFF_FIELD_LABELS, key) ? DIFF_FIELD_LABELS[key] : key
}

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const ISO_DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/
const MAX_INLINE_ITEMS = 5

function isPrimitive(value: unknown): value is string | number | boolean | null | undefined {
  return value === null || value === undefined || typeof value !== 'object'
}

function pluralize(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`
}

/**
 * Valor legible de un campo de un payload. El valor completo sigue disponible en
 * «Datos técnicos»; aquí los objetos y las listas largas se resumen.
 */
export function formatDiffValue(value: unknown): string {
  if (value === undefined || value === null) return '—'
  if (typeof value === 'boolean') return value ? 'Sí' : 'No'
  if (typeof value === 'number' || typeof value === 'bigint') return String(value)

  if (typeof value === 'string') {
    if (value === '') return '—'

    const dateOnly = ISO_DATE_PATTERN.exec(value)
    if (dateOnly) return `${dateOnly[3]}/${dateOnly[2]}/${dateOnly[1]}`

    if (ISO_DATE_TIME_PATTERN.test(value) && !Number.isNaN(new Date(value).getTime())) {
      return formatNotificationDateTime(value)
    }

    return value
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return '—'
    if (value.length <= MAX_INLINE_ITEMS && value.every(isPrimitive)) {
      return value.map(formatDiffValue).join(', ')
    }
    return pluralize(value.length, 'elemento', 'elementos')
  }

  if (typeof value === 'object') {
    const count = Object.keys(value as Record<string, unknown>).length
    return count === 0 ? '—' : pluralize(count, 'campo', 'campos')
  }

  return String(value)
}
