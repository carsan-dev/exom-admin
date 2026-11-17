import { type ReactNode, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'
import { getApiErrorMessage } from '@/lib/api-utils'
import type { BulkDeleteItem, BulkDeleteProgress, BulkDeleteSummary } from '@/lib/bulk-delete'
import type { BulkDeleteDialogProps } from './bulk-delete-dialog'
import { agreeParticiple, type BulkDeleteEntityLabels, formatEntityCount } from './bulk-delete-labels'

export interface BulkDeleteRunVariables {
  items: BulkDeleteItem[]
  onProgress: (progress: BulkDeleteProgress) => void
}

export interface UseBulkDeleteFlowOptions {
  labels: BulkDeleteEntityLabels
  /** Consequences of the deletion for this entity, shown in the confirmation. */
  consequences: ReactNode
  /** Runs the batch. Usually the `mutateAsync` of the feature's bulk-delete mutation. */
  run: (variables: BulkDeleteRunVariables) => Promise<BulkDeleteSummary>
  /**
   * Called once the batch finished. `null` means everything was deleted (clear the selection);
   * otherwise it holds the ids worth retrying (failed and not attempted), to keep selected.
   */
  onSettled: (retryableIds: Set<string> | null) => void
  /** Called after a batch that deleted at least one item (e.g. to go back to the first page). */
  onDeleted?: () => void
  /** Message when the batch itself throws unexpectedly. */
  unexpectedErrorMessage?: string
}

export interface UseBulkDeleteFlowResult {
  /** Opens the confirmation for the given items, in execution order. */
  open: (items: ReadonlyArray<BulkDeleteItem>) => void
  /** Ready-to-spread props for `<BulkDeleteDialog>`. */
  dialogProps: BulkDeleteDialogProps
}

/**
 * Page-level state machine of a bulk deletion: confirmation, progress, result, toasts and the
 * selection hand-off. The dialog stays presentational; every entity only supplies its labels,
 * consequences and the function that runs the batch.
 */
export function useBulkDeleteFlow({
  labels,
  consequences,
  run,
  onSettled,
  onDeleted,
  unexpectedErrorMessage = 'No se ha podido completar la eliminación',
}: UseBulkDeleteFlowOptions): UseBulkDeleteFlowResult {
  const requiresApproval = useAuth((state) => state.user?.role) === 'ADMIN'
  const [isOpen, setIsOpen] = useState(false)
  const [items, setItems] = useState<BulkDeleteItem[]>([])
  const [progress, setProgress] = useState<BulkDeleteProgress | null>(null)
  const [summary, setSummary] = useState<BulkDeleteSummary | null>(null)
  // Own flag (not mutation.isPending) so the dialog switches straight from running to its result.
  const [running, setRunning] = useState(false)
  // Synchronous guard: a second confirmation can arrive before `running` re-renders the dialog.
  const runningRef = useRef(false)

  const open = (nextItems: ReadonlyArray<BulkDeleteItem>) => {
    setItems([...nextItems])
    setProgress(null)
    setSummary(null)
    setIsOpen(true)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    setIsOpen(nextOpen)
    if (!nextOpen) {
      setItems([])
      setProgress(null)
      setSummary(null)
    }
  }

  const confirm = async () => {
    if (runningRef.current) return
    runningRef.current = true
    let result: BulkDeleteSummary
    setRunning(true)
    try {
      result = await run({ items, onProgress: setProgress })
    } catch (error) {
      runningRef.current = false
      setRunning(false)
      toast.error(getApiErrorMessage(error, unexpectedErrorMessage))
      handleOpenChange(false)
      return
    }

    runningRef.current = false
    setRunning(false)
    const { counts } = result
    if (counts.deleted > 0) onDeleted?.()

    if (result.allDeleted) {
      onSettled(null)
      handleOpenChange(false)
      toast.success(
        `${formatEntityCount(counts.deleted, labels)} ${agreeParticiple('eliminad', counts.deleted, labels.gender)}`
      )
      return
    }

    // Keep only what can be retried: failed and not attempted items.
    const retryable = new Set(
      result.results
        .filter((item) => item.outcome === 'failed' || item.outcome === 'not_attempted')
        .map((item) => item.id)
    )
    onSettled(retryable)
    setProgress(null)
    setSummary(result)

    if (retryable.size > 0) {
      toast.warning(`${formatEntityCount(retryable.size, labels)} sin eliminar. Revisa el resultado.`)
    } else {
      toast.info(
        `${formatEntityCount(counts.pending_approval, labels)} ${agreeParticiple('enviad', counts.pending_approval, labels.gender)} a aprobación`
      )
    }
  }

  return {
    open,
    dialogProps: {
      open: isOpen,
      onOpenChange: handleOpenChange,
      items,
      labels,
      consequences,
      requiresApproval,
      running,
      progress,
      summary,
      onConfirm: () => void confirm(),
    },
  }
}
