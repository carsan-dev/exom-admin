import * as React from 'react'
import { Check, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface CheckboxProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'type' | 'checked' | 'defaultChecked'
  > {
  /** `true` / `false`, or `'indeterminate'` (mixed, e.g. a table header with a partial selection). */
  checked?: boolean | 'indeterminate'
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  (
    { className, checked, defaultChecked, onCheckedChange, onChange, ...props },
    ref
  ) => {
    const indeterminate = checked === 'indeterminate'

    const setRef = React.useCallback(
      (node: HTMLInputElement | null) => {
        if (node) node.indeterminate = indeterminate
        if (typeof ref === 'function') ref(node)
        else if (ref) ref.current = node
      },
      [ref, indeterminate]
    )

    return (
      <span className="relative inline-grid shrink-0 place-items-center">
        <input
          {...props}
          ref={setRef}
          type="checkbox"
          checked={checked === undefined ? undefined : checked === true}
          defaultChecked={checked === undefined ? defaultChecked : undefined}
          aria-checked={indeterminate ? 'mixed' : undefined}
          onChange={(event) => {
            onChange?.(event)
            onCheckedChange?.(event.target.checked)
          }}
          className={cn(
            'peer relative col-start-1 row-start-1 m-0 size-4 shrink-0 cursor-pointer appearance-none rounded-md border border-input bg-input transition-[border-color,background-color] duration-(--dur-fast) ease-(--ease-out) hover:border-control-border-hover checked:border-accent-line checked:bg-primary indeterminate:border-accent-line indeterminate:bg-primary focus-visible:border-focus focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus aria-invalid:border-status-error disabled:cursor-not-allowed disabled:border-border disabled:bg-transparent disabled:hover:border-border',
            "max-md:after:absolute max-md:after:content-[''] max-md:after:inset-x-[min(0px,calc(50%-22px))] max-md:after:inset-y-[min(0px,calc(50%-22px))]",
            className
          )}
        />
        <Check
          aria-hidden="true"
          strokeWidth={3}
          className="pointer-events-none col-start-1 row-start-1 size-3 text-primary-foreground opacity-0 peer-checked:opacity-100 peer-indeterminate:hidden peer-disabled:text-muted-foreground"
        />
        <Minus
          aria-hidden="true"
          strokeWidth={3}
          className="pointer-events-none col-start-1 row-start-1 hidden size-3 text-primary-foreground peer-indeterminate:block peer-disabled:text-muted-foreground"
        />
      </span>
    )
  }
)
Checkbox.displayName = 'Checkbox'

export { Checkbox }
