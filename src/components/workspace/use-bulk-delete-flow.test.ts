import { act, renderHook } from '@testing-library/react'
import { toast } from 'sonner'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from '@/hooks/use-auth'
import {
  type BulkDeleteItemResult,
  type BulkDeleteProgress,
  type BulkDeleteSummary,
  runBulkDelete,
} from '@/lib/bulk-delete'
import type { AuthUser } from '@/types/auth'
import type { BulkDeleteEntityLabels } from './bulk-delete-labels'
import { type BulkDeleteRunVariables, useBulkDeleteFlow } from './use-bulk-delete-flow'

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), info: vi.fn(), error: vi.fn(), warning: vi.fn() },
}))

const LABELS: BulkDeleteEntityLabels = { singular: 'ejercicio', plural: 'ejercicios', gender: 'masculine' }
const ITEMS = [
  { id: 'a', name: 'Alpha' },
  { id: 'b', name: 'Beta' },
  { id: 'c', name: 'Gamma' },
]

function summaryOf(results: BulkDeleteItemResult[]): BulkDeleteSummary {
  const counts = { deleted: 0, pending_approval: 0, failed: 0, not_attempted: 0 }
  for (const result of results) counts[result.outcome] += 1
  return { results, counts, allDeleted: counts.deleted === results.length, stopped: false }
}

const deleted = (id: string, name: string): BulkDeleteItemResult => ({ id, name, outcome: 'deleted' })
const failed = (id: string, name: string): BulkDeleteItemResult => ({
  id,
  name,
  outcome: 'failed',
  message: 'En uso',
  status: 409,
})

type Run = (variables: BulkDeleteRunVariables) => Promise<BulkDeleteSummary>

function setup(run: Run) {
  const onSettled = vi.fn()
  const onDeleted = vi.fn()
  const hook = renderHook(() =>
    useBulkDeleteFlow({ labels: LABELS, consequences: 'Consecuencias', run, onSettled, onDeleted })
  )
  return { ...hook, onSettled, onDeleted }
}

function setRole(role: AuthUser['role']) {
  useAuth.setState({ user: { id: 'u-1', email: 'admin@example.test', role, profile: null } })
}

