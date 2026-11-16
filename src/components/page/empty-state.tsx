import * as React from "react"

import { cn } from "@/lib/utils"

export interface EmptyStateProps {
  title: React.ReactNode
  description?: React.ReactNode
  /** Decorative icon; wrapped in an aria-hidden container. */
  icon?: React.ReactNode
  action?: React.ReactNode
  className?: string
}

/** Quiet placeholder: no live region, not an alert. */
function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn("flex flex-col items-center px-6 pb-14 pt-12 text-center", className)}
    >
      {icon ? (
        <div
          aria-hidden="true"
          data-slot="empty-state-icon"
          className="mb-6 text-foreground-muted [&_svg]:size-8"
        >
          {icon}
        </div>
      ) : null}
      <p className="text-base font-semibold leading-6 text-foreground">{title}</p>
      {description ? (
        <p className="mt-1 max-w-[46ch] text-[13px] leading-5 text-foreground-secondary">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  )
}

export { EmptyState }
