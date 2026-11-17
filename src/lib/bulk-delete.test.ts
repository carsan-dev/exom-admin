import { AxiosError, AxiosHeaders, CanceledError } from 'axios'
import { describe, expect, it, vi } from 'vitest'
import { ApprovalPendingError } from './api-utils'
import { runBulkDelete, type BulkDeleteProgress } from './bulk-delete'

function httpError(status: number, message?: string | string[]) {
  const config = { headers: new AxiosHeaders() }
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, undefined, {
    status,
    statusText: 'error',
    headers: {},
    config,
    data: message === undefined ? {} : { statusCode: status, message, error: 'Error' },
  })
}

function accountBlockedError() {
  const error = new Error('ACCOUNT_BLOCKED')
  error.name = 'ACCOUNT_BLOCKED'
  return error
}

const items = (count: number) =>
  Array.from({ length: count }, (_, index) => ({ id: `id-${index + 1}`, name: `Elemento ${index + 1}` }))

describe('runBulkDelete', () => {
  it('deletes in series, in the given order, and reports progress', async () => {
    const calls: string[] = []
    let active = 0
    let maxActive = 0
    const deleteOne = vi.fn(async (id: string) => {
      active += 1
      maxActive = Math.max(maxActive, active)
      calls.push(id)
      await new Promise((resolve) => setTimeout(resolve, 1))
      active -= 1
    })
    const progress: BulkDeleteProgress[] = []

    const summary = await runBulkDelete({
      items: items(3),
      deleteOne,
      onProgress: (value) => progress.push(value),
    })

    expect(calls).toEqual(['id-1', 'id-2', 'id-3'])
    expect(maxActive).toBe(1)
    expect(summary.results.map((result) => result.outcome)).toEqual(['deleted', 'deleted', 'deleted'])
    expect(summary.counts).toEqual({ deleted: 3, not_found: 0, pending_approval: 0, failed: 0, not_attempted: 0 })
    expect(summary.allDeleted).toBe(true)
    expect(progress).toEqual([
      { current: 1, total: 3 },
      { current: 2, total: 3 },
      { current: 3, total: 3 },
    ])
  })

  it('classifies approvals, already deleted items and server failures without stopping the batch', async () => {
    const outcomes: Record<string, unknown> = {
      'id-2': new ApprovalPendingError({ approval_request_id: 'req-2', message: 'Pendiente' }),
      'id-3': httpError(403, 'No tienes permiso'),
      'id-4': httpError(404, 'Dieta no encontrada'),
      'id-5': httpError(409, 'La dieta está en uso'),
      'id-6': httpError(400, ['id debe ser un UUID', 'otro motivo']),
      'id-7': httpError(503),
      'id-8': httpError(500, 'Error interno'),
    }
    const deleteOne = vi.fn(async (id: string) => {
      if (id in outcomes) throw outcomes[id]
    })

    const summary = await runBulkDelete({
      items: items(9),
      deleteOne,
      fallbackErrorMessage: 'No se ha podido eliminar',
    })

    expect(deleteOne).toHaveBeenCalledTimes(9)
    expect(summary.results).toEqual([
      { id: 'id-1', name: 'Elemento 1', outcome: 'deleted' },
      { id: 'id-2', name: 'Elemento 2', outcome: 'pending_approval' },
      { id: 'id-3', name: 'Elemento 3', outcome: 'failed', status: 403, message: 'No tienes permiso' },
      // The API answers 404 for items that are already archived or deleted: nothing left to delete.
      { id: 'id-4', name: 'Elemento 4', outcome: 'not_found' },
      { id: 'id-5', name: 'Elemento 5', outcome: 'failed', status: 409, message: 'La dieta está en uso' },
      {
        id: 'id-6',
        name: 'Elemento 6',
        outcome: 'failed',
        status: 400,
        message: 'id debe ser un UUID, otro motivo',
      },
      { id: 'id-7', name: 'Elemento 7', outcome: 'failed', status: 503, message: 'Request failed' },
      { id: 'id-8', name: 'Elemento 8', outcome: 'failed', status: 500, message: 'Error interno' },
      { id: 'id-9', name: 'Elemento 9', outcome: 'deleted' },
    ])
    expect(summary.counts).toEqual({ deleted: 2, not_found: 1, pending_approval: 1, failed: 5, not_attempted: 0 })
    expect(summary.allDeleted).toBe(false)
    expect(summary.stopped).toBe(false)
  })

  it.each([
    ['a network error', new AxiosError('Network Error', AxiosError.ERR_NETWORK)],
    ['a timeout', new AxiosError('timeout of 15000ms exceeded', AxiosError.ECONNABORTED)],
  ])('stops on %s without a server response', async (_label, error) => {
    const deleteOne = vi.fn(async (id: string) => {
      if (id === 'id-2') throw error
    })

    const summary = await runBulkDelete({ items: items(4), deleteOne })

    expect(deleteOne.mock.calls.map(([id]) => id)).toEqual(['id-1', 'id-2'])
    expect(summary.results).toEqual([
      { id: 'id-1', name: 'Elemento 1', outcome: 'deleted' },
      {
        id: 'id-2',
        name: 'Elemento 2',
        outcome: 'failed',
        status: undefined,
        message: 'Sin conexión con el servidor. Inténtalo de nuevo.',
      },
      { id: 'id-3', name: 'Elemento 3', outcome: 'not_attempted' },
      { id: 'id-4', name: 'Elemento 4', outcome: 'not_attempted' },
    ])
    expect(summary.stopped).toBe(true)
  })

  it.each([
    ['the server message', httpError(429, 'Has superado el límite'), 'Has superado el límite'],
    ['a fallback message', httpError(429), 'Demasiadas peticiones. Espera un momento e inténtalo de nuevo.'],
  ])('stops on 429 using %s', async (_label, error, message) => {
    const deleteOne = vi.fn(async (id: string) => {
      if (id === 'id-1') throw error
    })

    const summary = await runBulkDelete({ items: items(3), deleteOne })

    expect(deleteOne).toHaveBeenCalledTimes(1)
    expect(summary.results[0]).toEqual({ id: 'id-1', name: 'Elemento 1', outcome: 'failed', status: 429, message })
    expect(summary.results.slice(1).map((result) => result.outcome)).toEqual(['not_attempted', 'not_attempted'])
    expect(summary.stopped).toBe(true)
  })

  it('checks shouldContinue before every request and stops without sending once it fails', async () => {
    let sessionValid = true
    const deleteOne = vi.fn(async (id: string) => {
      if (id === 'id-2') sessionValid = false
    })
    const shouldContinue = vi.fn(() => sessionValid)
    const progress: BulkDeleteProgress[] = []

    const summary = await runBulkDelete({
      items: items(4),
      deleteOne,
      shouldContinue,
      onProgress: (value) => progress.push(value),
    })

    expect(deleteOne.mock.calls.map(([id]) => id)).toEqual(['id-1', 'id-2'])
    expect(shouldContinue).toHaveBeenCalledTimes(3)
    expect(summary.results.map((result) => result.outcome)).toEqual([
      'deleted',
      'deleted',
      'not_attempted',
      'not_attempted',
    ])
    expect(summary.stopped).toBe(true)
    expect(summary.allDeleted).toBe(false)
    expect(progress).toEqual([
      { current: 1, total: 4 },
      { current: 2, total: 4 },
    ])
  })

  it('sends nothing when shouldContinue fails before the first request', async () => {
    const deleteOne = vi.fn(async () => undefined)

    const summary = await runBulkDelete({ items: items(2), deleteOne, shouldContinue: () => false })

    expect(deleteOne).not.toHaveBeenCalled()
    expect(summary.counts).toEqual({ deleted: 0, not_found: 0, pending_approval: 0, failed: 0, not_attempted: 2 })
    expect(summary.stopped).toBe(true)
  })

  it('stops when a request is cancelled because the session changed', async () => {
    const deleteOne = vi.fn(async (id: string) => {
      if (id === 'id-1') throw new CanceledError('Authentication session changed')
    })

    const summary = await runBulkDelete({ items: items(3), deleteOne })

    expect(deleteOne).toHaveBeenCalledTimes(1)
    expect(summary.results[0]).toEqual({
      id: 'id-1',
      name: 'Elemento 1',
      outcome: 'failed',
      status: undefined,
      message: 'La sesión ha cambiado. Vuelve a iniciar sesión e inténtalo de nuevo.',
    })
    expect(summary.results.slice(1).map((result) => result.outcome)).toEqual(['not_attempted', 'not_attempted'])
    expect(summary.stopped).toBe(true)
  })

  it('stops on 401 and marks the rest as not attempted', async () => {
    const deleteOne = vi.fn(async (id: string) => {
      if (id === 'id-2') throw httpError(401, 'Unauthorized')
    })
    const progress: BulkDeleteProgress[] = []

    const summary = await runBulkDelete({ items: items(4), deleteOne, onProgress: (value) => progress.push(value) })

    expect(deleteOne.mock.calls.map(([id]) => id)).toEqual(['id-1', 'id-2'])
    expect(summary.results.map((result) => result.outcome)).toEqual([
      'deleted',
      'failed',
      'not_attempted',
      'not_attempted',
    ])
    expect(summary.results[1]).toMatchObject({ status: 401, message: 'Unauthorized' })
    expect(summary.stopped).toBe(true)
    expect(progress).toEqual([
      { current: 1, total: 4 },
      { current: 2, total: 4 },
    ])
  })

  it.each([
    ['the interceptor ACCOUNT_BLOCKED error', accountBlockedError()],
    ['a raw 423 response', httpError(423, 'Cuenta bloqueada')],
  ])('stops when the account is blocked (%s)', async (_label, error) => {
    const deleteOne = vi.fn(async (id: string) => {
      if (id === 'id-1') throw error
    })

    const summary = await runBulkDelete({ items: items(3), deleteOne })

    expect(deleteOne).toHaveBeenCalledTimes(1)
    expect(summary.results[0]).toMatchObject({ outcome: 'failed', status: 423 })
    expect(summary.results.slice(1).map((result) => result.outcome)).toEqual(['not_attempted', 'not_attempted'])
    expect(summary.counts.not_attempted).toBe(2)
  })

  it('does not count a 404 as deleted: the batch is not all deleted and goes on', async () => {
    const deleteOne = vi.fn(async (id: string) => {
      if (id === 'id-1') throw httpError(404, 'Ejercicio no encontrado')
    })

    const summary = await runBulkDelete({ items: items(2), deleteOne })

    expect(deleteOne).toHaveBeenCalledTimes(2)
    expect(summary.results.map((result) => result.outcome)).toEqual(['not_found', 'deleted'])
    expect(summary.allDeleted).toBe(false)
    expect(summary.stopped).toBe(false)
  })

  it('never throws and never retries', async () => {
    const deleteOne = vi.fn(async () => {
      throw 'unexpected'
    })

    const summary = await runBulkDelete({ items: items(2), deleteOne, fallbackErrorMessage: 'Fallo' })

    expect(deleteOne).toHaveBeenCalledTimes(2)
    expect(summary.results.map((result) => result.outcome)).toEqual(['failed', 'failed'])
    expect(summary.results[0]).toMatchObject({ message: 'Fallo' })
  })
})
