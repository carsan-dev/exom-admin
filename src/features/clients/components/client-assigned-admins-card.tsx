import { AlertTriangle, RefreshCcw, UserPlus, Users } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
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
    <Card className="border-border/70">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <Skeleton className="h-10 w-36" />
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="flex items-center gap-3 rounded-xl border border-border/70 p-4">
            <Skeleton className="h-11 w-11 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-56 max-w-full" />
            </div>
            <Skeleton className="h-6 w-24" />
          </div>
        ))}
      </CardContent>
    </Card>
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
      <Card className="border-status-error/20">
        <CardHeader>
          <CardTitle className="text-lg">Admins asignados</CardTitle>
          <CardDescription>No se ha podido cargar la cartera actual del cliente.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-status-error/10 p-3 text-status-error">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <p className="max-w-xl text-sm text-muted-foreground">
              {getApiErrorMessage(assignmentsQuery.error, 'Reintenta para consultar qué admins tiene asignados este cliente.')}
            </p>
          </div>

          <Button type="button" variant="outline" onClick={() => void assignmentsQuery.refetch()}>
            <RefreshCcw className="h-4 w-4" />
            Reintentar
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/70">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-lg">Admins asignados</CardTitle>
          <CardDescription>
            Visualiza rápidamente la cartera activa antes de abrir la gestión de asignaciones.
          </CardDescription>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="outline" className="border-brand-primary/30 bg-brand-soft/10 text-brand-primary">
            {activeAdmins.length} admin{activeAdmins.length === 1 ? '' : 's'} activo{activeAdmins.length === 1 ? '' : 's'}
          </Badge>
          <Button type="button" variant="outline" onClick={onManage}>
            <Users className="h-4 w-4" />
            Gestionar admins
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {activeAdmins.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-8 text-center">
            <div className="rounded-full bg-status-warning/10 p-4 text-status-warning">
              <UserPlus className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="font-medium text-foreground">Sin admins asignados</p>
              <p className="max-w-xl text-sm text-muted-foreground">
                Este cliente está actualmente sin cartera asignada. Puedes dejarlo así si está pausado o volver a asignarlo cuando retome actividad.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {activeAdmins.map((admin) => (
              <div key={admin.id} className="rounded-xl border border-border/70 bg-background/50 p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-11 w-11 border border-border/60">
                    <AvatarImage src={admin.profile?.avatar_url ?? undefined} alt={getUserDisplayName(admin)} />
                    <AvatarFallback>{getAdminInitials(admin)}</AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium text-foreground">{getUserDisplayName(admin)}</p>
                      <Badge variant="outline" className="border-status-success/30 bg-status-success/10 text-status-success">
                        Activo
                      </Badge>
                    </div>

                    <p className="truncate text-sm text-muted-foreground">{admin.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Asignado desde {assignmentDateFormatter.format(new Date(admin.assigned_at))}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
