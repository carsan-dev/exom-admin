export interface FeedbackItem {
  id: string
  client_id: string
  exercise_id: string | null
  media_type: 'VIDEO' | 'IMAGE'
  media_url: string
  notes: string | null
  admin_response: string | null
  status: 'PENDING' | 'REVIEWED'
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
  client: {
    id: string
    email: string
    profile: { first_name: string; last_name: string } | null
  }
  exercise: { id: string; name: string } | null
}

export interface FeedbackStats {
  total: number
  pending: number
  reviewed: number
}

export type FeedbackStatusFilter = 'ALL' | 'PENDING' | 'REVIEWED'

export interface PaginatedFeedback {
  data: FeedbackItem[]
  total: number
  page: number
  limit: number
  totalPages: number
}
