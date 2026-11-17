import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/use-auth'
import { getUsersRoute } from '@/features/clients/types'
import type { DashboardStats } from '../types'

interface StatsCardsProps {
  stats: DashboardStats
}

export function StatsCards({ stats }: StatsCardsProps) {
  const currentUserRole = useAuth((state) => state.user?.role)
  const usersRoute = getUsersRoute(currentUserRole)
  const hasLockedAccounts = stats.lockedAccounts > 0
  const cells = [
    {
      title: 'Recaps pendientes',
      value: stats.pendingRecaps,
      description: 'Pendientes de revisión',
      to: '/recaps?status=SUBMITTED',
      alert: false,
    },
    {
      title: 'Feedback pendiente',
      value: stats.pendingFeedback,
      description: 'Feedback por responder',
      to: '/feedback?status=PENDING',
      alert: false,
    },
    {
      title: 'Cuentas bloqueadas',
      value: stats.lockedAccounts,
      description: hasLockedAccounts ? 'Requieren atención inmediata' : 'Sin alertas activas',
      to: usersRoute,
      alert: hasLockedAccounts,
    },
    {
      title: 'Clientes activos',
      value: stats.activeClients,
      description: `${stats.totalClients} clientes visibles`,
      to: usersRoute,
      alert: false,
    },
  ]

  return (
    <section aria-label="Indicadores">
      <div
        data-slot="figure-strip"
        className="grid grid-cols-2 overflow-hidden border-y border-border-strong lg:grid-flow-col lg:auto-cols-fr lg:grid-cols-none"
      >
        {cells.map((cell) => (
          <Link
            key={cell.title}
            to={cell.to}
            data-tone={cell.alert ? 'danger' : 'default'}
            className="group -ml-px -mt-px flex min-h-11 min-w-0 flex-col border-l border-t border-border px-5 pb-[18px] pt-4 transition-colors hover:bg-muted/40 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
          >
            <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-foreground-muted">
              {cell.alert ? (
                <span aria-hidden="true" className="size-1.5 flex-none rounded-full bg-destructive" />
              ) : null}
              <span className="min-w-0 flex-1 break-words">{cell.title}</span>
              <ArrowUpRight
                aria-hidden="true"
                className="size-3.5 flex-none text-foreground-muted transition-colors group-hover:text-foreground"
              />
            </span>
            <span
              className={cn(
                'mt-3.5 font-display text-4xl font-extrabold uppercase leading-none tabular-nums',
                cell.alert ? 'text-destructive' : 'text-foreground',
              )}
            >
              {cell.value}
            </span>
            <span className="mt-2.5 text-xs leading-4 text-foreground-muted">{cell.description}</span>
          </Link>
        ))}
      </div>
    </section>
  )
}
