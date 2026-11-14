import type { BaseDelivery, BaseRoute, BaseSubscriber, DeliveryStatus } from './types'

const GOAL_LABELS: Record<string, string> = {
  'perder-grasa': 'Perder grasa',
  'ganar-musculo': 'Ganar músculo',
  'ganar-musculo-y-perder-grasa': 'Ganar músculo y perder grasa',
  'ganar-fuerza': 'Ganar fuerza',
  'ponerte-en-forma': 'Ponerte en forma',
}

export function getGoalLabel(goal: string) {
  const known = GOAL_LABELS[goal]
  if (known) return known
  const words = goal.replace(/-/g, ' ').trim()
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : goal
}

export function formatRoute(goal: string, days: number) {
  return `${getGoalLabel(goal)} · ${days} ${days === 1 ? 'día' : 'días'}/semana`
}

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  PENDING: 'Enviando…',
  SENT: 'Enviado',
  FAILED: 'Fallido',
}

export function formatDateTime(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function getAvailableMonths(routes: BaseRoute[], goal: string, days: number): number[] {
  const route = routes.find((item) => item.objetivo === goal)
  return route?.monthsByDias.find((item) => item.dias === days)?.months ?? []
}

export const AMBIGUOUS_WARNING = 'Puede que el email sí haya llegado. Confírmalo con el cliente antes de reenviar.'

export const NOT_CONFIGURED_TITLE = 'El servicio base no está configurado en este entorno.'
export const NOT_CONFIGURED_HELP = 'Falta la fuente de los PDF o el envío de email. Pide al equipo técnico que lo configure.'

/** Why a send failed, by code. Whether the email may have arrived is decided by `possibly_delivered`, never by the code. */
export type SendFailureKind = 'archived' | 'rejected' | 'ops' | 'unclear' | 'stamp' | 'invalid-data' | 'internal' | 'unrecorded' | 'unknown'

const FAILURE_KIND_BY_CODE: Record<string, SendFailureKind> = {
  SUBSCRIBER_ARCHIVED: 'archived',
  EMAIL_REQUEST_REJECTED: 'rejected',
  EMAIL_PROVIDER_REJECTED: 'ops',
  EMAIL_PROVIDER_AUTH_REJECTED: 'ops',
  EMAIL_PROVIDER_NOT_CONFIGURED: 'ops',
  BASE_SOURCE_UNAVAILABLE: 'ops',
  BASE_CONTENT_UNAVAILABLE: 'ops',
  BASE_SOURCE_NOT_FOUND: 'ops',
  BASE_SOURCE_NOT_CONFIGURED: 'ops',
  BASE_SOURCE_CHANGED: 'ops',
  EMAIL_PROVIDER_UNAVAILABLE: 'unclear',
  EMAIL_PROVIDER_RATE_LIMITED: 'unclear',
  EMAIL_PROVIDER_UNREACHABLE: 'unclear',
  EMAIL_ACCEPTANCE_MISSING: 'unclear',
  EMAIL_IDEMPOTENCY_IN_PROGRESS: 'unclear',
  EMAIL_DEDUP_WINDOW_EXPIRED: 'unclear',
  EMAIL_IDEMPOTENCY_CONFLICT: 'unclear',
  ATTEMPT_FAILED_OR_AMBIGUOUS: 'unclear',
  BASE_STAMP_TOO_LONG: 'stamp',
  BASE_SNAPSHOT_INVALID: 'invalid-data',
  SEND_STATE_UNRECORDED: 'unrecorded',
  BASE_DELIVERY_SUPERSEDED: 'internal',
  BASE_DELIVERY_NOT_FOUND: 'internal',
  BASE_DELIVERY_FILES_INVALID: 'internal',
  BASE_SUBSCRIBER_NOT_FOUND: 'internal',
  EMAIL_RECIPIENT_CHANGED: 'internal',
  INVALID_BASE_DELIVERY_INTENT: 'internal',
  CLAIM_REQUIRED: 'internal',
  CLAIM_LOST: 'internal',
  ATTEMPTS_EXHAUSTED: 'internal',
}

export function getSendFailureKind(code: string | null): SendFailureKind {
  if (!code) return 'unknown'
  return FAILURE_KIND_BY_CODE[code] ?? 'unknown'
}

/** Secondary, per-code text: why it failed and what to fix. */
export function getSendFailureExplanation(code: string | null): string {
  switch (getSendFailureKind(code)) {
    case 'archived':
      return 'El suscriptor se archivó antes del envío. Reactívalo y pulsa Reenviar.'
    case 'rejected':
      return 'El proveedor rechazó el envío, normalmente por una dirección de email no válida. Corrige el email en la ficha y pulsa Reenviar.'
    case 'ops':
      return 'Hay un problema de configuración o de contenido que debe resolver el equipo técnico; después se puede reenviar.'
    case 'unclear':
      return 'El proveedor de email no respondió con claridad tras varios intentos.'
    case 'stamp':
      return 'El nombre y el email eran demasiado largos para la línea de licencia. Acórtalos en la ficha y pulsa Reenviar.'
    case 'invalid-data':
      return 'Los datos del suscriptor no pasan la validación actual. Edítalos en la ficha y pulsa Reenviar; avisa a desarrollo si persiste.'
    case 'unrecorded':
      return 'No se pudo registrar el resultado de este envío. Revisa el aviso de abajo y, si procede, pulsa Reenviar.'
    case 'internal':
      return 'Error interno. Avisa al equipo de desarrollo.'
    default:
      return 'El envío ha fallado por un motivo desconocido.'
  }
}

/** The ambiguity warning is shown only for a FAILED send flagged `possibly_delivered`. */
export function getAmbiguityWarning(send: { status: DeliveryStatus; possibly_delivered: boolean }) {
  return send.status === 'FAILED' && send.possibly_delivered ? AMBIGUOUS_WARNING : null
}

/** Paragraphs of the resend confirmation; the resend goes to the subscriber's CURRENT address. */
export function getResendMessage(delivery: BaseDelivery, subscriber: BaseSubscriber): string[] {
  const lines: string[] = []
  if (delivery.status === 'SENT') {
    lines.push('Este mes ya se envió. Se volverá a enviar el mismo material.')
  } else {
    lines.push(getAmbiguityWarning(delivery) ?? 'Se volverá a intentar el envío.')
  }
  lines.push(`Se enviará a ${subscriber.email}.`)
  if (subscriber.email !== delivery.snapshot_email) {
    lines.push(`La vez anterior se envió a ${delivery.snapshot_email}.`)
  }
  return lines
}

export function canResendDelivery(
  delivery: { status: DeliveryStatus },
  subscriber: { is_archived: boolean },
) {
  return !subscriber.is_archived && delivery.status !== 'PENDING'
}

export type SendBlockKind = 'archived' | 'pending' | 'failed' | 'no-route' | 'no-content' | 'loading'

export interface SendBlock {
  kind: SendBlockKind
  text: string
}

export function getSendBlock(
  subscriber: BaseSubscriber,
  routes: BaseRoute[] | undefined,
  routesFailed: boolean,
): SendBlock | null {
  const latest = subscriber.latest_delivery
  if (subscriber.is_archived) return { kind: 'archived', text: 'El suscriptor está archivado' }
  if (latest?.status === 'PENDING') return { kind: 'pending', text: `El mes ${latest.month} se está enviando` }
  if (latest?.status === 'FAILED') {
    return { kind: 'failed', text: `Resuelve el mes ${latest.month} antes de enviar el siguiente` }
  }
  if (routesFailed) return null
  if (!routes) return { kind: 'loading', text: 'Comprobando el contenido disponible…' }
  const route = routes.find((item) => item.objetivo === subscriber.goal)
  if (!route || !route.dias.includes(subscriber.days_per_week)) {
    return { kind: 'no-route', text: 'Esta ruta ya no está en el catálogo. Edita el objetivo o los días.' }
  }
  const months = getAvailableMonths(routes, subscriber.goal, subscriber.days_per_week)
  if (!months.includes(subscriber.next_month)) {
    return { kind: 'no-content', text: `Aún no hay contenido para el mes ${subscriber.next_month}` }
  }
  return null
}
