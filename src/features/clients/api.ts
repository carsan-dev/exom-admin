import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { invalidateAdminQueries } from '@/lib/admin-query-invalidations'
import { type ApiEnvelope, getApiErrorMessage, getApiErrorStatus, shouldRetryQuery, unwrapResponse } from '@/lib/api-utils'
import type {
  CreateAdminFormValues,
  CreateClientFormValues,
  UpdateClientProfileFormValues,
  UpdateUserFormValues,
} from './schemas'
import type {
  AdminUserListItem,
  Client,
  ClientAssignmentsResponse,
  ClientDetail,
  PaginatedResponse,
  Role,
  UpdateClientAssignmentsValues,
} from './types'

export { getApiErrorMessage, getApiErrorStatus }

interface MutationMessage {
  message: string
}

interface UpdateRolePayload {
  userId: string
  role: Role
}

interface UpdateUserPayload {
  userId: string
  values: UpdateUserFormValues
}

interface UpdateUserStatusPayload {
  userId: string
  is_active: boolean
}

export const clientsQueryKeys = {
  all: ['clients'] as const,
  list: (page: number, limit: number) => ['clients', page, limit] as const,
  detail: (id?: string) => ['clients', id] as const,
}

const clientAssignmentsQueryKeys = {
  all: ['client-assignments'] as const,
  detail: (clientId?: string) => ['client-assignments', clientId] as const,
}

const usersQueryKeys = {
  all: ['users'] as const,
  list: (role: Role | undefined, page: number, limit: number) => ['users', role, page, limit] as const,
  admins: ['users', 'ADMIN', 'all'] as const,
}

const ALL_ADMINS_PAGE_SIZE = 100

function normalizeCreateClientPayload(payload: CreateClientFormValues) {
  return {
    email: payload.email.trim(),
    password: payload.password,
    first_name: payload.first_name.trim(),
    last_name: payload.last_name.trim(),
    level: payload.level,
    main_goal: payload.main_goal?.trim() || null,
  }
}

function normalizeCreateAdminPayload(payload: CreateAdminFormValues) {
  return {
    email: payload.email.trim(),
    password: payload.password,
    first_name: payload.first_name.trim(),
    last_name: payload.last_name.trim(),
  }
}

function normalizeUpdateUserPayload(payload: UpdateUserFormValues) {
  return {
    email: payload.email.trim(),
    first_name: payload.first_name.trim(),
    last_name: payload.last_name.trim(),
  }
}

export function useClients(page: number, limit: number) {
  return useQuery({
    queryKey: clientsQueryKeys.list(page, limit),
    retry: shouldRetryQuery,
    queryFn: async () => {
      const response = await api.get<ApiEnvelope<PaginatedResponse<Client>>>('/admin/clients', {
        params: { page, limit },
      })

      return unwrapResponse(response)
    },
  })
}

export function useClientProfile(id?: string) {
  return useQuery({
    queryKey: clientsQueryKeys.detail(id),
    enabled: Boolean(id),
    retry: shouldRetryQuery,
    queryFn: async () => {
      if (!id) {
        throw new Error('Client id is required')
      }

      const response = await api.get<ApiEnvelope<ClientDetail>>(`/admin/clients/${id}`)
      return unwrapResponse(response)
    },
  })
}

export function useClientAssignments(clientId?: string, enabled = true) {
  return useQuery({
    queryKey: clientAssignmentsQueryKeys.detail(clientId),
    enabled: enabled && Boolean(clientId),
    retry: shouldRetryQuery,
    queryFn: async () => {
      if (!clientId) {
        throw new Error('Client id is required')
      }

      const response = await api.get<ApiEnvelope<ClientAssignmentsResponse>>(`/admin/clients/${clientId}/assignments`)
      return unwrapResponse(response)
    },
  })
}

export function useAllUsers(role?: Role, page = 1, limit = 20, enabled = true) {
  return useQuery({
    queryKey: usersQueryKeys.list(role, page, limit),
    enabled,
    retry: shouldRetryQuery,
    queryFn: async () => {
      const response = await api.get<ApiEnvelope<PaginatedResponse<AdminUserListItem>>>('/admin/users', {
        params: { role, page, limit },
      })

      return unwrapResponse(response)
    },
  })
}

export function useAllAdminsList(enabled = true) {
  return useQuery({
    queryKey: usersQueryKeys.admins,
    enabled,
    retry: shouldRetryQuery,
    queryFn: async () => {
      const admins: AdminUserListItem[] = []
      let currentPage = 1
      let totalPages = 1

      while (currentPage <= totalPages) {
        const response = await api.get<ApiEnvelope<PaginatedResponse<AdminUserListItem>>>('/admin/users', {
          params: {
            role: 'ADMIN',
            page: currentPage,
            limit: ALL_ADMINS_PAGE_SIZE,
          },
        })

        const page = unwrapResponse(response)
        admins.push(...page.data)
        totalPages = Math.max(page.totalPages, 1)
        currentPage += 1
      }

      return admins
    },
  })
}