describe('useBulkDeleteFlow', () => {
  beforeEach(() => {
    vi.mocked(toast.success).mockClear()
    vi.mocked(toast.info).mockClear()
    vi.mocked(toast.error).mockClear()
    vi.mocked(toast.warning).mockClear()
    setRole('SUPER_ADMIN')
  })

  it('opens the confirmation with the given items and resets the previous result', () => {
    const { result } = setup(vi.fn<Run>())
    expect(result.current.dialogProps.open).toBe(false)

    act(() => result.current.open(ITEMS))

    expect(result.current.dialogProps).toMatchObject({
      open: true,
      items: ITEMS,
      labels: LABELS,
      consequences: 'Consecuencias',
      running: false,
      progress: null,
      summary: null,
      requiresApproval: false,
    })
  })

  it('reports requiresApproval for the ADMIN role only', () => {
    setRole('ADMIN')
    const { result } = setup(vi.fn<Run>())
    expect(result.current.dialogProps.requiresApproval).toBe(true)
  })

  it('clears selection, closes and toasts once when everything was deleted', async () => {
    const run = vi.fn<Run>().mockResolvedValue(summaryOf(ITEMS.map((item) => deleted(item.id, item.name))))
    const { result, onSettled, onDeleted } = setup(run)
    act(() => result.current.open(ITEMS))

    await act(async () => result.current.dialogProps.onConfirm())

    expect(run).toHaveBeenCalledWith({ items: ITEMS, onProgress: expect.any(Function) })
    expect(onDeleted).toHaveBeenCalledTimes(1)
    expect(onSettled).toHaveBeenCalledExactlyOnceWith(null)
    expect(toast.success).toHaveBeenCalledExactlyOnceWith('3 ejercicios eliminados')
    expect(result.current.dialogProps).toMatchObject({ open: false, items: [], summary: null, running: false })
  })

  it('keeps the result open and only failed or not attempted items retryable on a partial batch', async () => {
    const run = vi
      .fn<Run>()
      .mockResolvedValue(
        summaryOf([deleted('a', 'Alpha'), failed('b', 'Beta'), { id: 'c', name: 'Gamma', outcome: 'not_attempted' }])
      )
    const { result, onSettled, onDeleted } = setup(run)
    act(() => result.current.open(ITEMS))

    await act(async () => result.current.dialogProps.onConfirm())

    expect(onDeleted).toHaveBeenCalledTimes(1)
    expect(onSettled).toHaveBeenCalledExactlyOnceWith(new Set(['b', 'c']))
    expect(toast.warning).toHaveBeenCalledExactlyOnceWith('2 ejercicios sin eliminar. Revisa el resultado.')
    expect(toast.success).not.toHaveBeenCalled()
    expect(result.current.dialogProps.open).toBe(true)
    expect(result.current.dialogProps.summary?.counts).toMatchObject({ deleted: 1, failed: 1, not_attempted: 1 })
    expect(result.current.dialogProps.progress).toBeNull()
  })

  it('announces approval requests with a single info toast and does not call onDeleted', async () => {
    const run = vi
      .fn<Run>()
      .mockResolvedValue(summaryOf(ITEMS.map((item) => ({ ...item, outcome: 'pending_approval' as const }))))
    const { result, onSettled, onDeleted } = setup(run)
    act(() => result.current.open(ITEMS))

    await act(async () => result.current.dialogProps.onConfirm())

    expect(toast.info).toHaveBeenCalledExactlyOnceWith('3 ejercicios enviados a aprobación')
    expect(toast.warning).not.toHaveBeenCalled()
    expect(onDeleted).not.toHaveBeenCalled()
    expect(onSettled).toHaveBeenCalledExactlyOnceWith(new Set())
    expect(result.current.dialogProps.open).toBe(true)
  })

  it('toasts the error and closes when the batch throws unexpectedly', async () => {
    const run = vi.fn<Run>().mockRejectedValue(new Error('boom'))
    const { result, onSettled, onDeleted } = setup(run)
    act(() => result.current.open(ITEMS))

    await act(async () => result.current.dialogProps.onConfirm())

    expect(toast.error).toHaveBeenCalledTimes(1)
    expect(onSettled).not.toHaveBeenCalled()
    expect(onDeleted).not.toHaveBeenCalled()
    expect(result.current.dialogProps).toMatchObject({ open: false, running: false })
  })

  it('exposes progress and the running flag while the batch is in flight', async () => {
    let finish: (summary: BulkDeleteSummary) => void = () => {}
    const run = vi.fn<Run>().mockImplementation(({ onProgress }) => {
      const progress: BulkDeleteProgress = { current: 2, total: 3 }
      onProgress(progress)
      return new Promise<BulkDeleteSummary>((resolve) => {
        finish = resolve
      })
    })
    const { result } = setup(run)
    act(() => result.current.open(ITEMS))

    act(() => result.current.dialogProps.onConfirm())

    expect(result.current.dialogProps.running).toBe(true)
    expect(result.current.dialogProps.progress).toEqual({ current: 2, total: 3 })

    await act(async () => {
      finish(summaryOf(ITEMS.map((item) => deleted(item.id, item.name))))
    })
    expect(result.current.dialogProps.running).toBe(false)
  })

  it('forgets items and result when the dialog is closed', async () => {
    const run = vi.fn<Run>().mockResolvedValue(summaryOf([failed('a', 'Alpha')]))
    const { result } = setup(run)
    act(() => result.current.open([ITEMS[0]]))
    await act(async () => result.current.dialogProps.onConfirm())
    expect(result.current.dialogProps.summary).not.toBeNull()

    act(() => result.current.dialogProps.onOpenChange(false))

    expect(result.current.dialogProps).toMatchObject({ open: false, items: [], summary: null, progress: null })
  })

  it('ignores a second confirmation while the batch is running', async () => {
    const deleteOne = vi.fn(async () => undefined)
    const run = vi.fn<Run>(({ items, onProgress }) => runBulkDelete({ items, deleteOne, onProgress }))
    const { result } = setup(run)
    act(() => result.current.open(ITEMS))

    // Both clicks land before React re-renders with `running` (which disables the button).
    const { onConfirm } = result.current.dialogProps
    await act(async () => {
      onConfirm()
      onConfirm()
    })

    expect(run).toHaveBeenCalledTimes(1)
    expect(deleteOne).toHaveBeenCalledTimes(ITEMS.length)
    expect(toast.success).toHaveBeenCalledTimes(1)
    expect(result.current.dialogProps.running).toBe(false)
  })

  it('accepts a new confirmation once the previous batch finished', async () => {
    const run = vi.fn<Run>().mockResolvedValue(summaryOf([failed('a', 'Alpha')]))
    const { result } = setup(run)
    act(() => result.current.open([ITEMS[0]]))
    await act(async () => result.current.dialogProps.onConfirm())

    act(() => result.current.open([ITEMS[0]]))
    await act(async () => result.current.dialogProps.onConfirm())

    expect(run).toHaveBeenCalledTimes(2)
  })
})
