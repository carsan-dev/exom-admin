import { AlertTriangle, RefreshCcw, UserPlus, Users } from 'lucide-react'
import { EmptyState } from '@/components/page'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusChip } from '@/components/ui/status-chip'
import { getApiErrorMessage, useClientAssignments } from '../api'
import { getUserDisplayName } from '../types'

interface ClientAssignedAdminsCardProps {
  clientId: string
  onManage: () => void
}

const assignmentDateFormatter = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

function getAdminInitials(admin: { email: string; profile: { first_name: string; last_name: string } | null }) {
  const firstName = admin.profile?.first_name?.[0] ?? ''
  const lastName = admin.profile?.last_name?.[0] ?? ''
  const initials = `${firstName}${lastName}`.trim().toUpperCase()

  return initials || admin.email.slice(0, 2).toUpperCase()
}

function AssignedAdminsSkeleton() {
  return (
    <div className="space-y-4 py-3">
      <div className="space-y-2">
        <Skeleton className="h-6 w-44" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      {Array.from({ length: 2 }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 border-t border-border pt-4">
          <Skeleton className="h-11 w-11 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-56 max-w-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function ClientAssignedAdminsCard({ clientId, onManage }: ClientAssignedAdminsCardProps) {
  const assignmentsQuery = useClientAssignments(clientId)
  const activeAdmins = assignmentsQuery.data?.active_admins ?? []

  if (assignmentsQuery.isLoading) {
    return <AssignedAdminsSkeleton />
  }

  if (assignmentsQuery.isError) {
    return (
      <div role="group" aria-label="Admins asignados" className="space-y-4 py-3">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Admins asignados</h3>
          <p className="mt-1 text-[13px] leading-5 text-foreground-secondary">No se ha podido cargar la cartera actual del cliente.</p>
        </div>
        <div className="flex flex-col gap-4 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <AlertTriangle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <p className="max-w-xl text-sm text-muted-foreground [overflow-wrap:anywhere]">
              {getApiErrorMessage(assignmentsQuery.error, 'Reintenta para consultar qué admins tiene asignados este cliente.')}
            </p>
          </div>

          <Button type="button" variant="outline" onClick={() => void assignmentsQuery.refetch()}>
            <RefreshCcw className="h-4 w-4" />
            Reintentar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0 flex-[1_1_16rem]">
          <h3 className="text-lg font-semibold text-foreground">Admins asignados</h3>
          <p className="mt-1 text-[13px] leading-5 text-foreground-secondary">
            Visualiza rápidamente la cartera activa antes de abrir la gestión de asignaciones.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <StatusChip variant="brand" dot={false}>
            {activeAdmins.length} admin{activeAdmins.length === 1 ? '' : 's'} activo{activeAdmins.length === 1 ? '' : 's'}
          </StatusChip>
          <Button type="button" variant="outline" onClick={onManage}>
            <Users className="h-4 w-4" />
            Gestionar admins
          </Button>
        </div>
      </div>

      {activeAdmins.length === 0 ? (
        <div className="border-t border-border">
          <EmptyState
            icon={<UserPlus />}
            title="Sin admins asignados"
            description="Este cliente está actualmente sin cartera asignada. Puedes dejarlo así si está pausado o volver a asignarlo cuando retome actividad."
          />
        </div>
      ) : (
        <ul className="border-t border-border">
          {activeAdmins.map((admin) => (
            <li key={admin.id} className="flex items-start gap-3 border-b border-border py-3">
              <Avatar className="h-11 w-11 shrink-0 border border-border/60">
                <AvatarImage src={admin.profile?.avatar_url ?? undefined} alt={getUserDisplayName(admin)} />
                <AvatarFallback>{getAdminInitials(admin)}</AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="min-w-0 font-medium text-foreground [overflow-wrap:anywhere]">{getUserDisplayName(admin)}</p>
                  <StatusChip variant="success">Activo</StatusChip>
                </div>

                <p className="text-sm text-muted-foreground [overflow-wrap:anywhere]">{admin.email}</p>
                <p className="text-xs text-muted-foreground">
                  Asignado desde {assignmentDateFormatter.format(new Date(admin.assigned_at))}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
