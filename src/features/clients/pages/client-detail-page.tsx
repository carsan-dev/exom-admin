import { useState } from 'react'
import { ArrowLeft, CalendarDays, ShieldCheck, Unlock, UserCheck, UserX, Users } from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/page'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/hooks/use-auth'
import { getApiErrorMessage, getApiErrorStatus, useClientProfile } from '../api'
import { ChangeRoleDialog } from '../components/change-role-dialog'
import { ClientAssignedAdminsCard } from '../components/client-assigned-admins-card'
import { ClientHeader } from '../components/client-header'
import { ClientAdherenceTab } from '../components/client-adherence-tab'
import { ClientInfoTab } from '../components/client-info-tab'
import { ManageClientAssignmentsDialog } from '../components/manage-client-assignments-dialog'
import { ClientMetricsTab } from '../components/client-metrics-tab'
import { ClientStreakCard } from '../components/client-streak-card'
import { ToggleUserStatusDialog } from '../components/toggle-user-status-dialog'
import { UnlockDialog } from '../components/unlock-dialog'
import { getUsersRoute } from '../types'

const TAB_TRIGGER_CLASS = 'min-h-11 shrink-0 md:min-h-10'
const CLIENT_TABS = ['info', 'metrics', 'streak', 'adherence'] as const

function DetailPageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <Skeleton className="h-11 w-40" />
      <div className="flex items-center gap-4 border-b border-border pb-6">
        <Skeleton className="size-14 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-3">
          <Skeleton className="h-8 w-56 max-w-full" />
          <Skeleton className="h-5 w-72 max-w-full" />
        </div>
      </div>
      <Skeleton className="h-11 w-full" />
      <div className="grid gap-6 md:grid-cols-2">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
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
      canRetry: false,
    }
  }

  if (errorStatus === 404) {
    return {
      title: 'Cliente no encontrado',
      message: 'No hemos encontrado el cliente solicitado o este enlace ya no corresponde a un perfil de cliente.',
      canRetry: false,
    }
  }

  if (errorStatus === 500) {
    return {
      title: 'Error del servidor',
      message: 'El servidor no ha podido cargar el perfil del cliente. Inténtalo de nuevo en unos segundos.',
      canRetry: true,
    }
  }

  return {
    title: 'Error al cargar el perfil',
    message: 'No se ha podido cargar el perfil del cliente.',
    canRetry: true,
  }
}

export function ClientDetailPage() {
  const { id } = useParams()
  const currentUserRole = useAuth((state) => state.user?.role)
  const usersRoute = getUsersRoute(currentUserRole)
  const backLabel = currentUserRole === 'SUPER_ADMIN' ? 'Volver a usuarios' : 'Volver a clientes'
  const [unlockDialogOpen, setUnlockDialogOpen] = useState(false)
  const [changeRoleDialogOpen, setChangeRoleDialogOpen] = useState(false)
  const [manageAssignmentsDialogOpen, setManageAssignmentsDialogOpen] = useState(false)
  const [toggleStatusDialogOpen, setToggleStatusDialogOpen] = useState(false)

  const [searchParams, setSearchParams] = useSearchParams()
  const requestedTab = searchParams.get('tab')
  const activeTab = CLIENT_TABS.find((tab) => tab === requestedTab) ?? 'info'

  function handleTabChange(value: string) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      next.set('tab', value)
      return next
    }, { replace: true })
  }

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
      <div className="border-y border-border">
        <ErrorState
          title={errorCopy.title}
          description={message}
          onRetry={errorCopy.canRetry ? () => clientProfile.refetch() : undefined}
        />
        <div className="flex justify-center pb-14">
          <Button variant="outline" asChild>
            <Link to={usersRoute}>
              <ArrowLeft className="h-4 w-4" />
              {backLabel}
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  const client = clientProfile.data

  return (
    <div className="space-y-3 sm:space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" asChild>
          <Link to={usersRoute}>
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Link>
        </Button>

        <div className="flex flex-wrap gap-3">
          <Button asChild>
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
            <Button variant="outline" onClick={() => setManageAssignmentsDialogOpen(true)}>
              <Users className="h-4 w-4" />
              Gestionar admins
            </Button>
          )}
          {currentUserRole === 'SUPER_ADMIN' && (
            <Button variant="outline" onClick={() => setChangeRoleDialogOpen(true)}>
              <ShieldCheck className="h-4 w-4" />
              Cambiar rol
            </Button>
          )}
          {currentUserRole === 'SUPER_ADMIN' && (
            <Button variant="outline" onClick={() => setToggleStatusDialogOpen(true)}>
              {client.is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
              {client.is_active ? 'Dar de baja' : 'Reactivar'}
            </Button>
          )}
        </div>
      </div>

      <ClientHeader client={client} />

      {currentUserRole === 'SUPER_ADMIN' && (
        <details className="border-t border-border">
          <summary className="min-h-11 cursor-pointer content-center rounded text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Administradores asignados</summary>
          <ClientAssignedAdminsCard clientId={client.id} onManage={() => setManageAssignmentsDialogOpen(true)} />
        </details>
      )}

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList aria-label="Secciones del cliente" className="h-auto w-full max-w-full justify-start gap-1 overflow-x-auto border-t border-border">
          <TabsTrigger className={TAB_TRIGGER_CLASS} value="info">
            Info general
          </TabsTrigger>
          <TabsTrigger className={TAB_TRIGGER_CLASS} value="metrics">
            Métricas
          </TabsTrigger>
          <TabsTrigger className={TAB_TRIGGER_CLASS} value="streak">
            Racha
          </TabsTrigger>
          <TabsTrigger className={TAB_TRIGGER_CLASS} value="adherence">
            Adherencia
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <ClientInfoTab profile={client.profile} clientId={client.id} />
        </TabsContent>
        <TabsContent value="metrics">
          <ClientMetricsTab clientId={client.id} metrics={client.bodyMetrics} />
        </TabsContent>
        <TabsContent value="streak">
          <ClientStreakCard streak={client.streak} />
        </TabsContent>
        <TabsContent value="adherence">
          {id === client.id && <ClientAdherenceTab clientId={id} />}
        </TabsContent>
      </Tabs>

      <UnlockDialog user={client} open={unlockDialogOpen} onOpenChange={setUnlockDialogOpen} />
      <ChangeRoleDialog user={client} open={changeRoleDialogOpen} onOpenChange={setChangeRoleDialogOpen} />
      <ToggleUserStatusDialog user={client} open={toggleStatusDialogOpen} onOpenChange={setToggleStatusDialogOpen} />
      <ManageClientAssignmentsDialog
        client={client}
        open={manageAssignmentsDialogOpen}
        onOpenChange={setManageAssignmentsDialogOpen}
      />
    </div>
  )
}
