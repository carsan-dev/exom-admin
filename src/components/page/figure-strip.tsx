import * as React from "react"

import { cn } from "@/lib/utils"

export type FigureTone = "default" | "success" | "warning" | "danger"

export interface FigureStripItem {
  label: string
  value: React.ReactNode
  hint?: React.ReactNode
  tone?: FigureTone
}

export interface FigureStripProps {
  items: FigureStripItem[]
  "aria-label"?: string
  className?: string
}

const dotClass: Record<Exclude<FigureTone, "default">, string> = {
  success: "bg-status-success",
  warning: "bg-status-warning",
  danger: "bg-destructive",
}

/**
 * Ledger of figures. Tone only decorates (dot, red figure for danger): the
 * value text itself must carry the meaning.
 */
function FigureStrip({ items, "aria-label": ariaLabel, className }: FigureStripProps) {
  return (
    <dl
      aria-label={ariaLabel}
      data-slot="figure-strip"
      className={cn(
        "grid grid-cols-2 overflow-hidden border-y border-border-strong lg:grid-flow-col lg:auto-cols-fr lg:grid-cols-none",
        className
      )}
    >
      {items.map((item, index) => {
        const tone = item.tone ?? "default"
        return (
          <div
            key={`${item.label}-${index}`}
            data-tone={tone}
            className="-ml-px -mt-px flex min-w-0 flex-col border-l border-t border-border px-5 pb-[18px] pt-4"
          >
            <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-foreground-muted">
              {tone !== "default" ? (
                <span
                  aria-hidden="true"
                  data-slot="figure-strip-dot"
                  className={cn("size-1.5 flex-none rounded-full", dotClass[tone])}
                />
              ) : null}
              {item.label}
            </dt>
            <dd
              className={cn(
                "mt-3.5 font-display text-4xl font-extrabold uppercase leading-none tabular-nums",
                tone === "danger" ? "text-destructive" : "text-foreground"
              )}
            >
              {item.value}
            </dd>
            {item.hint ? (
              <dd className="mt-2.5 text-xs leading-4 text-foreground-muted">{item.hint}</dd>
            ) : null}
          </div>
        )
      })}
    </dl>
  )
}

export { FigureStrip }