export function useCreateClient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: CreateClientFormValues) => {
      const response = await api.post<ApiEnvelope<Client>>('/admin/users', normalizeCreateClientPayload(payload))
      return unwrapResponse(response)
    },
    onSuccess: async () => {
      await invalidateAdminQueries(queryClient, {
        includeDashboard: true,
        extraQueryKeys: [clientsQueryKeys.all, usersQueryKeys.all],
      })
    },
  })
}

export function useCreateAdmin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: CreateAdminFormValues) => {
      const response = await api.post<ApiEnvelope<AdminUserListItem>>(
        '/admin/users/admins',
        normalizeCreateAdminPayload(payload),
      )

      return unwrapResponse(response)
    },
    onSuccess: async () => {
      await invalidateAdminQueries(queryClient, {
        extraQueryKeys: [usersQueryKeys.all],
      })
    },
  })
}

export function useUnlockUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (userId: string) => {
      const response = await api.put<ApiEnvelope<MutationMessage>>(`/admin/users/${userId}/unlock`)
      return unwrapResponse(response)
    },
    onSuccess: async () => {
      await invalidateAdminQueries(queryClient, {
        includeDashboard: true,
        extraQueryKeys: [clientsQueryKeys.all, usersQueryKeys.all, clientAssignmentsQueryKeys.all],
      })
    },
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, values }: UpdateUserPayload) => {
      const response = await api.put<ApiEnvelope<AdminUserListItem>>(
        `/admin/users/${userId}`,
        normalizeUpdateUserPayload(values),
      )

      return unwrapResponse(response)
    },
    onSuccess: async (_data, { userId }) => {
      await invalidateAdminQueries(queryClient, {
        includeDashboard: true,
        extraQueryKeys: [clientsQueryKeys.all, clientsQueryKeys.detail(userId), usersQueryKeys.all],
      })
    },
  })
}

export function useUpdateUserStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, is_active }: UpdateUserStatusPayload) => {
      const response = await api.put<ApiEnvelope<MutationMessage>>(`/admin/users/${userId}/status`, {
        is_active,
      })

      return unwrapResponse(response)
    },
    onSuccess: async (_data, { userId }) => {
      await invalidateAdminQueries(queryClient, {
        includeDashboard: true,
        extraQueryKeys: [
          clientsQueryKeys.all,
          clientsQueryKeys.detail(userId),
          usersQueryKeys.all,
          clientAssignmentsQueryKeys.all,
        ],
      })
    },
  })
}

export function useUpdateRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, role }: UpdateRolePayload) => {
      const response = await api.put<ApiEnvelope<MutationMessage>>(`/admin/users/${userId}/role`, {
        role,
      })

      return unwrapResponse(response)
    },
    onSuccess: async () => {
      await invalidateAdminQueries(queryClient, {
        includeDashboard: true,
        extraQueryKeys: [clientsQueryKeys.all, usersQueryKeys.all, clientAssignmentsQueryKeys.all],
      })
    },
  })
}

export function useUpdateClientProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ clientId, values }: { clientId: string; values: UpdateClientProfileFormValues }) => {
      const payload = {
        main_goal: values.main_goal?.trim() ? values.main_goal.trim() : null,
      }
      const response = await api.patch<ApiEnvelope<ClientDetail>>(`/admin/clients/${clientId}/profile`, payload)
      return unwrapResponse(response)
    },
    onSuccess: async (_data, { clientId }) => {
      await invalidateAdminQueries(queryClient, {
        includeDashboard: true,
        extraQueryKeys: [clientsQueryKeys.all, clientsQueryKeys.detail(clientId)],
      })
    },
  })
}

export function useUpdateClientAssignments() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ clientId, values }: { clientId: string; values: UpdateClientAssignmentsValues }) => {
      const response = await api.put<ApiEnvelope<ClientAssignmentsResponse>>(
        `/admin/clients/${clientId}/assignments`,
        values,
      )

      return unwrapResponse(response)
    },
    onSuccess: async (_data, { clientId }) => {
      await invalidateAdminQueries(queryClient, {
        includeDashboard: true,
        extraQueryKeys: [clientsQueryKeys.all, clientsQueryKeys.detail(clientId), clientAssignmentsQueryKeys.all],
      })
    },
  })
}
