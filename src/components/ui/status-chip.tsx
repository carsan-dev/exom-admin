import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const statusChipVariants = cva(
  "inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full px-2 text-xs font-semibold leading-none",
  {
    variants: {
      variant: {
        success: "bg-status-success-soft text-status-success",
        warning: "bg-status-warning-soft text-status-warning",
        danger: "bg-status-error-soft text-status-error",
        info: "bg-status-info-soft text-status-info",
        neutral: "bg-status-neutral-soft text-foreground-secondary",
        brand: "bg-lime-soft text-accent-text",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
)

export interface StatusChipProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusChipVariants> {
  /** Leading status dot (decorative). Defaults to true. */
  dot?: boolean
}

const StatusChip = React.forwardRef<HTMLSpanElement, StatusChipProps>(
  ({ className, variant, dot = true, children, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(statusChipVariants({ variant }), className)}
      {...props}
    >
      {dot ? (
        <span
          aria-hidden="true"
          data-slot="status-chip-dot"
          className="size-1.5 flex-none rounded-full bg-current"
        />
      ) : null}
      {children}
    </span>
  )
)
StatusChip.displayName = "StatusChip"

// eslint-disable-next-line react-refresh/only-export-components
export { StatusChip, statusChipVariants }
