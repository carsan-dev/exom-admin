import * as React from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Shows a `current/max` counter below the field (max = native `maxLength`). */
  showCount?: boolean
}

const textareaClass =
  'flex min-h-22 w-full resize-y rounded-md border border-input bg-input px-3 py-2 text-sm leading-normal text-foreground transition-[border-color,background-color] duration-(--dur-fast) ease-(--ease-out) placeholder:text-muted-foreground hover:border-control-border-hover focus-visible:border-focus focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus aria-invalid:border-status-error read-only:bg-transparent disabled:cursor-not-allowed disabled:border-border disabled:bg-transparent disabled:text-muted-foreground disabled:hover:border-border'

const lengthOf = (value: unknown): number => {
  if (value === undefined || value === null) return 0
  if (Array.isArray(value)) return value.join('').length
  return String(value).length
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      showCount = false,
      value,
      defaultValue,
      onChange,
      maxLength,
      'aria-describedby': describedBy,
      ...props
    },
    ref
  ) => {
    const counterId = React.useId()
    const [uncontrolledLength, setUncontrolledLength] = React.useState(() =>
      lengthOf(defaultValue)
    )

    if (!showCount) {
      return (
        <textarea
          {...props}
          ref={ref}
          className={cn(textareaClass, className)}
          value={value}
          defaultValue={defaultValue}
          onChange={onChange}
          maxLength={maxLength}
          aria-describedby={describedBy}
        />
      )
    }

    const isControlled = value !== undefined
    const count = isControlled ? lengthOf(value) : uncontrolledLength
    const atLimit = maxLength !== undefined && count >= maxLength
    const nearLimit =
      maxLength !== undefined && count >= Math.floor(maxLength * 0.9)

    return (
      <div className="flex w-full flex-col">
        <textarea
          {...props}
          ref={ref}
          className={cn(textareaClass, className)}
          value={value}
          defaultValue={defaultValue}
          maxLength={maxLength}
          onChange={(event) => {
            if (!isControlled) setUncontrolledLength(event.target.value.length)
            onChange?.(event)
          }}
          aria-describedby={
            describedBy ? `${describedBy} ${counterId}` : counterId
          }
        />
        <span
          id={counterId}
          aria-live={atLimit ? 'polite' : 'off'}
          className={cn(
            'mt-1.5 ml-auto text-xs leading-4 tabular-nums',
            nearLimit ? 'text-status-warning' : 'text-muted-foreground'
          )}
        >
          {maxLength !== undefined ? `${count}/${maxLength}` : count}
        </span>
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'

export { Textarea }
