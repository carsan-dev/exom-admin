import { cn } from '@/lib/utils'

interface CharCounterProps {
  /** What is being counted, used in the accessible announcement (e.g. "título"). */
  label: string
  count: number
  max: number
}

/**
 * `N/max` counter. It is announced politely only when the field is near or over its limit,
 * so it does not read out every keystroke. Over the limit it turns red and says so in text.
 */
export function CharCounter({ label, count, max }: CharCounterProps) {
  const isOver = count > max
  const isNear = count >= Math.floor(max * 0.9)

  return (
    <p
      data-testid={`counter-${label}`}
      aria-live={isNear ? 'polite' : 'off'}
      className={cn(
        'text-right text-xs leading-4 tabular-nums',
        isOver ? 'font-semibold text-status-error' : isNear ? 'text-status-warning' : 'text-foreground-muted',
      )}
    >
      <span className="sr-only">Caracteres del {label}: </span>
      <span>
        {count}/{max}
      </span>
      {isOver ? <span className="sr-only"> (límite superado)</span> : null}
    </p>
  )
}
