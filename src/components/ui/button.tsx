import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  [
    // Layout and type
    "relative inline-flex items-center justify-center gap-2 whitespace-nowrap select-none rounded-md border border-transparent text-sm font-semibold",
    // Motion: colour changes at --dur-fast, press scale at --dur-press
    "[transition:background-color_var(--dur-fast)_var(--ease-out),border-color_var(--dur-fast)_var(--ease-out),color_var(--dur-fast)_var(--ease-out),transform_var(--dur-press)_var(--ease-out)] active:scale-[0.98]",
    // Focus: outline, same as the other restyled controls
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
    // Disabled: quiet outline with muted text (no opacity, keeps text legible)
    "disabled:pointer-events-none disabled:border-border disabled:bg-transparent disabled:text-muted-foreground",
    // Touch: below md the hit area grows to 44px without changing the visual size
    "max-md:after:absolute max-md:after:content-[''] max-md:after:inset-x-[min(0px,calc(50%-22px))] max-md:after:inset-y-[min(0px,calc(50%-22px))]",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        default:
          "border-accent-line bg-primary text-primary-foreground hover:border-foreground hover:bg-foreground hover:text-background focus-visible:outline-foreground disabled:border-secondary disabled:bg-secondary",
        destructive:
          "border-destructive bg-destructive text-destructive-foreground hover:bg-transparent hover:text-destructive",
        outline:
          "border-control-border bg-transparent text-foreground hover:border-control-border-hover hover:bg-card",
        secondary:
          "bg-secondary text-secondary-foreground hover:border-control-border-hover",
        ghost:
          "text-foreground-secondary hover:bg-card hover:text-foreground [&[aria-haspopup][aria-expanded=true]]:bg-background-surface [&[aria-haspopup][aria-expanded=true]]:text-foreground disabled:border-transparent",
        link: "text-accent-text underline-offset-4 hover:underline disabled:border-transparent",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

// eslint-disable-next-line react-refresh/only-export-components
export { Button, buttonVariants }
