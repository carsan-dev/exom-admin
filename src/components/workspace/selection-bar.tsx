import * as React from 'react'
import { X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

function formatSelectionCount(count: number) {
  return count === 1 ? '1 seleccionado' : `${count} seleccionados`
}

export interface SelectionBarProps {
  /** Number of selected items. The bar renders nothing at 0. */
  count: number
  /** Clears the selection (the «Limpiar selección» control). */
  onClear: () => void
  /** Bulk action buttons, shown to the right of the count. */
  children?: React.ReactNode
  /** Count text. Default: «1 seleccionado» / «N seleccionados» (same copy as the mockups). */
  formatCount?: (count: number) => string
  /** Accessible name of the region. Default «Acciones de selección» (sistema.html). */
  'aria-label'?: string
  /**
   * Positioning is the consumer's call. Default is the docked variant used by the list
   * mockups (`.selection-bar.is-docked`): sticky at the bottom of its scroll container,
   * full width, z-6 (mockup value) so it stays above table rows (sticky headers) and below
   * the version banner (z-40) and overlays (z-50). Pass e.g. `fixed bottom-6 ...` for a
   * floating bar.
   */
  className?: string
}

export function SelectionBar({
  count,
  onClear,
  children,
  formatCount = formatSelectionCount,
  'aria-label': ariaLabel = 'Acciones de selección',
  className,
}: SelectionBarProps) {
  if (count === 0) return null

  return (
    <div
      role="region"
      aria-label={ariaLabel}
      data-slot="selection-bar"
      className={cn(
        'sticky bottom-4 z-6 mt-3 flex min-h-13 w-full items-center gap-3 border border-border-strong bg-background-surface py-2 pr-2 pl-4 text-foreground max-md:overflow-x-auto',
        className
      )}
    >
      <span aria-live="polite" className="text-sm font-semibold whitespace-nowrap tabular-nums">
        {formatCount(count)}
      </span>
      <div className="ml-auto flex shrink-0 items-center gap-2">
        {children}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9"
          aria-label="Limpiar selección"
          onClick={onClear}
        >
          <X aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
}
