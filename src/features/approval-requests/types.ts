import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'FAILED'
export type ApprovalStatusFilter = ApprovalStatus | 'ALL'

export type ResourceType =
  | 'training'
  | 'diet'
  | 'exercise'
  | 'ingredient'
  | 'meal'
  | 'challenge'
  | 'achievement'
  | 'notification'

export interface ApprovalActorProfile {
  first_name: string | null
  last_name: string | null
  avatar_url?: string | null
}

export interface ApprovalActor {
  id: string
  email: string
  profile: ApprovalActorProfile | null
}

interface ApprovalRequestBase {
  id: string
  requester_id: string
  reviewer_id: string | null
  action_type: string
  resource_type: ResourceType
  resource_id: string | null
  request_reason: string | null
  status: ApprovalStatus
  rejection_reason: string | null
  failure_reason: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
  requester: ApprovalActor
  reviewer?: ApprovalActor | null
}

export interface ApprovalRequest extends ApprovalRequestBase {
  payload: Record<string, unknown>
  current_resource?: Record<string, unknown> | null
  resource_deleted?: boolean
  resource_name?: string
}

interface ApprovalRequestDetailBase extends ApprovalRequestBase {
  resource_name: string
  resource_deleted: boolean
}

export interface AdminApprovalRequestDetail extends ApprovalRequestDetailBase {}

export interface SuperAdminApprovalRequestDetail extends ApprovalRequestDetailBase {
  payload: Record<string, unknown>
  current_resource: Record<string, unknown> | null
}

export type ApprovalRequestDetail =
  | AdminApprovalRequestDetail
  | SuperAdminApprovalRequestDetail

type ApprovalRequestLike = ApprovalRequest | ApprovalRequestDetail

export function hasTechnicalApprovalDetail(
  request: ApprovalRequestDetail,
): request is SuperAdminApprovalRequestDetail {
  return 'payload' in request
}

