import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { type ApiEnvelope, unwrapResponse, shouldRetryQuery } from '@/lib/api-utils'

export interface ClientDeletion {
  id: string
  client_id: string
  status: 'PENDING' | 'PROCESSING' | 'BLOCKED' | 'COMPLETED'
  last_error: string | null
  created_at: string
  completed_at: string | null
}

export function useDeleteClient() {
  const queryClient = useQueryClient()
  return useMutation({
    retry: false,
    mutationFn: async (clientId: string) => {
      const response = await api.delete<ApiEnvelope<ClientDeletion>>(`/admin/clients/${clientId}`, { data: { confirmation: 'ELIMINAR' } })
      return unwrapResponse(response)
    },
    onSettled: async (_result, _error, clientId) => {
      // A timeout may follow a committed deletion. Cancel old responses before
      // invalidation so profile/assignment caches cannot repopulate stale data.
      await queryClient.cancelQueries()
      queryClient.removeQueries({ predicate: (query) => query.queryKey.includes(clientId) })
      await queryClient.invalidateQueries()
    },
  })
}

export function useClientDeletions() {
  return useQuery({
    queryKey: ['client-deletions'],
    retry: shouldRetryQuery,
    refetchInterval: 15000,
    queryFn: async () => {
      const response = await api.get<ApiEnvelope<ClientDeletion[]>>('/admin/client-deletions')
      return unwrapResponse(response)
    },
  })
}
