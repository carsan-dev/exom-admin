import { useState } from 'react'
import { cn } from '@/lib/utils'

interface CharCounterProps {
  /** What is being counted, used in the accessible announcement (e.g. "título"). */
  label: string
  count: number
  max: number
}

type CounterTier = 'ok' | 'near' | 'over'

function getTier(count: number, max: number): CounterTier {
  if (count > max) return 'over'
  return count >= Math.floor(max * 0.9) ? 'near' : 'ok'
}

function getAnnouncement(previous: CounterTier, next: CounterTier, remaining: number): string {
  if (next === 'over') return 'Límite superado'
  if (previous === 'over') return 'Dentro del límite'
  if (next === 'near') return `Quedan ${remaining} caracteres`
  return ''
}

/**
 * `N/max` counter. The visible counter is not a live region (it would read every keystroke);
 * a separate `sr-only` status region announces only when the count crosses a threshold:
 * reaching 90 %, exceeding the limit, or getting back within it.
 */
export function CharCounter({ label, count, max }: CharCounterProps) {
  const isOver = count > max
  const tier = getTier(count, max)
  const [announced, setAnnounced] = useState<{ tier: CounterTier; text: string }>({ tier, text: '' })

  if (announced.tier !== tier) {
    setAnnounced({ tier, text: getAnnouncement(announced.tier, tier, max - count) })
  }

  return (
    <div>
      <p
        data-testid={`counter-${label}`}
        className={cn(
          'text-right text-xs leading-4 tabular-nums',
          isOver ? 'font-semibold text-status-error' : tier === 'near' ? 'text-status-warning' : 'text-foreground-muted',
        )}
      >
        <span className="sr-only">Caracteres del {label}: </span>
        <span>
          {count}/{max}
        </span>
        {isOver ? <span className="sr-only"> (límite superado)</span> : null}
      </p>
      <p role="status" data-testid={`counter-status-${label}`} className="sr-only">
        {announced.text}
      </p>
    </div>
  )
}
