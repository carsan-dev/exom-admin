import axios from 'axios'
import { getApiErrorMessage, getApiErrorStatus, isApprovalPendingError } from './api-utils'

export interface BulkDeleteItem {
  id: string
  name: string
}

export type BulkDeleteOutcome = 'deleted' | 'pending_approval' | 'failed' | 'not_attempted'

export type BulkDeleteItemResult =
  | (BulkDeleteItem & { outcome: 'deleted' | 'pending_approval' | 'not_attempted' })
  | (BulkDeleteItem & { outcome: 'failed'; message: string; status: number | undefined })

export interface BulkDeleteProgress {
  /** 1-based position of the item whose request is starting. */
  current: number
  total: number
}

export interface BulkDeleteSummary {
  /** One result per item, in the order received. */
  results: BulkDeleteItemResult[]
  counts: Record<BulkDeleteOutcome, number>
  /** Every item was deleted (no approvals, failures or skipped items). */
  allDeleted: boolean
  /**
   * The batch stopped early: the session is no longer usable (401, blocked account, session
   * changed) or the server cannot take more requests now (no response, 429).
   */
  stopped: boolean
}

export interface RunBulkDeleteOptions {
  items: ReadonlyArray<BulkDeleteItem>
  /** Deletes a single item. Rejections are classified, never rethrown. */
  deleteOne: (id: string) => Promise<unknown>
  onProgress?: (progress: BulkDeleteProgress) => void
  /** Message used when the error carries no usable text. */
  fallbackErrorMessage?: string
  /**
   * Checked before every request. Returning `false` stops the batch without sending that
   * request: it and the remaining items are `not_attempted`. Used to pin the session.
   */
  shouldContinue?: () => boolean
}

const ACCOUNT_BLOCKED_STATUS = 423
const TOO_MANY_REQUESTS_STATUS = 429

const NO_RESPONSE_MESSAGE = 'Sin conexión con el servidor. Inténtalo de nuevo.'
const TOO_MANY_REQUESTS_MESSAGE = 'Demasiadas peticiones. Espera un momento e inténtalo de nuevo.'
const SESSION_CHANGED_MESSAGE = 'La sesión ha cambiado. Vuelve a iniciar sesión e inténtalo de nuevo.'

interface ClassifiedFailure {
  message: string
  status: number | undefined
  /** The remaining items must not be attempted. */
  stop: boolean
}

function isAccountBlocked(error: unknown, status: number | undefined) {
  return status === ACCOUNT_BLOCKED_STATUS || (error instanceof Error && error.name === 'ACCOUNT_BLOCKED')
}

function getServerMessage(error: unknown) {
  if (!axios.isAxiosError<{ message?: string | string[] }>(error)) return undefined
  const message = error.response?.data?.message
  if (Array.isArray(message) && message.length > 0) return message.join(', ')
  if (typeof message === 'string' && message.trim()) return message
  return undefined
}

function classifyFailure(error: unknown, fallbackErrorMessage: string): ClassifiedFailure {
  // The interceptor cancels requests whose Firebase session changed mid-flight.
  if (axios.isCancel(error)) return { message: SESSION_CHANGED_MESSAGE, status: undefined, stop: true }

  const rawStatus = getApiErrorStatus(error)
  if (axios.isAxiosError(error) && error.response === undefined) {
    // Network error or timeout: further requests would most likely hang the same way.
    return { message: NO_RESPONSE_MESSAGE, status: undefined, stop: true }
  }
  if (rawStatus === TOO_MANY_REQUESTS_STATUS) {
    return {
      message: getServerMessage(error) ?? TOO_MANY_REQUESTS_MESSAGE,
      status: rawStatus,
      stop: true,
    }
  }

  const blocked = isAccountBlocked(error, rawStatus)
  const status = blocked ? ACCOUNT_BLOCKED_STATUS : rawStatus
  const message = blocked && rawStatus === undefined
    ? 'Cuenta bloqueada'
    : getApiErrorMessage(error, fallbackErrorMessage)
  return { message, status, stop: blocked || status === 401 }
}

/**
 * Deletes items one by one, in order, and returns a per-item summary. Approval receipts
 * (`ApprovalPendingError`) count as `pending_approval`. A failing `shouldContinue`, a 401, a
 * blocked account, a session cancellation, a request without server response (network/timeout)
 * or a 429 stops the batch: the remaining items are `not_attempted`. Any other failure
 * (403/404/409/5xx…) is recorded and the batch continues. It never retries and never throws.
 */
export async function runBulkDelete({
  items,
  deleteOne,
  onProgress,
  fallbackErrorMessage = 'No se ha podido eliminar',
  shouldContinue,
}: RunBulkDeleteOptions): Promise<BulkDeleteSummary> {
  const results: BulkDeleteItemResult[] = []
  let stopped = false

  for (const [index, item] of items.entries()) {
    const base = { id: item.id, name: item.name }

    if (!stopped && shouldContinue && !shouldContinue()) stopped = true
    if (stopped) {
      results.push({ ...base, outcome: 'not_attempted' })
      continue
    }

    onProgress?.({ current: index + 1, total: items.length })

    try {
      await deleteOne(item.id)
      results.push({ ...base, outcome: 'deleted' })
    } catch (error) {
      if (isApprovalPendingError(error)) {
        results.push({ ...base, outcome: 'pending_approval' })
      } else {
        const { message, status, stop } = classifyFailure(error, fallbackErrorMessage)
        results.push({ ...base, outcome: 'failed', message, status })
        stopped = stop
      }
    }
  }

  const counts: Record<BulkDeleteOutcome, number> = {
    deleted: 0,
    pending_approval: 0,
    failed: 0,
    not_attempted: 0,
  }
  for (const result of results) counts[result.outcome] += 1

  return {
    results,
    counts,
    allDeleted: counts.deleted === items.length,
    stopped,
  }
}
