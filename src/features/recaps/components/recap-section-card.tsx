import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface RecapSectionCardProps {
  title: string
  description: string
  action?: ReactNode
  /** Sin filete superior: para el primer bloque bajo una fila de pestañas. */
  flush?: boolean
  children: ReactNode
}

/** Sección con filete superior y título de sección; sustituye a la tarjeta enmarcada. */
export function RecapSectionCard({ title, description, action, flush = false, children }: RecapSectionCardProps) {
  return (
    <section className={cn('min-w-0', !flush && 'border-t border-border pt-6')}>
      <div className="mb-4 flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h3 className="font-display text-xl font-extrabold uppercase leading-none text-foreground">{title}</h3>
          <p className="text-[13px] leading-5 text-foreground-secondary">{description}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}
