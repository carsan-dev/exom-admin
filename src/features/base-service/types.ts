export type DeliveryStatus = 'PENDING' | 'SENT' | 'FAILED'

export type ArchiveFilter = 'visible' | 'archived' | 'all'

export interface BaseRoute {
  objetivo: string
  dias: number[]
  months: number[]
  monthsByDias: { dias: number; months: number[] }[]
}

export interface LatestDelivery {
  id: string
  month: number
  status: DeliveryStatus
  send_seq: number
}

export interface BaseSubscriber {
  id: string
  order_code: string
  name: string
  email: string
  goal: string
  days_per_week: number
  notes: string | null
  is_archived: boolean
  archived_at: string | null
  created_by_id: string | null
  created_at: string
  updated_at: string
  last_sent_month: number | null
  next_month: number
  latest_delivery: LatestDelivery | null
}

export interface PaginatedSubscribers {
  data: BaseSubscriber[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface BaseDeliveryFile {
  filename: string
  source_key: string
  source_sha256: string
  sha256: string
  size: number
}

export interface BaseDeliverySend {
  send_seq: number
  status: DeliveryStatus
  requested_by_id: string | null
  requested_at: string | null
  sent_at: string | null
  provider_message_id: string | null
  error: string | null
  attempts: number
  snapshot_name: string | null
  snapshot_email: string | null
  possibly_delivered: boolean
}

export interface BaseDelivery {
  id: string
  subscriber_id: string
  month: number
  status: DeliveryStatus
  send_seq: number
  snapshot_name: string
  snapshot_email: string
  snapshot_goal: string
  snapshot_days_per_week: number
  snapshot_order_code: string
  files: BaseDeliveryFile[]
  requested_by_id: string | null
  requested_at: string
  sent_at: string | null
  provider_message_id: string | null
  last_error: string | null
  possibly_delivered: boolean
  created_at: string
  updated_at: string
  sends: BaseDeliverySend[]
}

export interface SubscriberListParams {
  q: string
  archive: ArchiveFilter
  page: number
  limit: number
}

export interface CreateSubscriberPayload {
  name: string
  email: string
  goal: string
  days_per_week: number
  notes?: string | null
}

export type UpdateSubscriberPayload = Partial<CreateSubscriberPayload>
