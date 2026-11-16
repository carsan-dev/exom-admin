import type { FilterOption } from '@/components/filters'
import type { NotificationTemplate } from './types'

export interface TemplateDraft {
  title: string
  body: string
  route: string
  enabled: boolean
}

export interface CreateTemplateDraft extends TemplateDraft {
  name: string
  description: string
  category: string
}

export interface ScheduleDraft {
  enabled: boolean
  timezone: string
  times: string[]
  weekday: number
}

export const emptyDraft: TemplateDraft = {
  title: '',
  body: '',
  route: '',
  enabled: true,
}

export const defaultScheduleDraft: ScheduleDraft = {
  enabled: true,
  timezone: 'Europe/Madrid',
  times: ['09:00'],
  weekday: 0,
}

export const emptyCreateDraft: CreateTemplateDraft = {
  name: '',
  description: '',
  category: 'Manual',
  title: '',
  body: '',
  route: '',
  enabled: true,
}

export function normalizeRoute(route: string) {
  const trimmed = route.trim()
  return trimmed ? trimmed : null
}

export function validateTemplateFields(title: string, body: string, route: string | null) {
  if (!title || !body) {
    return 'Título y cuerpo son obligatorios'
  }

  if (route && !route.startsWith('/')) {
    return 'La ruta debe empezar por / o quedar vacía'
  }

  return null
}

export const weekdayOptions = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
]

export const mealTimeLabels = ['Desayuno', 'Comida', 'Snack', 'Cena']
export const DELIVERY_TYPE_OPTIONS: FilterOption[] = [
  { value: 'manual', label: 'Manual' },
  { value: 'event', label: 'Por evento' },
  { value: 'schedule', label: 'Programada' },
]
export const TEMPLATE_ORIGIN_OPTIONS: FilterOption[] = [
  { value: 'SYSTEM', label: 'Automática' },
  { value: 'MANUAL', label: 'Manual' },
]
export const TEMPLATE_STATE_OPTIONS: FilterOption[] = [
  { value: 'ENABLED', label: 'Activa' },
  { value: 'PAUSED', label: 'Pausada' },
]

export function getScheduleDraft(template: NotificationTemplate): ScheduleDraft {
  const delivery = template.delivery_info

  if (delivery.type !== 'schedule') {
    return defaultScheduleDraft
  }

  const fallbackTimes =
    delivery.schedule_kind === 'meal_daily'
      ? ['08:00', '13:00', '17:00', '20:30']
      : [delivery.times?.[0] ?? '09:00']

  return {
    enabled: delivery.schedule_enabled ?? true,
    timezone: delivery.timezone ?? 'Europe/Madrid',
    times: delivery.times && delivery.times.length > 0 ? delivery.times : fallbackTimes,
    weekday: delivery.weekday ?? 0,
  }
}

export function normalizeScheduleDraft(template: NotificationTemplate, draft: ScheduleDraft): ScheduleDraft {
  const kind = template.delivery_info.schedule_kind
  const timeCount = kind === 'meal_daily' ? 4 : 1
  const times = Array.from({ length: timeCount }, (_, index) => draft.times[index] ?? '')

  return {
    enabled: draft.enabled,
    timezone: draft.timezone.trim(),
    times,
    weekday: kind === 'weekly' ? draft.weekday : 0,
  }
}

export function schedulesEqual(left: ScheduleDraft, right: ScheduleDraft) {
  return (
    left.enabled === right.enabled &&
    left.timezone === right.timezone &&
    left.weekday === right.weekday &&
    left.times.length === right.times.length &&
    left.times.every((time, index) => time === right.times[index])
  )
}

export function formatUpdatedAt(value: string | null) {
  if (!value) {
    return 'Sin cambios'
  }

  return new Date(value).toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function getTemplateSearchText(template: NotificationTemplate) {
  return [
    template.name,
    template.description,
    template.category,
    template.title,
    template.body,
    template.key,
    template.delivery_info.label,
    template.delivery_info.description,
  ]
    .join(' ')
    .toLowerCase()
}

export function getTemplateOrigin(template: NotificationTemplate) {
  return template.is_system ? 'SYSTEM' : 'MANUAL'
}

export function getTemplateState(template: NotificationTemplate) {
  return template.enabled ? 'ENABLED' : 'PAUSED'
}
