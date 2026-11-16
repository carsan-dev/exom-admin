import * as React from "react"
import { CircleAlert } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface ErrorStateProps {
  title?: React.ReactNode
  description?: React.ReactNode
  /** When given, renders a retry button. */
  onRetry?: () => void
  retryLabel?: string
  className?: string
}

/** Announced on appearance via role="alert". */
function ErrorState({
  title = "No se ha podido cargar",
  description,
  onRetry,
  retryLabel = "Reintentar",
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      data-slot="error-state"
      className={cn("flex flex-col items-center px-6 py-14 text-center", className)}
    >
      <CircleAlert aria-hidden="true" className="size-6 text-destructive" />
      <p className="mt-4 text-base font-semibold leading-6 text-foreground">{title}</p>
      {description ? (
        <p className="mt-1 max-w-[46ch] text-[13px] leading-5 text-foreground-secondary">
          {description}
        </p>
      ) : null}
      {onRetry ? (
        <Button type="button" className="mt-5" onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null}
    </div>
  )
}

export { ErrorState }
