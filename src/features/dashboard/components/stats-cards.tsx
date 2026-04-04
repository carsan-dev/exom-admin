import { AlertTriangle, FileText, MessageSquare, Users } from 'lucide-react'
import { Link } from 'react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { DashboardStats } from '../types'

interface StatsCardsProps {
  stats: DashboardStats
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      title: 'Clientes activos',
      value: stats.activeClients,
      description: `${stats.totalClients} clientes visibles`,
      icon: Users,
      to: '/clients',
      valueClassName: 'text-brand-primary',
    },
    {
      title: 'Recaps pendientes',
      value: stats.pendingRecaps,
      description: 'Pendientes de revisión',
      icon: FileText,
      to: '/recaps?status=SUBMITTED',
      valueClassName: 'text-status-info',
    },
    {
      title: 'Feedback pendiente',
      value: stats.pendingFeedback,
      description: 'Feedback por responder',
      icon: MessageSquare,
      to: '/feedback?status=PENDING',
      valueClassName: 'text-status-warning',
    },
    {
      title: 'Cuentas bloqueadas',
      value: stats.lockedAccounts,
      description:
        stats.lockedAccounts > 0 ? 'Requieren atención inmediata' : 'Sin alertas activas',
      icon: AlertTriangle,
      to: '/clients',
      valueClassName: stats.lockedAccounts > 0 ? 'text-status-error' : 'text-foreground',
      cardClassName:
        stats.lockedAccounts > 0
          ? 'border-status-error/40 bg-status-error/5'
          : 'border-border hover:border-border/80',
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon

        return (
          <Link key={card.title} to={card.to} className="block">
            <Card className={`h-full transition-colors hover:border-brand-primary/40 ${card.cardClassName ?? ''}`}>
              <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
                  <p className={`text-3xl font-semibold ${card.valueClassName}`}>{card.value}</p>
                </div>
                <div className="rounded-full bg-muted p-2 text-muted-foreground">
                  <Icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{card.description}</p>
              </CardContent>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}
