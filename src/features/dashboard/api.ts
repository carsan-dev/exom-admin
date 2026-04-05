import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { type ApiEnvelope, shouldRetryQuery, unwrapResponse } from '@/lib/api-utils'
import type { DashboardData } from './types'

export const dashboardQueryKey = ['dashboard'] as const
const DASHBOARD_REFETCH_INTERVAL = 30_000

export function useDashboard() {
  return useQuery({
    queryKey: dashboardQueryKey,
    retry: shouldRetryQuery,
    staleTime: DASHBOARD_REFETCH_INTERVAL,
    refetchInterval: DASHBOARD_REFETCH_INTERVAL,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const response = await api.get<ApiEnvelope<DashboardData>>('/dashboard')
      return unwrapResponse(response)
    },
  })
}
