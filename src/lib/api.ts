import axios, { CanceledError } from 'axios'
import type { User } from 'firebase/auth'
import { toast } from 'sonner'
import { auth, getIdToken } from './firebase'
import { ApprovalPendingError } from './api-utils'
import { redirectToLogin } from './login-redirect'

declare module 'axios' {
  interface AxiosRequestConfig {
    /**
     * Client-only flag (never sent to the server): skip the «solicitud enviada» toast for an
     * approval receipt (202 with `approval_request_id`). The request still rejects with
     * `ApprovalPendingError`. Used by bulk actions that summarise approvals themselves.
     */
    suppressApprovalToast?: boolean
    /**
     * Client-only flag (never sent to the server): a 401 of this request may postpone the
     * redirect to /login while a `holdLoginRedirect()` hold is active (bulk deletions, so the
     * result can be shown first). Without an active hold it redirects at once, as usual.
     */
    deferLoginRedirect?: boolean
  }
}

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

const requestSessions = new WeakMap<object, User | null>()
const isStaleSession = (config: object | undefined) =>
  config !== undefined && requestSessions.has(config) && requestSessions.get(config) !== auth.currentUser

// Request interceptor — inject Firebase JWT
api.interceptors.request.use(async (config) => {
  if (AUTH_ROUTES_WITHOUT_REDIRECT.has(config.url ?? '')) return config
  const session = auth.currentUser
  requestSessions.set(config, session)
  const token = await getIdToken()
  if (session !== auth.currentUser) throw new CanceledError('Authentication session changed')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor — handle auth errors
api.interceptors.response.use(
  (response) => {
    if (isStaleSession(response.config)) return Promise.reject(new CanceledError('Authentication session changed'))
    if (response.status === 202) {
      const approvalData = response.data?.data ?? response.data
      // Deletion also returns 202; approval receipts have their own identifier.
      if (typeof approvalData?.approval_request_id !== 'string') return response
      if (!response.config.suppressApprovalToast) {
        toast.info(approvalData?.message ?? 'Solicitud enviada para aprobación')
      }

      // Approval requests are a transitional UI state, not a hard failure.
      return Promise.reject(new ApprovalPendingError(approvalData))
    }

    return response
  },
  (error) => {
    if (isStaleSession(error.config)) return Promise.reject(new CanceledError('Authentication session changed'))
    const requestUrl = error.config?.url as string | undefined
    const shouldSkipRedirect = requestUrl
      ? AUTH_ROUTES_WITHOUT_REDIRECT.has(requestUrl)
      : false

    if (error.response?.status === 401 && !shouldSkipRedirect) {
      redirectToLogin({ deferrable: error.config?.deferLoginRedirect === true })
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
