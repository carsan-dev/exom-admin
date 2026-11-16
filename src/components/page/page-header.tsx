import * as React from "react"

import { cn } from "@/lib/utils"

export interface PageHeaderProps {
  /** Rendered as the single page h1. */
  title: React.ReactNode
  /** Small uppercase label above the title. Not a heading. */
  eyebrow?: React.ReactNode
  /** Supporting text under the title. Not a heading. */
  description?: React.ReactNode
  /** Right-side actions; wrap below the title on narrow screens. */
  actions?: React.ReactNode
  className?: string
}

function PageHeader({ title, eyebrow, description, actions, className }: PageHeaderProps) {
  return (
    <header
      data-slot="page-header"
      className={cn(
        "mb-6 flex flex-wrap items-start justify-between gap-x-6 gap-y-4 md:mb-8",
        className
      )}
    >
      <div className="min-w-0 flex-[1_1_22rem]">
        {eyebrow ? (
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-foreground-muted">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-display text-3xl font-extrabold uppercase leading-[0.95] text-foreground">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-[72ch] text-pretty text-[13px] leading-5 text-foreground-secondary">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  )
}

export { PageHeader }
