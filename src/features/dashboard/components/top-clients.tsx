import { Flame } from 'lucide-react'
import { Link } from 'react-router'
import { EmptyState } from '@/components/page'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/use-auth'
import { getClientDetailRoute } from '@/features/clients/types'
import type { TopClient } from '../types'

interface TopClientsProps {
  clients: TopClient[]
}

const WEEK_DAYS = 7

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function TopClients({ clients }: TopClientsProps) {
  const currentUserRole = useAuth((state) => state.user?.role)

  return (
    <section aria-labelledby="dashboard-top-title" className="min-w-0">
      <div className="mb-3 space-y-1 border-b border-border-strong pb-3">
        <h2
          id="dashboard-top-title"
          className="font-display text-xl font-extrabold uppercase leading-none text-foreground"
        >
          Top clientes
        </h2>
        <p className="text-[13px] leading-5 text-foreground-secondary">
          Ranking semanal por días de entrenamiento completados.
        </p>
      </div>

      {clients.length === 0 ? (
        <EmptyState className="pb-10 pt-8" title="Aún no hay entrenamientos completados esta semana." />
      ) : (
        <ol className="divide-y divide-border">
          {clients.map((client, index) => (
            <li key={client.clientId}>
              <Link
                to={getClientDetailRoute(client.clientId, currentUserRole)}
                className="flex min-h-11 items-center gap-3 py-3 transition-colors hover:bg-muted/40"
              >
                <span className="w-5 flex-none text-center font-display text-lg font-extrabold tabular-nums text-foreground-muted">
                  {index + 1}
                </span>

                <Avatar className="size-8">
                  <AvatarImage src={client.clientAvatar ?? undefined} alt={client.clientName} />
                  <AvatarFallback className="text-xs">{getInitials(client.clientName)}</AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1 space-y-1">
                  <p className="truncate text-sm font-medium text-foreground">{client.clientName}</p>
                  <div className="flex items-center gap-2">
                    <span aria-hidden="true" className="flex flex-none gap-0.5">
                      {Array.from({ length: WEEK_DAYS }).map((_, day) => (
                        <i
                          key={day}
                          className={cn(
                            'block h-1.5 w-3 flex-none',
                            day < Math.min(client.completedDays, WEEK_DAYS) ? 'bg-brand-primary' : 'bg-border',
                          )}
                        />
                      ))}
                    </span>
                    <span className="min-w-0 text-xs text-foreground-muted">
                      {client.completedDays}/7 días completados
                    </span>
                  </div>
                </div>

                <span className="inline-flex flex-none items-center gap-1 text-sm font-medium tabular-nums text-status-warning">
                  <Flame aria-hidden="true" className="size-4" />
                  {client.currentStreak} días
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
