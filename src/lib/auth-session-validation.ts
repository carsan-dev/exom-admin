import axios from 'axios'

export type SessionValidationFailure = 'rejected' | 'locked' | 'temporary'

export function classifySessionValidationError(error: unknown): SessionValidationFailure {
  if (typeof error === 'object' && error !== null && 'name' in error) {
    if ((error as { name?: unknown }).name === 'ACCOUNT_BLOCKED') {
      return 'locked'
    }
  }

  if (!axios.isAxiosError(error)) {
    return 'temporary'
  }

  if (error.response?.status === 401 || error.response?.status === 403) {
    return 'rejected'
  }
  if (error.response?.status === 423) {
    return 'locked'
  }
  return 'temporary'
}
