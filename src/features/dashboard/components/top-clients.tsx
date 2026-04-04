import { Flame, Trophy } from 'lucide-react'
import { Link } from 'react-router'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { TopClient } from '../types'

interface TopClientsProps {
  clients: TopClient[]
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function TopClients({ clients }: TopClientsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Trophy className="h-5 w-5 text-status-warning" />
          Top clientes
        </CardTitle>
        <CardDescription>Ranking semanal por días de entrenamiento completados.</CardDescription>
      </CardHeader>
      <CardContent>
        {clients.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
            Aún no hay entrenamientos completados esta semana.
          </div>
        ) : (
          <div className="space-y-3">
            {clients.map((client, index) => {
              const progressWidth = `${Math.min((client.completedDays / 7) * 100, 100)}%`

              return (
                <Link
                  key={client.clientId}
                  to={`/clients/${client.clientId}`}
                  className="block rounded-xl border border-border/70 p-4 transition-colors hover:border-brand-primary/40"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-soft/20 text-sm font-semibold text-brand-primary">
                      {index + 1}
                    </div>

                    <Avatar className="h-10 w-10">
                      <AvatarImage src={client.clientAvatar ?? undefined} alt={client.clientName} />
                      <AvatarFallback>{getInitials(client.clientName)}</AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{client.clientName}</p>
                      <div className="mt-2 h-2 rounded-full bg-muted">
                        <div className="h-2 rounded-full bg-brand-primary" style={{ width: progressWidth }} />
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">{client.completedDays}/7 días completados</span>
                    <span className="inline-flex items-center gap-1 font-medium text-status-warning">
                      <Flame className="h-4 w-4" />
                      {client.currentStreak} días
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
