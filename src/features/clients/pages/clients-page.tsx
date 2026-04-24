import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, ChevronLeft, ChevronRight, Plus, Users } from 'lucide-react'
import { useSearchParams } from 'react-router'
import {
  FilterToolbar,
  filtersToApiParams,
  type FilterOption,
  type FilterSectionConfig,
  useListFilters,
} from '@/components/filters'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/hooks/use-auth'
import {
  buildPaginationSearchParams,
  getPageSearchParam,
  hasSearchParamsChanged,
  replacePaginationSearchParams,
} from '@/lib/pagination-search-params'
import {
  getApiErrorMessage,
  type ClientsListParams,
  type UsersListParams,
  useAllUsers,
  useClients,
} from '../api'
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
const USER_STATUS_OPTIONS: FilterOption[] = [
  { value: 'ACTIVE', label: 'Activa' },
  { value: 'LOCKED', label: 'Bloqueada' },
  { value: 'INACTIVE', label: 'Inactiva' },
]
const CLIENT_LEVEL_OPTIONS: FilterOption[] = [
  { value: 'PRINCIPIANTE', label: 'Principiante' },
  { value: 'INTERMEDIO', label: 'Intermedio' },
  { value: 'AVANZADO', label: 'Avanzado' },
]
const ASSIGNMENT_STATE_OPTIONS: FilterOption[] = [
  { value: 'ASSIGNED', label: 'Con admins' },
  { value: 'UNASSIGNED', label: 'Sin admins' },
]

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
            className="grid gap-4 rounded-xl border border-border/60 p-4 lg:grid-cols-[2fr_1.4fr_1fr_1fr_1fr_1.8fr]"
          >
            {Array.from({ length: 6 }).map((__, columnIndex) => (
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
type ClientsTab = 'clients' | 'admins' | 'super-admins'

function getClientsTab(value: string | null): ClientsTab {
  return value === 'admins' || value === 'super-admins' ? value : 'clients'
}

export function ClientsPage() {
  const currentUser = useAuth((state) => state.user)
  const currentUserRole = currentUser?.role ?? 'ADMIN'
  const currentUserId = currentUser?.id
  const isSuperAdmin = currentUserRole === 'SUPER_ADMIN'

  const [searchParams, setSearchParams] = useSearchParams()
  const [clientSearch, setClientSearch] = useState('')
  const [adminSearch, setAdminSearch] = useState('')
  const [superAdminSearch, setSuperAdminSearch] = useState('')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [createAdminDialogOpen, setCreateAdminDialogOpen] = useState(false)
  const [unlockDialogOpen, setUnlockDialogOpen] = useState(false)
  const [changeRoleDialogOpen, setChangeRoleDialogOpen] = useState(false)
  const [editUserDialogOpen, setEditUserDialogOpen] = useState(false)
  const [toggleStatusDialogOpen, setToggleStatusDialogOpen] = useState(false)
  const [manageAssignmentsDialogOpen, setManageAssignmentsDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<ManageableUser | null>(null)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const deferredClientSearch = useDeferredValue(clientSearch)
  const deferredAdminSearch = useDeferredValue(adminSearch)
  const deferredSuperAdminSearch = useDeferredValue(superAdminSearch)
  const activeClientSearch = deferredClientSearch.trim()
  const activeAdminSearch = deferredAdminSearch.trim()
  const activeSuperAdminSearch = deferredSuperAdminSearch.trim()
  const tabParam = getClientsTab(searchParams.get('tab'))
  const activeTab = isSuperAdmin ? tabParam : 'clients'
  const clientPage = getPageSearchParam(searchParams.get('clientsPage'))
  const adminPage = getPageSearchParam(searchParams.get('adminsPage'))
  const superAdminPage = getPageSearchParam(searchParams.get('superAdminsPage'))
  const clientSections = useMemo<FilterSectionConfig[]>(
    () => [
      {
        type: 'multi',
        key: 'status',
        label: 'Estado',
        options: USER_STATUS_OPTIONS,
      },
      {
        type: 'multi',
        key: 'level',
        label: 'Nivel',
        options: CLIENT_LEVEL_OPTIONS,
      },
      ...(isSuperAdmin
        ? [
            {
              type: 'multi',
              key: 'assignment_state',
              label: 'Asignación',
              options: ASSIGNMENT_STATE_OPTIONS,
            } satisfies FilterSectionConfig,
          ]
        : []),
      {
        type: 'date-range',
        key: 'created',
        label: 'Fecha registro',
      },
    ],
    [isSuperAdmin]
  )
  const userSections = useMemo<FilterSectionConfig[]>(
    () => [
      {
        type: 'multi',
        key: 'status',
        label: 'Estado',
        options: USER_STATUS_OPTIONS,
      },
      {
        type: 'date-range',
        key: 'created',
        label: 'Fecha registro',
      },
    ],
    []
  )
  const clientFilters = useListFilters(clientSections)
  const adminFilters = useListFilters(userSections)
  const superAdminFilters = useListFilters(userSections)
  const clientFilterParams = filtersToApiParams(clientFilters.values, clientSections) as Partial<ClientsListParams>
  const adminFilterParams = filtersToApiParams(adminFilters.values, userSections) as Partial<UsersListParams>
  const superAdminFilterParams = filtersToApiParams(
    superAdminFilters.values,
    userSections
  ) as Partial<UsersListParams>
  const clientPageResetKey = `${activeClientSearch}::${JSON.stringify(clientFilterParams)}`
  const adminPageResetKey = `${activeAdminSearch}::${JSON.stringify(adminFilterParams)}`
  const superAdminPageResetKey = `${activeSuperAdminSearch}::${JSON.stringify(superAdminFilterParams)}`
  const lastClientPageResetKeyRef = useRef(clientPageResetKey)
  const lastAdminPageResetKeyRef = useRef(adminPageResetKey)
  const lastSuperAdminPageResetKeyRef = useRef(superAdminPageResetKey)

  const updateSearchParams = (updates: {
    tab?: ClientsTab
    clientsPage?: number
    adminsPage?: number
    superAdminsPage?: number
  }) => {
    setSearchParams(
      (currentSearchParams) => {
        const nextSearchParams = buildPaginationSearchParams(currentSearchParams, {
          clientsPage: updates.clientsPage,
          adminsPage: updates.adminsPage,
          superAdminsPage: updates.superAdminsPage,
        })

        if (updates.tab !== undefined) {
          nextSearchParams.set('tab', updates.tab)
        }

        return hasSearchParamsChanged(currentSearchParams, nextSearchParams)
          ? nextSearchParams
          : currentSearchParams
      },
      { replace: true },
    )
  }

  useEffect(() => {
    if (lastClientPageResetKeyRef.current === clientPageResetKey) {
      return
    }

    lastClientPageResetKeyRef.current = clientPageResetKey
    replacePaginationSearchParams(setSearchParams, { clientsPage: 1 })
  }, [clientPageResetKey, setSearchParams])

  useEffect(() => {
    if (lastAdminPageResetKeyRef.current === adminPageResetKey) {
      return
    }

    lastAdminPageResetKeyRef.current = adminPageResetKey
    replacePaginationSearchParams(setSearchParams, { adminsPage: 1 })
  }, [adminPageResetKey, setSearchParams])

  useEffect(() => {
    if (lastSuperAdminPageResetKeyRef.current === superAdminPageResetKey) {
      return
    }

    lastSuperAdminPageResetKeyRef.current = superAdminPageResetKey
    replacePaginationSearchParams(setSearchParams, { superAdminsPage: 1 })
  }, [superAdminPageResetKey, setSearchParams])

  const clientsQuery = useClients({
    page: clientPage,
    limit: PAGE_SIZE,
    search: activeClientSearch,
    ...clientFilterParams,
  })
  const adminsQuery = useAllUsers(
    {
      role: 'ADMIN',
      page: adminPage,
      limit: PAGE_SIZE,
      search: activeAdminSearch,
      ...adminFilterParams,
    },
    isSuperAdmin && activeTab === 'admins'
  )
  const superAdminsQuery = useAllUsers(
    {
      role: 'SUPER_ADMIN',
      page: superAdminPage,
      limit: PAGE_SIZE,
      search: activeSuperAdminSearch,
      ...superAdminFilterParams,
    },
    isSuperAdmin && activeTab === 'super-admins'
  )

  const clients = clientsQuery.data?.data ?? []
  const totalClients = clientsQuery.data?.total ?? 0
  const clientTotalPages = clientsQuery.data?.totalPages ?? 1

  const admins = adminsQuery.data?.data ?? []
  const totalAdmins = adminsQuery.data?.total ?? 0
  const adminTotalPages = adminsQuery.data?.totalPages ?? 1

  const superAdmins = superAdminsQuery.data?.data ?? []
  const totalSuperAdmins = superAdminsQuery.data?.total ?? 0
  const superAdminTotalPages = superAdminsQuery.data?.totalPages ?? 1

  const pageTitle = isSuperAdmin ? 'Usuarios' : 'Clientes'
  const pageDescription = isSuperAdmin
    ? 'Gestiona clientes y admins desde un único punto, incluyendo altas, roles, accesos y reasignaciones.'
    : 'Consulta clientes asignados, revisa su perfil completo y gestiona desbloqueos sin salir del panel.'

  const pageCountLabel = isSuperAdmin
    ? activeTab === 'admins'
      ? totalAdmins > 0
        ? `${totalAdmins} admins registrados`
        : 'Todavía no hay admins registrados'
      : activeTab === 'super-admins'
        ? totalSuperAdmins > 0
          ? `${totalSuperAdmins} super admins registrados`
          : 'Todavía no hay super admins registrados'
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
    const hasClientQuery = activeClientSearch.length > 0 || clientFilters.activeCount > 0

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

    if (clients.length === 0 && !hasClientQuery) {
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
          <FilterToolbar
            search={clientSearch}
            onSearchChange={setClientSearch}
            searchPlaceholder="Buscar por nombre o email..."
            sections={clientSections}
            filters={clientFilters}
          />

          {clients.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No se encontraron clientes con la búsqueda y filtros actuales.
            </p>
          ) : (
            <ClientsTable
              clients={clients}
              currentUserRole={currentUserRole}
              onUnlock={handleUnlock}
              onChangeRole={handleChangeRole}
              onManageAssignments={handleManageAssignments}
              onToggleStatus={handleToggleStatus}
            />
          )}

          <PaginationBar
            page={clientPage}
            totalPages={clientTotalPages}
            onPrevious={() =>
              updateSearchParams({ clientsPage: Math.max(1, clientPage - 1) })
            }
            onNext={() =>
              updateSearchParams({
                clientsPage: Math.min(clientTotalPages, clientPage + 1),
              })
            }
          />
        </CardContent>
      </Card>
    )
  }

  const renderAdminsPanel = () => {
    const hasAdminQuery = activeAdminSearch.length > 0 || adminFilters.activeCount > 0

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

    if (admins.length === 0 && !hasAdminQuery) {
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
          <FilterToolbar
            search={adminSearch}
            onSearchChange={setAdminSearch}
            searchPlaceholder="Buscar por nombre o email..."
            sections={userSections}
            filters={adminFilters}
          />

          {admins.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No se encontraron admins con la búsqueda y filtros actuales.
            </p>
          ) : (
            <AdminsTable
              admins={admins}
              currentUserId={currentUserId}
              onEdit={handleEditUser}
              onUnlock={handleUnlock}
              onChangeRole={handleChangeRole}
              onToggleStatus={handleToggleStatus}
            />
          )}

          <PaginationBar
            page={adminPage}
            totalPages={adminTotalPages}
            onPrevious={() => updateSearchParams({ adminsPage: Math.max(1, adminPage - 1) })}
            onNext={() =>
              updateSearchParams({
                adminsPage: Math.min(adminTotalPages, adminPage + 1),
              })
            }
          />
        </CardContent>
      </Card>
    )
  }

  const renderSuperAdminsPanel = () => {
    const hasSuperAdminQuery =
      activeSuperAdminSearch.length > 0 || superAdminFilters.activeCount > 0

    if (superAdminsQuery.isLoading) {
      return <AdminsTableSkeleton />
    }

    if (superAdminsQuery.isError) {
      return (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 pt-8 text-center">
            <div className="rounded-full bg-status-error/10 p-4 text-status-error">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-foreground">
                No se ha podido cargar el listado de super admins
              </h2>
              <p className="max-w-xl text-sm text-muted-foreground">
                {getApiErrorMessage(superAdminsQuery.error, 'Inténtalo de nuevo en unos segundos.')}
              </p>
            </div>
            <Button onClick={() => superAdminsQuery.refetch()}>Reintentar</Button>
          </CardContent>
        </Card>
      )
    }

    if (superAdmins.length === 0 && !hasSuperAdminQuery) {
      return (
        <Card className="border-dashed border-border/70">
          <CardContent className="flex flex-col items-center gap-4 pt-10 text-center">
            <div className="rounded-full bg-brand-soft/10 p-4 text-brand-primary">
              <Users className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-foreground">Todavía no hay super admins adicionales</h2>
              <p className="max-w-xl text-sm text-muted-foreground">
                Para crear uno nuevo, da de alta primero un admin y después promuévelo a super admin desde la gestión de roles.
              </p>
            </div>
            <Button onClick={() => setCreateAdminDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Crear admin base
            </Button>
          </CardContent>
        </Card>
      )
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Listado de super admins</CardTitle>
          <CardDescription>
            Puedes editar, desbloquear, cambiar el rol o reactivar otros super admins. Tu propia cuenta queda protegida frente a degradaciones o bajas accidentales.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <FilterToolbar
            search={superAdminSearch}
            onSearchChange={setSuperAdminSearch}
            searchPlaceholder="Buscar por nombre o email..."
            sections={userSections}
            filters={superAdminFilters}
          />

          {superAdmins.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No se encontraron super admins con la búsqueda y filtros actuales.
            </p>
          ) : (
            <AdminsTable
              admins={superAdmins}
              currentUserId={currentUserId}
              onEdit={handleEditUser}
              onUnlock={handleUnlock}
              onChangeRole={handleChangeRole}
              onToggleStatus={handleToggleStatus}
            />
          )}

          <PaginationBar
            page={superAdminPage}
            totalPages={superAdminTotalPages}
            onPrevious={() =>
              updateSearchParams({ superAdminsPage: Math.max(1, superAdminPage - 1) })
            }
            onNext={() =>
              updateSearchParams({
                superAdminsPage: Math.min(superAdminTotalPages, superAdminPage + 1),
              })
            }
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-card p-6 shadow-none sm:shadow-sm lg:flex-row lg:items-center lg:justify-between">
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
            if (isSuperAdmin && activeTab !== 'clients') {
              setCreateAdminDialogOpen(true)
              return
            }

            setCreateDialogOpen(true)
          }}
          className="lg:self-start"
        >
          <Plus className="h-4 w-4" />
          {isSuperAdmin && activeTab !== 'clients' ? 'Nuevo admin' : 'Nuevo cliente'}
        </Button>
      </div>

      {isSuperAdmin ? (
        <Tabs
          value={activeTab}
          onValueChange={(value) => updateSearchParams({ tab: value as ClientsTab })}
          className="space-y-4"
        >
          <TabsList className="grid h-auto w-full grid-cols-1 gap-2 bg-transparent p-0 sm:grid-cols-3">
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
            <TabsTrigger
              value="super-admins"
              className="rounded-xl border border-border bg-card py-3 data-[state=active]:border-brand-primary/40 data-[state=active]:bg-brand-soft/10 data-[state=active]:text-brand-primary"
            >
              Super Admins
            </TabsTrigger>
          </TabsList>

          <TabsContent value="clients">{renderClientsPanel()}</TabsContent>
          <TabsContent value="admins">{renderAdminsPanel()}</TabsContent>
          <TabsContent value="super-admins">{renderSuperAdminsPanel()}</TabsContent>
        </Tabs>
      ) : (
        renderClientsPanel()
      )}

      <CreateClientDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreated={() => replacePaginationSearchParams(setSearchParams, { clientsPage: 1 })}
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
