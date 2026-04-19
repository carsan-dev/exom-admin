export interface NotificationTemplateDeliveryInfo {
  type: 'event' | 'schedule' | 'manual'
  label: string
  description: string
  timezone?: string
  cron?: string
  times?: string[]
}

export interface NotificationTemplate {
  key: string
  name: string
  description: string
  category: string
  title: string
  body: string
  route: string | null
  enabled: boolean
  variables: string[]
  variable_help: Record<string, string>
  delivery_info: NotificationTemplateDeliveryInfo
  customized: boolean
  is_system: boolean
  updated_at: string | null
}

export interface CreateNotificationTemplatePayload {
  name: string
  description?: string
  category?: string
  title: string
  body: string
  route?: string | null
  enabled?: boolean
}

export interface UpdateNotificationTemplatePayload {
  name?: string
  description?: string | null
  category?: string
  title?: string
  body?: string
  route?: string | null
  enabled?: boolean
}

export interface DeletedNotificationTemplate {
  key: string
  deleted: true
}