export interface PaginatedApprovalRequests {
  data: ApprovalRequest[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface ApprovalStats {
  pending: number
  approved: number
  rejected: number
  failed: number
}

export interface ResolveApprovalRequestPayload {
  action: 'approve' | 'reject'
  rejection_reason?: string
}

export interface MyApprovalRequestFilters {
  status?: ApprovalStatus | 'ALL'
  resource_type?: string
  page?: number
  limit?: number
}

export interface ResourceApprovalSummary {
  resource_id: string
  has_pending_approval: boolean
  pending_approval_actions: string[]
}

export interface ApprovalDetailFact {
  label: string
  value: string
}

export interface AdminApprovalDetailView {
  summary: string
  facts: ApprovalDetailFact[]
  requestReason: string | null
  outcomeReason: string | null
}

export interface SuperAdminApprovalDetailView extends AdminApprovalDetailView {
  rawPayload: string
}

export const APPROVAL_STATUS_LABELS: Record<ApprovalStatus, string> = {
  PENDING: 'Pendiente',
  APPROVED: 'Aprobada',
  REJECTED: 'Rechazada',
  FAILED: 'Fallida',
}

export const ACTION_TYPE_LABELS: Record<string, string> = {
  'training.update': 'Modificar entrenamiento',
  'training.delete': 'Eliminar entrenamiento',
  'diet.update': 'Modificar dieta',
  'diet.delete': 'Eliminar dieta',
  'exercise.update': 'Modificar ejercicio',
  'exercise.delete': 'Eliminar ejercicio',
  'ingredient.update': 'Modificar ingrediente',
  'ingredient.delete': 'Eliminar ingrediente',
  'meal.create': 'Crear comida (dieta ajena)',
  'meal.update': 'Modificar comida (dieta ajena)',
  'meal.delete': 'Eliminar comida',
  'challenge.create': 'Crear reto global',
  'challenge.update': 'Modificar reto',
  'challenge.delete': 'Eliminar reto',
  'challenge.assign': 'Asignar reto a clientes',
  'achievement.create': 'Crear logro',
  'achievement.update': 'Modificar logro',
  'achievement.grant': 'Otorgar logro',
  'achievement.revoke': 'Revocar logro',
  'achievement.recompute': 'Recalcular logros',
  'notification.send': 'Enviar notificación',
}

export const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  training: 'Entrenamiento',
  diet: 'Dieta',
  exercise: 'Ejercicio',
  ingredient: 'Ingrediente',
  meal: 'Comida',
  challenge: 'Reto',
  achievement: 'Logro',
  notification: 'Notificación',
}

export function getApprovalActorName(actor: ApprovalActor) {
  const firstName = actor.profile?.first_name?.trim()
  const lastName = actor.profile?.last_name?.trim()
  const fullName = [firstName, lastName].filter(Boolean).join(' ')
  return fullName || actor.email
}

export function getApprovalActorInitials(actor: ApprovalActor) {
  const firstName = actor.profile?.first_name?.[0] ?? ''
  const lastName = actor.profile?.last_name?.[0] ?? ''
  const initials = `${firstName}${lastName}`.trim().toUpperCase()
  return initials || actor.email.slice(0, 2).toUpperCase()
}

export function getApprovalActionLabel(actionType: string) {
  return ACTION_TYPE_LABELS[actionType] ?? actionType
}

export function getApprovalResourceLabel(resourceType: ResourceType) {
  return RESOURCE_TYPE_LABELS[resourceType] ?? resourceType
}

export function getApprovalResourceName(request: ApprovalRequestLike) {
  const explicitName =
    'resource_name' in request && typeof request.resource_name === 'string'
      ? request.resource_name.trim()
      : ''

  if (explicitName) {
    return explicitName
  }

  const currentResource = 'current_resource' in request ? request.current_resource ?? undefined : undefined
  const payload = 'payload' in request ? request.payload ?? {} : {}

  const currentName =
    (typeof currentResource?.name === 'string' && currentResource.name) ||
    (typeof currentResource?.title === 'string' && currentResource.title)
  if (currentName) {
    return currentName
  }

  const payloadName =
    (typeof payload.name === 'string' && payload.name) ||
    (typeof payload.title === 'string' && payload.title)
  if (payloadName) {
    return payloadName
  }

  if (request.resource_type === 'notification' && typeof payload.title === 'string') {
    return payload.title
  }

  if (typeof payload.user_id === 'string') {
    return payload.user_id
  }

  return request.resource_id ?? 'Sin recurso asociado'
}

export function getRelativeApprovalDate(value: string) {
  return formatDistanceToNow(new Date(value), { addSuffix: true, locale: es })
}

export function getApprovalOutcomeReason(request: ApprovalRequestLike) {
  return request.rejection_reason ?? request.failure_reason ?? null
}

export function buildApprovalBusinessSummary(request: ApprovalRequestLike) {
  const resourceLabel = getApprovalResourceLabel(request.resource_type).toLowerCase()
  const resourceName = getApprovalResourceName(request)

  if (request.action_type.endsWith('.create')) {
    return `Se solicita crear ${resourceLabel} "${resourceName}".`
  }

  if (request.action_type.endsWith('.update')) {
    return `Se solicita actualizar ${resourceLabel} "${resourceName}".`
  }

  if (request.action_type.endsWith('.delete')) {
    return `Se solicita eliminar ${resourceLabel} "${resourceName}".`
  }

  return `Se solicita ejecutar ${getApprovalActionLabel(request.action_type).toLowerCase()} sobre "${resourceName}".`
}

export function buildAdminApprovalDetailView(request: ApprovalRequestLike): AdminApprovalDetailView {
  const facts: ApprovalDetailFact[] = [
    { label: 'Accion', value: getApprovalActionLabel(request.action_type) },
    { label: 'Recurso', value: getApprovalResourceName(request) },
    { label: 'Tipo', value: getApprovalResourceLabel(request.resource_type) },
    { label: 'Solicitante', value: getApprovalActorName(request.requester) },
    { label: 'Creada', value: getRelativeApprovalDate(request.created_at) },
  ]

  if (request.resolved_at) {
    facts.push({ label: 'Resuelta', value: getRelativeApprovalDate(request.resolved_at) })
  }

  if (request.reviewer) {
    facts.push({ label: 'Revisada por', value: getApprovalActorName(request.reviewer) })
  }

  return {
    summary: buildApprovalBusinessSummary(request),
    facts,
    requestReason: request.request_reason,
    outcomeReason: getApprovalOutcomeReason(request),
  }
}

export function buildSuperAdminApprovalDetailView(
  request: SuperAdminApprovalRequestDetail,
): SuperAdminApprovalDetailView {
  const baseView = buildAdminApprovalDetailView(request)

  return {
    ...baseView,
    rawPayload: JSON.stringify(request.payload, null, 2),
  }
}

export function getApprovalStatusFilterOptions(): ApprovalStatusFilter[] {
  return ['PENDING', 'APPROVED', 'REJECTED', 'FAILED', 'ALL']
}

export function buildResourceApprovalMap(items: ResourceApprovalSummary[]) {
  return Object.fromEntries(items.map((item) => [item.resource_id, item])) as Record<string, ResourceApprovalSummary>
}
