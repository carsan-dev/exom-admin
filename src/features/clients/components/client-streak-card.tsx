import type { ReactNode } from 'react'
import { FigureStrip } from '@/components/page'
import { Skeleton } from '@/components/ui/skeleton'
import type { Streak } from '../types'

interface ClientStreakCardProps {
  streak: Streak | null | undefined
  isLoading?: boolean
  action?: ReactNode
}

const dateFormatter = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC',
})

/** Read-only canonical presentation. Actions remain owned by the route. */
export function ClientStreakCard({ streak, isLoading, action }: ClientStreakCardProps) {
  return <section aria-label="Racha del cliente" className="space-y-6">
    <div className="space-y-2">
      <h2 className="text-xl font-semibold leading-7 text-foreground">Racha del cliente</h2>
      <p className="max-w-prose text-sm text-foreground-secondary">Racha actual y mejor récord registrado, en días. Estos contadores no se filtran por el periodo de métricas.</p>
    </div>
    {isLoading ? <Skeleton className="h-24 w-full" /> : !streak ?
      <p className="max-w-prose text-sm text-foreground-secondary">{streak === null ? 'El cliente todavía no tiene una racha registrada.' : 'Racha no disponible.'} No equivale a una racha de cero días.</p> : <>
        <FigureStrip
          aria-label="Contadores de racha"
          className="lg:grid-flow-row lg:auto-cols-auto lg:grid-cols-3"
          items={[
            { label: 'Racha actual', value: `${streak.current_days} días` },
            { label: 'Mejor récord', value: `${streak.longest_days} días` },
            { label: 'Última actividad · UTC', value: streak.last_active_date ? dateFormatter.format(new Date(streak.last_active_date)) : 'Fecha no disponible' },
          ]}
        />
        <p className="max-w-prose text-sm text-foreground-secondary">No se dispone del historial de rachas ni de los motivos de interrupción. La última actividad no permite reconstruir qué ocurrió en los días anteriores.</p>
        {action ? <div className="flex flex-wrap items-center gap-2">{action}</div> : null}
      </>}
  </section>
}
