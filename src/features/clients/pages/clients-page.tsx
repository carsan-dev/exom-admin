import { useState } from 'react'
import { AlertTriangle, ChevronLeft, ChevronRight, Plus, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/use-auth'
import { getApiErrorMessage, useClients } from '../api'
import { ChangeRoleDialog } from '../components/change-role-dialog'
import { ClientsTable } from '../components/clients-table'
import { CreateClientDialog } from '../components/create-client-dialog'
import { UnlockDialog } from '../components/unlock-dialog'
import type { Client } from '../types'

const PAGE_SIZE = 10

function ClientsTableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-72" />
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="grid gap-4 rounded-xl border border-border/60 p-4 lg:grid-cols-[2fr_1.4fr_1fr_1fr_1fr_1.4fr]">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export function ClientsPage() {
  const currentUserRole = useAuth((state) => state.user?.role ?? 'ADMIN')
  const isSuperAdmin = currentUserRole === 'SUPER_ADMIN'
  const [page, setPage] = useState(1)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [unlockDialogOpen, setUnlockDialogOpen] = useState(false)
  const [changeRoleDialogOpen, setChangeRoleDialogOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)

  const clientsQuery = useClients(page, PAGE_SIZE)
  const clients = clientsQuery.data?.data ?? []
  const total = clientsQuery.data?.total ?? 0
  const totalPages = clientsQuery.data?.totalPages ?? 1
  const pageDescription = isSuperAdmin
    ? 'Consulta la cartera asignada en esta vista, revisa perfiles completos y gestiona desbloqueos o cambios de rol sin salir del panel.'
    : 'Consulta clientes asignados, revisa su perfil completo y gestiona desbloqueos sin salir del panel.'
  const pageCountLabel =
    total > 0
      ? isSuperAdmin
        ? `${total} clientes asignados en esta vista`
        : `${total} clientes asignados a tu cuenta`
      : isSuperAdmin
        ? 'Todavía no hay clientes asignados en esta vista'
        : 'Todavía no hay clientes asignados a tu cuenta'
  const emptyTitle = isSuperAdmin ? 'Todavía no hay clientes asignados en esta vista' : 'Aún no tienes clientes asignados'
  const emptyDescription = isSuperAdmin
    ? 'Esta vista solo muestra clientes asignados. Crea un cliente o espera nuevas asignaciones para empezar a gestionar perfiles, métricas y accesos.'
    : 'Crea el primer cliente para empezar a gestionar perfiles, métricas y estados de acceso.'
  const tableDescription = isSuperAdmin
    ? 'Vista paginada de clientes asignados con acciones avanzadas de desbloqueo y cambio de rol'
    : 'Vista paginada de clientes asignados al admin actual'

  const handleUnlock = (client: Client) => {
    setSelectedClient(client)
    setUnlockDialogOpen(true)
  }

  const handleChangeRole = (client: Client) => {
    setSelectedClient(client)
    setChangeRoleDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-card p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-brand-primary">Gestión de clientes</p>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Clientes</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {pageDescription}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">{pageCountLabel}</p>
        </div>

        <Button onClick={() => setCreateDialogOpen(true)} className="lg:self-start">
          <Plus className="h-4 w-4" />
          Nuevo cliente
        </Button>
      </div>

      {clientsQuery.isLoading ? (
        <ClientsTableSkeleton />
      ) : clientsQuery.isError ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 pt-8 text-center">
            <div className="rounded-full bg-status-error/10 p-4 text-status-error">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-foreground">No se ha podido cargar el listado</h2>
              <p className="max-w-xl text-sm text-muted-foreground">
                {getApiErrorMessage(clientsQuery.error, 'Inténtalo de nuevo en unos segundos.')}
              </p>
            </div>
            <Button onClick={() => clientsQuery.refetch()}>Reintentar</Button>
          </CardContent>
        </Card>
      ) : clients.length === 0 ? (
        <Card className="border-dashed border-border/70">
          <CardContent className="flex flex-col items-center gap-4 pt-10 text-center">
            <div className="rounded-full bg-brand-soft/10 p-4 text-brand-primary">
              <Users className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-foreground">{emptyTitle}</h2>
              <p className="max-w-xl text-sm text-muted-foreground">{emptyDescription}</p>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Crear primer cliente
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Listado principal</CardTitle>
            <CardDescription>{tableDescription}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <ClientsTable
              clients={clients}
              currentUserRole={currentUserRole}
              onUnlock={handleUnlock}
              onChangeRole={handleChangeRole}
            />

            <div className="flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Página {page} de {totalPages}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1}>
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={page >= totalPages}
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <CreateClientDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreated={() => setPage(1)}
      />
      <UnlockDialog client={selectedClient} open={unlockDialogOpen} onOpenChange={setUnlockDialogOpen} />
      <ChangeRoleDialog user={selectedClient} open={changeRoleDialogOpen} onOpenChange={setChangeRoleDialogOpen} />
    </div>
  )
}
