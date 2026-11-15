"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

/*
 * Sliding underline under the active tab. It is a decorative child of the tablist,
 * positioned from the active trigger's box (so it follows grid, wrapped and
 * horizontally scrolled lists) and re-measured when:
 * - the active tab changes, from a click, the keyboard or a controlled value
 *   (MutationObserver on data-state);
 * - the list or a trigger is resized (ResizeObserver, when it exists).
 * Until a measurement succeeds the list has no data-indicator and each active
 * trigger draws its own static underline, so jsdom, hidden lists and missing
 * ResizeObserver still mark the active tab. The first placement and resizes are
 * applied without transition (no slide-in from 0); only tab changes slide.
 */
function useTabsIndicator() {
  const listRef = React.useRef<HTMLDivElement | null>(null)
  const indicatorRef = React.useRef<HTMLSpanElement | null>(null)

  React.useLayoutEffect(() => {
    const list = listRef.current
    const indicator = indicatorRef.current
    if (!list || !indicator) return

    let placed = false

    const update = (animate: boolean) => {
      const active = list.querySelector<HTMLElement>('[role="tab"][data-state="active"]')
      const listRect = list.getBoundingClientRect()
      const rect = active?.getBoundingClientRect()
      if (!active || !rect || rect.width === 0 || listRect.width === 0) {
        placed = false
        list.removeAttribute("data-indicator")
        return
      }

      const style = window.getComputedStyle(active)
      const padLeft = Number.parseFloat(style.paddingLeft) || 0
      const padRight = Number.parseFloat(style.paddingRight) || 0
      const width = Math.max(rect.width - padLeft - padRight, 1)
      const x = rect.left - listRect.left - list.clientLeft + list.scrollLeft + padLeft
      const y = rect.bottom - listRect.top - list.clientTop + list.scrollTop - indicator.offsetHeight

      const transform = `translate(${x}px, ${y}px) scaleX(${width})`
      if (animate && placed) {
        indicator.style.transform = transform
      } else {
        indicator.style.transition = "none"
        indicator.style.transform = transform
        void indicator.offsetWidth
        indicator.style.transition = ""
      }
      placed = true
      list.setAttribute("data-indicator", "ready")
    }

    update(false)

    const resizeObserver =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => update(false))
    const observeTriggers = () => {
      if (!resizeObserver) return
      resizeObserver.disconnect()
      resizeObserver.observe(list)
      list.querySelectorAll('[role="tab"]').forEach((tab) => resizeObserver.observe(tab))
    }
    observeTriggers()

    const mutationObserver =
      typeof MutationObserver === "undefined"
        ? null
        : new MutationObserver((records) => {
            const triggersChanged = records.some((record) => record.type === "childList")
            if (triggersChanged) observeTriggers()
            update(!triggersChanged)
          })
    mutationObserver?.observe(list, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["data-state"],
    })

    // Without ResizeObserver, at least follow viewport changes and late font loads.
    const onWindowResize = () => update(false)
    if (!resizeObserver) {
      window.addEventListener("resize", onWindowResize)
      void document.fonts?.ready.then(() => update(false))
    }

    return () => {
      resizeObserver?.disconnect()
      mutationObserver?.disconnect()
      window.removeEventListener("resize", onWindowResize)
    }
  }, [])

  return { listRef, indicatorRef }
}

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, children, ...props }, ref) => {
  const { listRef, indicatorRef } = useTabsIndicator()
  const setRefs = React.useCallback(
    (node: HTMLDivElement | null) => {
      listRef.current = node
      if (typeof ref === "function") ref(node)
      else if (ref) ref.current = node
    },
    [listRef, ref]
  )

  return (
    <TabsPrimitive.List
      ref={setRefs}
      className={cn(
        "group/tabs relative inline-flex h-10 items-center justify-start border-b border-border text-muted-foreground",
        className
      )}
      {...props}
    >
      {children}
      <span
        ref={indicatorRef}
        aria-hidden="true"
        data-slot="tabs-indicator"
        className="pointer-events-none absolute top-0 left-0 h-0.5 w-px origin-left bg-accent-line opacity-0 transition-transform duration-(--dur-base) ease-(--ease-out) group-data-[indicator=ready]/tabs:opacity-100"
      />
    </TabsPrimitive.List>
  )
})
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "relative inline-flex items-center justify-center gap-2 self-stretch whitespace-nowrap px-3 text-sm font-semibold text-muted-foreground transition-colors duration-(--dur-fast) ease-(--ease-out) hover:data-[state=inactive]:text-foreground-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus disabled:pointer-events-none disabled:opacity-50 data-[state=active]:text-foreground after:pointer-events-none after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-accent-line after:opacity-0 data-[state=active]:after:opacity-100 group-data-[indicator=ready]/tabs:after:hidden",
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
