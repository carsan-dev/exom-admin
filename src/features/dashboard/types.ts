export type DashboardActivityType =
  | 'recap_submitted'
  | 'feedback_sent'
  | 'progress_completed'
  | 'client_created'

export interface DashboardStats {
  activeClients: number
  totalClients: number
  pendingRecaps: number
  pendingFeedback: number
  lockedAccounts: number
}

export interface RecentActivityItem {
  id: string
  type: DashboardActivityType
  clientId: string
  clientName: string
  clientAvatar: string | null
  description: string
  createdAt: string
}

export interface TopClient {
  clientId: string
  clientName: string
  clientAvatar: string | null
  completedDays: number
  currentStreak: number
}

export interface DashboardData {
  stats: DashboardStats
  recentActivity: RecentActivityItem[]
  topClients: TopClient[]
}
