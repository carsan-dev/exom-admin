import axios from 'axios'
import { toast } from 'sonner'
import { getIdToken } from './firebase'
import { ApprovalPendingError } from './api-utils'

const AUTH_ROUTES_WITHOUT_REDIRECT = new Set([
  '/auth/login',
  '/auth/social',
  '/auth/forgot-password',
])

export const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL ?? 'http://localhost:3000') + '/api/v1',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor — inject Firebase JWT
api.interceptors.request.use(async (config) => {
  const token = await getIdToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor — handle auth errors
api.interceptors.response.use(
  (response) => {
    if (response.status === 202) {
      const approvalData = response.data?.data ?? response.data
      toast.info(approvalData?.message ?? 'Solicitud enviada para aprobación')

      // Approval requests are a transitional UI state, not a hard failure.
      return Promise.reject(new ApprovalPendingError(approvalData))
    }

    return response
  },
  (error) => {
    const requestUrl = error.config?.url as string | undefined
    const shouldSkipRedirect = requestUrl
      ? AUTH_ROUTES_WITHOUT_REDIRECT.has(requestUrl)
      : false

    if (error.response?.status === 401 && !shouldSkipRedirect && window.location.pathname !== '/login') {
      window.location.href = '/login'
    }
    if (error.response?.status === 423) {
      // Account blocked — propagate special error code
      const err = new Error('ACCOUNT_BLOCKED')
      err.name = 'ACCOUNT_BLOCKED'
      return Promise.reject(err)
    }
    return Promise.reject(error)
  }
)
