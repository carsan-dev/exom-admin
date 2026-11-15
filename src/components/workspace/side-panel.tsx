import * as React from 'react'

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

export type SidePanelSize = 'sm' | 'md' | 'lg'

// COMPONENTS.md `.sheet-sm|md|lg` = 480 / 640 / 960. Full width below `sm`.
// `sm:` prefix on purpose: it replaces the base Sheet's `sm:max-w-sm` via tailwind-merge.
const sidePanelWidths: Record<SidePanelSize, string> = {
  sm: 'sm:max-w-[480px]',
  md: 'sm:max-w-[640px]',
  lg: 'sm:max-w-[960px]',
}

export interface SidePanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Accessible name of the panel. */
  title: React.ReactNode
  description?: React.ReactNode
  side?: 'right' | 'left'
  size?: SidePanelSize
  /** Scrollable body. */
  children?: React.ReactNode
  /** Pinned footer (e.g. Cancelar / Guardar). */
  footer?: React.ReactNode
  className?: string
}

/** Lateral panel on top of `Sheet`: fixed header, scrolling body, pinned footer. */
export function SidePanel({
  open,
  onOpenChange,
  title,
  description,
  side = 'right',
  size = 'md',
  children,
  footer,
  className,
}: SidePanelProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={side}
        data-side={side}
        data-size={size}
        // No description: drop Radix's dangling aria-describedby (and its console warning).
        {...(description ? {} : { 'aria-describedby': undefined })}
        className={cn('flex w-full flex-col gap-0 p-0', sidePanelWidths[size], className)}
      >
        <SheetHeader className="shrink-0 pt-5 pr-14 pb-4 pl-6 max-md:pl-4">
          <SheetTitle>{title}</SheetTitle>
          {description ? <SheetDescription>{description}</SheetDescription> : null}
        </SheetHeader>
        <div
          data-slot="side-panel-body"
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pt-1 pb-6 max-md:px-4 max-md:pb-5"
        >
          {children}
        </div>
        {footer ? (
          <div
            data-slot="side-panel-footer"
            className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-border bg-background-surface px-6 py-4 max-md:px-4 max-md:py-3"
          >
            {footer}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
