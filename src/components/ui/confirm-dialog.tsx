import type { ReactNode } from 'react'
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface ConfirmDialogProps {
  open: boolean
  /** The question; it is the dialog's accessible name. */
  title: ReactNode
  description?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  /** Renders the confirm button with the destructive button variant. */
  destructive?: boolean
  onConfirm: () => void
  /** Called by the cancel button and by Escape. There is no outside-click close. */
  onCancel: () => void
  /**
   * Element to give focus back to once the dialog has closed, normally the one focused when the
   * question was asked. Needed because an imperatively opened dialog has no Trigger to return to.
   */
  returnFocusTo?: HTMLElement | SVGElement | null
}

/**
 * Close auto-focus handler. Radix calls it when the content unmounts (after the exit animation,
 * or at once when none runs), which is exactly when it would restore focus itself.
 *
 * Rule: focus goes back to `target` only while focus is lost, i.e. on <body> or still inside the
 * closing dialog. If the caller's code after an accepted answer has already moved focus elsewhere,
 * that choice is kept. A target that left the document or cannot take focus is skipped and
 * Radix's default (focus the Trigger, of which there is none) runs unchanged.
 */
function restoreFocus(event: Event, target: HTMLElement | SVGElement | null | undefined) {
  if (!target?.isConnected) return
  const active = document.activeElement
  const closing = event.currentTarget
  const focusLost = !active || active === document.body || (closing instanceof Node && closing.contains(active))
  if (!focusLost) return
  target.focus()
  // Only take over from Radix when focus really moved (a disabled target does not accept it).
  if (document.activeElement === target) event.preventDefault()
}

/**
 * Controlled confirmation built on AlertDialog. Initial focus goes to the cancel
 * button (AlertDialog default) so Enter never confirms by accident.
 * Each answer path calls exactly one callback.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Aceptar',
  cancelLabel = 'Cancelar',
  destructive = false,
  onConfirm,
  onCancel,
  returnFocusTo,
}: ConfirmDialogProps) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        // Escape and the cancel button request a close; acceptance never reaches here.
        if (!nextOpen) onCancel()
      }}
    >
      <AlertDialogContent onCloseAutoFocus={(event) => restoreFocus(event, returnFocusTo)}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description !== undefined ? <AlertDialogDescription>{description}</AlertDialogDescription> : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <AlertDialogPrimitive.Action
            className={cn(buttonVariants({ variant: destructive ? 'destructive' : 'default' }))}
            onClick={(event) => {
              // Keep the primitive from also requesting a close, which would report a cancel.
              event.preventDefault()
              onConfirm()
            }}
          >
            {confirmLabel}
          </AlertDialogPrimitive.Action>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
