import * as React from "react"

import { cn } from "@/lib/utils"

export interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Any CSS colour (e.g. a stored hex). Rendered as a decorative dot. */
  color?: string
}

const Tag = React.forwardRef<HTMLSpanElement, TagProps>(
  ({ className, color, children, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        "inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-none border border-border-strong bg-transparent px-2 text-xs leading-none text-foreground-secondary",
        className
      )}
      {...props}
    >
      {color ? (
        <span
          aria-hidden="true"
          data-slot="tag-dot"
          className="size-1.5 flex-none rounded-full"
          style={{ backgroundColor: color }}
        />
      ) : null}
      {children}
    </span>
  )
)
Tag.displayName = "Tag"

export { Tag }
