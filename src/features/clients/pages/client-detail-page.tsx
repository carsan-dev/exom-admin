import { useState } from 'react'
import { ArrowLeft, AlertTriangle, CalendarDays, ShieldCheck, Unlock } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'
import { getApiErrorMessage, getApiErrorStatus, useClientProfile } from '../api'
import { ChangeRoleDialog } from '../components/change-role-dialog'
import { ClientHeader } from '../components/client-header'
import { ClientInfoTab } from '../components/client-info-tab'
import { ClientMetricsTab } from '../components/client-metrics-tab'
import { ClientStreakCard } from '../components/client-streak-card'
import { UnlockDialog } from '../components/unlock-dialog'

function DetailPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-28" />
        <Skeleton className="h-8 w-40" />
      </div>
      <Skeleton className="h-52 w-full rounded-2xl" />
      <Skeleton className="h-12 w-full rounded-xl" />
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-40 rounded-xl md:col-span-2" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    </div>
  )
}

function getErrorCopy(errorStatus: number | undefined, currentUserRole?: string) {
  if (errorStatus === 403) {
    return {
      title: 'Cliente no asignado',
      message:
        currentUserRole === 'ADMIN'
          ? 'Solo puedes abrir perfiles de clientes asignados a tu cuenta. Vuelve al listado para revisar tu cartera actual.'
          : 'No tienes permisos para abrir este perfil desde tu sesión actual.',
      toneClass: 'bg-status-warning/10 text-status-warning',
      canRetry: false,
    }
  }

  if (errorStatus === 404) {
    return {
      title: 'Cliente no encontrado',
      message: 'No hemos encontrado el cliente solicitado o este enlace ya no corresponde a un perfil de cliente.',
      toneClass: 'bg-muted text-muted-foreground',
      canRetry: false,
    }
  }

  if (errorStatus === 500) {
    return {
      title: 'Error del servidor',
      message: 'El servidor no ha podido cargar el perfil del cliente. Inténtalo de nuevo en unos segundos.',
      toneClass: 'bg-status-error/10 text-status-error',
      canRetry: true,
    }
  }

  return {
    title: 'Error al cargar el perfil',
    message: 'No se ha podido cargar el perfil del cliente.',
    toneClass: 'bg-status-error/10 text-status-error',
    canRetry: true,
  }
}

export function ClientDetailPage() {
  const { id } = useParams()
  const currentUserRole = useAuth((state) => state.user?.role)
  const [unlockDialogOpen, setUnlockDialogOpen] = useState(false)
  const [changeRoleDialogOpen, setChangeRoleDialogOpen] = useState(false)

  const clientProfile = useClientProfile(id)
  const errorStatus = getApiErrorStatus(clientProfile.error)

  if (clientProfile.isLoading) {
    return <DetailPageSkeleton />
  }

  if (clientProfile.isError || !clientProfile.data) {
    const errorCopy = getErrorCopy(errorStatus, currentUserRole)
    const message =
      errorStatus === 500 || errorStatus === 403 || errorStatus === 404
        ? errorCopy.message
        : getApiErrorMessage(clientProfile.error, errorCopy.message)

    return (
      <Card className="border-border/70">
        <CardContent className="flex flex-col items-center gap-4 pt-8 text-center">
          <div className={cn('rounded-full p-4', errorCopy.toneClass)}>
            <AlertTriangle className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-foreground">{errorCopy.title}</h1>
            <p className="max-w-xl text-sm text-muted-foreground">{message}</p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <Button variant="outline" asChild>
              <Link to="/clients">
                <ArrowLeft className="h-4 w-4" />
                Volver a clientes
              </Link>
            </Button>
            {errorCopy.canRetry && <Button onClick={() => clientProfile.refetch()}>Reintentar</Button>}
          </div>
        </CardContent>
      </Card>
    )
  }

  const client = clientProfile.data

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" asChild>
          <Link to="/clients">
            <ArrowLeft className="h-4 w-4" />
            Volver a clientes
          </Link>
        </Button>

        <div className="flex flex-wrap gap-3">
          <Button variant="outline" asChild>
            <Link to={`/assignments?clientId=${client.id}`}>
              <CalendarDays className="h-4 w-4" />
              Planificar asignaciones
            </Link>
          </Button>
          {client.is_locked && (
            <Button variant="outline" onClick={() => setUnlockDialogOpen(true)}>
              <Unlock className="h-4 w-4" />
              Desbloquear
            </Button>
          )}
          {currentUserRole === 'SUPER_ADMIN' && (
            <Button variant="outline" onClick={() => setChangeRoleDialogOpen(true)}>
              <ShieldCheck className="h-4 w-4" />
              Cambiar rol
            </Button>
          )}
        </div>
      </div>

      <ClientHeader client={client} />

      <Tabs defaultValue="info" className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-1 gap-2 bg-transparent p-0 sm:grid-cols-3">
          <TabsTrigger className="rounded-xl border border-border bg-card py-3 data-[state=active]:border-brand-primary/40 data-[state=active]:bg-brand-soft/10 data-[state=active]:text-brand-primary" value="info">
            Info general
          </TabsTrigger>
          <TabsTrigger className="rounded-xl border border-border bg-card py-3 data-[state=active]:border-brand-primary/40 data-[state=active]:bg-brand-soft/10 data-[state=active]:text-brand-primary" value="metrics">
            Métricas
          </TabsTrigger>
          <TabsTrigger className="rounded-xl border border-border bg-card py-3 data-[state=active]:border-brand-primary/40 data-[state=active]:bg-brand-soft/10 data-[state=active]:text-brand-primary" value="streak">
            Racha
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <ClientInfoTab profile={client.profile} />
        </TabsContent>
        <TabsContent value="metrics">
          <ClientMetricsTab metrics={client.bodyMetrics} />
        </TabsContent>
        <TabsContent value="streak">
          <ClientStreakCard streak={client.streak} />
        </TabsContent>
      </Tabs>

      <UnlockDialog client={client} open={unlockDialogOpen} onOpenChange={setUnlockDialogOpen} />
      <ChangeRoleDialog user={client} open={changeRoleDialogOpen} onOpenChange={setChangeRoleDialogOpen} />
    </div>
  )
}
