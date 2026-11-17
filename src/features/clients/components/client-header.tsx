import { CalendarClock, Mail } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { PageHeader } from '@/components/page'
import { StatusChip } from '@/components/ui/status-chip'
import { Tag } from '@/components/ui/tag'
import { getUserStatus } from './user-display'
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
  const status = getUserStatus(client)
  const name = getUserDisplayName(client)

  return (
    <section aria-label="Perfil de cliente" className="min-w-0 text-foreground">
      <div className="flex items-start gap-4">
        <Avatar className="h-14 w-14 shrink-0 border border-border/60">
          <AvatarImage src={client.profile?.avatar_url ?? undefined} alt={name} />
          <AvatarFallback className="font-semibold">{getInitials(client)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <PageHeader
            className="mb-3 min-w-0 md:mb-3 [&_h1]:min-w-0 [&_h1]:[overflow-wrap:anywhere]"
            eyebrow="Gestión de usuarios"
            title={<span className="[overflow-wrap:anywhere]">{name}</span>}
          />
          <div className="flex flex-wrap items-center gap-2">
            <StatusChip variant="neutral" dot={false}>{ROLE_LABELS[client.role]}</StatusChip>
            <StatusChip variant={status.variant}>{status.label}</StatusChip>
            {client.profile?.level && <Tag>{LEVEL_LABELS[client.profile.level]}</Tag>}
          </div>
        </div>
      </div>
      <details className="mt-4 border-t border-border">
        <summary className="min-h-11 cursor-pointer content-center rounded text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Datos de contacto y alta</summary>
        <dl className="grid gap-4 pb-3 pt-2 text-sm sm:grid-cols-2">
          <div className="min-w-0"><dt className="flex items-center gap-2 font-semibold text-foreground-secondary"><Mail aria-hidden="true" className="h-4 w-4" />Email</dt><dd className="mt-1 [overflow-wrap:anywhere]">{client.email}</dd></div>
          <div className="min-w-0"><dt className="flex items-center gap-2 font-semibold text-foreground-secondary"><CalendarClock aria-hidden="true" className="h-4 w-4" />Alta</dt><dd className="mt-1">{dateFormatter.format(new Date(client.created_at))}</dd></div>
        </dl>
      </details>
    </section>
  )
}
