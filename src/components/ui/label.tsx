import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const labelVariants = cva(
  "text-[13px] leading-[18px] font-normal text-foreground-secondary peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
)

/**
 * Marca visible de campo obligatorio (RDS-F5-A11Y-15). El asterisco se pinta con
 * `::after` en un span vacío y oculto a lectores: ni el textContent de la etiqueta ni
 * su nombre accesible cambian; la obligatoriedad se anuncia con `aria-required` en el control.
 */
const RequiredMark = () => (
  <span
    aria-hidden="true"
    data-required-mark=""
    className="ml-0.5 text-destructive after:content-['*']"
  />
)

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> &
    VariantProps<typeof labelVariants> & {
      /**
       * Muestra el asterisco de obligatorio. No se combina con `asChild`: el Slot exige un
       * único hijo, así que la marca se añade al hijo (o se usa `RequiredMark`) en ese caso.
       */
      required?: boolean
    }
>(({ className, required = false, children, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(labelVariants(), className)}
    {...props}
  >
    {required ? (
      <>
        {children}
        <RequiredMark />
      </>
    ) : (
      children
    )}
  </LabelPrimitive.Root>
))
Label.displayName = LabelPrimitive.Root.displayName

export { Label, RequiredMark }
