import axios, { type AxiosResponse } from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { CreateClientFormValues } from './schemas'
import type { AdminUserListItem, Client, ClientDetail, PaginatedResponse, Role } from './types'

interface ApiEnvelope<T> {
  success: boolean
  data: T
  timestamp: string
}

interface ApiErrorResponse {
  statusCode?: number
  message?: string | string[]
  error?: string
  timestamp?: string
  path?: string
}

interface MutationMessage {
  message: string
}

interface UpdateRolePayload {
  userId: string
  role: Role
}

const clientsQueryKeys = {
  all: ['clients'] as const,
  list: (page: number, limit: number) => ['clients', page, limit] as const,
  detail: (id?: string) => ['clients', id] as const,
}

const usersQueryKeys = {
  all: ['users'] as const,
  list: (role: Role | undefined, page: number, limit: number) => ['users', role, page, limit] as const,
}

function unwrapResponse<T>(response: AxiosResponse<ApiEnvelope<T>>) {
  return response.data.data
}

function normalizeCreateClientPayload(payload: CreateClientFormValues) {
  return {
    email: payload.email.trim(),
    password: payload.password,
    first_name: payload.first_name.trim(),
    last_name: payload.last_name.trim(),
    level: payload.level,
    main_goal: payload.main_goal?.trim() || undefined,
  }
}

export function getApiErrorMessage(error: unknown, fallback = 'Ha ocurrido un error') {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    const message = error.response?.data?.message

    if (Array.isArray(message) && message.length > 0) {
      return message.join(', ')
    }

    if (typeof message === 'string' && message.trim()) {
      return message
    }
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return fallback
}

export function getApiErrorStatus(error: unknown) {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    return error.response?.status
  }

  return undefined
}

function shouldRetryQuery(failureCount: number, error: unknown) {
  const status = getApiErrorStatus(error)

  if (status === 400 || status === 403 || status === 404) {
    return false
  }

  return failureCount < 2
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

export function useAllUsers(role?: Role, page = 1, limit = 20) {
  return useQuery({
    queryKey: usersQueryKeys.list(role, page, limit),
    retry: shouldRetryQuery,
    queryFn: async () => {
      const response = await api.get<ApiEnvelope<PaginatedResponse<AdminUserListItem>>>('/admin/users', {
        params: { role, page, limit },
      })

      return unwrapResponse(response)
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
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: clientsQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: usersQueryKeys.all }),
      ])
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
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: clientsQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: usersQueryKeys.all }),
      ])
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
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: clientsQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: usersQueryKeys.all }),
      ])
    },
  })
}
