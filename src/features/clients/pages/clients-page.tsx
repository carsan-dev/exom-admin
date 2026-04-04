import { useState } from 'react'
import { AlertTriangle, ChevronLeft, ChevronRight, Plus, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/hooks/use-auth'
import { getApiErrorMessage, useAllUsers, useClients } from '../api'
import { AdminsTable } from '../components/admins-table'
import { ChangeRoleDialog } from '../components/change-role-dialog'
import { ClientsTable } from '../components/clients-table'
import { CreateAdminDialog } from '../components/create-admin-dialog'
import { CreateClientDialog } from '../components/create-client-dialog'
import { EditUserDialog } from '../components/edit-user-dialog'
import { ManageClientAssignmentsDialog } from '../components/manage-client-assignments-dialog'
import { ToggleUserStatusDialog } from '../components/toggle-user-status-dialog'
import { UnlockDialog } from '../components/unlock-dialog'
import type { AdminUserListItem, Client } from '../types'

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
          <div
            key={index}
            className="grid gap-4 rounded-xl border border-border/60 p-4 lg:grid-cols-[2fr_1.4fr_1fr_1fr_1fr_1fr_1.7fr]"
          >
            {Array.from({ length: 7 }).map((__, columnIndex) => (
              <Skeleton key={columnIndex} className="h-10 w-full" />
            ))}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function AdminsTableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-72" />
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="grid gap-4 rounded-xl border border-border/60 p-4 lg:grid-cols-[2fr_1.4fr_1fr_1fr_1.8fr]"
          >
            {Array.from({ length: 5 }).map((__, columnIndex) => (
              <Skeleton key={columnIndex} className="h-10 w-full" />
            ))}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

interface PaginationBarProps {
  page: number
  totalPages: number
  onPrevious: () => void
  onNext: () => void
}

function PaginationBar({ page, totalPages, onPrevious, onNext }: PaginationBarProps) {
  return (
    <div className="flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Página {page} de {totalPages}
      </p>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onPrevious} disabled={page === 1}>
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </Button>
        <Button variant="outline" onClick={onNext} disabled={page >= totalPages}>
          Siguiente
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

type ManageableUser = Client | AdminUserListItem

export function ClientsPage() {
  const currentUserRole = useAuth((state) => state.user?.role ?? 'ADMIN')
  const isSuperAdmin = currentUserRole === 'SUPER_ADMIN'

  const [activeTab, setActiveTab] = useState<'clients' | 'admins'>('clients')
  const [clientPage, setClientPage] = useState(1)
  const [adminPage, setAdminPage] = useState(1)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [createAdminDialogOpen, setCreateAdminDialogOpen] = useState(false)
  const [unlockDialogOpen, setUnlockDialogOpen] = useState(false)
  const [changeRoleDialogOpen, setChangeRoleDialogOpen] = useState(false)
  const [editUserDialogOpen, setEditUserDialogOpen] = useState(false)
  const [toggleStatusDialogOpen, setToggleStatusDialogOpen] = useState(false)
  const [manageAssignmentsDialogOpen, setManageAssignmentsDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<ManageableUser | null>(null)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)

  const clientsQuery = useClients(clientPage, PAGE_SIZE)
  const adminsQuery = useAllUsers('ADMIN', adminPage, PAGE_SIZE, isSuperAdmin && activeTab === 'admins')

  const clients = clientsQuery.data?.data ?? []
  const totalClients = clientsQuery.data?.total ?? 0
  const clientTotalPages = clientsQuery.data?.totalPages ?? 1

  const admins = adminsQuery.data?.data ?? []
  const totalAdmins = adminsQuery.data?.total ?? 0
  const adminTotalPages = adminsQuery.data?.totalPages ?? 1

  const pageTitle = isSuperAdmin ? 'Usuarios' : 'Clientes'
  const pageDescription = isSuperAdmin
    ? 'Gestiona clientes y admins desde un único punto, incluyendo altas, roles, accesos y reasignaciones.'
    : 'Consulta clientes asignados, revisa su perfil completo y gestiona desbloqueos sin salir del panel.'

  const pageCountLabel = isSuperAdmin
    ? activeTab === 'admins'
      ? totalAdmins > 0
        ? `${totalAdmins} admins registrados`
        : 'Todavía no hay admins registrados'
      : totalClients > 0
        ? `${totalClients} clientes registrados`
        : 'Todavía no hay clientes registrados'
    : totalClients > 0
      ? `${totalClients} clientes asignados a tu cuenta`
      : 'Todavía no hay clientes asignados a tu cuenta'

  const handleUnlock = (user: ManageableUser) => {
    setSelectedUser(user)
    setUnlockDialogOpen(true)
  }

  const handleChangeRole = (user: ManageableUser) => {
    setSelectedUser(user)
    setChangeRoleDialogOpen(true)
  }

  const handleEditUser = (user: ManageableUser) => {
    setSelectedUser(user)
    setEditUserDialogOpen(true)
  }

  const handleToggleStatus = (user: ManageableUser) => {
    setSelectedUser(user)
    setToggleStatusDialogOpen(true)
  }

  const handleManageAssignments = (client: Client) => {
    setSelectedClient(client)
    setManageAssignmentsDialogOpen(true)
  }

  const renderClientsPanel = () => {
    const emptyTitle = isSuperAdmin ? 'Todavía no hay clientes registrados' : 'Aún no tienes clientes asignados'
    const emptyDescription = isSuperAdmin
      ? 'Crea el primer cliente para empezar a gestionar perfiles, métricas, accesos y reasignaciones desde el panel.'
      : 'Crea el primer cliente para empezar a gestionar perfiles, métricas y estados de acceso.'
    const tableDescription = isSuperAdmin
      ? 'Vista paginada de clientes con reasignación, desbloqueo, cambio de rol y alta/baja de cuenta.'
      : 'Vista paginada de clientes asignados al admin actual.'

    if (clientsQuery.isLoading) {
      return <ClientsTableSkeleton />
    }

    if (clientsQuery.isError) {
      return (
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
      )
    }

    if (clients.length === 0) {
      return (
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
      )
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Listado de clientes</CardTitle>
          <CardDescription>{tableDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ClientsTable
            clients={clients}
            currentUserRole={currentUserRole}
            onUnlock={handleUnlock}
            onChangeRole={handleChangeRole}
            onManageAssignments={handleManageAssignments}
            onToggleStatus={handleToggleStatus}
          />

          <PaginationBar
            page={clientPage}
            totalPages={clientTotalPages}
            onPrevious={() => setClientPage((current) => Math.max(1, current - 1))}
            onNext={() => setClientPage((current) => Math.min(clientTotalPages, current + 1))}
          />
        </CardContent>
      </Card>
    )
  }

  const renderAdminsPanel = () => {
    if (adminsQuery.isLoading) {
      return <AdminsTableSkeleton />
    }

    if (adminsQuery.isError) {
      return (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 pt-8 text-center">
            <div className="rounded-full bg-status-error/10 p-4 text-status-error">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-foreground">No se ha podido cargar el listado de admins</h2>
              <p className="max-w-xl text-sm text-muted-foreground">
                {getApiErrorMessage(adminsQuery.error, 'Inténtalo de nuevo en unos segundos.')}
              </p>
            </div>
            <Button onClick={() => adminsQuery.refetch()}>Reintentar</Button>
          </CardContent>
        </Card>
      )
    }

    if (admins.length === 0) {
      return (
        <Card className="border-dashed border-border/70">
          <CardContent className="flex flex-col items-center gap-4 pt-10 text-center">
            <div className="rounded-full bg-brand-soft/10 p-4 text-brand-primary">
              <Users className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-foreground">Todavía no hay admins registrados</h2>
              <p className="max-w-xl text-sm text-muted-foreground">
                Crea el primer admin para delegar la gestión diaria del panel y de las carteras de clientes.
              </p>
            </div>
            <Button onClick={() => setCreateAdminDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Crear primer admin
            </Button>
          </CardContent>
        </Card>
      )
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Listado de admins</CardTitle>
          <CardDescription>
            Gestiona altas, edición, desbloqueos, cambios de rol y estado de acceso del equipo administrador.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <AdminsTable
            admins={admins}
            onEdit={handleEditUser}
            onUnlock={handleUnlock}
            onChangeRole={handleChangeRole}
            onToggleStatus={handleToggleStatus}
          />

          <PaginationBar
            page={adminPage}
            totalPages={adminTotalPages}
            onPrevious={() => setAdminPage((current) => Math.max(1, current - 1))}
            onNext={() => setAdminPage((current) => Math.min(adminTotalPages, current + 1))}
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-card p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-brand-primary">Gestión de usuarios</p>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">{pageTitle}</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{pageDescription}</p>
          </div>
          <p className="text-sm text-muted-foreground">{pageCountLabel}</p>
        </div>

        <Button
          onClick={() => {
            if (isSuperAdmin && activeTab === 'admins') {
              setCreateAdminDialogOpen(true)
              return
            }

            setCreateDialogOpen(true)
          }}
          className="lg:self-start"
        >
          <Plus className="h-4 w-4" />
          {isSuperAdmin && activeTab === 'admins' ? 'Nuevo admin' : 'Nuevo cliente'}
        </Button>
      </div>

      {isSuperAdmin ? (
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'clients' | 'admins')} className="space-y-4">
          <TabsList className="grid h-auto w-full grid-cols-1 gap-2 bg-transparent p-0 sm:grid-cols-2">
            <TabsTrigger
              value="clients"
              className="rounded-xl border border-border bg-card py-3 data-[state=active]:border-brand-primary/40 data-[state=active]:bg-brand-soft/10 data-[state=active]:text-brand-primary"
            >
              Clientes
            </TabsTrigger>
            <TabsTrigger
              value="admins"
              className="rounded-xl border border-border bg-card py-3 data-[state=active]:border-brand-primary/40 data-[state=active]:bg-brand-soft/10 data-[state=active]:text-brand-primary"
            >
              Admins
            </TabsTrigger>
          </TabsList>

          <TabsContent value="clients">{renderClientsPanel()}</TabsContent>
          <TabsContent value="admins">{renderAdminsPanel()}</TabsContent>
        </Tabs>
      ) : (
        renderClientsPanel()
      )}

      <CreateClientDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreated={() => setClientPage(1)}
      />
      <CreateAdminDialog open={createAdminDialogOpen} onOpenChange={setCreateAdminDialogOpen} />
      <UnlockDialog user={selectedUser} open={unlockDialogOpen} onOpenChange={setUnlockDialogOpen} />
      <EditUserDialog user={selectedUser} open={editUserDialogOpen} onOpenChange={setEditUserDialogOpen} />
      <ToggleUserStatusDialog
        user={selectedUser}
        open={toggleStatusDialogOpen}
        onOpenChange={setToggleStatusDialogOpen}
      />
      <ChangeRoleDialog user={selectedUser} open={changeRoleDialogOpen} onOpenChange={setChangeRoleDialogOpen} />
      <ManageClientAssignmentsDialog
        client={selectedClient}
        open={manageAssignmentsDialogOpen}
        onOpenChange={setManageAssignmentsDialogOpen}
      />
    </div>
  )
}
