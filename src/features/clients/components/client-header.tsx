import { CalendarClock, Mail } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { getUserDisplayName, LEVEL_LABELS, ROLE_LABELS, type ClientDetail } from '../types'

interface ClientHeaderProps {
  client: ClientDetail
}

const dateFormatter = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
})

function getInitials(client: ClientDetail) {
  const firstName = client.profile?.first_name?.[0] ?? ''
  const lastName = client.profile?.last_name?.[0] ?? ''
  const initials = `${firstName}${lastName}`.trim().toUpperCase()

  return initials || client.email.slice(0, 2).toUpperCase()
}

export function ClientHeader({ client }: ClientHeaderProps) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-none [isolation:isolate] [backface-visibility:hidden] [-webkit-backface-visibility:hidden] sm:shadow-sm">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16 border border-border/60 shadow-sm">
            <AvatarImage src={client.profile?.avatar_url ?? undefined} alt={getUserDisplayName(client)} />
            <AvatarFallback className="text-lg font-semibold">{getInitials(client)}</AvatarFallback>
          </Avatar>

          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-brand-primary">Perfil de cliente</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
                {getUserDisplayName(client)}
              </h1>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="border-brand-soft/40 bg-brand-soft/10 text-brand-primary">
                {ROLE_LABELS[client.role]}
              </Badge>
              <Badge
                variant="outline"
                className={
                  client.is_locked
                    ? 'border-status-error/30 bg-status-error/10 text-status-error'
                    : client.is_active
                      ? 'border-status-success/30 bg-status-success/10 text-status-success'
                      : 'border-border bg-muted text-muted-foreground'
                }
              >
                {client.is_locked ? 'Bloqueada' : client.is_active ? 'Activa' : 'Inactiva'}
              </Badge>
              {client.profile?.level && (
                <Badge variant="outline" className="border-status-info/30 bg-status-info/10 text-status-info">
                  {LEVEL_LABELS[client.profile.level]}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2 lg:min-w-[280px]">
          <div className="rounded-xl border border-border/60 bg-background/50 p-3">
            <div className="flex items-center gap-2 text-foreground">
              <Mail className="h-4 w-4 text-brand-primary" />
              <span className="font-medium">Email</span>
            </div>
            <p className="mt-2 break-all">{client.email}</p>
          </div>

          <div className="rounded-xl border border-border/60 bg-background/50 p-3">
            <div className="flex items-center gap-2 text-foreground">
              <CalendarClock className="h-4 w-4 text-brand-primary" />
              <span className="font-medium">Alta</span>
            </div>
            <p className="mt-2">{dateFormatter.format(new Date(client.created_at))}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
