import * as React from 'react'
import { cn } from '@/lib/utils'

export interface SegmentedOption<T extends string = string> {
  value: T
  label: React.ReactNode
  disabled?: boolean
}

export interface SegmentedControlProps<T extends string = string>
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange' | 'role'> {
  value: T
  onValueChange?: (value: T) => void
  options: SegmentedOption<T>[]
  size?: 'default' | 'sm'
  disabled?: boolean
  ref?: React.Ref<HTMLDivElement>
}

/** Exactly-one-selected group of toggle buttons (`aria-pressed`). React 19: `ref` is a plain prop. */
function SegmentedControl<T extends string = string>({
  value,
  onValueChange,
  options,
  size = 'default',
  disabled = false,
  className,
  ...props
}: SegmentedControlProps<T>) {
  return (
    <div
      {...props}
      role="group"
      className={cn(
        'inline-flex flex-none items-center gap-0.5 rounded-full border border-border-strong p-1',
        className
      )}
    >
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            disabled={disabled || option.disabled}
            onClick={() => {
              if (!selected) onValueChange?.(option.value)
            }}
            className={cn(
              'relative inline-flex items-center justify-center rounded-full border border-transparent px-3.5 text-[13px] font-semibold whitespace-nowrap text-foreground-secondary transition-[background-color,color,border-color] duration-(--dur-fast) ease-(--ease-out) hover:bg-card hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus disabled:cursor-not-allowed disabled:text-muted-foreground disabled:hover:bg-transparent',
              "max-md:after:absolute max-md:after:content-[''] max-md:after:inset-x-0 max-md:after:inset-y-[min(0px,calc(50%-22px))]",
              size === 'sm' ? 'h-6' : 'h-[26px]',
              selected &&
                'border-accent-line bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground disabled:border-border disabled:bg-transparent disabled:text-muted-foreground disabled:hover:bg-transparent'
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export { SegmentedControl }
