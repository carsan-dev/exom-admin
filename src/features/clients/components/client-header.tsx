import { CalendarClock, Mail } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { getUserDisplayName, LEVEL_LABELS, ROLE_LABELS, type ClientDetail } from '../types'

interface ClientHeaderProps {
  client: ClientDetail
}

const dateFormatter = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit', month: 'long', year: 'numeric',
})

function getInitials(client: ClientDetail) {
  const firstName = client.profile?.first_name?.[0] ?? ''
  const lastName = client.profile?.last_name?.[0] ?? ''
  const initials = `${firstName}${lastName}`.trim().toUpperCase()
  return initials || client.email.slice(0, 2).toUpperCase()
}

export function ClientHeader({ client }: ClientHeaderProps) {
  return (
    <section aria-label="Perfil de cliente" className="rounded-2xl border border-border/70 bg-card p-4 text-foreground sm:p-5">
      <div className="flex items-start gap-3">
        <Avatar className="h-12 w-12 shrink-0 border border-border/60">
          <AvatarImage src={client.profile?.avatar_url ?? undefined} alt={getUserDisplayName(client)} />
          <AvatarFallback className="font-semibold">{getInitials(client)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 space-y-2">
          <h1 className="break-words text-xl font-semibold tracking-tight sm:text-2xl">{getUserDisplayName(client)}</h1>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="border-brand-soft/40 bg-brand-soft/10 text-foreground">{ROLE_LABELS[client.role]}</Badge>
            <Badge variant="outline" className={client.is_locked
              ? 'border-status-error/30 bg-status-error/10 text-foreground'
              : client.is_active ? 'border-status-success/30 bg-status-success/10 text-foreground'
                : 'border-border bg-muted text-foreground'}>
              {client.is_locked ? 'Bloqueada' : client.is_active ? 'Activa' : 'Inactiva'}
            </Badge>
            {client.profile?.level && <Badge variant="outline" className="border-status-info/30 bg-status-info/10 text-foreground">{LEVEL_LABELS[client.profile.level]}</Badge>}
          </div>
        </div>
      </div>
      <details className="mt-3 border-t border-border/60 pt-2">
        <summary className="min-h-11 cursor-pointer content-center rounded text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Datos de contacto y alta</summary>
        <dl className="grid gap-3 pb-2 pt-2 text-sm sm:grid-cols-2">
          <div><dt className="flex items-center gap-2 font-medium"><Mail className="h-4 w-4" />Email</dt><dd className="mt-1 break-all">{client.email}</dd></div>
          <div><dt className="flex items-center gap-2 font-medium"><CalendarClock className="h-4 w-4" />Alta</dt><dd className="mt-1">{dateFormatter.format(new Date(client.created_at))}</dd></div>
        </dl>
      </details>
    </section>
  )
}
