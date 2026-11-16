import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { Dumbbell, FileText, MessageSquare, UserPlus } from 'lucide-react'
import { Link } from 'react-router'
import { EmptyState } from '@/components/page'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth } from '@/hooks/use-auth'
import { getUsersRoute } from '@/features/clients/types'
import type { RecentActivityItem } from '../types'

interface RecentActivityProps {
  items: RecentActivityItem[]
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function getActivityLink(item: RecentActivityItem, usersRoute: string) {
  switch (item.type) {
    case 'recap_submitted':
      return `/recaps?clientId=${item.clientId}&status=SUBMITTED`
    case 'feedback_sent':
      return `/feedback?clientId=${item.clientId}&status=PENDING`
    case 'progress_completed':
      return `/progress?clientId=${item.clientId}`
    case 'client_created':
      return usersRoute
  }
}

function getActivityIcon(type: RecentActivityItem['type']) {
  switch (type) {
    case 'recap_submitted':
      return FileText
    case 'feedback_sent':
      return MessageSquare
    case 'progress_completed':
      return Dumbbell
    case 'client_created':
      return UserPlus
  }
}

export function RecentActivity({ items }: RecentActivityProps) {
  const currentUserRole = useAuth((state) => state.user?.role)
  const usersRoute = getUsersRoute(currentUserRole)

  return (
    <section aria-labelledby="dashboard-activity-title" className="min-w-0">
      <div className="mb-3 space-y-1 border-b border-border-strong pb-3">
        <h2
          id="dashboard-activity-title"
          className="font-display text-xl font-extrabold uppercase leading-none text-foreground"
        >
          Actividad reciente
        </h2>
        <p className="text-[13px] leading-5 text-foreground-secondary">
          Últimos movimientos relevantes de tus clientes.
        </p>
      </div>

      {items.length === 0 ? (
        <EmptyState
          className="pb-10 pt-8"
          title="Todavía no hay actividad reciente para mostrar."
        />
      ) : (
        <ul className="divide-y divide-border">
          {items.map((item) => {
            const Icon = getActivityIcon(item.type)

            return (
              <li
                key={item.id}
                className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <Avatar className="size-8">
                    <AvatarImage src={item.clientAvatar ?? undefined} alt={item.clientName} />
                    <AvatarFallback className="text-xs">{getInitials(item.clientName)}</AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 space-y-0.5">
                    <div className="flex min-w-0 items-center gap-2 text-sm font-medium text-foreground">
                      <Icon aria-hidden="true" className="size-3.5 flex-none text-foreground-muted" />
                      <span className="min-w-0 break-words">{item.clientName}</span>
                    </div>
                    <p className="break-words text-[13px] leading-5 text-foreground-secondary">
                      {item.description}
                    </p>
                  </div>
                </div>

                <div className="flex flex-none items-center justify-between gap-4 pl-11 sm:flex-col sm:items-end sm:gap-1 sm:pl-0">
                  <p className="text-xs tabular-nums text-foreground-muted">
                    {formatDistanceToNow(new Date(item.createdAt), {
                      addSuffix: true,
                      locale: es,
                    })}
                  </p>
                  <Link
                    className="inline-flex min-h-11 items-center text-sm font-medium text-accent-text hover:underline md:min-h-0"
                    to={getActivityLink(item, usersRoute)}
                  >
                    Ver todos
                  </Link>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
