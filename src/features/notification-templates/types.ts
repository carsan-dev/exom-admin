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
  customized: boolean
  updated_at: string | null
}

export interface UpdateNotificationTemplatePayload {
  title?: string
  body?: string
  route?: string | null
  enabled?: boolean
}
