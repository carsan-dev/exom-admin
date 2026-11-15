import * as React from 'react'
import { cn } from '@/lib/utils'

export interface SwitchProps
  extends Omit<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    'type' | 'role' | 'value' | 'defaultChecked'
  > {
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
  /** When set, a hidden input submits `value` (default "on") while the switch is on. */
  name?: string
  value?: string
}

const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  (
    {
      className,
      checked,
      defaultChecked = false,
      onCheckedChange,
      onClick,
      name,
      value = 'on',
      disabled,
      ...props
    },
    ref
  ) => {
    const [internal, setInternal] = React.useState(defaultChecked)
    const isOn = checked ?? internal

    return (
      <>
        <button
          {...props}
          ref={ref}
          type="button"
          role="switch"
          aria-checked={isOn}
          data-state={isOn ? 'checked' : 'unchecked'}
          disabled={disabled}
          onClick={(event) => {
            onClick?.(event)
            if (event.defaultPrevented) return
            if (checked === undefined) setInternal(!isOn)
            onCheckedChange?.(!isOn)
          }}
          className={cn(
            'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-input bg-secondary transition-[background-color,border-color] duration-(--dur-base) ease-(--ease-out) hover:border-control-border-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus aria-checked:border-accent-line aria-checked:bg-primary disabled:cursor-not-allowed disabled:border-border disabled:bg-transparent disabled:hover:border-border',
            "max-md:after:absolute max-md:after:content-[''] max-md:after:inset-x-[min(0px,calc(50%-22px))] max-md:after:inset-y-[min(0px,calc(50%-22px))]",
            className
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              'pointer-events-none block size-3.5 translate-x-0.5 rounded-full bg-foreground-secondary transition-[transform,translate,background-color] duration-(--dur-base) ease-(--ease-out)',
              isOn && 'translate-x-[18px] bg-primary-foreground',
              disabled && 'bg-muted-foreground'
            )}
          />
        </button>
        {name && isOn ? (
          <input type="hidden" name={name} value={value} disabled={disabled} />
        ) : null}
      </>
    )
  }
)
Switch.displayName = 'Switch'

export { Switch }
