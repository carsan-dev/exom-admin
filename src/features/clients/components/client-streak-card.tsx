import type { ReactNode } from 'react'
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
  return <section aria-label="Racha del cliente" className="space-y-6 rounded-lg bg-card p-4 sm:p-6 [--muted-foreground:var(--foreground-secondary)]">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Racha del cliente</h2>
        <p className="max-w-prose text-sm text-muted-foreground">Racha actual y mejor récord registrado, en días. Estos contadores no se filtran por el periodo de métricas.</p>
      </div>
      {!isLoading && streak && action}
    </div>
    {isLoading ? <Skeleton className="h-24 w-full" /> : !streak ?
      <p className="text-sm">{streak === null ? 'El cliente todavía no tiene una racha registrada.' : 'Racha no disponible.'} No equivale a una racha de cero días.</p> : <>
        <dl className="grid gap-6 border-y border-border py-5 sm:grid-cols-3">
          <div><dt className="text-sm text-muted-foreground">Racha actual</dt><dd className="mt-2 text-2xl font-semibold tabular-nums">{streak.current_days} días</dd></div>
          <div><dt className="text-sm text-muted-foreground">Mejor récord</dt><dd className="mt-2 text-2xl font-semibold tabular-nums">{streak.longest_days} días</dd></div>
          <div><dt className="text-sm text-muted-foreground">Última actividad · UTC</dt><dd className="mt-2 text-base font-medium">{streak.last_active_date ? dateFormatter.format(new Date(streak.last_active_date)) : 'Fecha no disponible'}</dd></div>
        </dl>
        <p className="max-w-prose text-sm text-muted-foreground">No se dispone del historial de rachas ni de los motivos de interrupción. La última actividad no permite reconstruir qué ocurrió en los días anteriores.</p>
      </>}
  </section>
}
