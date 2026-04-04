export type NotificationStatus = 'SENT' | 'FAILED'
export type NotificationStatusFilter = 'ALL' | NotificationStatus

export const NOTIFICATION_ROUTE_VALUES = [
  'home',
  'recap',
  'training',
  'diet',
  'challenge',
  'calendar',
  'profile',
] as const

export type NotificationRouteType = (typeof NOTIFICATION_ROUTE_VALUES)[number]

export const NOTIFICATION_ROUTE_OPTIONS: ReadonlyArray<{
  value: NotificationRouteType
  label: string
}> = [
  { value: 'home', label: 'Inicio' },
  { value: 'recap', label: 'Recap' },
  { value: 'training', label: 'Entrenamiento' },
  { value: 'diet', label: 'Dieta' },
  { value: 'challenge', label: 'Reto' },
  { value: 'calendar', label: 'Calendario' },
  { value: 'profile', label: 'Perfil' },
]

export interface NotificationRecipientProfile {
  first_name: string | null
  last_name: string | null
  avatar_url?: string | null
}

export interface NotificationRecipient {
  email: string
  profile: NotificationRecipientProfile | null
}

export interface NotificationItem {
  id: string
  sender_id: string
  recipient_id: string
  title: string
  body: string
  data: Record<string, string> | null
  status: NotificationStatus
  error: string | null
  read_at: string | null
  created_at: string
  recipient: NotificationRecipient
}

export interface NotificationStats {
  total: number
  today: number
  failed: number
}

export interface PaginatedNotifications {
  data: NotificationItem[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface NotificationSendSummary {
  success: boolean
  sent: number
  failed: number
}

export type SendNotificationResponse = NotificationItem | NotificationSendSummary

export interface SendNotificationPayload {
  user_id?: string
  user_ids?: string[]
  title: string
  body: string
  data?: Record<string, string>
}

export interface SendToAllClientsPayload {
  title: string
  body: string
  data?: Record<string, string>
}

type UserWithName = {
  email: string
  profile: NotificationRecipientProfile | null
}

export function getNotificationRecipientName(user: UserWithName) {
  const firstName = user.profile?.first_name?.trim()
  const lastName = user.profile?.last_name?.trim()
  const fullName = [firstName, lastName].filter(Boolean).join(' ')

  return fullName || user.email
}

export function isNotificationSendSummary(
  value: SendNotificationResponse,
): value is NotificationSendSummary {
  return 'sent' in value && 'failed' in value
}
