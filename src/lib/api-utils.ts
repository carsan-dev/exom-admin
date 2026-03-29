import axios, { type AxiosResponse } from 'axios'

export interface ApiEnvelope<T> {
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

export function unwrapResponse<T>(response: AxiosResponse<ApiEnvelope<T>>) {
  return response.data.data
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

export function shouldRetryQuery(failureCount: number, error: unknown) {
  const status = getApiErrorStatus(error)

  if (status === 400 || status === 403 || status === 404) {
    return false
  }

  return failureCount < 2
}
