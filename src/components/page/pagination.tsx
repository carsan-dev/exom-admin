import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface PaginationProps {
  /** Current page, 1-based. */
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  disabled?: boolean
  /** Optional summary next to the page label, e.g. "42 resultados". */
  summary?: React.ReactNode
  /** Accessible name of the nav landmark. */
  "aria-label"?: string
  previousLabel?: string
  nextLabel?: string
  pageLabel?: (page: number, totalPages: number) => string
  className?: string
}

const defaultPageLabel = (page: number, totalPages: number) => `Página ${page} de ${totalPages}`

/** Renders nothing when there is a single page (or none), like most list screens today. */
function Pagination({
  page,
  totalPages,
  onPageChange,
  disabled = false,
  summary,
  "aria-label": ariaLabel = "Paginación",
  previousLabel = "Anterior",
  nextLabel = "Siguiente",
  pageLabel = defaultPageLabel,
  className,
}: PaginationProps) {
  if (totalPages <= 1) return null

  return (
    <nav
      aria-label={ariaLabel}
      data-slot="pagination"
      className={cn(
        "flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-foreground-muted tabular-nums">
        <span>{pageLabel(page, totalPages)}</span>
        {summary ? <span>{summary}</span> : null}
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft aria-hidden="true" />
          {previousLabel}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          {nextLabel}
          <ChevronRight aria-hidden="true" />
        </Button>
      </div>
    </nav>
  )
}

export { Pagination }
