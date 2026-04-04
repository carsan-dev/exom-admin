import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { type ApiEnvelope, shouldRetryQuery, unwrapResponse } from '@/lib/api-utils'
import type { DashboardData } from './types'

export const dashboardQueryKey = ['dashboard'] as const

export function useDashboard() {
  return useQuery({
    queryKey: dashboardQueryKey,
    retry: shouldRetryQuery,
    staleTime: 60_000,
    refetchInterval: 60_000,
    queryFn: async () => {
      const response = await api.get<ApiEnvelope<DashboardData>>('/dashboard')
      return unwrapResponse(response)
    },
  })
}
