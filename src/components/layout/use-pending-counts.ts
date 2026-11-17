import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { type ApiEnvelope, shouldRetryQuery, unwrapResponse } from '@/lib/api-utils'
import { dashboardQueryKey } from '@/features/dashboard/api'
import type { DashboardData } from '@/features/dashboard/types'

/** Refresco de los contadores fuera del Dashboard (decisión D10). */
export const PENDING_COUNTS_REFETCH_INTERVAL = 120_000

export interface PendingCounts {
  feedback: number | null
  recaps: number | null
}

function toCount(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null
}

// Replica la consulta de useDashboard (misma clave dashboardQueryKey): api.ts no exporta la queryFn y no se edita en esta fase; si cambia aquella, cambiar esta.
/**
 * Pendientes de Feedback y Recaps para la navegación. Comparte la entrada de caché del
 * Dashboard (misma clave y mismo endpoint); en esa página manda su observador de 30 s.
 */
export function usePendingCounts(): PendingCounts {
  const query = useQuery({
    queryKey: dashboardQueryKey,
    retry: shouldRetryQuery,
    staleTime: PENDING_COUNTS_REFETCH_INTERVAL,
    refetchInterval: PENDING_COUNTS_REFETCH_INTERVAL,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const response = await api.get<ApiEnvelope<DashboardData>>('/dashboard')
      return unwrapResponse(response)
    },
  })

  if (query.isError) return { feedback: null, recaps: null }
  const stats = query.data?.stats
  return { feedback: toCount(stats?.pendingFeedback), recaps: toCount(stats?.pendingRecaps) }
}
