import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

export interface ConfirmDialogOptions {
  /** The question, shown verbatim as the dialog title. */
  title: ReactNode
  description?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
}

interface ConfirmDialogState {
  open: boolean
  options: ConfirmDialogOptions | null
}

/**
 * Promise-based replacement for the browser's native confirm dialog, scoped to the calling component.
 *
 * - `confirm(options)` resolves `true` when accepted and `false` on cancel or Escape.
 * - Only one confirmation is pending per hook instance: a `confirm()` call made while
 *   another is pending resolves `false` immediately and leaves the open question untouched,
 *   so a second trigger can never start a second flow.
 * - If the component unmounts while a confirmation is pending, the promise resolves `false`
 *   and no state update is attempted. Calls made after unmount resolve `false` at once.
 * - The dialog keeps its content after answering so it can play its exit animation.
 * - `confirm` has a stable identity.
 *
 * Render `dialog` somewhere in the component's output.
 */
export function useConfirmDialog() {
  const [state, setState] = useState<ConfirmDialogState>({ open: false, options: null })
  const resolverRef = useRef<((accepted: boolean) => void) | null>(null)
  const mountedRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      const resolve = resolverRef.current
      resolverRef.current = null
      resolve?.(false)
    }
  }, [])

  const settle = useCallback((accepted: boolean) => {
    const resolve = resolverRef.current
    if (!resolve) return
    resolverRef.current = null
    if (mountedRef.current) {
      setState((current) => ({ ...current, open: false }))
    }
    resolve(accepted)
  }, [])

  const confirm = useCallback((options: ConfirmDialogOptions) => {
    // A pending question keeps priority; an unmounted host can never be answered.
    if (resolverRef.current || !mountedRef.current) return Promise.resolve(false)
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve
      setState({ open: true, options })
    })
  }, [])

  const handleConfirm = useCallback(() => settle(true), [settle])
  const handleCancel = useCallback(() => settle(false), [settle])

  const dialog = state.options ? (
    <ConfirmDialog
      open={state.open}
      title={state.options.title}
      description={state.options.description}
      confirmLabel={state.options.confirmLabel}
      cancelLabel={state.options.cancelLabel}
      destructive={state.options.destructive}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  ) : null

  return { confirm, dialog }
}
