import { useSyncExternalStore } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/use-auth'
import { api } from '@/lib/api'
import { type ApiEnvelope, unwrapResponse } from '@/lib/api-utils'
import type { AdherenceConfig, AdherenceRange, AdherenceReport, UpdateAdherenceConfig } from './adherence.types'

// The auth store has no public session ID. Observe identity/validation boundaries
// without changing auth: same-account relogin must not reuse a former session cache.
let generation = 0
useAuth.subscribe((state, previous) => {
  if (state.user !== previous.user || state.isAuthenticated !== previous.isAuthenticated || state.isLoading !== previous.isLoading) generation++
})
const subscribe = (notify: () => void) => useAuth.subscribe(notify)
const snapshot = () => generation
export function useAdherenceIdentity() {
  const user = useAuth((state) => state.user)
  const authenticated = useAuth((state) => state.isAuthenticated)
  const loading = useAuth((state) => state.isLoading)
  const session = useSyncExternalStore(subscribe, snapshot, snapshot)
  const allowed = authenticated && !loading && !!user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN')
  return { owner: user?.id ?? '', role: user?.role ?? '', session, allowed }
}
export function isCivilDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const at = new Date(value + 'T00:00:00Z')
  return Number.isFinite(at.getTime()) && at.toISOString().slice(0, 10) === value
}
export function isAdherenceRange(range: AdherenceRange) {
  if (!isCivilDate(range.start) || !isCivilDate(range.end)) return false
  const days = (Date.parse(range.end) - Date.parse(range.start)) / 86_400_000 + 1
  return days >= 1 && days <= 31
}
export const adherenceKeys = {
  reports: (client: string) => ['client-adherence', client] as const,
  configs: (client: string) => ['client-adherence-config', client] as const,
}
export function useClientAdherence(client: string, range: AdherenceRange) {
  const identity = useAdherenceIdentity()
  return useQuery({
    queryKey: [...adherenceKeys.reports(client), identity.owner, identity.role, identity.session, range.start, range.end],
    enabled: identity.allowed && !!client && isAdherenceRange(range),
    retry: false,
    queryFn: async ({ signal }) => {
      if (!identity.allowed || !isAdherenceRange(range)) throw new Error('Invalid adherence request')
      const response = await api.get<ApiEnvelope<AdherenceReport>>(`/admin/clients/${client}/adherence`, { params: range, signal })
      const result = unwrapResponse(response)
      if (result.version !== 1) throw new Error('Unsupported adherence version')
      return result
    },
  })
}
export function useClientAdherenceConfig(client: string, date: string) {
  const identity = useAdherenceIdentity()
  return useQuery({
    queryKey: [...adherenceKeys.configs(client), identity.owner, identity.role, identity.session, date],
    enabled: identity.allowed && !!client && isCivilDate(date),
    retry: false,
    queryFn: async ({ signal }) => unwrapResponse(await api.get<ApiEnvelope<AdherenceConfig>>(
      `/admin/clients/${client}/adherence/config`, { params: { date }, signal },
    )),
  })
}
export function useUpdateClientAdherenceConfig(client: string) {
  const identity = useAdherenceIdentity()
  const queryClient = useQueryClient()
  return useMutation({
    retry: false,
    mutationFn: async (values: UpdateAdherenceConfig) => {
      if (!identity.allowed || snapshot() !== identity.session) throw new Error('Session changed')
      const result = unwrapResponse(await api.put<ApiEnvelope<AdherenceConfig>>(`/admin/clients/${client}/adherence/config`, values))
      if (snapshot() !== identity.session) throw new Error('Session changed')
      return result
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adherenceKeys.configs(client) }),
        queryClient.invalidateQueries({ queryKey: adherenceKeys.reports(client) }),
      ])
    },
  })
}
