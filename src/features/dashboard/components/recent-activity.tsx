import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { Dumbbell, FileText, MessageSquare, UserPlus } from 'lucide-react'
import { Link } from 'react-router'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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

function getActivityLink(item: RecentActivityItem) {
  switch (item.type) {
    case 'recap_submitted':
      return `/recaps?clientId=${item.clientId}&status=SUBMITTED`
    case 'feedback_sent':
      return `/feedback?clientId=${item.clientId}&status=PENDING`
    case 'progress_completed':
      return `/progress?clientId=${item.clientId}`
    case 'client_created':
      return '/clients'
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
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Actividad reciente</CardTitle>
        <CardDescription>Últimos movimientos relevantes de tus clientes.</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
            Todavía no hay actividad reciente para mostrar.
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => {
              const Icon = getActivityIcon(item.type)

              return (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 rounded-xl border border-border/70 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="h-11 w-11">
                      <AvatarImage src={item.clientAvatar ?? undefined} alt={item.clientName} />
                      <AvatarFallback>{getInitials(item.clientName)}</AvatarFallback>
                    </Avatar>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <span className="rounded-full bg-muted p-1.5 text-muted-foreground">
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        {item.clientName}
                      </div>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(item.createdAt), {
                        addSuffix: true,
                        locale: es,
                      })}
                    </p>
                    <Link className="text-sm font-medium text-brand-primary hover:underline" to={getActivityLink(item)}>
                      Ver todos
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
