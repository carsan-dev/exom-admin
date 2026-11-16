import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

export interface WorkbenchProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Required: it is the dialog's accessible name. */
  title: React.ReactNode
  description?: React.ReactNode
  /** Right side of the fixed header (e.g. Cancelar / Guardar). */
  headerActions?: React.ReactNode
  /** Scrollable work area. */
  children?: React.ReactNode
  footer?: React.ReactNode
  /** Ignore pointer-down outside the surface. Default true. Escape is governed by onCloseRequest. */
  disableOutsideClose?: boolean
  /**
   * When provided, every dismiss request (the «Cerrar» button, Escape and, if allowed,
   * an outside press) calls this instead of `onOpenChange(false)`. The consumer runs its
   * unsaved-changes confirmation and closes for real through `onOpenChange(false)` /
   * its `open` state. Without it, dismissing closes directly.
   */
  onCloseRequest?: () => void
  className?: string
}

/**
 * Full-viewport modal work surface (builders). Not a route: it never touches the URL.
 *
 * Built on the Dialog primitives from `@/components/ui/dialog`: `DialogOverlay` carries
 * Radix's counted scroll lock and `DialogPrimitive.Content` the focus trap, so this file
 * adds no scroll-lock code. `DialogContent` itself is not used because it always renders
 * its own uninterceptable "Close" button and centred-card layout.
 */
export function Workbench({
  open,
  onOpenChange,
  title,
  description,
  headerActions,
  children,
  footer,
  disableOutsideClose = true,
  onCloseRequest,
  className,
}: WorkbenchProps) {
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && onCloseRequest) {
      onCloseRequest()
      return
    }
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogPortal>
        <DialogOverlay className="bg-transparent" />
        <DialogPrimitive.Content
          data-slot="workbench"
          // No description: drop Radix's dangling aria-describedby (and its console warning).
          {...(description ? {} : { 'aria-describedby': undefined })}
          className={cn(
            'fixed inset-0 z-50 flex h-dvh w-full flex-col bg-background text-foreground anim-overlay-panel [--ov-x:0px] [--ov-y:0px]',
            className
          )}
          onInteractOutside={(event) => {
            if (disableOutsideClose) event.preventDefault()
          }}
        >
          <header
            data-slot="workbench-header"
            className="flex min-h-16 shrink-0 items-center gap-4 border-b border-border-strong bg-background-darker py-3 pr-5 pl-3 max-md:flex-wrap max-md:pr-4"
          >
            <DialogClose asChild>
              <Button type="button" variant="ghost" size="icon" className="size-9 shrink-0">
                <X aria-hidden="true" />
                <span className="sr-only">Cerrar</span>
              </Button>
            </DialogClose>
            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate">{title}</DialogTitle>
              {description ? (
                <DialogDescription className="truncate">{description}</DialogDescription>
              ) : null}
            </div>
            {headerActions ? (
              <div data-slot="workbench-actions" className="flex shrink-0 items-center gap-2">
                {headerActions}
              </div>
            ) : null}
          </header>
          <div data-slot="workbench-body" className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {children}
          </div>
          {footer ? (
            <div
              data-slot="workbench-footer"
              className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-border bg-background-darker px-6 py-4 max-md:px-4 max-md:py-3"
            >
              {footer}
            </div>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  )
}
